import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || (() => {
      try { return JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}").default || ""; }
      catch { return ""; }
    })();
    if (!supabaseUrl || !serviceRole) throw new Error("Konfigurasi Supabase Edge Function belum lengkap.");

    const admin = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });
    let { data: cfg, error } = await admin.from("bmk_push_config").select("id,public_key,private_key,subject").eq("id", 1).maybeSingle();
    if (error) throw error;

    if (!cfg?.public_key || !cfg?.private_key) {
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
      cfg = saved;
    }

    return new Response(JSON.stringify({ publicKey: cfg.public_key }), {
      headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch (e) {
    console.error("[BMK Push Public Key]", e);
    return new Response(JSON.stringify({ error: e?.message || "Gagal menyiapkan kunci push." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
