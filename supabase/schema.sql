-- BANI MAD KAMARI - SUPABASE FINAL SCHEMA
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nama text,
  role text not null default 'editor' check (role in ('super_admin','admin','editor')),
  created_at timestamptz not null default now()
);

create table if not exists public.anggota_keluarga (
 id uuid primary key default gen_random_uuid(),
 nama text not null, panggilan text, gender text, generasi integer,
 tempat_lahir text, tanggal_lahir date, hp text, email text, alamat text,
 ayah_id uuid references public.anggota_keluarga(id) on delete set null,
 ibu_id uuid references public.anggota_keluarga(id) on delete set null,
 pasangan_id uuid references public.anggota_keluarga(id) on delete set null,
 bio text, foto_url text, foto_path text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.agenda (
 id uuid primary key default gen_random_uuid(), judul text not null, tanggal date, waktu text,
 tempat text, keterangan text, created_at timestamptz not null default now()
);
create table if not exists public.rsvp (
 id uuid primary key default gen_random_uuid(), nama text not null,
 status text default 'hadir', jumlah integer default 1, hp text, catatan text,
 anggota_id uuid references public.anggota_keluarga(id) on delete set null,
 created_at timestamptz not null default now()
);
create table if not exists public.galeri (
 id uuid primary key default gen_random_uuid(), judul text, image_url text not null,
 image_path text, keterangan text, created_at timestamptz not null default now()
);
create table if not exists public.berita (
 id uuid primary key default gen_random_uuid(), judul text not null, isi text, tanggal date default current_date,
 gambar_url text, gambar_path text, published boolean default false,
 created_at timestamptz not null default now()
);
create table if not exists public.kas (
 id uuid primary key default gen_random_uuid(), tanggal date default current_date,
 jenis text not null check (jenis in ('masuk','keluar')), keterangan text, nominal numeric(15,2) not null,
 created_at timestamptz not null default now()
);
create table if not exists public.pengaturan (
 id integer primary key default 1, nama_keluarga text, deskripsi text, logo_url text, logo_path text,
 updated_at timestamptz not null default now()
);
insert into public.pengaturan(id,nama_keluarga,deskripsi) values(1,'BANI MAD KAMARI','Website keluarga Bani Mad Kamari')
on conflict(id) do nothing;

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at=now(); return new; end $$;
drop trigger if exists trg_anggota_updated on public.anggota_keluarga;
create trigger trg_anggota_updated before update on public.anggota_keluarga for each row execute function public.set_updated_at();

create or replace function public.is_admin() returns boolean
language sql security definer set search_path=public stable as $$
 select exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('admin','super_admin'));
$$;
create or replace function public.is_editor() returns boolean
language sql security definer set search_path=public stable as $$
 select exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('editor','admin','super_admin'));
$$;

alter table public.profiles enable row level security;
alter table public.anggota_keluarga enable row level security;
alter table public.agenda enable row level security;
alter table public.rsvp enable row level security;
alter table public.galeri enable row level security;
alter table public.berita enable row level security;
alter table public.kas enable row level security;
alter table public.pengaturan enable row level security;

drop policy if exists profiles_self on public.profiles;
create policy profiles_self on public.profiles for select using (id=auth.uid() or public.is_admin());

drop policy if exists family_public_read on public.anggota_keluarga;
create policy family_public_read on public.anggota_keluarga for select using (true);
drop policy if exists family_staff_write on public.anggota_keluarga;
create policy family_staff_write on public.anggota_keluarga for all using (public.is_editor()) with check (public.is_editor());

drop policy if exists agenda_public_read on public.agenda;
create policy agenda_public_read on public.agenda for select using (true);
drop policy if exists agenda_staff_write on public.agenda;
create policy agenda_staff_write on public.agenda for all using (public.is_editor()) with check (public.is_editor());

drop policy if exists rsvp_public_insert on public.rsvp;
create policy rsvp_public_insert on public.rsvp for insert with check (true);
drop policy if exists rsvp_admin_all on public.rsvp;
create policy rsvp_admin_all on public.rsvp for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists gallery_public_read on public.galeri;
create policy gallery_public_read on public.galeri for select using (true);
drop policy if exists gallery_staff_write on public.galeri;
create policy gallery_staff_write on public.galeri for all using (public.is_editor()) with check (public.is_editor());

drop policy if exists news_public_read on public.berita;
create policy news_public_read on public.berita for select using (published=true or public.is_editor());
drop policy if exists news_staff_write on public.berita;
create policy news_staff_write on public.berita for all using (public.is_editor()) with check (public.is_editor());

drop policy if exists kas_admin_all on public.kas;
create policy kas_admin_all on public.kas for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists settings_public_read on public.pengaturan;
create policy settings_public_read on public.pengaturan for select using (true);
drop policy if exists settings_admin_write on public.pengaturan;
create policy settings_admin_write on public.pengaturan for all using (public.is_admin()) with check (public.is_admin());

-- Auth profile trigger
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path=public as $$
begin
 insert into public.profiles(id,nama,role) values(new.id,coalesce(new.raw_user_meta_data->>'nama',new.email),'editor')
 on conflict(id) do nothing;
 return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Storage
insert into storage.buckets(id,name,public) values('bmk-media','bmk-media',true)
on conflict(id) do update set public=true;
drop policy if exists bmk_media_read on storage.objects;
create policy bmk_media_read on storage.objects for select using (bucket_id='bmk-media');
drop policy if exists bmk_media_insert on storage.objects;
create policy bmk_media_insert on storage.objects for insert to authenticated with check (bucket_id='bmk-media' and public.is_editor());
drop policy if exists bmk_media_update on storage.objects;
create policy bmk_media_update on storage.objects for update to authenticated using (bucket_id='bmk-media' and public.is_editor()) with check (bucket_id='bmk-media' and public.is_editor());
drop policy if exists bmk_media_delete on storage.objects;
create policy bmk_media_delete on storage.objects for delete to authenticated using (bucket_id='bmk-media' and public.is_editor());

drop policy if exists profiles_admin_write on public.profiles;
create policy profiles_admin_write on public.profiles for update using (public.is_admin()) with check (public.is_admin());

-- Optional public-safe balance function. It exposes only the current balance, not transaction rows.
create or replace function public.kas_public_balance()
returns numeric
language sql
security definer
set search_path=public
stable
as $$
  select coalesce(sum(case when jenis='masuk' then nominal else -nominal end),0)
  from public.kas;
$$;
