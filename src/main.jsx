import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import DemoBanner from './components/DemoBanner.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <DemoBanner />
    <App />
  </StrictMode>,
)
