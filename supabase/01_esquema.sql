create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  correo text not null default '',
  nombre text not null default '',
  rol text not null default 'proyectista' check (rol in ('admin', 'proyectista')),
  activo boolean not null default false,
  creado timestamptz not null default now()
);

create table if not exists public.proyecto (
  id text primary key,
  folio text not null default '',
  desarrollo text not null default '',
  cliente text not null default '',
  datos jsonb not null,
  creado_por uuid references auth.users (id) on delete set null default auth.uid(),
  modificado_por uuid references auth.users (id) on delete set null default auth.uid(),
  creado timestamptz not null default now(),
  modificado timestamptz not null default now()
);

create index if not exists proyecto_modificado_idx on public.proyecto (modificado desc);

create table if not exists public.parametros (
  id int primary key default 1 check (id = 1),
  datos jsonb not null,
  modificado_por uuid references auth.users (id) on delete set null default auth.uid(),
  modificado timestamptz not null default now()
);

create or replace function public.es_activo() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select activo from public.profiles where id = auth.uid()), false)
$$;

create or replace function public.es_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select activo and rol = 'admin' from public.profiles where id = auth.uid()), false)
$$;

create or replace function public.nuevo_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, correo, nombre)
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data ->> 'nombre', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists al_crear_usuario on auth.users;
create trigger al_crear_usuario after insert on auth.users
  for each row execute function public.nuevo_usuario();

create or replace function public.proteger_perfil() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.es_admin() then
    new.rol := old.rol;
    new.activo := old.activo;
  end if;
  if auth.uid() is not null then
    new.correo := old.correo;
  end if;
  return new;
end;
$$;

drop trigger if exists antes_de_editar_perfil on public.profiles;
create trigger antes_de_editar_perfil before update on public.profiles
  for each row execute function public.proteger_perfil();

alter table public.profiles enable row level security;
alter table public.proyecto enable row level security;
alter table public.parametros enable row level security;

drop policy if exists perfiles_leer on public.profiles;
create policy perfiles_leer on public.profiles for select
  using (id = auth.uid() or public.es_admin());

drop policy if exists perfiles_editar on public.profiles;
create policy perfiles_editar on public.profiles for update
  using (id = auth.uid() or public.es_admin())
  with check (id = auth.uid() or public.es_admin());

drop policy if exists proyectos_leer on public.proyecto;
create policy proyectos_leer on public.proyecto for select
  using (public.es_activo());

drop policy if exists proyectos_crear on public.proyecto;
create policy proyectos_crear on public.proyecto for insert
  with check (public.es_activo());

drop policy if exists proyectos_editar on public.proyecto;
create policy proyectos_editar on public.proyecto for update
  using (public.es_activo())
  with check (public.es_activo());

drop policy if exists proyectos_borrar on public.proyecto;
create policy proyectos_borrar on public.proyecto for delete
  using (public.es_admin() or creado_por = auth.uid());

drop policy if exists parametros_leer on public.parametros;
create policy parametros_leer on public.parametros for select
  using (public.es_activo());

drop policy if exists parametros_crear on public.parametros;
create policy parametros_crear on public.parametros for insert
  with check (public.es_admin());

drop policy if exists parametros_editar on public.parametros;
create policy parametros_editar on public.parametros for update
  using (public.es_admin())
  with check (public.es_admin());

insert into public.profiles (id, correo)
select id, coalesce(email, '') from auth.users
on conflict (id) do nothing;
