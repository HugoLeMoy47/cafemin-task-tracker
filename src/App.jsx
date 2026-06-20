import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import Login from './components/Login'
import Navbar from './components/Navbar'
import TaskList from './components/TaskList'
import KanbanBoard from './components/KanbanBoard'
import TaskForm from './components/TaskForm'
import UserManagement from './components/UserManagement'
import CatalogManagement from './components/CatalogManagement'
import Reports from './components/Reports'

export default function App() {
  const [session, setSession] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [currentView, setCurrentView] = useState('tasks')
  const [editingTask, setEditingTask] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
      else { setUserProfile(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    const { data } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', userId)
      .single()
    setUserProfile(data)
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
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-gray-500">Cargando...</div>
      </div>
    )
  }

  if (!session) return <Login />

  const isAdmin = userProfile?.rol === 'Administrador'
  const isGestor = userProfile?.rol === 'Gestor'

  if (!userProfile) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-2xl shadow-md max-w-sm">
          <div className="text-4xl mb-4">⏳</div>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Cuenta pendiente de activación</h2>
          <p className="text-gray-500 text-sm mb-6">
            Tu registro fue recibido. El administrador necesita asignarte un rol para que puedas acceder.
          </p>
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-blue-600 hover:underline text-sm"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar
        userProfile={userProfile}
        currentView={currentView}
        setCurrentView={setCurrentView}
      />
      <main className="max-w-5xl mx-auto px-4 py-6">
        {currentView === 'tasks' && (
          isAdmin || isGestor ? (
            <TaskList
              userProfile={userProfile}
              onEdit={handleEdit}
              onNew={handleNew}
            />
          ) : (
            <KanbanBoard userProfile={userProfile} />
          )
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
    </div>
  )
}
