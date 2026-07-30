-- Migración: datos antropométricos en profiles + tabla de planes semanales generados.
-- Pegar COMPLETO en el SQL Editor de Supabase (proyecto swgqlrbztvqikkyitqtx) y Run.

-- 1) Columnas nuevas en profiles (para calcular TDEE / calorías de mantenimiento)
alter table public.profiles
  add column if not exists weight_kg numeric,
  add column if not exists height_cm numeric,
  add column if not exists age int,
  add column if not exists sex text check (sex in ('male', 'female')),
  add column if not exists activity_level text check (
    activity_level in ('sedentary', 'light', 'moderate', 'active', 'very_active')
  ),
  add column if not exists dietary_restrictions text[] not null default '{}';

comment on column public.profiles.weight_kg is 'Peso en kilogramos, para calcular TDEE (Mifflin-St Jeor)';
comment on column public.profiles.height_cm is 'Estatura en centímetros, para calcular TDEE';
comment on column public.profiles.activity_level is 'sedentary|light|moderate|active|very_active — multiplicador de actividad para TDEE';
comment on column public.profiles.dietary_restrictions is 'Categorías de food_nutrition a excluir por intolerancia/alergia/preferencia, ej. {Lácteos}';

-- 2) RPC segura para que el propio usuario actualice SOLO sus datos antropométricos
-- (mismo patrón que update_my_profile: nunca permite tocar `role`).
create or replace function public.update_my_biometrics(
  p_weight_kg numeric,
  p_height_cm numeric,
  p_age int,
  p_sex text,
  p_activity_level text,
  p_dietary_restrictions text[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set
    weight_kg = p_weight_kg,
    height_cm = p_height_cm,
    age = p_age,
    sex = p_sex,
    activity_level = p_activity_level,
    dietary_restrictions = coalesce(p_dietary_restrictions, '{}')
  where id = auth.uid();
end;
$$;

revoke execute on function public.update_my_biometrics from public, anon;
grant execute on function public.update_my_biometrics to authenticated;

-- 3) Tabla de planes semanales generados
create table if not exists public.generated_meal_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  risk_category text not null,
  tdee numeric not null,
  target_calories numeric not null,
  dietary_restrictions text[] not null default '{}',
  plan jsonb not null,
  created_at timestamptz not null default now()
);

comment on table public.generated_meal_plans is 'Plan de alimentación semanal (lunes-domingo) generado a partir del TDEE del usuario y su nivel de riesgo';

alter table public.generated_meal_plans enable row level security;

drop policy if exists "meal_plans select propias" on public.generated_meal_plans;
create policy "meal_plans select propias"
  on public.generated_meal_plans for select
  using (user_id = auth.uid());

drop policy if exists "meal_plans insert propias" on public.generated_meal_plans;
create policy "meal_plans insert propias"
  on public.generated_meal_plans for insert
  with check (user_id = auth.uid());

drop policy if exists "meal_plans delete propias" on public.generated_meal_plans;
create policy "meal_plans delete propias"
  on public.generated_meal_plans for delete
  using (user_id = auth.uid());

create index if not exists generated_meal_plans_user_idx on public.generated_meal_plans (user_id, created_at desc);
