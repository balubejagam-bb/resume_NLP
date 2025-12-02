import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Upload, FileText, X, Bot, User, Sparkles, MessageCircle, Users } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import api from '../api/axios'
import { useResumes } from '../hooks/useResumes'
import { getErrorMessage } from '../utils/errorHandler'
import { ChatbotMultiResponse } from '../types'

// Helper function to clean markdown formatting
const cleanMarkdown = (text: string): string => {
  let cleaned = text
    // Fix double asterisks with spaces (e.g., "** text **" -> "**text**")
    .replace(/\*\*\s+/g, '**')
    .replace(/\s+\*\*/g, '**')
    // Convert lines starting with single asterisk to bullet points
    .replace(/^\s*\*\s+/gm, '- ')
    // Convert lines starting with ** as bullets (e.g., "**Skills:**" on its own line)
    .replace(/^\*\*([^*]+):\*\*\s*$/gm, '### $1')
    // Fix patterns like "**text:**text" - ensure proper spacing
    .replace(/\*\*([^*]+):\*\*([^\s])/g, '**$1:** $2')
    // Remove triple asterisks (often formatting errors)
    .replace(/\*{3,}/g, '**')
    // Convert -** to just - for bullet points
    .replace(/^-\*\*/gm, '- **')
    // Clean up multiple consecutive line breaks
    .replace(/\n{3,}/g, '\n\n')
  return cleaned
}

