-- El Perro — cómo se guarda el progreso (después de esquema.sql).
-- Nadie escribe su ficha a mano: el juego solo puede SUMAR lo que se acaba de jugar, con la función
-- apuntar_progreso, que comprueba que lo que llega tiene sentido (cuántas jugadas caben desde la última vez, que las
-- chinas, los juegos y las vacas cuadren con las jugadas...). Como suma en vez de pisar, dos móviles a la vez no se
-- borran lo ganado el uno al otro. Del nombre sí se puede cambiar a mano (solo esa columna).
-- (El juego corre en el móvil de cada uno, así que esto no impide del todo hacer trampas, pero ya no se puede poner
-- cualquier cifra: habría que ir sumando partidas creíbles poco a poco.)

revoke insert, update, delete, truncate, references, trigger on table public.jugadores from authenticated;
grant select on table public.jugadores to authenticated;
grant update (nombre) on table public.jugadores to authenticated;
drop policy if exists "cada uno crea su ficha" on public.jugadores;

create or replace function public.apuntar_progreso(d jsonb)
returns jsonb
language plpgsql
security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  fila public.jugadores%rowtype;
  p jsonb;
  seg numeric;
  j int; cg int; cp int; jg int; jp int; vg int; vp int; ab int := 0;
  part jsonb; x jsonb; modo text; gana boolean;
  pj int := 0; pg int := 0; pp int := 0;
  ra int; rm int;
  imp jsonb; ij int; icg int; icp int; ijg int; ijp int; ivg int; ivp int; ipj int; ipg int; ipp int; irm int;
  m jsonb;
