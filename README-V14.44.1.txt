BANI MAD KAMARI — V14.44.1 NAV DASHBOARD REUNI FIX

Tujuan: membuat menu Dashboard Reuni tersedia konsisten pada sidebar halaman admin.

Isi folder admin/: file HTML admin yang diperbarui dan dashboard-reuni.html.

Pemasangan:
1. Backup folder admin di GitHub terlebih dahulu.
2. Unggah file-file dalam folder admin/ ini ke folder admin/ di repositori GitHub, pilih Replace untuk file yang namanya sama.
3. Pastikan dashboard-reuni.html ikut ditambahkan.
4. Commit dan push, lalu tunggu deployment Vercel.
5. Refresh browser dengan Ctrl+Shift+R. Menu Dashboard Reuni seharusnya terlihat di halaman admin lainnya.

Tidak ada perubahan SQL/Supabase.
Catatan: file HTML dalam patch ini berasal dari backup proyek yang tersedia dan halaman pendaftaran V14.44. Jika halaman admin lain di repositori Anda sudah memiliki perubahan setelah backup tersebut, jangan replace semua file sekaligus; gunakan hanya penyisipan tautan berikut pada setiap sidebar admin yang belum memilikinya:
<a href="dashboard-reuni.html"><span class="nav-icon">📊</span><span>Dashboard Reuni</span></a>
Letakkan setelah tautan Reuni dan sebelum Pendaftaran.
