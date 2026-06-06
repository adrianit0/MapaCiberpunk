create extension if not exists pgcrypto with schema extensions;

insert into storage.buckets (id, name, public)
values ('lancer-mapa', 'lancer-mapa', true)
on conflict (id) do update
set public = excluded.public;

create or replace function public.has_role(required_roles text[])
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profile_rol pr
    join public.rol r on r.id = pr.rol_id
    where pr.user_id = auth.uid()
      and (pr.date_end is null or pr.date_end >= current_date)
      and lower(r.name) = any(required_roles)
  );
$$;

create table if not exists public.lancer_maps (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  name text not null,
  image_path text not null,
  image_url text,
  image_width integer not null default 1600,
  image_height integer not null default 1000,
  grid_origin_x numeric not null default 0,
  grid_origin_y numeric not null default 0,
  hex_size numeric not null default 52,
  grid_rotation numeric not null default 0,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint lancer_maps_name_not_blank check (length(trim(name)) > 0),
  constraint lancer_maps_image_path_not_blank check (length(trim(image_path)) > 0),
  constraint lancer_maps_image_width_positive check (image_width > 0),
  constraint lancer_maps_image_height_positive check (image_height > 0),
  constraint lancer_maps_hex_size_positive check (hex_size > 0)
);

alter table public.lancer_maps
  add column if not exists grid_rotation numeric not null default 0;

create unique index if not exists lancer_maps_one_active_idx
on public.lancer_maps (is_active)
where is_active;

create index if not exists lancer_maps_created_at_idx
on public.lancer_maps (created_at desc);

create table if not exists public.lancer_characters (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  name text not null,
  image_path text not null,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint lancer_characters_name_not_blank check (length(trim(name)) > 0),
  constraint lancer_characters_image_path_not_blank check (length(trim(image_path)) > 0)
);

create index if not exists lancer_characters_created_at_idx
on public.lancer_characters (created_at desc);

create table if not exists public.lancer_map_tokens (
  id uuid primary key default gen_random_uuid(),
  map_id uuid not null references public.lancer_maps(id) on delete cascade,
  character_id uuid not null references public.lancer_characters(id) on delete cascade,
  q integer not null,
  r integer not null,
  label text,
  created_by uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint lancer_map_tokens_map_character_unique unique (map_id, character_id)
);

create index if not exists lancer_map_tokens_map_id_idx
on public.lancer_map_tokens (map_id);

create index if not exists lancer_map_tokens_character_id_idx
on public.lancer_map_tokens (character_id);

drop trigger if exists set_lancer_maps_updated_at on public.lancer_maps;
create trigger set_lancer_maps_updated_at
before update on public.lancer_maps
for each row
execute function public.set_updated_at();

drop trigger if exists set_lancer_characters_updated_at on public.lancer_characters;
create trigger set_lancer_characters_updated_at
before update on public.lancer_characters
for each row
execute function public.set_updated_at();

drop trigger if exists set_lancer_map_tokens_updated_at on public.lancer_map_tokens;
create trigger set_lancer_map_tokens_updated_at
before update on public.lancer_map_tokens
for each row
execute function public.set_updated_at();

alter table public.lancer_maps enable row level security;
alter table public.lancer_characters enable row level security;
alter table public.lancer_map_tokens enable row level security;

revoke all on table public.lancer_maps from anon;
revoke all on table public.lancer_maps from authenticated;
revoke all on table public.lancer_characters from anon;
revoke all on table public.lancer_characters from authenticated;
revoke all on table public.lancer_map_tokens from anon;
revoke all on table public.lancer_map_tokens from authenticated;

grant select on table public.lancer_maps to authenticated;
grant select on table public.lancer_characters to authenticated;
grant select on table public.lancer_map_tokens to authenticated;
grant insert, update, delete on table public.lancer_maps to authenticated;
grant insert, update, delete on table public.lancer_characters to authenticated;
grant insert, update, delete on table public.lancer_map_tokens to authenticated;

drop policy if exists "Authenticated users can read lancer maps" on public.lancer_maps;
create policy "Authenticated users can read lancer maps"
on public.lancer_maps
for select
to authenticated
using (auth.uid() is not null);

drop policy if exists "Admins and masters can write lancer maps" on public.lancer_maps;
create policy "Admins and masters can write lancer maps"
on public.lancer_maps
for all
to authenticated
using (public.has_role(array['admin', 'master']))
with check (public.has_role(array['admin', 'master']));

drop policy if exists "Authenticated users can read lancer characters" on public.lancer_characters;
create policy "Authenticated users can read lancer characters"
on public.lancer_characters
for select
to authenticated
using (auth.uid() is not null);

drop policy if exists "Admins and masters can write lancer characters" on public.lancer_characters;
create policy "Admins and masters can write lancer characters"
on public.lancer_characters
for all
to authenticated
using (public.has_role(array['admin', 'master']))
with check (public.has_role(array['admin', 'master']));

drop policy if exists "Authenticated users can read lancer tokens" on public.lancer_map_tokens;
create policy "Authenticated users can read lancer tokens"
on public.lancer_map_tokens
for select
to authenticated
using (auth.uid() is not null);

drop policy if exists "Admins and masters can write lancer tokens" on public.lancer_map_tokens;
create policy "Admins and masters can write lancer tokens"
on public.lancer_map_tokens
for all
to authenticated
using (public.has_role(array['admin', 'master']))
with check (public.has_role(array['admin', 'master']));

drop policy if exists "Authenticated users can read lancer storage" on storage.objects;
create policy "Authenticated users can read lancer storage"
on storage.objects
for select
to authenticated
using (bucket_id = 'lancer-mapa');

drop policy if exists "Admins and masters can upload lancer storage" on storage.objects;
create policy "Admins and masters can upload lancer storage"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'lancer-mapa' and public.has_role(array['admin', 'master']));

drop policy if exists "Admins and masters can update lancer storage" on storage.objects;
create policy "Admins and masters can update lancer storage"
on storage.objects
for update
to authenticated
using (bucket_id = 'lancer-mapa' and public.has_role(array['admin', 'master']))
with check (bucket_id = 'lancer-mapa' and public.has_role(array['admin', 'master']));

drop policy if exists "Admins and masters can delete lancer storage" on storage.objects;
create policy "Admins and masters can delete lancer storage"
on storage.objects
for delete
to authenticated
using (bucket_id = 'lancer-mapa' and public.has_role(array['admin', 'master']));

notify pgrst, 'reload schema';
