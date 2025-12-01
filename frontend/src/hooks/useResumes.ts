import { useState, useEffect } from 'react'
import api from '../api/axios'
import { Resume } from '../types'

export const useResumes = () => {
  const [resumes, setResumes] = useState<Resume[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchResumes = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await api.get('/resumes')
      setResumes(response.data.resumes)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch resumes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchResumes()
  }, [])

  return { resumes, loading, error, refetch: fetchResumes }
}

