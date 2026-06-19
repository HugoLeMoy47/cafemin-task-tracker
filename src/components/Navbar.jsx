import { supabase } from '../supabaseClient'

const ROL_BADGE = {
  Administrador: 'bg-purple-100 text-purple-700',
  Gestor: 'bg-blue-100 text-blue-700',
  Asignado: 'bg-gray-100 text-gray-700',
}

export default function Navbar({ userProfile, currentView, setCurrentView }) {
  const isAdmin = userProfile.rol === 'Administrador'
  const isGestor = userProfile.rol === 'Gestor'

  const navItems = [
    { id: 'tasks', label: 'Tareas', show: true },
    { id: 'reports', label: 'Reportes', show: isAdmin || isGestor },
    { id: 'users', label: 'Usuarios', show: isAdmin },
    { id: 'catalogs', label: 'Catálogos', show: isAdmin },
  ]

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <span className="font-bold text-blue-600 text-lg tracking-tight">CAFEMIN</span>
          <nav className="flex items-center gap-1">
            {navItems.filter((i) => i.show).map((item) => (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  currentView === item.id
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-700 hidden sm:block">{userProfile.nombre_completo}</span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROL_BADGE[userProfile.rol]}`}>
            {userProfile.rol}
          </span>
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-sm text-gray-500 hover:text-gray-700 ml-1"
          >
            Salir
          </button>
        </div>
      </div>
    </header>
  )
}
