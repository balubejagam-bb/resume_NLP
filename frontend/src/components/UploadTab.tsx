import { useState, useCallback, useEffect } from 'react'
import { Upload, FileText, X, CheckCircle, Cloud, Sparkles, Trash2, RefreshCw, AlertTriangle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../api/axios'
import { getErrorMessage } from '../utils/errorHandler'

interface UploadedResume {
  id: string
  filename: string
  upload_date: string
  skills: string[]
  experience_years: number
  is_duplicate: boolean
}

export default function UploadTab() {
  const [files, setFiles] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadResult, setUploadResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploadedResumes, setUploadedResumes] = useState<UploadedResume[]>([])
  const [loadingResumes, setLoadingResumes] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false)
  const [deletingAll, setDeletingAll] = useState(false)

  // Fetch uploaded resumes
  const fetchResumes = useCallback(async () => {
    try {
      setLoadingResumes(true)
      const response = await api.get('/resumes')
      setUploadedResumes(response.data.resumes || [])
    } catch (err) {
      console.error('Failed to fetch resumes:', err)
    } finally {
      setLoadingResumes(false)
    }
  }, [])

  useEffect(() => {
    fetchResumes()
  }, [fetchResumes])

  // Delete single resume
  const handleDeleteResume = async (resumeId: string) => {
    try {
      setDeletingId(resumeId)
      await api.delete(`/resumes/${resumeId}`)
      setUploadedResumes(prev => prev.filter(r => r.id !== resumeId))
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setDeletingId(null)
    }
  }

  // Delete all resumes
  const handleDeleteAll = async () => {
    try {
      setDeletingAll(true)
      await api.delete('/resumes')
      setUploadedResumes([])
      setShowDeleteAllConfirm(false)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setDeletingAll(false)
    }
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      file => file.type === 'application/pdf' || 
              file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
              file.type === 'text/plain'
    )
    
    setFiles(prev => [...prev, ...droppedFiles].slice(0, 15))
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files)
      setFiles(prev => [...prev, ...selectedFiles].slice(0, 15))
    }
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleUpload = async () => {
    if (files.length === 0) {
      setError('Please select at least one file')
      return
    }

    try {
      setUploading(true)
      setError(null)
      setUploadResult(null)
      setUploadProgress(0)

      const formData = new FormData()
      files.forEach(file => {
        formData.append('files', file)
      })

      const response = await api.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const progress = progressEvent.total
            ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
            : 0
          setUploadProgress(progress)
        },
      })

      setUploadResult(response.data)
      setFiles([])
    } catch (err: any) {
      setError(getErrorMessage(err))
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  return (
    <motion.div 
      className="max-w-6xl mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Hero Section with Illustration */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Left Side - Illustration */}
        <motion.div 
          className="premium-card flex flex-col items-center justify-center p-8 order-2 lg:order-1"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <motion.img 
            src="/upload-illustration.png" 
            alt="Resume Analysis Illustration"
            className="w-full max-w-md h-auto rounded-xl shadow-2xl"
            whileHover={{ scale: 1.02, rotate: 1 }}
            transition={{ duration: 0.3 }}
          />
          <div className="mt-6 text-center">
            <h3 className="text-xl font-bold text-white mb-2">AI-Powered Resume Analysis</h3>
            <p className="text-slate-400 text-sm max-w-sm">
              Upload your resumes and let our intelligent system analyze, score, and rank candidates based on your job requirements.
            </p>
            <div className="flex items-center justify-center space-x-4 mt-4">
              <div className="flex items-center space-x-2 text-emerald-400">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm">Smart Parsing</span>
              </div>
              <div className="flex items-center space-x-2 text-blue-400">
                <Sparkles className="w-4 h-4" />
                <span className="text-sm">AI Scoring</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right Side - Upload Section */}
        <div className="premium-card order-1 lg:order-2">
          {/* Header */}
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-blue-600">
              <Cloud className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Upload Resumes</h2>
              <p className="text-slate-400 text-sm">
                Drag and drop or select files to analyze
              </p>
            </div>
          </div>

          {/* Drop Zone */}
          <motion.div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`drop-zone relative ${isDragging ? 'active' : ''}`}
            whileHover={{ scale: 1.01 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              animate={isDragging ? { scale: 1.1 } : { scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              <Upload 
              size={48} 
              className="mx-auto mb-4" 
              style={{ color: isDragging ? '#3B82F6' : '#64748B' }}
            />
          </motion.div>
          <p className="text-white text-lg font-medium mb-2">
            {isDragging ? 'Drop your files here!' : 'Drag and drop files here'}
          </p>
          <p className="text-slate-400 mb-4">or</p>
          <label className="neo-button cursor-pointer inline-flex items-center space-x-2">
            <input
              type="file"
              multiple
              accept=".pdf,.docx,.txt"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Sparkles className="w-5 h-5" />
            <span>Select Files</span>
          </label>
          <p className="text-slate-500 text-sm mt-4">
            Supported formats: PDF, DOCX, TXT (Max 15 files, 10MB each)
          </p>
        </motion.div>

        {/* Selected Files */}
        <AnimatePresence>
          {files.length > 0 && (
            <motion.div 
              className="mt-6 space-y-2"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <h3 className="text-white font-semibold mb-3 flex items-center space-x-2">
                <FileText className="w-5 h-5 text-blue-400" />
                <span>Selected Files ({files.length}/15)</span>
              </h3>
              {files.map((file, index) => (
                <motion.div
                  key={`${file.name}-${index}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ delay: index * 0.05 }}
                  className="gradient-border-card flex items-center justify-between p-4"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-500/20">
                      <FileText className="text-blue-400" size={20} />
                    </div>
                    <div>
                      <span className="text-white font-medium block">{file.name}</span>
                      <span className="text-slate-400 text-sm">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </div>
                  </div>
                  <motion.button
                    onClick={() => removeFile(index)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-500/20 hover:bg-red-500/30 transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <X size={18} className="text-red-400" />
                  </motion.button>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Upload Button with Progress */}
        <AnimatePresence>
          {files.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mt-6"
            >
              <motion.button
                onClick={handleUpload}
                disabled={uploading}
                className="neo-button w-full py-4 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
                whileHover={{ scale: uploading ? 1 : 1.02 }}
                whileTap={{ scale: uploading ? 1 : 0.98 }}
              >
                {uploading && (
                  <motion.div
                    className="absolute left-0 top-0 bottom-0 bg-white/20"
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadProgress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                )}
                <span className="relative z-10 font-semibold">
                  {uploading ? `Uploading... ${uploadProgress}%` : `Upload ${files.length} File(s)`}
                </span>
                {!uploading && <Upload className="w-5 h-5 relative z-10" />}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Success Result */}
        <AnimatePresence>
          {uploadResult && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="mt-4 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30"
            >
              <div className="flex items-center space-x-2 text-emerald-400 mb-2">
                <CheckCircle size={20} />
                <span className="font-semibold">{uploadResult.message}</span>
              </div>
              {uploadResult.resumes && uploadResult.resumes.length > 0 && (
                <div className="mt-2 text-sm text-slate-300">
                  {uploadResult.resumes.map((r: any, i: number) => (
                    <motion.div 
                      key={i} 
                      className="flex items-center space-x-2 py-1"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                    >
                      <span>• {r.filename}</span>
                      {r.is_duplicate && (
                        <span className="neo-tag text-xs bg-yellow-500/20 border-yellow-500/30 text-yellow-400">
                          Duplicate
                        </span>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </div>

      {/* Uploaded Resumes Section */}
      <div className="premium-card">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-emerald-600">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Uploaded Resumes</h2>
              <p className="text-slate-400 text-sm">
                {uploadedResumes.length} resume{uploadedResumes.length !== 1 ? 's' : ''} in database
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <motion.button
              onClick={fetchResumes}
              disabled={loadingResumes}
              className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors disabled:opacity-50"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Refresh"
            >
              <RefreshCw className={`w-5 h-5 text-slate-300 ${loadingResumes ? 'animate-spin' : ''}`} />
            </motion.button>
            {uploadedResumes.length > 0 && (
              <motion.button
                onClick={() => setShowDeleteAllConfirm(true)}
                className="px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm font-medium transition-colors flex items-center space-x-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete All</span>
              </motion.button>
            )}
          </div>
        </div>

        {/* Delete All Confirmation */}
        <AnimatePresence>
          {showDeleteAllConfirm && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 p-4 rounded-lg bg-red-500/10 border border-red-500/30"
            >
              <div className="flex items-center space-x-2 text-red-400 mb-3">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-semibold">Are you sure you want to delete all resumes?</span>
              </div>
              <p className="text-slate-400 text-sm mb-4">
                This will permanently delete all {uploadedResumes.length} resumes and their analysis data. This action cannot be undone.
              </p>
              <div className="flex items-center space-x-3">
                <motion.button
                  onClick={handleDeleteAll}
                  disabled={deletingAll}
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {deletingAll ? 'Deleting...' : 'Yes, Delete All'}
                </motion.button>
                <motion.button
                  onClick={() => setShowDeleteAllConfirm(false)}
                  className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-medium transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Cancel
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading State */}
        {loadingResumes && uploadedResumes.length === 0 && (
          <div className="text-center py-8">
            <RefreshCw className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-3" />
            <p className="text-slate-400">Loading resumes...</p>
          </div>
        )}

        {/* Empty State */}
        {!loadingResumes && uploadedResumes.length === 0 && (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No resumes uploaded yet</p>
            <p className="text-slate-500 text-sm mt-1">Upload some resumes to get started</p>
          </div>
        )}

        {/* Resume List */}
        <AnimatePresence>
          {uploadedResumes.length > 0 && (
            <motion.div className="space-y-3">
              {uploadedResumes.map((resume, index) => (
                <motion.div
                  key={resume.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ delay: index * 0.05 }}
                  className="gradient-border-card flex items-center justify-between p-4"
                >
                  <div className="flex items-center space-x-4 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-500/20 flex-shrink-0">
                      <FileText className="text-blue-400" size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{resume.filename}</p>
                      <div className="flex items-center space-x-3 text-sm text-slate-400">
                        <span>{new Date(resume.upload_date).toLocaleDateString()}</span>
                        {resume.experience_years > 0 && (
                          <span>• {resume.experience_years} yrs exp</span>
                        )}
                        {resume.skills && resume.skills.length > 0 && (
                          <span>• {resume.skills.length} skills</span>
                        )}
                      </div>
                    </div>
                    {resume.is_duplicate && (
                      <span className="neo-tag text-xs bg-yellow-500/20 border-yellow-500/30 text-yellow-400 flex-shrink-0">
                        Duplicate
                      </span>
                    )}
                  </div>
                  <motion.button
                    onClick={() => handleDeleteResume(resume.id)}
                    disabled={deletingId === resume.id}
                    className="ml-4 p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 transition-colors disabled:opacity-50 flex-shrink-0"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    title="Delete resume"
                  >
                    {deletingId === resume.id ? (
                      <RefreshCw className="w-5 h-5 text-red-400 animate-spin" />
                    ) : (
                      <Trash2 className="w-5 h-5 text-red-400" />
                    )}
                  </motion.button>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

