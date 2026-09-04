/**
 * Arnés de verificación móvil.
 * Mobile verification harness.
 *
 * Monta los componentes REALES con datos simulados, para poder medirlos a
 * 320, 360 y 412 px sin una sesión de Supabase. Lo consume
 * `pruebas/movil.mjs`; no forma parte del bundle de la aplicación.
 *
 * Mounts the REAL components with stubbed data so they can be measured
 * without a Supabase session. Consumed by `pruebas/movil.mjs`.
 *
 * `login` está aquí por una razón concreta: durante tres rondas de trabajo en
 * móvil esta pantalla quedó fuera de toda medición, porque el arnés arrancaba
 * ya con sesión. Es la única que toca el 100% de la gente, y salió con
 * objetivos de 42 y 20 px. Un arnés que no ve la primera pantalla no es un
 * arnés.
 *
 * `login` is here for a concrete reason: for three rounds this screen was
 * outside every measurement, because the harness started already signed in.
 */
import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import KanbanBoard from './components/KanbanBoard'
import Reports from './components/Reports'
import Login from './components/Login'
import Ajustes from './components/Ajustes'
import './index.css'

const PERFILES = {
  asignado: { id: 'u3', nombre_completo: 'Fernanda Quiroz Bello', rol: 'Asignado' },
  admin: { id: 'u1', nombre_completo: 'Alejandra Rueda Ontiveros', rol: 'Administrador' },
}

function App() {
  const vista = new URLSearchParams(location.search).get('v') || 'kanban'
  const perfil = vista === 'reportes' ? PERFILES.admin : PERFILES.asignado
  const [, forzar] = useState(0)

  // El login trae su propio fondo a pantalla completa: envolverlo en el <main>
  // con padding mediría una caja que en la aplicación no existe.
  // Login brings its own full-screen layout; wrapping it would measure a box
  // that does not exist in the real app.
  if (vista === 'login') return <Login />

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <main className="w-full max-w-5xl mx-auto px-4 py-6">
        {vista === 'ajustes' ? (
          <Ajustes />
        ) : vista === 'reportes' ? (
          <Reports userProfile={perfil} />
        ) : (
          <KanbanBoard userProfile={perfil} onEdit={vista === 'kanban-admin' ? () => forzar((n) => n + 1) : undefined} />
        )}
      </main>
    </div>
  )
}

createRoot(document.getElementById('root')).render(<App />)
