create table if not exists public.menu_app_favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  app_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint menu_app_favorites_pkey primary key (user_id, app_id),
  constraint menu_app_favorites_app_id_not_blank check (length(trim(app_id)) > 0)
);

comment on table public.menu_app_favorites is 'Aplicaciones marcadas como favoritas por perfil para el menu principal.';
comment on column public.menu_app_favorites.user_id is 'Perfil propietario del favorito.';
comment on column public.menu_app_favorites.app_id is 'Identificador estable de la aplicacion del menu.';

create index if not exists menu_app_favorites_user_id_created_at_idx
on public.menu_app_favorites (user_id, created_at);

drop trigger if exists set_menu_app_favorites_updated_at on public.menu_app_favorites;
create trigger set_menu_app_favorites_updated_at
before update on public.menu_app_favorites
for each row
execute function public.set_updated_at();

alter table public.menu_app_favorites enable row level security;

revoke all on table public.menu_app_favorites from anon;
revoke all on table public.menu_app_favorites from authenticated;

grant select, insert, update, delete on table public.menu_app_favorites to authenticated;

drop policy if exists "Users can read their menu favorites" on public.menu_app_favorites;
create policy "Users can read their menu favorites"
on public.menu_app_favorites
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can insert their menu favorites" on public.menu_app_favorites;
create policy "Users can insert their menu favorites"
on public.menu_app_favorites
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Users can update their menu favorites" on public.menu_app_favorites;
create policy "Users can update their menu favorites"
on public.menu_app_favorites
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users can delete their menu favorites" on public.menu_app_favorites;
create policy "Users can delete their menu favorites"
on public.menu_app_favorites
for delete
to authenticated
using (user_id = auth.uid());
