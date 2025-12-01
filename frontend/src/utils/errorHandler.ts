/**
 * Extract error message from FastAPI error response
 * Handles both string errors and validation error arrays
 */
export const getErrorMessage = (error: any): string => {
  if (!error) return 'An unknown error occurred'
  
  // If it's already a string, return it
  if (typeof error === 'string') return error
  
  // Check for response data
  const detail = error.response?.data?.detail || error.detail
  
  if (!detail) {
    return error.message || 'An error occurred'
  }
  
  // If detail is a string, return it
  if (typeof detail === 'string') {
    return detail
  }
  
  // If detail is an array (validation errors), format them
  if (Array.isArray(detail)) {
    return detail
      .map((err: any) => {
        const field = err.loc?.slice(1).join('.') || 'field'
        return `${field}: ${err.msg}`
      })
      .join(', ')
  }
  
  // If detail is an object, try to extract message
  if (typeof detail === 'object') {
    return detail.msg || detail.message || JSON.stringify(detail)
  }
  
  return 'An error occurred'
}

