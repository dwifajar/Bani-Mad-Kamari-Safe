/* BANI MAD KAMARI — Web Push client V14.47
   Uses the existing PWA service worker + Supabase RPC.
*/
(function(){
  'use strict';

  const C=window.BMK_PUSH_CONFIG||{};
  const cfg=window.BMK_SUPABASE||{};
  const supported=('serviceWorker' in navigator)&&('PushManager' in window)&&('Notification' in window)&&!!cfg.url&&!!cfg.anonKey;

  function $(s){return document.querySelector(s)}
  function isIOS(){return /iphone|ipad|ipod/i.test(navigator.userAgent)||(/macintosh/i.test(navigator.userAgent)&&'ontouchend' in document)}
  function isStandalone(){return window.matchMedia?.('(display-mode: standalone)')?.matches||window.navigator.standalone===true}
  function setState(state,msg){
    document.querySelectorAll('[data-bmk-push-status]').forEach(el=>{el.textContent=msg||'';el.dataset.state=state||''});
    document.querySelectorAll('[data-bmk-push]').forEach(btn=>{
      btn.dataset.state=state||'';
      if(state==='busy')btn.disabled=true;
      else btn.disabled=false;
    });
  }
  function humanError(err){
    const m=String(err?.message||err||'').toLowerCase();
    if(m.includes('permission')&&Notification.permission==='denied')return 'Notifikasi diblokir. Aktifkan izin notifikasi untuk BANI MAD KAMARI di pengaturan browser/HP.';
    if(m.includes('failed to fetch')||m.includes('network'))return 'Koneksi ke layanan notifikasi gagal. Periksa internet lalu coba lagi.';
    return 'Notifikasi HP belum berhasil diaktifkan. Silakan coba lagi.';
  }
  function b64ToUint8Array(base64){
    const pad='='.repeat((4-base64.length%4)%4);
    const raw=atob((base64+pad).replace(/-/g,'+').replace(/_/g,'/'));
    const out=new Uint8Array(raw.length);
    for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);
    return out;
  }
  async function getPublicKey(){
    const url=new URL(C.functionPath||'/functions/v1/push-public-key',cfg.url).href;
    const res=await fetch(url,{method:'GET',headers:{'apikey':cfg.anonKey,'Accept':'application/json'},cache:'no-store'});
    const body=await res.json().catch(()=>({}));
    if(!res.ok||!body.publicKey)throw new Error(body.error||'Kunci notifikasi belum tersedia.');
    return body.publicKey;
  }
  async function saveSubscription(sub){
    const json=sub.toJSON();
    const sb=window.supabase.createClient(cfg.url,cfg.anonKey);
    const {error}=await sb.rpc(C.registerRpc||'register_push_subscription',{
      p_endpoint:json.endpoint,
      p_p256dh:json.keys?.p256dh||'',
      p_auth:json.keys?.auth||'',
      p_user_agent:navigator.userAgent.slice(0,500)
    });
    if(error)throw error;
  }
  async function ensureSubscription(){
    if(!supported)throw new Error('Browser ini belum mendukung Web Push.');
    if(isIOS()&&!isStandalone()){
      throw new Error('iOS/iPad: tambahkan BANI MAD KAMARI ke Layar Utama terlebih dahulu, lalu buka dari ikon aplikasi untuk mengaktifkan notifikasi.');
    }
    const registration=await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});
    await navigator.serviceWorker.ready;
    if(Notification.permission!=='granted'){
      const p=await Notification.requestPermission();
      if(p!=='granted')throw new Error('Izin notifikasi belum diberikan.');
    }
    let sub=await registration.pushManager.getSubscription();
    if(!sub){
      const publicKey=await getPublicKey();
      sub=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64ToUint8Array(publicKey)});
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
      setState('error',humanError(e));
      document.querySelectorAll('[data-bmk-push-status]').forEach(el=>{if(String(e.message||'').startsWith('iOS/iPad'))el.textContent=e.message});
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
      setState('ready','Tekan tombol untuk memastikan perangkat terdaftar.');
      syncExisting().then(ok=>{if(ok){setState('on','✅ Notifikasi HP aktif. Pengumuman baru akan dikirim otomatis.');buttons.forEach(btn=>btn.textContent='✅ Notifikasi HP Aktif')}});
    }else{
      setState('idle','Aktifkan agar pengumuman reuni masuk langsung ke HP.');
    }
    buttons.forEach(btn=>btn.addEventListener('click',handleClick,{passive:true}));
  }
  window.BMK_PUSH={supported,ensureSubscription,syncExisting};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
