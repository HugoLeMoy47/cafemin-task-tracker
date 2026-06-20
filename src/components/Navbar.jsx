import { useState, useRef, useEffect } from 'react'
import { supabase } from '../supabaseClient'

const ROL_BADGE = {
  Administrador: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
  Gestor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
  Asignado: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
}

export default function Navbar({ userProfile, currentView, setCurrentView, darkMode, onToggleDark }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const headerRef = useRef()
  const isAdmin = userProfile.rol === 'Administrador'
  const isGestor = userProfile.rol === 'Gestor'

  useEffect(() => {
    if (!menuOpen) return
    function handleOutsideClick(e) {
      if (headerRef.current && !headerRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('touchstart', handleOutsideClick)
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('touchstart', handleOutsideClick)
    }
  }, [menuOpen])

  const navItems = [
    { id: 'tasks',    label: 'Tareas',     show: true },
    { id: 'reports',  label: 'Reportes',   show: isAdmin || isGestor },
    { id: 'users',    label: 'Usuarios',   show: isAdmin },
    { id: 'catalogs', label: 'Catálogos',  show: isAdmin },
  ].filter((i) => i.show)

  function navigate(id) {
    setCurrentView(id)
    setMenuOpen(false)
  }

  return (
    <header ref={headerRef} className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-20">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">

        {/* Logo */}
        <span className="font-bold text-blue-600 dark:text-blue-400 text-lg tracking-tight shrink-0">
          CAFEMIN
        </span>

        {/* Nav desktop */}
        <nav className="hidden sm:flex items-center gap-1 flex-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                currentView === item.id
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Right side: user info + dark toggle + logout (desktop) */}
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <span className="text-sm text-gray-700 dark:text-gray-300">{userProfile.nombre_completo}</span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROL_BADGE[userProfile.rol]}`}>
            {userProfile.rol}
          </span>
          <button
            onClick={onToggleDark}
            aria-label="Cambiar modo oscuro"
            className="text-lg px-2 py-1 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            Salir
          </button>
        </div>

        {/* Mobile: dark toggle + hamburger */}
        <div className="flex sm:hidden items-center gap-1">
          <button
            onClick={onToggleDark}
            aria-label="Cambiar modo oscuro"
            className="text-lg px-2 py-1 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Abrir menú"
            className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {menuOpen ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="sm:hidden border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 space-y-1">
          {/* Nav items */}
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                currentView === item.id
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {item.label}
            </button>
          ))}

          {/* User info + logout */}
          <div className="pt-2 mt-2 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                {userProfile.nombre_completo}
              </span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROL_BADGE[userProfile.rol]}`}>
                {userProfile.rol}
              </span>
            </div>
            <button
              onClick={() => supabase.auth.signOut()}
              className="text-sm text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium"
            >
              Salir
            </button>
          </div>
        </div>
      )}
    </header>
  )
}
