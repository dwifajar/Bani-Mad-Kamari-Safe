BANI MAD KAMARI — CLEAN RELEASE V4

PERBAIKAN TERAKHIR:
- Login, routing admin, dashboard, dan logout tetap seperti V3.
- Nama pada header dashboard tidak lagi menampilkan email.
- Jika profil super_admin memiliki nama kosong atau nama sama dengan email,
  dashboard menampilkan "Administrator".
- Role admin menampilkan "Admin".
- Role editor menampilkan "Editor".
- Jika profil memiliki nama asli yang berbeda dari email, nama tersebut tetap
  digunakan.

File yang berubah:
- admin/index.html

Upload:
Timpa admin/index.html pada project GitHub yang sedang berjalan.
Tidak perlu mengubah Supabase atau database.

Setelah deploy:
Dashboard harus menampilkan:
"Selamat datang, Administrator"
untuk akun super_admin.


=== V8 — KONFIRMASI EMAIL & HAK AKSES ===
1. Admin membuat pengguna dari menu Pengguna & Hak Akses.
2. Sistem mengirim email konfirmasi ke alamat pengguna.
3. Link email mengarah kembali ke /login.html?confirmed=1.
4. Setelah konfirmasi berhasil, halaman login menampilkan pesan sukses.
5. Saat login, sistem membaca role dari profiles: super_admin, admin, atau editor, lalu menampilkan hak akses tersebut sebelum membuka dashboard.
6. Di Supabase Authentication > URL Configuration, pastikan Site URL adalah domain website dan Redirect URL mencakup:
   https://banimadkamari.vercel.app/login.html
7. Pastikan Email Confirmations aktif jika ingin verifikasi email wajib.
