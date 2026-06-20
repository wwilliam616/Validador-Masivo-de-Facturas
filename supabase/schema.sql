-- ============================================================
-- Validador de Facturas — Schema de Supabase
-- ============================================================
-- Cómo ejecutar:
-- 1. Ve a tu proyecto en https://supabase.com/dashboard
-- 2. Abre el "SQL Editor" (menú lateral izquierdo)
-- 3. Pega TODO este archivo y dale "Run"
-- ============================================================

create extension if not exists "pgcrypto";

create table if not exists public.facturas (
  id              uuid primary key default gen_random_uuid(),
  nombre_archivo  text not null,
  ruc_emisor      text,
  ruc_receptor    text,
  numero_factura  text,
  fecha_emision   text,
  monto_total     numeric,
  iva_10          numeric,
  iva_5           numeric,
  exentas         numeric,
  estado          text not null default 'pendiente'
                    check (estado in ('valida', 'invalida', 'pendiente')),
  errores         text[],
  texto_crudo     text,
  creado_en       timestamptz not null default now()
);

-- Índices para que los filtros y búsquedas del dashboard sean rápidos
create index if not exists idx_facturas_estado     on public.facturas (estado);
create index if not exists idx_facturas_creado_en  on public.facturas (creado_en desc);
create index if not exists idx_facturas_ruc_emisor on public.facturas (ruc_emisor);

-- ============================================================
-- Seguridad: Row Level Security (RLS)
-- ============================================================
-- Este MVP es de un solo usuario y NO usa autenticación (Supabase Auth),
-- así que la app se conecta con la "anon key" pública.
-- Para que el MVP funcione, habilitamos acceso público de lectura/escritura
-- a esta tabla específica.
--
-- ⚠️ IMPORTANTE: esto significa que cualquiera con tu URL + anon key podría
-- leer/escribir en esta tabla. Aceptable para un MVP de validación de idea,
-- pero ANTES de tener datos reales/sensibles o más usuarios, esto debe
-- reemplazarse con Supabase Auth + políticas RLS por usuario.
-- ============================================================

alter table public.facturas enable row level security;

create policy "Acceso público de lectura (MVP)"
  on public.facturas for select
  using (true);

create policy "Acceso público de inserción (MVP)"
  on public.facturas for insert
  with check (true);

create policy "Acceso público de borrado (MVP)"
  on public.facturas for delete
  using (true);
