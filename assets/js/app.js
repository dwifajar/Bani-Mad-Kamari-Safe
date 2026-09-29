/* BANI MAD KAMARI - Public App JS
   SAFE V14.18: countdown demo removed.
   Countdown is controlled ONLY by index.html from Supabase agenda data.
*/
const menuBtn=document.getElementById('menuBtn');
const mainNav=document.getElementById('mainNav');
if(menuBtn && mainNav){
  menuBtn.onclick=()=>mainNav.classList.toggle('open');
}
