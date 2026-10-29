-- El Perro — base de datos de jugadores (Supabase / PostgreSQL)
-- Cómo usarlo: en tu proyecto de Supabase, abre «SQL Editor», pega todo este archivo y pulsa «Run».
-- Crea una tabla con una fila por jugador (su nombre y su progreso) y las reglas para que
-- cada uno solo pueda leer y cambiar la suya. (La mesa con amigos no necesita ninguna tabla.)

create table if not exists public.jugadores (
  id          uuid primary key references auth.users (id) on delete cascade,
  nombre      text not null default 'Jugador' check (char_length(nombre) between 2 and 24),
  progreso    jsonb not null default '{}'::jsonb,
  creado      timestamptz not null default now(),
  actualizado timestamptz not null default now()
);

alter table public.jugadores enable row level security;

-- Sin sesión no se puede tocar nada; con sesión, solo leer, crear y cambiar (nunca borrar)
revoke all on table public.jugadores from anon;
revoke delete, truncate, references, trigger on table public.jugadores from authenticated;

drop policy if exists "cada uno ve su ficha" on public.jugadores;
create policy "cada uno ve su ficha" on public.jugadores
  for select to authenticated using ((select auth.uid()) = id);

drop policy if exists "cada uno crea su ficha" on public.jugadores;
create policy "cada uno crea su ficha" on public.jugadores
  for insert to authenticated with check ((select auth.uid()) = id);

drop policy if exists "cada uno cambia su ficha" on public.jugadores;
create policy "cada uno cambia su ficha" on public.jugadores
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- Al registrarse alguien, se le crea su ficha con el nombre que puso (o «Jugador» si es muy corto)
create or replace function public.nuevo_jugador()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  n text := left(trim(coalesce(new.raw_user_meta_data ->> 'nombre', '')), 24);
begin
  if char_length(n) < 2 then n := 'Jugador'; end if;
  insert into public.jugadores (id, nombre) values (new.id, n)
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke execute on function public.nuevo_jugador() from public, anon, authenticated;

drop trigger if exists al_registrarse on auth.users;
create trigger al_registrarse
  after insert on auth.users
  for each row execute procedure public.nuevo_jugador();
