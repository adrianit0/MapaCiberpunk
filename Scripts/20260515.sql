create extension if not exists pgcrypto with schema extensions;

create table if not exists public.dice_rolls (
  id uuid primary key default gen_random_uuid(),
  "userId" uuid not null default auth.uid() references auth.users(id) on delete cascade,
  preset_id text not null,
  preset_label text not null,
  roll_mode text not null,
  formula text not null,
  counts jsonb not null default '{}'::jsonb,
  bonus integer not null default 0,
  groups jsonb not null default '[]'::jsonb,
  total integer not null,
  breakdown text,
  result_type text,
  rolled_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint dice_rolls_counts_is_object check (jsonb_typeof(counts) = 'object'),
  constraint dice_rolls_groups_is_array check (jsonb_typeof(groups) = 'array'),
  constraint dice_rolls_result_type_check check (
    result_type is null
    or result_type in ('max-all', 'min-all', 'max-some', 'min-some')
  )
);

comment on table public.dice_rolls is 'Historial publico de tiradas de dados para usuarios autenticados.';
comment on column public.dice_rolls."userId" is 'Usuario autenticado que realizo la tirada.';
comment on column public.dice_rolls.counts is 'Cantidad de dados seleccionada por id de dado, por ejemplo {"d20": 1}.';
comment on column public.dice_rolls.groups is 'Detalle completo de grupos generados por la tirada, incluyendo dado, cantidad, resultados y subtotal.';

create index if not exists dice_rolls_user_id_idx on public.dice_rolls ("userId");
create index if not exists dice_rolls_rolled_at_idx on public.dice_rolls (rolled_at desc);
create index if not exists dice_rolls_counts_gin_idx on public.dice_rolls using gin (counts);
create index if not exists dice_rolls_groups_gin_idx on public.dice_rolls using gin (groups);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_dice_rolls_updated_at on public.dice_rolls;
create trigger set_dice_rolls_updated_at
before update on public.dice_rolls
for each row
execute function public.set_updated_at();

alter table public.dice_rolls enable row level security;

revoke all on table public.dice_rolls from anon;
revoke all on table public.dice_rolls from authenticated;

grant select, insert, update, delete on table public.dice_rolls to authenticated;

drop policy if exists "Authenticated users can read dice rolls" on public.dice_rolls;
create policy "Authenticated users can read dice rolls"
on public.dice_rolls
for select
to authenticated
using (auth.uid() is not null);

drop policy if exists "Authenticated users can insert their dice rolls" on public.dice_rolls;
create policy "Authenticated users can insert their dice rolls"
on public.dice_rolls
for insert
to authenticated
with check ("userId" = auth.uid());

drop policy if exists "Authenticated users can update dice rolls" on public.dice_rolls;
create policy "Authenticated users can update dice rolls"
on public.dice_rolls
for update
to authenticated
using (auth.uid() is not null)
with check ("userId" = auth.uid());

drop policy if exists "Authenticated users can delete dice rolls" on public.dice_rolls;
create policy "Authenticated users can delete dice rolls"
on public.dice_rolls
for delete
to authenticated
using (auth.uid() is not null);

-- Migracion posterior: dice_rolls.userId debe apuntar a profiles.id, no a auth.users.id.
alter table public.dice_rolls
  drop constraint if exists "dice_rolls_userId_fkey";

alter table public.dice_rolls
  drop constraint if exists dice_rolls_user_id_profiles_fkey;

alter table public.dice_rolls
  add constraint dice_rolls_user_id_profiles_fkey
  foreign key ("userId")
  references public.profiles(id)
  on delete cascade;
