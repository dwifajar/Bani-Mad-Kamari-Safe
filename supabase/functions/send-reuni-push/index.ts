import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const accessToken = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!accessToken) return json({ error: "Sesi admin tidak ditemukan." }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || (() => {
      try { return JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}").default || ""; }
      catch { return ""; }
    })();
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || (() => {
      try { return JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}").default || ""; }
      catch { return ""; }
    })();
    if (!supabaseUrl || !serviceRole || !anonKey) throw new Error("Konfigurasi Supabase Edge Function belum lengkap.");

    const caller = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
    const { data: userData, error: userError } = await caller.auth.getUser(accessToken);
    if (userError || !userData?.user) return json({ error: "Sesi admin tidak valid atau sudah kedaluwarsa." }, 401);

    const admin = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });
    const { data: profile, error: profileError } = await admin.from("profiles").select("role,nama,email").eq("id", userData.user.id).maybeSingle();
    if (profileError) throw profileError;
    if (!profile || !["super_admin", "admin", "editor"].includes(profile.role)) return json({ error: "Akun ini tidak memiliki akses mengirim notifikasi." }, 403);

    const body = await req.json().catch(() => ({}));
    const notificationId = String(body.notification_id || "").trim();
    const force = body.force === true;
    if (!notificationId) return json({ error: "notification_id wajib diisi." }, 400);

    const { data: notice, error: noticeError } = await admin.from("notifikasi_reuni").select("id,judul,isi,kategori,status,publish_at,push_sent_at").eq("id", notificationId).maybeSingle();
    if (noticeError) throw noticeError;
    if (!notice) return json({ error: "Pengumuman tidak ditemukan." }, 404);
    const live = notice.status === "published" && (!notice.publish_at || new Date(notice.publish_at).getTime() <= Date.now());
    if (!live) return json({ error: "Pengumuman belum berstatus published atau belum masuk waktu tayang." }, 400);
    if (notice.push_sent_at && !force) return json({ ok: true, skipped: true, reason: "already_sent", sent: 0, failed: 0 });

    let { data: vapid, error: vapidError } = await admin.from("bmk_push_config").select("id,public_key,private_key,subject").eq("id", 1).maybeSingle();
    if (vapidError) throw vapidError;
    if (!vapid?.public_key || !vapid?.private_key) {
      const keys = webpush.generateVAPIDKeys();
      const subject = `${supabaseUrl}/functions/v1/push-public-key`;
      const { data: saved, error: saveError } = await admin.from("bmk_push_config").upsert({
        id: 1,
        public_key: keys.publicKey,
        private_key: keys.privateKey,
        subject,
        updated_at: new Date().toISOString(),
      }).select("id,public_key,private_key,subject").single();
      if (saveError) throw saveError;
      vapid = saved;
    }

    webpush.setVapidDetails(vapid.subject || `${supabaseUrl}/functions/v1/send-reuni-push`, vapid.public_key, vapid.private_key);

    const { data: subs, error: subError } = await admin.from("push_subscriptions").select("id,endpoint,p256dh,auth");
    if (subError) throw subError;

    const title = `BANI MAD KAMARI — ${notice.judul}`;
    const bodyText = String(notice.isi || "").trim().slice(0, 220);
    const payload = JSON.stringify({
      title,
      body: bodyText,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: `bmk-notif-${notice.id}`,
      renotify: true,
      data: { notificationId: notice.id, url: `/notifikasi.html?id=${encodeURIComponent(notice.id)}` }
    });

    let sent = 0;
    let failed = 0;
    let removed = 0;
    for (const sub of subs || []) {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload, { TTL: 86400, urgency: "high" });
        sent++;
      } catch (err) {
        failed++;
        const code = Number(err?.statusCode || 0);
        if (code === 404 || code === 410) {
          const { error: delError } = await admin.from("push_subscriptions").delete().eq("id", sub.id);
          if (!delError) removed++;
        }
        console.warn("[BMK Push] delivery failed", code, err?.body || err?.message || err);
      }
    }

    await admin.from("notifikasi_reuni").update({
      push_sent_at: new Date().toISOString(),
      push_sent_count: sent,
      push_failed_count: failed,
    }).eq("id", notice.id);

    return json({ ok: true, sent, failed, removed, total: (subs || []).length, notificationId: notice.id });
  } catch (e) {
    console.error("[BMK Send Reuni Push]", e);
    return json({ error: e?.message || "Gagal mengirim notifikasi HP." }, 500);
  }
});
