import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabaseClient'
import Login from './components/Login'
import Navbar from './components/Navbar'
import KanbanBoard from './components/KanbanBoard'
import TaskForm from './components/TaskForm'
import UserManagement from './components/UserManagement'
import CatalogManagement from './components/CatalogManagement'
import Reports from './components/Reports'

export default function App() {
  const [session, setSession] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [profileError, setProfileError] = useState(false)
  const [currentView, setCurrentView] = useState('tasks')
  const [editingTask, setEditingTask] = useState(null)
  const [loading, setLoading] = useState(true)
  const [darkMode, setDarkMode] = useState(() => {
    const stored = localStorage.getItem('darkMode')
    return stored !== null
      ? stored === 'true'
      : window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  // Sincroniza el estado con la clase en <html> y localStorage
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    localStorage.setItem('darkMode', String(darkMode))
  }, [darkMode])

  const toggleDarkMode = useCallback(() => setDarkMode((prev) => !prev), [])

  useEffect(() => {
    // onAuthStateChange emits INITIAL_SESSION synchronously, so getSession is redundant
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
      else { setUserProfile(null); setProfileError(false); setLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', userId)
      .single()
    if (error) {
      setProfileError(true)
    } else {
      setUserProfile(data)
    }
    setLoading(false)
  }

  function handleEdit(task) {
    setEditingTask(task)
    setCurrentView('form')
  }

  function handleNew() {
    setEditingTask(null)
    setCurrentView('form')
  }

  function handleFormDone() {
    setEditingTask(null)
    setCurrentView('tasks')
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-gray-500 dark:text-gray-400">Cargando...</div>
      </div>
    )
  }

  if (!session) return <Login />

  if (profileError) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-md max-w-sm">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">Error al cargar perfil</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
            No se pudo obtener tu información de usuario. Verifica tu conexión e intenta de nuevo.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => { setProfileError(false); setLoading(true); fetchProfile(session.user.id) }}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              Reintentar
            </button>
            <button
              onClick={() => supabase.auth.signOut()}
              className="text-gray-500 dark:text-gray-400 hover:underline text-sm px-4 py-2"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    )
  }

  const isAdmin = userProfile?.rol === 'Administrador'
  const isGestor = userProfile?.rol === 'Gestor'

  if (!userProfile) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-md max-w-sm">
          <div className="text-4xl mb-4">⏳</div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">Cuenta pendiente de activación</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
            Tu registro fue recibido. El administrador necesita asignarte un rol para que puedas acceder.
          </p>
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar
        userProfile={userProfile}
        currentView={currentView}
        setCurrentView={setCurrentView}
        darkMode={darkMode}
        onToggleDark={toggleDarkMode}
      />
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-6">
        {currentView === 'tasks' && (
          <KanbanBoard
            userProfile={userProfile}
            onEdit={isAdmin || isGestor ? handleEdit : undefined}
            onNew={isAdmin || isGestor ? handleNew : undefined}
          />
        )}
        {currentView === 'form' && (
          <TaskForm
            task={editingTask}
            userProfile={userProfile}
            onDone={handleFormDone}
          />
        )}
        {currentView === 'users' && isAdmin && <UserManagement />}
        {currentView === 'catalogs' && isAdmin && <CatalogManagement />}
        {currentView === 'reports' && (isAdmin || isGestor) && <Reports userProfile={userProfile} />}
      </main>
      <footer className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 py-3">
        <p className="text-center text-xs text-gray-400 dark:text-gray-500">
          © 2026 Freejolitos Consultores. Todos los derechos reservados.
        </p>
      </footer>
    </div>
  )
}