begin
  if uid is null then raise exception 'sin sesión' using errcode = '28000'; end if;
  if d is null or jsonb_typeof(d) <> 'object' then raise exception 'progreso no válido' using errcode = '22023'; end if;

  insert into public.jugadores (id) values (uid) on conflict (id) do nothing;
  select * into fila from public.jugadores where id = uid for update;
  p := coalesce(fila.progreso, '{}'::jsonb);
  if jsonb_typeof(p->'porModo') is distinct from 'object' then p := jsonb_set(p, '{porModo}', '{}'::jsonb, true); end if;
  seg := extract(epoch from (now() - coalesce(fila.actualizado, fila.creado)));

  j  := coalesce((d->>'jugadas')::int, 0);
  cg := coalesce((d->'chinas'->>'g')::int, 0);  cp := coalesce((d->'chinas'->>'p')::int, 0);
  jg := coalesce((d->'juegos'->>'g')::int, 0);  jp := coalesce((d->'juegos'->>'p')::int, 0);
  vg := coalesce((d->'vacas'->>'g')::int, 0);   vp := coalesce((d->'vacas'->>'p')::int, 0);
  part := coalesce(d->'partidas', '[]'::jsonb);
  if jsonb_typeof(part) <> 'array' then raise exception 'progreso no válido' using errcode = '22023'; end if;

  -- Que cuadre: nada negativo, como mucho 100 chinas por jugada, un juego por jugada, una vaca por juego...
  if least(j, cg, cp, jg, jp, vg, vp) < 0 or j > 300 or cg + cp > 100 * j or jg + jp > j or vg + vp > jg + jp
     or jsonb_array_length(part) > j + 1 then
    raise exception 'progreso no válido' using errcode = '22023';
  end if;
  -- Y que dé tiempo: unas pocas jugadas de golpe, y luego una cada seis segundos desde la última vez
  if j > 3 + floor(seg / 6) then raise exception 'demasiado deprisa' using errcode = '53400'; end if;

  ra := coalesce((p->'racha'->>'actual')::int, 0);
  rm := coalesce((p->'racha'->>'mejor')::int, 0);
  for x in select * from jsonb_array_elements(part) loop
    modo := case when x->>'m' = '2v2' then '2v2' else '1v1' end;
    gana := coalesce((x->>'g')::boolean, false);
    if coalesce((x->>'ab')::boolean, false) then ab := ab + 1; gana := false; end if;
    pj := pj + 1;
    if gana then pg := pg + 1; ra := ra + 1; else pp := pp + 1; ra := 0; end if;
    rm := greatest(rm, ra);
    p := jsonb_set(p, array['porModo', modo], jsonb_build_object(
      'jugadas', coalesce((p->'porModo'->modo->>'jugadas')::int, 0) + 1,
      'ganadas', coalesce((p->'porModo'->modo->>'ganadas')::int, 0) + (case when gana then 1 else 0 end)), true);
  end loop;

  -- Traer lo jugado sin cuenta en un móvil (o lo que se quedó en un móvil de antes): como mucho tres veces por cuenta
  imp := d->'importar';
  if imp is not null and jsonb_typeof(imp) = 'object' then
    if coalesce((p->>'importaciones')::int, 0) >= 3 then raise exception 'ya importado' using errcode = '22023'; end if;
    ij := coalesce((imp->>'jugadas')::int, 0);
    icg := coalesce((imp->'chinas'->>'g')::int, 0); icp := coalesce((imp->'chinas'->>'p')::int, 0);
    ijg := coalesce((imp->'juegos'->>'g')::int, 0); ijp := coalesce((imp->'juegos'->>'p')::int, 0);
    ivg := coalesce((imp->'vacas'->>'g')::int, 0);  ivp := coalesce((imp->'vacas'->>'p')::int, 0);
    ipj := coalesce((imp->'partidas'->>'jugadas')::int, 0); ipg := coalesce((imp->'partidas'->>'ganadas')::int, 0);
    ipp := coalesce((imp->'partidas'->>'perdidas')::int, 0); irm := coalesce((imp->>'rachaMejor')::int, 0);
    if least(ij, icg, icp, ijg, ijp, ivg, ivp, ipj, ipg, ipp, irm) < 0 or ij > 5000 or icg + icp > 100 * ij or ijg + ijp > ij
       or ivg + ivp > ijg + ijp or ipj > ij + 50 or ipg + ipp > ipj or irm > ipg then
      raise exception 'progreso no válido' using errcode = '22023';
    end if;
    for modo in select unnest(array['1v1', '2v2']) loop
      m := imp->'porModo'->modo;
      if m is not null then
        if least(coalesce((m->>'jugadas')::int, 0), coalesce((m->>'ganadas')::int, 0)) < 0 or coalesce((m->>'ganadas')::int, 0) > coalesce((m->>'jugadas')::int, 0)
           or coalesce((m->>'jugadas')::int, 0) > ipj then
          raise exception 'progreso no válido' using errcode = '22023';
        end if;
        p := jsonb_set(p, array['porModo', modo], jsonb_build_object(
          'jugadas', coalesce((p->'porModo'->modo->>'jugadas')::int, 0) + coalesce((m->>'jugadas')::int, 0),
          'ganadas', coalesce((p->'porModo'->modo->>'ganadas')::int, 0) + coalesce((m->>'ganadas')::int, 0)), true);
      end if;
    end loop;
    j := j + ij; cg := cg + icg; cp := cp + icp; jg := jg + ijg; jp := jp + ijp; vg := vg + ivg; vp := vp + ivp;
    pj := pj + ipj; pg := pg + ipg; pp := pp + ipp; rm := greatest(rm, irm);
    p := p || jsonb_build_object('importaciones', coalesce((p->>'importaciones')::int, 0) + 1);
  end if;

  p := p || jsonb_build_object(
    'version', 1,
    'jugadas', coalesce((p->>'jugadas')::int, 0) + j,
    'chinas', jsonb_build_object('ganadas', coalesce((p->'chinas'->>'ganadas')::int, 0) + cg, 'perdidas', coalesce((p->'chinas'->>'perdidas')::int, 0) + cp),
    'juegos', jsonb_build_object('ganados', coalesce((p->'juegos'->>'ganados')::int, 0) + jg, 'perdidos', coalesce((p->'juegos'->>'perdidos')::int, 0) + jp),
    'vacas', jsonb_build_object('ganadas', coalesce((p->'vacas'->>'ganadas')::int, 0) + vg, 'perdidas', coalesce((p->'vacas'->>'perdidas')::int, 0) + vp),
    'partidas', jsonb_build_object('jugadas', coalesce((p->'partidas'->>'jugadas')::int, 0) + pj,
                                   'ganadas', coalesce((p->'partidas'->>'ganadas')::int, 0) + pg,
                                   'perdidas', coalesce((p->'partidas'->>'perdidas')::int, 0) + pp),
    'abandonos', coalesce((p->>'abandonos')::int, 0) + ab,
    'racha', jsonb_build_object('actual', ra, 'mejor', greatest(rm, ra)),
    'tutorial', coalesce((p->>'tutorial')::boolean, false) or coalesce((d->>'tutorial')::boolean, false),
    'ultimaPartida', case when pj > 0 then to_jsonb(now()) else coalesce(p->'ultimaPartida', 'null'::jsonb) end,
    'primeraVez', coalesce(p->'primeraVez', to_jsonb(fila.creado)),
    'actualizado', to_jsonb(now())
  );
  update public.jugadores set progreso = p, actualizado = now() where id = uid;
  return p;
end;
$$;

revoke execute on function public.apuntar_progreso(jsonb) from public, anon;
grant execute on function public.apuntar_progreso(jsonb) to authenticated;