const formatMultiChatResponse = (payload: ChatbotMultiResponse): string => {
  const resumeSummaries = payload.resumes
    .map((resume, index) => {
      const label = resume.filename ?? `Resume ${index + 1}`
      const sourceSummary = resume.source ? `\n${resume.source}` : ''
      return `**${label}**${sourceSummary}`
    })
    .join('\n\n')

  return resumeSummaries ? `${payload.response}\n\n${resumeSummaries}` : payload.response
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export default function ChatbotTab() {
  const { resumes } = useResumes()
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hello! I'm your AI Resume Assistant. I can help you:\n\n• Analyze your resume for ATS compatibility\n• Check resume against job descriptions\n• Provide optimization suggestions\n• Answer questions about resume best practices\n\nYou can upload a resume file or select an existing one to get started!",
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedResumeId, setSelectedResumeId] = useState<string>('')
  const [chatMode, setChatMode] = useState<'single' | 'multi'>('single')
  const [multiResumeIds, setMultiResumeIds] = useState<string[]>([])
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const isMultiMode = chatMode === 'multi'

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleChatModeChange = useCallback((mode: 'single' | 'multi') => {
    setChatMode(mode)
    if (mode === 'single') {
      setMultiResumeIds([])
    } else {
      setSelectedResumeId('')
    }
  }, [])

  const toggleMultiResume = useCallback((resumeId: string) => {
    setMultiResumeIds((prev) =>
      prev.includes(resumeId)
        ? prev.filter((id) => id !== resumeId)
        : [...prev, resumeId]
    )
  }, [])

  const isResumeSelected = useCallback(
    (resumeId: string) => multiResumeIds.includes(resumeId),
    [multiResumeIds]
  )

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
    const file = e.dataTransfer.files[0]
    if (file && (file.type === 'application/pdf' || 
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.type === 'text/plain')) {
      handleFileUpload(file)
    }
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0])
    }
  }

  const handleFileUpload = async (file: File) => {
    try {
      setUploading(true)
      const formData = new FormData()
      formData.append('files', file)

      const response = await api.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      if (response.data.resumes && response.data.resumes.length > 0) {
        const newResumeId = response.data.resumes[0].id
        if (isMultiMode) {
          setMultiResumeIds((prev) =>
            prev.includes(newResumeId) ? prev : [...prev, newResumeId]
          )
        } else {
          setSelectedResumeId(newResumeId)
        }
        setUploadedFile(file)
        addMessage('assistant', `Great! I've uploaded "${file.name}". You can now ask me to analyze it, check it against a job description, or get optimization suggestions.`)
      }
    } catch (err: any) {
      addMessage('assistant', `Sorry, I couldn't upload the file: ${getErrorMessage(err)}`)
    } finally {
      setUploading(false)
    }
  }

  const addMessage = (role: 'user' | 'assistant', content: string) => {
    setMessages(prev => [...prev, { role, content, timestamp: new Date() }])
  }

  const handleSend = async () => {
    const userMessage = input.trim()
    if (!userMessage) return

    if (isMultiMode && multiResumeIds.length < 2) {
      addMessage('assistant', 'Select at least two resumes to start a multi-resume conversation.')
      return
    }

    addMessage('user', userMessage)
    setInput('')
    setLoading(true)

    try {
      const lowerMessage = userMessage.toLowerCase()
      let response: string

      if (isMultiMode) {
        if (
          lowerMessage.includes('analyze') ||
          lowerMessage.includes('analysis') ||
          lowerMessage.includes('optimize') ||
          lowerMessage.includes('suggestions')
        ) {
          addMessage('assistant', 'Bulk resume analysis happens in the Results tab. Switch to single mode for targeted analysis or keep chatting here about multiple resumes.')
          return
        }

        const multiChatResponse = await api.post<ChatbotMultiResponse>('/chatbot/chat-multi', {
          message: userMessage,
          resume_ids: multiResumeIds
        })

        response = formatMultiChatResponse(multiChatResponse.data)
      } else if (lowerMessage.includes('analyze') || lowerMessage.includes('analysis')) {
        if (!selectedResumeId) {
          addMessage('assistant', 'Please upload or select a resume first to analyze it.')
          return
        }
        const analyzeResponse = await api.post('/chatbot/analyze', {
          resume_id: selectedResumeId,
          job_description: lowerMessage.includes('job') ? userMessage : undefined,
          analysis_focus: extractAnalysisFocus(userMessage)
        })
        response = analyzeResponse.data.analysis
      } else if (
        lowerMessage.includes('optimize') ||
        lowerMessage.includes('suggestions') ||
        lowerMessage.includes('improve')
      ) {
        if (!selectedResumeId) {
          addMessage('assistant', 'Please upload or select a resume first to get optimization suggestions.')
          return
        }
        const jobDescMatch = userMessage.match(/job description[:\s]+(.*)/i)
        const jobDesc = jobDescMatch ? jobDescMatch[1] : userMessage

        const optimizeResponse = await api.post('/chatbot/optimize', {
          resume_id: selectedResumeId,
          job_description: jobDesc
        })
        response = optimizeResponse.data.suggestions
      } else {
        const chatResponse = await api.post('/chatbot/chat', {
          message: userMessage,
          resume_id: selectedResumeId || undefined
        })
        response = chatResponse.data.response
      }

      addMessage('assistant', response)
    } catch (err: any) {
      addMessage('assistant', `Sorry, I encountered an error: ${getErrorMessage(err)}`)
    } finally {
      setLoading(false)
    }
  }

  const extractAnalysisFocus = (message: string): string | undefined => {
    const lower = message.toLowerCase()
    if (lower.includes('ats') || lower.includes('compatibility')) return 'ATS compatibility'
    if (lower.includes('keyword')) return 'keyword optimization'
    if (lower.includes('format') || lower.includes('structure')) return 'formatting and structure'
    if (lower.includes('skill')) return 'skills alignment'
    return undefined
  }

  const handleQuickAction = async (action: string) => {
    if (isMultiMode) {
      addMessage('assistant', 'Quick actions are available in single resume mode. Switch back to single mode to use them.')
      return
    }

    if (!selectedResumeId) {
      addMessage('assistant', 'Please upload or select a resume first.')
      return
    }

    setInput(action)
    await handleSend()
  }

  return (
    <motion.div 
      className="max-w-6xl mx-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div 
        className="premium-card mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {/* Header */}
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-blue-600">
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">AI Resume Assistant</h2>
            <p className="text-slate-400 text-sm">
              Chat with AI to improve your resume
            </p>
          </div>
        </div>

        {/* Chat Mode Toggle */}
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <span className="text-slate-300 text-sm">Chat Mode</span>
            <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-1 flex">
              <motion.button
                onClick={() => handleChatModeChange('single')}
                className={`px-3 py-1.5 text-xs md:text-sm rounded-lg transition-colors ${
                  !isMultiMode ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'
                }`}
                whileTap={{ scale: 0.95 }}
              >
                Single
              </motion.button>
              <motion.button
                onClick={() => handleChatModeChange('multi')}
                className={`px-3 py-1.5 text-xs md:text-sm rounded-lg transition-colors ${
                  isMultiMode ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'
                }`}
                whileTap={{ scale: 0.95 }}
              >
                Multi
              </motion.button>
            </div>
          </div>
          <p className="text-xs text-slate-500 md:text-right">
            {isMultiMode
              ? 'Ask comparative questions across multiple resumes to spot strengths and gaps.'
              : 'Focus on one resume at a time for deeper analysis and optimization.'}
          </p>
        </div>

        {/* Resume Selection */}
        <div className="mb-4">
          <label className="block text-slate-300 mb-2 text-sm">
            {isMultiMode ? 'Select resumes to include' : 'Select Resume (Optional)'}
          </label>
          {isMultiMode ? (
            <div className="space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {resumes.length === 0 && (
                  <div className="text-slate-400 text-sm">
                    Upload resumes to start a multi-resume conversation.
                  </div>
                )}
                {resumes.map((resume) => {
                  const selected = isResumeSelected(resume.id)
                  return (
                    <motion.button
                      key={resume.id}
                      onClick={() => toggleMultiResume(resume.id)}
                      className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors ${
                        selected
                          ? 'border-blue-500 bg-blue-500/15 text-white'
                          : 'border-slate-700 bg-slate-800/60 text-slate-300 hover:border-blue-500/60 hover:text-white'
                      }`}
                      whileHover={{ scale: selected ? 1 : 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-slate-900/60 p-2">
                          <FileText size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{resume.filename}</p>
                          <p className="text-xs text-slate-400">Uploaded {new Date(resume.upload_date).toLocaleDateString()}</p>
                        </div>
                      </div>
                      {selected ? (
                        <span className="flex items-center gap-1 text-xs text-blue-300">
                          <Users size={14} /> Selected
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500">Tap to include</span>
                      )}
                    </motion.button>
                  )
                })}
              </div>
              <p className="text-xs text-slate-500">
                Selected {multiResumeIds.length} of {resumes.length} resumes.
              </p>
            </div>
          ) : (
            <div className="flex space-x-2">
              <select
                value={selectedResumeId}
                onChange={(e) => setSelectedResumeId(e.target.value)}
                className="neo-input flex-1"
              >
                <option value="">-- Select a resume --</option>
                {resumes.map((resume) => (
                  <option key={resume.id} value={resume.id}>
                    {resume.filename}
                  </option>
                ))}
              </select>
              {selectedResumeId && (
                <motion.button
                  onClick={() => {
                    setSelectedResumeId('')
                    setUploadedFile(null)
                  }}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white transition-colors"
                  style={{
                    background: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <X size={18} />
                </motion.button>
              )}
            </div>
          )}
        </div>

        {/* File Upload */}
        <motion.div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`drop-zone mb-4 ${isDragging ? 'active' : ''}`}
          whileHover={{ scale: 1.01 }}
        >
          <Upload size={24} className="mx-auto mb-2" style={{ color: isDragging ? '#60A5FA' : '#3B82F6' }} />
          <p className="text-white text-sm mb-2">Drag and drop resume file here</p>
          <label className="neo-button cursor-pointer inline-block text-sm py-2 px-4">
            <input
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={handleFileSelect}
              className="hidden"
              disabled={uploading}
            />
            {uploading ? 'Uploading...' : 'Select File'}
          </label>
          {uploadedFile && (
            <p className="text-slate-400 text-xs mt-2">{uploadedFile.name}</p>
          )}
        </motion.div>

        {/* Quick Actions */}
        <AnimatePresence>
          {!isMultiMode && selectedResumeId && (
            <motion.div 
              className="mb-4"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <p className="text-slate-300 text-sm mb-2">Quick Actions:</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Analyze ATS', action: 'Analyze this resume for ATS compatibility' },
                  { label: 'Check Keywords', action: 'What keywords are missing from this resume?' },
                  { label: 'Get Suggestions', action: 'How can I improve this resume?' },
                ].map((item, i) => (
                  <motion.button
                    key={item.label}
                    onClick={() => handleQuickAction(item.action)}
                    className="neo-tag cursor-pointer text-sm"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {item.label}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Chat Messages */}
      <motion.div 
        className="premium-card h-[500px] flex flex-col"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex-1 overflow-y-auto mb-4 space-y-4 pr-2">
          <AnimatePresence initial={false}>
            {messages.map((message, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: message.role === 'user' ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`flex items-start space-x-2 max-w-[80%] ${
                    message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                  }`}
                >
                  <motion.div
                    className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center bg-blue-600"
                    whileHover={{ scale: 1.05 }}
                  >
                    {message.role === 'user' ? (
                      <User size={18} className="text-white" />
                    ) : (
                      <Bot size={18} className="text-white" />
                    )}
                  </motion.div>
                  <div
                    className="chat-bubble p-4"
                    style={{
                      background: message.role === 'user'
                        ? 'rgba(59, 130, 246, 0.15)'
                        : 'var(--bg-tertiary)',
                      borderColor: message.role === 'user'
                        ? 'rgba(59, 130, 246, 0.4)'
                        : 'var(--border)',
                    }}
                  >
                    {message.role === 'assistant' ? (
                      <div className="text-white prose prose-invert prose-sm max-w-none
                        prose-headings:text-slate-300 prose-headings:font-semibold prose-headings:mb-2 prose-headings:mt-3
                        prose-p:my-1 prose-p:leading-relaxed
                        prose-ul:my-2 prose-ul:pl-4
                        prose-ol:my-2 prose-ol:pl-4
                        prose-li:my-0.5
                        prose-strong:text-slate-300
                        prose-code:bg-slate-700 prose-code:px-1 prose-code:rounded
                        prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline">
                        <ReactMarkdown>{cleanMarkdown(message.content)}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-white whitespace-pre-wrap">{message.content}</p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {/* Typing Indicator */}
          <AnimatePresence>
            {loading && (
              <motion.div 
                className="flex justify-start"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="flex items-start space-x-2">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-600">
                    <Bot size={18} className="text-white" />
                  </div>
                  <div 
                    className="chat-bubble p-4 bg-slate-800 border border-slate-700"
                  >
                    <div className="typing-dots flex space-x-1">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Ask me anything about your resume..."
            className="neo-input flex-1"
            disabled={loading}
          />
          <motion.button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="neo-button px-6 disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={{ scale: loading || !input.trim() ? 1 : 1.05 }}
            whileTap={{ scale: loading || !input.trim() ? 1 : 0.95 }}
          >
            <Send size={20} />
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

