/* BANI MAD KAMARI — legacy login compatibility shim
   The active login flow is login.html + Supabase Auth.
   This file intentionally contains no credentials.
*/
(function () {
  const form = document.getElementById('loginForm');
  if (!form) return;

  const message = document.getElementById('loginMsg');
  if (message) {
    message.textContent = 'Silakan gunakan halaman login utama.';
    message.className = 'login-msg error';
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    const target = new URL('/login.html', location.origin).href;
    location.replace(target);
  });
})();
