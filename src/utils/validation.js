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
