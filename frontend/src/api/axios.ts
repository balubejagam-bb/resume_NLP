import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken')
  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`,
    }
  } else if (config.headers && 'Authorization' in config.headers) {
    delete (config.headers as Record<string, unknown>).Authorization
  }
  return config
})

export default api

