-- El Perro — base de datos de jugadores (Supabase / PostgreSQL)
-- Cómo usarlo: en tu proyecto de Supabase, abre «SQL Editor», pega todo este archivo y pulsa «Run».
-- Crea una tabla con una fila por jugador (su nombre y su progreso) y las reglas para que
-- cada uno solo pueda leer y cambiar la suya.

create table if not exists public.jugadores (
  id          uuid primary key references auth.users (id) on delete cascade,
  nombre      text not null default 'Jugador' check (char_length(nombre) between 2 and 24),
  progreso    jsonb not null default '{}'::jsonb,
  creado      timestamptz not null default now(),
  actualizado timestamptz not null default now()
);

alter table public.jugadores enable row level security;

drop policy if exists "cada uno ve su ficha" on public.jugadores;
create policy "cada uno ve su ficha" on public.jugadores
  for select using (auth.uid() = id);

drop policy if exists "cada uno crea su ficha" on public.jugadores;
create policy "cada uno crea su ficha" on public.jugadores
  for insert with check (auth.uid() = id);

drop policy if exists "cada uno cambia su ficha" on public.jugadores;
create policy "cada uno cambia su ficha" on public.jugadores
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Al registrarse alguien, se le crea su ficha con el nombre que puso
create or replace function public.nuevo_jugador()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.jugadores (id, nombre)
  values (new.id, coalesce(nullif(left(trim(new.raw_user_meta_data ->> 'nombre'), 24), ''), 'Jugador'))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists al_registrarse on auth.users;
create trigger al_registrarse
  after insert on auth.users
  for each row execute procedure public.nuevo_jugador();
