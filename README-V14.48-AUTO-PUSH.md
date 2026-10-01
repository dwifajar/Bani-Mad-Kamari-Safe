# BANI MAD KAMARI V14.48 — AUTO PUSH

Patch ini membuat pengiriman notifikasi reuni berjalan dari server:

- Pengumuman `published` tanpa `publish_at` → push otomatis setelah data tersimpan.
- Pengumuman `published` dengan `publish_at` di masa depan → dipantau Supabase Cron setiap menit dan dikirim ketika waktunya tiba.
- Tombol `Kirim ke HP` yang sudah ada tetap boleh dipakai sebagai kirim ulang/manual.
- Tidak perlu mengganti seluruh project.

## File yang dipasang

Ganti / tambahkan hanya file berikut:

- `sw.js` (ganti)
- `supabase/config.toml` (ganti)
- `supabase/functions/auto-reuni-push/index.ts` (tambahkan)
- `supabase/functions/auto-reuni-push/deno.json` (tambahkan)
- `V14.48_AUTO_PUSH.sql` (jalankan sekali di SQL Editor)

Tidak perlu mengganti `admin/notifikasi.html`, `bmk-push.js`, `push-public-key`, atau file database lainnya.

## 1. Deploy Edge Function

Buat/Deploy function:

`auto-reuni-push`

Atur:

`Verify JWT = OFF`

Function ini hanya menerima panggilan internal yang membawa `apikey` sama dengan `SUPABASE_SERVICE_ROLE_KEY` project.

## 2. Simpan secret di Vault

Di Supabase SQL Editor, jalankan dengan nilai milik project Anda sendiri:

```sql
select vault.create_secret('https://YOUR-PROJECT-REF.supabase.co', 'bmk_project_url');
select vault.create_secret('YOUR_SERVICE_ROLE_KEY', 'bmk_service_role_key');
```

Jangan masukkan service role key ke GitHub atau file frontend.

## 3. Jalankan SQL V14.48

Buka:

`V14.48_AUTO_PUSH.sql`

Jalankan isinya sekali.

## 4. Tes pengiriman otomatis sekarang

Buat pengumuman baru dari `admin/notifikasi.html`:

- Status: `Published`
- `publish_at`: kosong

Simpan.

Server trigger akan memanggil Edge Function otomatis. Anda tidak perlu menekan `Kirim ke HP`.

## 5. Tes pengiriman terjadwal

Buat pengumuman:

- Status: `Published`
- `publish_at`: 2–3 menit dari waktu sekarang

Tidak perlu membuka halaman admin lagi. Cron mengecek setiap menit dan mengirim saat waktunya tiba.

## 6. Cek hasil otomatis

```sql
select id, judul, status, publish_at, push_sent_at,
       push_sent_count, push_failed_count, push_sending_at
from public.notifikasi_reuni
order by created_at desc
limit 20;
```

Untuk memeriksa Cron:

```sql
select jobid, jobname, schedule, active
from cron.job
where jobname='bmk-auto-reuni-push-every-minute';
```

Dan riwayat eksekusi:

```sql
select start_time, end_time, status, return_message
from cron.job_run_details
order by start_time desc
limit 10;
```

## Tentang notif Apple yang terlihat lalu hilang

Banner yang muncul di iPhone dapat berhenti tampil di layar sesuai pengaturan sistem, tetapi Apple menyediakan Notification Center untuk melihat riwayat notifikasi. Web Push untuk Home Screen web apps terintegrasi dengan Lock Screen dan Notification Center.

Patch `sw.js` menambahkan app badge saat push diterima. Jadi ketika banner sudah tidak terlihat, ikon BANI MAD KAMARI di Layar Utama dapat tetap menunjukkan ada notifikasi baru.

Cara melihat riwayat iPhone:
- Dari Layar Terkunci: geser ke atas dari tengah layar.
- Dari layar lain: geser turun dari bagian atas layar untuk membuka Notification Center.

Notifikasi yang ditekan akan membuka `notifikasi.html?id=...`.
