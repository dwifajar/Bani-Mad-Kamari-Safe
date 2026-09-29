/* BANI MAD KAMARI — FINAL AUTH CORE V3
   Non-blocking auth: dashboard is never hidden by the auth script.
*/
(function(){
  const home=()=>new URL("/",location.origin).href;
  const login=()=>new URL("/login.html",location.origin).href;

  const cfg=window.BMK_SUPABASE||{};
  const url=String(cfg.url||"").trim();
  const anon=String(cfg.anonKey||"").trim();
  const valid=!!(url && anon &&
    !url.includes("YOUR-PROJECT-REF") &&
    !anon.includes("YOUR_SUPABASE_ANON_KEY"));

  let sb=null;
  try{
    if(valid && window.supabase && typeof window.supabase.createClient==="function"){
      sb=window.supabase.createClient(url,anon);
    }
  }catch(e){
    console.error("[BMK] Supabase client:",e);
  }

  window.BMK=window.BMK||{};
  const BMK=window.BMK;
  BMK.supabase=sb;
  BMK.cloud=!!sb;

  BMK.escape=s=>String(s??"").replace(/[&<>"']/g,m=>({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[m]));

  BMK.ROLE_LABELS={
    super_admin:"Super Admin",
    admin:"Admin",
    editor:"Editor"
  };
  BMK.ROLE_PERMISSIONS={
    super_admin:["dashboard","keluarga","silsilah","reuni","pendaftaran","galeri","berita","agenda","kas","pengguna","pengaturan"],
    admin:["dashboard","keluarga","silsilah","reuni","pendaftaran","galeri","berita","agenda","kas"],
    editor:["dashboard","keluarga","silsilah","reuni","pendaftaran","galeri","berita","agenda"]
  };
  BMK.hasPermission=function(role,key){
    return Array.isArray(BMK.ROLE_PERMISSIONS[role]) && BMK.ROLE_PERMISSIONS[role].includes(key);
  };
  BMK.applyMenuPermissions=function(role){
    const nav=document.querySelector(".sidebar nav");
    if(!nav)return;
    const map={
      "index.html":"dashboard","keluarga.html":"keluarga","silsilah.html":"silsilah",
      "reuni.html":"reuni","pendaftaran.html":"pendaftaran","galeri.html":"galeri",
      "berita.html":"berita","agenda.html":"agenda","kas.html":"kas",
      "pengguna.html":"pengguna","pengaturan.html":"pengaturan"
    };
    nav.querySelectorAll("a[href]").forEach(a=>{
      const file=(a.getAttribute("href")||"").split("/").pop().split("?")[0].toLowerCase();
      const key=map[file];
      if(key && !BMK.hasPermission(role,key)) a.style.display="none";
    });
  };

  BMK.toast=function(msg,type="info"){
    let el=document.getElementById("bmk-toast");
    if(!el){
      el=document.createElement("div");
      el.id="bmk-toast";
      el.style.cssText="position:fixed;right:18px;bottom:18px;z-index:99999;padding:12px 16px;border-radius:12px;background:#111827;color:#fff;box-shadow:0 10px 30px #0003;font:500 14px system-ui";
      document.body.appendChild(el);
    }
    el.textContent=msg;
    el.style.background=type==="error"?"#b91c1c":type==="success"?"#15803d":"#111827";
    clearTimeout(el._t);el._t=setTimeout(()=>el.remove(),3500);
  };

  // Modern confirmation dialog used by all Admin delete actions.
  // Returns Promise<boolean> and replaces missing/unsupported BMK.confirm calls.
  BMK.confirm=function(message,title="Konfirmasi Penghapusan"){
    return new Promise(resolve=>{
      const old=document.getElementById("bmk-confirm-overlay");
      if(old)old.remove();
      const overlay=document.createElement("div");
      overlay.id="bmk-confirm-overlay";
      overlay.style.cssText="position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(15,23,42,.58);backdrop-filter:blur(4px);font-family:system-ui,-apple-system,Segoe UI,sans-serif";
      const box=document.createElement("div");
      box.style.cssText="width:min(420px,100%);background:#fff;border-radius:18px;padding:24px;box-shadow:0 24px 70px rgba(0,0,0,.25);transform:translateY(0);animation:bmkConfirmIn .18s ease-out";
      const style=document.createElement("style");
      style.textContent="@keyframes bmkConfirmIn{from{opacity:0;transform:translateY(8px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}";
      document.head.appendChild(style);
      box.innerHTML=`<div style="width:46px;height:46px;border-radius:14px;background:#fee2e2;display:flex;align-items:center;justify-content:center;font-size:22px;margin-bottom:14px">🗑️</div><div style="font-size:19px;font-weight:700;color:#0f172a;margin-bottom:8px"></div><div style="font-size:14px;line-height:1.55;color:#64748b;margin-bottom:22px"></div><div style="display:flex;justify-content:flex-end;gap:10px"><button type="button" data-bmk-cancel style="border:1px solid #cbd5e1;background:#fff;color:#334155;border-radius:10px;padding:10px 16px;font-weight:600;cursor:pointer">Batal</button><button type="button" data-bmk-ok style="border:0;background:#dc2626;color:#fff;border-radius:10px;padding:10px 16px;font-weight:700;cursor:pointer">Ya, Hapus</button></div>`;
      box.children[1].textContent=title;
      box.children[2].textContent=String(message||"Data ini akan dihapus. Lanjutkan?");
      overlay.appendChild(box);
      document.body.appendChild(overlay);
      const finish=value=>{overlay.remove();style.remove();resolve(value)};
      box.querySelector("[data-bmk-cancel]").onclick=()=>finish(false);
      box.querySelector("[data-bmk-ok]").onclick=()=>finish(true);
      overlay.addEventListener("click",e=>{if(e.target===overlay)finish(false)});
      const key=e=>{if(e.key==="Escape"){document.removeEventListener("keydown",key);finish(false)}else if(e.key==="Enter"){document.removeEventListener("keydown",key);finish(true)}};
      document.addEventListener("keydown",key);
    });
  };

  BMK.requireAuth=async function(roles){
    if(!sb)return true;
    try{
      const result=await sb.auth.getSession();
      const session=result?.data?.session;
      if(result?.error)throw result.error;
      if(!session){ location.replace(login()); return false; }

      const {data:p,error}=await sb.from("profiles")
        .select("role,nama,email").eq("id",session.user.id).maybeSingle();
      if(error)throw error;
      const role=p?.role||"editor";
      BMK.profile=p||{role};
      BMK.currentRole=role;
      BMK.applyMenuPermissions(role);

      const page=(location.pathname.split("/").pop()||"index.html").toLowerCase();
      const pageMap={
        "index.html":"dashboard","keluarga.html":"keluarga","silsilah.html":"silsilah",
        "reuni.html":"reuni","pendaftaran.html":"pendaftaran","galeri.html":"galeri",
        "berita.html":"berita","agenda.html":"agenda","kas.html":"kas",
        "pengguna.html":"pengguna","pengaturan.html":"pengaturan"
      };
      const pageKey=pageMap[page];
      if(pageKey && !BMK.hasPermission(role,pageKey)){
        BMK.toast("Role "+(BMK.ROLE_LABELS[role]||role)+" tidak memiliki akses ke menu ini.","error");
        setTimeout(()=>location.replace(new URL("/admin/index.html",location.origin).href),700);
        return false;
      }
      if(Array.isArray(roles)&&roles.length && !roles.includes(role)){
        BMK.toast("Role Anda tidak diizinkan membuka halaman ini.","error");
        setTimeout(()=>location.replace(new URL("/admin/index.html",location.origin).href),700);
        return false;
      }
      return true;
    }catch(err){
      console.error("[BMK] requireAuth:",err);
      BMK.toast("Supabase gagal memeriksa sesi. Silakan login kembali.","error");
      setTimeout(()=>location.replace(login()),900);
      return false;
    }
  };

  BMK.createUserBySuperAdmin=async function(payload){
    if(!sb)throw new Error("Supabase belum dikonfigurasi.");
    const {data:{session}}=await sb.auth.getSession();
    if(!session)throw new Error("Sesi Super Admin tidak ditemukan.");
    const res=await fetch(new URL("/functions/v1/create-user",sb.supabaseUrl).href,{
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        "Authorization":"Bearer "+session.access_token,
        "apikey":String((window.BMK_SUPABASE||{}).anonKey||"")
      },
      body:JSON.stringify(payload)
    });
    let body={};try{body=await res.json()}catch(e){}
    if(!res.ok)throw new Error(body.error||"Gagal membuat pengguna.");
    return body;
  };

  BMK.signOut=async function(){
    if(BMK._loggingOut)return;
    BMK._loggingOut=true;
    try{
      if(sb)await sb.auth.signOut({scope:"local"});
    }catch(e){console.warn("[BMK] signOut:",e)}
    finally{
      try{localStorage.removeItem("bmk_session")}catch(e){}
      try{localStorage.removeItem("bmk_admin")}catch(e){}
      try{sessionStorage.clear()}catch(e){}
      location.replace(home());
    }
  };

  BMK.file={
    async upload(file,folder="general"){
      if(!sb)throw new Error("Supabase belum dikonfigurasi.");
      const ext=(file.name.split(".").pop()||"bin").toLowerCase();
      const path=`${folder}/${crypto.randomUUID()}.${ext}`;
      const {error}=await sb.storage.from("bmk-media").upload(path,file,{upsert:false,contentType:file.type||undefined});
      if(error)throw error;
      return {path,url:sb.storage.from("bmk-media").getPublicUrl(path).data.publicUrl};
    },
    async remove(path){
      if(!sb||!path)return;
      const {error}=await sb.storage.from("bmk-media").remove([path]);
      if(error)throw error;
    }
  };

  BMK.db={
    async get(table,order="created_at",ascending=false){
      if(!sb)throw new Error("Supabase belum dikonfigurasi.");
      const {data,error}=await sb.from(table).select("*").order(order,{ascending});
      if(error)throw error;return data||[];
    },
    async insert(table,row){
      if(!sb)throw new Error("Supabase belum dikonfigurasi.");
      const {data,error}=await sb.from(table).insert(row).select().single();
      if(error)throw error;return data;
    },
    async update(table,id,row){
      if(!sb)throw new Error("Supabase belum dikonfigurasi.");
      const {data,error}=await sb.from(table).update(row).eq("id",id).select().single();
      if(error)throw error;return data;
    },
    async remove(table,id){
      if(!sb)throw new Error("Supabase belum dikonfigurasi.");
      const {error}=await sb.from(table).delete().eq("id",id);
      if(error)throw error;
    }
  };

  BMK.crud={
    async list(table,opts={}){
      if(!sb)throw new Error("Supabase belum dikonfigurasi.");
      let q=sb.from(table).select(opts.select||"*");
      if(opts.order)q=q.order(opts.order.column,{ascending:opts.order.ascending!==false});
      if(opts.limit)q=q.limit(opts.limit);
      if(opts.eq)for(const[k,v]of Object.entries(opts.eq))q=q.eq(k,v);
      return q;
    },
    async insert(table,row){if(!sb)throw new Error("Supabase belum dikonfigurasi.");return sb.from(table).insert(row).select().single()},
    async update(table,id,row){if(!sb)throw new Error("Supabase belum dikonfigurasi.");return sb.from(table).update(row).eq("id",id).select().single()},
    async remove(table,id){if(!sb)throw new Error("Supabase belum dikonfigurasi.");return sb.from(table).delete().eq("id",id)}
  };

  BMK.renderMode=()=>document.querySelectorAll("[data-bmk-mode]")
    .forEach(el=>el.textContent=BMK.cloud?"☁️ Supabase":"⚠️ Supabase belum dikonfigurasi");

  document.addEventListener("DOMContentLoaded",()=>{
    BMK.renderMode();
    if(sb)sb.auth.getSession().then(({data})=>{
      document.querySelectorAll("[data-bmk-user]").forEach(el=>el.textContent=data?.session?.user?.email||"");
    }).catch(()=>{});
  });
})();
