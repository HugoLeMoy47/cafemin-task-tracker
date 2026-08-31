export const normalizeText = (value) => (typeof value === 'string' ? value.trim() : '')

export const validateEmail = (email) => {
  const normalized = normalizeText(email)
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
}

export const validatePassword = (password) => typeof password === 'string' && password.length >= 6

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
    return 'La contraseña debe tener al menos 6 caracteres. / Password must be at least 6 characters.'
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
