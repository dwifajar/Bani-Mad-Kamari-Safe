/* BANI MAD KAMARI — Web Push client V14.47.1
   Fix: better diagnostics + robust registration/subscription flow.
*/
(function(){
  'use strict';

  const C=window.BMK_PUSH_CONFIG||{};
  const cfg=window.BMK_SUPABASE||{};
  const supported=('serviceWorker' in navigator)&&('PushManager' in window)&&('Notification' in window)&&!!cfg.url&&!!cfg.anonKey;

  function setState(state,msg){
    document.querySelectorAll('[data-bmk-push-status]').forEach(el=>{el.textContent=msg||'';el.dataset.state=state||''});
    document.querySelectorAll('[data-bmk-push]').forEach(btn=>{
      btn.dataset.state=state||'';
      btn.disabled=state==='busy';
    });
  }
  function isIOS(){return /iphone|ipad|ipod/i.test(navigator.userAgent)||(/macintosh/i.test(navigator.userAgent)&&'ontouchend' in document)}
  function isStandalone(){return window.matchMedia?.('(display-mode: standalone)')?.matches||window.navigator.standalone===true}
  function b64ToUint8Array(base64){
    const pad='='.repeat((4-base64.length%4)%4);
    const raw=atob((base64+pad).replace(/-/g,'+').replace(/_/g,'/'));
    const out=new Uint8Array(raw.length);
    for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);
    return out;
  }
  function fmtError(prefix, err){
    const msg=String(err?.message||err||'').trim();
    return msg ? `${prefix}: ${msg}` : prefix;
  }
  async function readResponse(res){
    const text=await res.text();
    let body={};
    try{body=text?JSON.parse(text):{}}catch{body={raw:text}};
    return {body,text};
  }
  async function getPublicKey(){
    const url=new URL(C.functionPath||'/functions/v1/push-public-key',cfg.url).href;
    let res;
    try{
      res=await fetch(url,{method:'GET',headers:{'Accept':'application/json','apikey':String(cfg.anonKey||'')},cache:'no-store'});
    }catch(e){
      throw new Error(`Gagal terhubung ke push-public-key (${url}). ${e?.message||'Periksa koneksi/URL Edge Function.'}`);
    }
    const {body,text}=await readResponse(res);
    if(!res.ok){
      const detail=body?.error||body?.message||text||`HTTP ${res.status}`;
      throw new Error(`Edge Function push-public-key gagal (${res.status}): ${detail}`);
    }
    if(!body?.publicKey)throw new Error('push-public-key aktif tetapi tidak mengembalikan publicKey. Periksa Logs Edge Function.');
    return String(body.publicKey);
  }
  async function saveSubscription(sub){
    const json=sub.toJSON();
    if(!json?.endpoint||!json?.keys?.p256dh||!json?.keys?.auth){
      throw new Error('Browser tidak mengembalikan data subscription yang lengkap.');
    }
    const sb=window.supabase.createClient(cfg.url,cfg.anonKey);
    const {error}=await sb.rpc(C.registerRpc||'register_push_subscription',{
      p_endpoint:json.endpoint,
      p_p256dh:json.keys.p256dh,
      p_auth:json.keys.auth,
      p_user_agent:navigator.userAgent.slice(0,500)
    });
    if(error)throw new Error(`Supabase RPC register_push_subscription gagal: ${error.message||error.code||'unknown error'}`);
  }
  async function ensureSubscription(){
    if(!supported)throw new Error('Browser ini belum mendukung Web Push. Gunakan Chrome/Edge/Firefox/Safari modern melalui HTTPS.');
    if(location.protocol!=='https:' && location.hostname!=='localhost')throw new Error('Website harus dibuka melalui HTTPS agar notifikasi HP dapat diaktifkan.');
    if(isIOS()&&!isStandalone()){
      throw new Error('iPhone/iPad: tambahkan BANI MAD KAMARI ke Layar Utama terlebih dahulu, lalu buka dari ikon aplikasi.');
    }
    const registration=await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});
    await navigator.serviceWorker.ready;
    if(Notification.permission!=='granted'){
      const p=await Notification.requestPermission();
      if(p!=='granted')throw new Error(`Izin notifikasi belum diberikan (status: ${p}).`);
    }
    let sub=await registration.pushManager.getSubscription();
    if(!sub){
      const publicKey=await getPublicKey();
      let key;
      try{key=b64ToUint8Array(publicKey)}catch{throw new Error('VAPID public key dari Edge Function tidak valid.');}
      sub=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key});
    }
    await saveSubscription(sub);
    return sub;
  }
  async function syncExisting(){
    if(!supported||Notification.permission!=='granted')return false;
    if(isIOS()&&!isStandalone())return false;
    try{
      const reg=await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});
      const sub=await reg.pushManager.getSubscription();
      if(!sub)return false;
      await saveSubscription(sub);
      return true;
    }catch(e){console.warn('[BMK Push] sync:',e);return false}
  }
  async function handleClick(){
    try{
      setState('busy','Mengaktifkan notifikasi HP…');
      await ensureSubscription();
      setState('on','✅ Notifikasi HP aktif. Pengumuman baru akan dikirim otomatis.');
      document.querySelectorAll('[data-bmk-push]').forEach(btn=>{btn.textContent='✅ Notifikasi HP Aktif';btn.disabled=false});
    }catch(e){
      console.error('[BMK Push]',e);
      const msg=String(e?.message||e||'');
      setState('error',fmtError('Aktivasi gagal',msg));
      document.querySelectorAll('[data-bmk-push]').forEach(btn=>{btn.disabled=false;});
    }
  }
  function init(){
    const buttons=[...document.querySelectorAll('[data-bmk-push]')];
    const statuses=[...document.querySelectorAll('[data-bmk-push-status]')];
    if(!buttons.length&&!statuses.length)return;
    if(!supported){
      setState('unsupported','Browser ini belum mendukung notifikasi push. Gunakan browser modern melalui HTTPS.');
      buttons.forEach(b=>b.style.display='none');
      return;
    }
    if(isIOS()&&!isStandalone()){
      setState('ios-home','Di iPhone/iPad, tambahkan website ke Layar Utama terlebih dahulu.');
    }else if(Notification.permission==='denied'){
      setState('blocked','Notifikasi diblokir. Aktifkan izin notifikasi di pengaturan browser/HP.');
    }else if(Notification.permission==='granted'){
      setState('ready','Memeriksa pendaftaran perangkat…');
      syncExisting().then(ok=>{if(ok){setState('on','✅ Notifikasi HP aktif. Pengumuman baru akan dikirim otomatis.');buttons.forEach(btn=>btn.textContent='✅ Notifikasi HP Aktif')}else{setState('idle','Notifikasi sudah diizinkan, tetapi perangkat belum terdaftar. Tekan tombol untuk mendaftar.')}});
    }else{
      setState('idle','Aktifkan agar pengumuman reuni masuk langsung ke HP.');
    }
    buttons.forEach(btn=>btn.addEventListener('click',handleClick,{passive:true}));
  }
  window.BMK_PUSH={supported,ensureSubscription,syncExisting};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
