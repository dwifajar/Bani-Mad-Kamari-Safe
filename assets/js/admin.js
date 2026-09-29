/* BANI MAD KAMARI — FINAL ADMIN LOGOUT */
(function(){
  document.addEventListener("DOMContentLoaded",function(){
    const logout=document.getElementById("logout");
    if(!logout)return;
    logout.addEventListener("click",async function(e){
      e.preventDefault();
      if(window.BMK?.signOut){
        logout.disabled=true;
        logout.textContent="Keluar...";
        await BMK.signOut();
      }else{
        location.replace(new URL("/",location.origin).href);
      }
    });
  });
})();
