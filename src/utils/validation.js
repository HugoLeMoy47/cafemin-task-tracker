export const normalizeText = (value) => (typeof value === 'string' ? value.trim() : '')

export const validateEmail = (email) => {
  const normalized = normalizeText(email)
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
}

/**
 * Longitud mínima de contraseña.
 * Minimum password length.
 *
 * Ocho es el piso que recomienda la propia documentación de Supabase
 * ("anything less than 8 characters is not recommended"). El sistema maneja
 * datos de personas en situación de vulnerabilidad, así que no se baja de ahí.
 *
 * ⚠️ Esta comprobación es de CONVENIENCIA, no un control de seguridad: corre en
 * el navegador y se puede saltar. El límite real se configura en Supabase →
 * Authentication → Providers → Email → Minimum password length, y debe
 * mantenerse igual que este valor.
 *
 * This check is a CONVENIENCE, not a security control: it runs in the browser
 * and can be bypassed. The real limit lives in the Supabase dashboard and must
 * be kept in sync with this value.
 */
export const MIN_PASSWORD_LENGTH = 8

export const validatePassword = (password) =>
  typeof password === 'string' && password.length >= MIN_PASSWORD_LENGTH

export const validateTaskPayload = ({ nombre, detalles }) => {
  const name = normalizeText(nombre)
  const details = normalizeText(detalles)

  if (name.length < 3) {
    return 'El nombre de la tarea debe tener al menos 3 caracteres. / Task name must be at least 3 characters.'
  }
  if (name.length > 250) {
    return 'El nombre de la tarea es demasiado largo. / Task name is too long.'
  }
  if (details.length > 1000) {
    return 'Los detalles no pueden superar 1000 caracteres. / Details cannot exceed 1000 characters.'
  }
  return null
}

/**
 * Valida el cambio de contraseña: longitud y coincidencia.
 * Validates a password change: length and confirmation match.
 *
 * Devuelve el mensaje de error, o null si es válida.
 * Returns the error message, or null when valid.
 */
export const validatePasswordChange = ({ password, confirmacion }) => {
  if (!validatePassword(password)) {
    return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres. / Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
  }
  if (password !== confirmacion) {
    return 'Las contraseñas no coinciden. / Passwords do not match.'
  }
  return null
}

export const validateImageFile = (file) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  const maxBytes = 5 * 1024 * 1024

  if (!file) {
    return 'No se seleccionó ningún archivo. / No file selected.'
  }
  if (!allowedTypes.includes(file.type)) {
    return 'Formato de imagen no válido. Use JPG, PNG o WEBP. / Invalid image format. Use JPG, PNG or WEBP.'
  }
  if (file.size > maxBytes) {
    return 'La imagen es demasiado grande. Máximo 5 MB. / Image is too large. Max 5 MB.'
  }
  return null
}
