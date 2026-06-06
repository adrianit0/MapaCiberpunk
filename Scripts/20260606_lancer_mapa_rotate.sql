alter table public.lancer_maps
  add column if not exists grid_rotation numeric not null default 0;

comment on column public.lancer_maps.grid_rotation is 'Rotacion en grados de la rejilla hexagonal respecto al origen configurado.';

notify pgrst, 'reload schema';
