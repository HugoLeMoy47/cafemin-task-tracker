-- Migración: agregar campo fecha_limite a la tabla tareas
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query

alter table tareas
  add column if not exists fecha_limite date;
