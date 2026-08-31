import { useState } from 'react'
import { getSignedEvidenceUrl } from '../lib/evidencias'

/**
 * Enlace a una foto de evidencia en un bucket privado.
 * Link to an evidence photo stored in a private bucket.
 *
 * El bucket ya no es público, así que no existe una URL fija que poner en el
 * href: hay que pedir una firmada al momento de abrirla.
 *
 * La pestaña se abre ANTES de esperar la firma. Si se abriera después del
 * await, el navegador la trataría como una ventana emergente no solicitada y
 * la bloquearía, porque ya se perdió el gesto del usuario.
 *
 * The tab is opened BEFORE awaiting the signature: opening it after the await
 * loses the user-gesture context and browsers block it as a popup.
 */
export default function EvidenceLink({ value, className = '', label = '📷 Ver evidencia' }) {
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  async function abrir(e) {
    e.preventDefault()
    e.stopPropagation()
    if (cargando) return

    setError('')
    setCargando(true)

    const ventana = window.open('', '_blank')
    if (ventana) ventana.opener = null

    const { url, error: fallo } = await getSignedEvidenceUrl(value)
    setCargando(false)

    if (fallo) {
      ventana?.close()
      setError(fallo)
      return
    }

    if (ventana) ventana.location.href = url
    else window.location.href = url // el navegador bloqueó la pestaña
  }

  return (
    <span className="inline-flex flex-col">
      <button type="button" onClick={abrir} disabled={cargando} className={className}>
        {cargando ? '📷 Abriendo…' : label}
      </button>
      {error && <span className="text-xs text-red-600 dark:text-red-400 mt-1">{error}</span>}
    </span>
  )
}
