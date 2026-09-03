import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabaseClient'
import Login from './components/Login'
import Navbar from './components/Navbar'
import KanbanBoard from './components/KanbanBoard'
import TaskForm from './components/TaskForm'
import UserManagement from './components/UserManagement'
import CatalogManagement from './components/CatalogManagement'
import TemplateManagement from './components/TemplateManagement'
import Reports from './components/Reports'
import UpdatePassword from './components/UpdatePassword'

export default function App() {
  const [session, setSession] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [profileError, setProfileError] = useState(false)
  const [currentView, setCurrentView] = useState('tasks')
  const [editingTask, setEditingTask] = useState(null)
  const [loading, setLoading] = useState(true)
  /**
   * ¿La visita llegó por un enlace de recuperación?
   *
   * La marca la deja index.html antes de que cargue el bundle, porque el
   * cliente de Supabase consume y limpia el fragmento de la URL al
   * inicializarse. Se complementa con el evento PASSWORD_RECOVERY por si el
   * orden de carga cambiara.
   *
   * Set by index.html before the bundle loads, since the Supabase client
   * consumes and clears the URL fragment on init. The PASSWORD_RECOVERY event
   * is kept as a second signal in case load order ever changes.
   */
  const [recuperando, setRecuperando] = useState(
    () => typeof window !== 'undefined' && window.__cafeminRecuperacion === true
  )
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setRecuperando(true)
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

  // La recuperación se atiende antes que cualquier otra vista: quien llega por
  // el enlace ya trae sesión temporal y, sin esta guarda, entraría a la
  // aplicación sin haber cambiado la contraseña.
  // Recovery is handled before any other view: the link already grants a
  // temporary session, so without this guard the user would simply land in the
  // app without having changed anything.
  if (recuperando && session) {
    return <UpdatePassword onListo={() => setRecuperando(false)} />
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

  /**
   * Acceso desactivado por un Administrador.
   *
   * La base ya lo bloqueó todo —`get_my_role()` devuelve nulo, así que ninguna
   * política concede nada— y esta pantalla existe solo para que la persona
   * entienda qué pasó. Sin ella vería la aplicación vacía, sin tareas ni menú,
   * como si estuviera rota.
   *
   * Puede leer su propia fila porque la política "Read own usuario" no mira
   * `activo`, y es justo lo que hace posible explicárselo.
   *
   * The database already denied everything; this screen exists so the person
   * understands why, instead of seeing an app that looks broken.
   */
  if (userProfile && userProfile.activo === false) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
        <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-md max-w-sm">
          <div className="text-4xl mb-4">🔒</div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">
            Tu acceso está desactivado
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
            Un Administrador desactivó el acceso de esta cuenta. Si crees que es un error,
            comunícate con quien administra el sistema.
          </p>
          <button
            onClick={() => supabase.auth.signOut()}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Cerrar sesión
          </button>
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
        {/* La guarda va aquí, junto a la vista, como en las otras cuatro.
            Antes solo existía en el cableado: 'form' se alcanzaba únicamente a
            través de handleEdit/handleNew, que solo se pasan a KanbanBoard
            cuando el rol es privilegiado. Funcionaba, pero una condición que
            vive en otro archivo es la que se pierde en el siguiente cambio.
            The guard used to live only in the prop wiring — which worked, but a
            condition that lives in another file is the one lost in the next
            refactor. */}
        {currentView === 'form' && (isAdmin || isGestor) && (
          <TaskForm
            task={editingTask}
            userProfile={userProfile}
            onDone={handleFormDone}
          />
        )}
        {currentView === 'users' && isAdmin && <UserManagement />}
        {currentView === 'catalogs' && isAdmin && <CatalogManagement />}
        {currentView === 'templates' && (isAdmin || isGestor) && (
          <TemplateManagement userProfile={userProfile} />
        )}
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
