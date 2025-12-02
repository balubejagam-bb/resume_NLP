import { useState, useEffect, useMemo, useRef } from 'react'
import { useResumes } from '../hooks/useResumes'
import { Search, Star, TrendingUp, Clock, Loader2, CheckCircle, AlertCircle, Settings, Sparkles, FileSearch, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../api/axios'
import { Analysis, BulkAnalyzeResponse } from '../types'
import { getErrorMessage } from '../utils/errorHandler'
import { getAnalysisSettings } from './SettingsTab'

export default function ResultsTab() {
  const { resumes, loading: resumesLoading } = useResumes()
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedResume, setSelectedResume] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [jobRequirements, setJobRequirements] = useState('')
  const [showJobInput, setShowJobInput] = useState(false)
  const [analysisFocus, setAnalysisFocus] = useState('')
  const [showAnalysisOptions, setShowAnalysisOptions] = useState(false)
  const [useSettings, setUseSettings] = useState(true)
  const [showModePrompt, setShowModePrompt] = useState(false)
  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkSummary, setBulkSummary] = useState<BulkAnalyzeResponse | null>(null)
  const [selectedBulkResumeIds, setSelectedBulkResumeIds] = useState<string[]>([])
  const [analysisProgress, setAnalysisProgress] = useState<{
    status: 'idle' | 'parsing' | 'analyzing' | 'scoring' | 'complete' | 'error';
    message: string;
    startTime?: number;
    elapsedTime?: number;
  }>({ status: 'idle', message: '' })
  const bulkSelectionInitialized = useRef(false)
  const allResumeIds = useMemo(() => resumes.map(resume => resume.id), [resumes])

  useEffect(() => {
    if (selectedResume) {
      fetchAnalysis(selectedResume, { promptOnExisting: true })
      setShowJobInput(false)
      setShowAnalysisOptions(false)
      setJobRequirements('')
      setAnalysisFocus('')
      setAnalysisProgress({ status: 'idle', message: '' })
      setShowModePrompt(false)
      setUseSettings(true)
      setError(null)
    } else {
      setShowModePrompt(false)
    }
  }, [selectedResume])

  useEffect(() => {
    setSelectedBulkResumeIds(prev => {
      const filtered = prev.filter(id => allResumeIds.includes(id))
      if (!bulkSelectionInitialized.current && allResumeIds.length > 0) {
        bulkSelectionInitialized.current = true
        return allResumeIds
      }
      return filtered
    })
  }, [allResumeIds])

  const selectedBulkCount = selectedBulkResumeIds.length
  const isAllSelected = selectedBulkCount > 0 && selectedBulkCount === allResumeIds.length

  const toggleBulkResume = (resumeId: string) => {
    setSelectedBulkResumeIds(prev =>
      prev.includes(resumeId)
        ? prev.filter(id => id !== resumeId)
        : [...prev, resumeId]
    )
  }

  const handleSelectAllBulk = () => {
    setSelectedBulkResumeIds(allResumeIds)
  }

  const handleClearBulkSelection = () => {
    setSelectedBulkResumeIds([])
  }

  const fetchAnalysis = async (resumeId: string, options: { promptOnExisting?: boolean } = {}) => {
    const { promptOnExisting = false } = options
    try {
      setError(null)
      const response = await api.get(`/analyses/${resumeId}`)
      setAnalyses(prev => {
        const existing = prev.find(a => a.id === response.data.id)
        if (existing) return prev
        return [...prev, response.data]
      })

      if (promptOnExisting) {
        setShowModePrompt(true)
      }
    } catch (err: any) {
      // Don't show error if analysis doesn't exist yet (404)
      if (err.response?.status !== 404) {
        setError(getErrorMessage(err))
        console.error('Failed to fetch analysis:', err)
      } else if (promptOnExisting) {
        setShowModePrompt(true)
      }
    }
  }

  const handleAnalyze = async (resumeId: string | null) => {
    if (!resumeId) {
      setError('Please select a resume to analyze first.')
      return
    }

    try {
      setLoading(true)
      setError(null)
      const startTime = Date.now()
      
      // Start progress tracking
      setAnalysisProgress({ 
        status: 'parsing', 
        message: 'Parsing resume content...', 
        startTime,
        elapsedTime: 0
      })
      
      // Update elapsed time every 100ms
      const timer = setInterval(() => {
        setAnalysisProgress(prev => ({
          ...prev,
          elapsedTime: Date.now() - startTime
        }))
      }, 100)
      
      // Simulate parsing phase
      await new Promise(resolve => setTimeout(resolve, 500))
      setAnalysisProgress(prev => ({ 
        ...prev, 
        status: 'analyzing', 
        message: 'AI analyzing resume...' 
      }))
      
      // Get settings if enabled
      let jobDesc = jobRequirements.trim() || undefined
      let focus = analysisFocus.trim() || undefined
      let skills: string[] = []
      let targetJob = ''
      let targetIndustry = ''
      
      if (useSettings) {
        const settings = getAnalysisSettings()
        
        // Use active job description if available
        if (settings.activeJobDescription) {
          const jd = settings.activeJobDescription
          jobDesc = `Job Title: ${jd.title}\n${jd.company ? `Company: ${jd.company}\n` : ''}Description: ${jd.description}\n${jd.requirements.length > 0 ? `Requirements:\n${jd.requirements.map(r => `- ${r}`).join('\n')}` : ''}`
        }
        
        // Use settings focus if not manually set
        if (!focus && settings.analysisFocus) {
          focus = settings.analysisFocus
        }
        
        skills = settings.selectedSkills || []
        targetJob = settings.targetJobTitle || ''
        targetIndustry = settings.targetIndustry || ''
      }
      
      // Build enhanced job description with settings
      let enhancedJobDesc = jobDesc || ''
      if (targetJob || targetIndustry || skills.length > 0) {
        const extras = []
        if (targetJob) extras.push(`Target Position: ${targetJob}`)
        if (targetIndustry) extras.push(`Target Industry: ${targetIndustry}`)
        if (skills.length > 0) extras.push(`Required Skills: ${skills.join(', ')}`)
        
        if (enhancedJobDesc) {
          enhancedJobDesc += '\n\n--- Additional Criteria ---\n' + extras.join('\n')
        } else {
          enhancedJobDesc = extras.join('\n')
        }
      }
      
      // Make the actual API call
      await api.post('/analyze_single', { 
        resume_id: resumeId,
        job_description: enhancedJobDesc || undefined,
        analysis_focus: focus
      })
      
      setAnalysisProgress(prev => ({ 
        ...prev, 
        status: 'scoring', 
        message: 'Calculating scores and generating report...' 
      }))
      
      await new Promise(resolve => setTimeout(resolve, 300))
      
      clearInterval(timer)
      
      const finalTime = Date.now() - startTime
      setAnalysisProgress({ 
        status: 'complete', 
        message: `Analysis complete in ${(finalTime / 1000).toFixed(1)}s`,
        elapsedTime: finalTime
      })
      
      await fetchAnalysis(resumeId, { promptOnExisting: false })
      setShowJobInput(false)
      setShowAnalysisOptions(false)
      setJobRequirements('')
      setAnalysisFocus('')
      
      // Reset progress after a delay
      setTimeout(() => {
        setAnalysisProgress({ status: 'idle', message: '' })
      }, 3000)
      
    } catch (err: any) {
      setAnalysisProgress({ 
        status: 'error', 
        message: getErrorMessage(err) 
      })
      setError(getErrorMessage(err))
      console.error('Analysis failed:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkBest = async (resumeId: string) => {
    try {
      await api.post(`/mark_best?resume_id=${resumeId}`)
      await fetchAnalysis(resumeId, { promptOnExisting: false })
      // Refresh all analyses
      setAnalyses(prev => prev.map(a => 
        a.resume_id === resumeId ? { ...a, is_best: true } : { ...a, is_best: false }
      ))
    } catch (err: any) {
      console.error('Failed to mark as best:', err)
    }
  }

  const filteredResumes = resumes.filter(r =>
    r.filename.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const selectedAnalysis = analyses.find(a => a.resume_id === selectedResume)
  const analyzeButtonLabel = isAllSelected ? 'Analyze All Resumes' : 'Analyze Selected'
  const bulkActionDisabled = bulkLoading || resumes.length === 0 || selectedBulkResumeIds.length === 0

  const handleBulkAnalyze = async () => {
    if (resumes.length === 0) {
      setError('Upload at least one resume before running bulk analysis.')
      return
    }

    if (selectedBulkResumeIds.length === 0) {
      setError('Select at least one resume to run bulk analysis.')
      return
    }

    setBulkLoading(true)
    try {
      const response = await api.post('/analyses/bulk', {
        resume_ids: selectedBulkResumeIds,
        auto_mark_best: true
      })
      const data: BulkAnalyzeResponse = response.data

      const normalizedAnalyses: Analysis[] = data.analyses.map(item => ({
        id: item.analysis_id,
        resume_id: item.resume_id,
        filename: item.filename,
        component_scores: item.component_scores,
        gemini_analysis: item.gemini_analysis,
        created_at: new Date(item.created_at).toISOString(),
        is_best: item.is_best
      }))

      setAnalyses(prev => {
        const map = new Map<string, Analysis>()
        prev.forEach(a => map.set(a.resume_id, a))
        normalizedAnalyses.forEach(a => map.set(a.resume_id, a))
        return Array.from(map.values()).sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
      })

      if (data.best_resume) {
        setSelectedResume(data.best_resume.resume_id)
      }

      setBulkSummary(data)
      setError(null)
    } catch (err: any) {
      setError(getErrorMessage(err))
    } finally {
      setBulkLoading(false)
    }
  }

  // Animation variants
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.1, duration: 0.4 }
    })
  }

  const tagVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: { delay: i * 0.05, duration: 0.3 }
    })
  }

  return (
    <motion.div 
      className="max-w-7xl mx-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="premium-card mb-6">
        {/* Header */}
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-blue-600">
            <FileSearch className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Resume Results</h2>
            <p className="text-slate-400 text-sm">
              Analyze and compare your resumes
            </p>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="space-y-2">
            <p className="text-slate-400 text-sm">
              Need a bird's-eye view? Run a full portfolio analysis and let AI highlight the strongest resume automatically.
            </p>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span className="px-2 py-1 rounded-lg bg-slate-800/60 border border-slate-700">
                Selected {selectedBulkCount} of {resumes.length} resumes
              </span>
              <button
                onClick={handleSelectAllBulk}
                disabled={isAllSelected || resumes.length === 0}
                className={`px-2 py-1 rounded-lg border transition-colors ${
                  isAllSelected || resumes.length === 0
                    ? 'border-slate-800 text-slate-600 cursor-not-allowed'
                    : 'border-slate-700 hover:border-blue-400 hover:text-white'
                }`}
              >
                Select All
              </button>
              <button
                onClick={handleClearBulkSelection}
                disabled={selectedBulkCount === 0}
                className={`px-2 py-1 rounded-lg border transition-colors ${
                  selectedBulkCount === 0
                    ? 'border-slate-800 text-slate-600 cursor-not-allowed'
                    : 'border-slate-700 hover:border-rose-400 hover:text-white'
                }`}
              >
                Clear
              </button>
            </div>
          </div>
          <motion.button
            onClick={() => void handleBulkAnalyze()}
            disabled={bulkActionDisabled}
            className={`neo-button flex items-center justify-center gap-2 ${bulkActionDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}
            whileHover={{ scale: bulkActionDisabled ? 1 : 1.05 }}
            whileTap={{ scale: bulkActionDisabled ? 1 : 0.95 }}
          >
            {bulkLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            <span>{bulkLoading ? 'Analyzing...' : analyzeButtonLabel}</span>
          </motion.button>
        </div>

        <AnimatePresence>
          {bulkSummary && (
            <motion.div
              className="gradient-border-card p-4 mb-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                  <h3 className="text-white font-semibold text-lg">Bulk Analysis Summary</h3>
                  <p className="text-slate-400 text-sm mt-1">
                    Reviewed {bulkSummary.analyzed_count} of {bulkSummary.total_resumes} resumes.
                    {bulkSummary.job_description_provided ? ' Job preferences were applied.' : ' No job description was supplied.'}
                  </p>
                  {bulkSummary.failures.length > 0 && (
                    <div className="mt-3 text-xs text-red-300 space-y-1">
                      <p className="font-medium">Unable to analyze:</p>
                      {bulkSummary.failures.map(failure => (
                        <p key={failure.resume_id}>
                          • {failure.filename ?? failure.resume_id}: {failure.error}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
                {bulkSummary.best_resume && (
                  <div className="md:text-right">
                    <p className="text-slate-400 text-sm">Recommended Resume</p>
                    <p className="text-white font-semibold text-base mt-1">{bulkSummary.best_resume.filename}</p>
                    <p className="text-slate-500 text-sm">
                      Composite Score: {bulkSummary.best_resume.final_score.toFixed(1)}
                    </p>
                    {bulkSummary.best_resume_reason && (
                      <p className="text-slate-500/70 text-xs mt-2">{bulkSummary.best_resume_reason}</p>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search Input */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500" size={20} />
          <input
            type="text"
            placeholder="Search resumes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="neo-input w-full pl-12"
          />
        </div>
        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 p-4 rounded-xl text-red-300"
              style={{
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(220, 38, 38, 0.2) 100%)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
              }}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {resumesLoading ? (
          <div className="text-center text-slate-400 py-8">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
            Loading resumes...
          </div>
        ) : filteredResumes.length === 0 ? (
          <div className="text-center text-slate-400 py-8">No resumes found</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredResumes.map((resume, index) => {
              const analysis = analyses.find(a => a.resume_id === resume.id)
              const isBulkSelected = selectedBulkResumeIds.includes(resume.id)
              return (
                <motion.div
                  key={resume.id}
                  custom={index}
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  whileHover={{ scale: 1.02, y: -5 }}
                  className={`gradient-border-card p-4 cursor-pointer transition-all duration-300 ${
                    selectedResume === resume.id
                      ? 'ring-2 ring-blue-500'
                      : ''
                  } ${
                    isBulkSelected ? 'border border-blue-500/40' : ''
                  }`}
                  style={{
                    background: selectedResume === resume.id 
                      ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(42, 15, 82, 0.3) 100%)'
                      : undefined
                  }}
                  onClick={() => setSelectedResume(resume.id)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-white font-semibold truncate flex-1 mr-2">{resume.filename}</h3>
                    <div className="flex items-center gap-2">
                      <motion.button
                        onClick={(event) => {
                          event.stopPropagation()
                          toggleBulkResume(resume.id)
                        }}
                        className={`text-xs px-2 py-1 rounded-lg border transition-colors ${
                          isBulkSelected
                            ? 'border-blue-400 bg-blue-500/20 text-blue-200'
                            : 'border-slate-700 text-slate-400 hover:border-blue-400 hover:text-white'
                        }`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {isBulkSelected ? 'Included' : 'Include'}
                      </motion.button>
                      {analysis?.is_best && (
                        <motion.div
                          animate={{ rotate: [0, 10, -10, 0] }}
                          transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 3 }}
                        >
                          <Star className="text-yellow-400 fill-yellow-400" size={20} />
                        </motion.div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {resume.skills.slice(0, 3).map((skill, i) => (
                      <motion.span 
                        key={i} 
                        custom={i}
                        variants={tagVariants}
                        initial="hidden"
                        animate="visible"
                        className="neo-tag text-xs"
                      >
                        {skill}
                      </motion.span>
                    ))}
                    {resume.skills.length > 3 && (
                      <span className="neo-tag text-xs">+{resume.skills.length - 3}</span>
                    )}
                  </div>
                  {analysis ? (
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="text-green-400" size={16} />
                      <span className="text-green-400 font-semibold">
                        ATS: {analysis.gemini_analysis.ats_score.toFixed(0)}%
                      </span>
                    </div>
                  ) : (
                    <motion.button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedResume(resume.id)
                        setShowJobInput(true)
                      }}
                      className="neo-button text-sm py-2 px-4 w-full mt-2"
                      disabled={loading}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Sparkles className="w-4 h-4 inline mr-2" />
                      Analyze
                    </motion.button>
                  )}
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {selectedResume && !selectedAnalysis && (
        <motion.div 
          className="premium-card mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h3 className="text-xl font-bold text-white mb-4">
            {resumes.find(r => r.id === selectedResume)?.filename}
          </h3>
          
          {!showJobInput ? (
            <div className="space-y-4">
              {/* Show active settings */}
              {(() => {
                const settings = getAnalysisSettings()
                const hasSettings = settings.activeJobDescription || settings.analysisFocus || settings.selectedSkills.length > 0 || settings.targetJobTitle || settings.targetIndustry
                return hasSettings ? (
                  <div className="gradient-border-card p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-white font-semibold flex items-center space-x-2">
                        <Settings size={16} className="text-slate-500" />
                        <span>Active Settings</span>
                      </h4>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={useSettings}
                          onChange={(e) => setUseSettings(e.target.checked)}
                          className="w-4 h-4 rounded border-blue-500/50 text-blue-600 focus:ring-blue-500 bg-transparent"
                        />
                        <span className="text-slate-400 text-sm">Use Settings</span>
                      </label>
                    </div>
                    <div className="space-y-2 text-sm">
                      {settings.activeJobDescription && (
                        <div className="flex items-center space-x-2">
                          <span className="text-slate-400">Job:</span>
                          <span className="text-slate-500">{settings.activeJobDescription.title}</span>
                          {settings.activeJobDescription.company && (
                            <span className="text-slate-500/60">@ {settings.activeJobDescription.company}</span>
                          )}
                        </div>
                      )}
                      {settings.analysisFocus && (
                        <div className="flex items-center space-x-2">
                          <span className="text-slate-400">Focus:</span>
                          <span className="text-slate-500">{settings.analysisFocus}</span>
                        </div>
                      )}
                      {settings.targetJobTitle && (
                        <div className="flex items-center space-x-2">
                          <span className="text-slate-400">Target:</span>
                          <span className="text-slate-500">{settings.targetJobTitle}</span>
                        </div>
                      )}
                      {settings.targetIndustry && (
                        <div className="flex items-center space-x-2">
                          <span className="text-slate-400">Industry:</span>
                          <span className="text-slate-500">{settings.targetIndustry}</span>
                        </div>
                      )}
                      {settings.selectedSkills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {settings.selectedSkills.slice(0, 5).map(skill => (
                            <span key={skill} className="neo-tag text-xs">{skill}</span>
                          ))}
                          {settings.selectedSkills.length > 5 && (
                            <span className="neo-tag text-xs">+{settings.selectedSkills.length - 5} more</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ) : null
              })()}
              
              <motion.button
                onClick={() => {
                  if (!selectedResume) {
                    setError('Please select a resume before choosing analysis options.')
                    return
                  }
                  setShowJobInput(true)
                  setShowAnalysisOptions(true)
                }}
                className={`neo-button w-full ${!selectedResume ? 'opacity-60 cursor-not-allowed' : ''}`}
                disabled={!selectedResume}
                whileHover={{ scale: selectedResume ? 1.02 : 1 }}
                whileTap={{ scale: selectedResume ? 0.98 : 1 }}
              >
                <Sparkles className="w-5 h-5 inline mr-2" />
                Analyze Resume with Advanced Options
              </motion.button>
              <motion.button
                onClick={() => {
                  if (!selectedResume) {
                    setError('Please select a resume before running Quick Analyze.')
                    return
                  }
                  setShowModePrompt(true)
                }}
                disabled={loading || !selectedResume}
                className={`w-full py-3 rounded-xl text-slate-400 hover:text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${!selectedResume ? 'cursor-not-allowed' : ''}`}
                style={{
                  background: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                }}
                whileHover={{ background: 'rgba(59, 130, 246, 0.2)' }}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span>{loading ? 'Analyzing...' : 'Quick Analyze (Use Settings)'}</span>
              </motion.button>
              <p className="text-slate-500/70 text-xs text-center">
                Get real-time dynamic AI-powered analysis
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-slate-300 mb-2">
                  How would you like to analyze this resume?
                </label>
                <select
                  value={analysisFocus}
                  onChange={(e) => setAnalysisFocus(e.target.value)}
                  className="neo-input w-full mb-3"
                >
                  <option value="">General Analysis (Default)</option>
                  <option value="ATS compatibility">ATS Compatibility Focus</option>
                  <option value="keyword optimization">Keyword Optimization</option>
                  <option value="formatting and structure">Formatting & Structure</option>
                  <option value="skills alignment">Skills Alignment</option>
                  <option value="experience relevance">Experience Relevance</option>
                  <option value="education match">Education Match</option>
                </select>
                <p className="text-slate-500/70 text-xs mb-4">
                  Select a focus area for more targeted analysis
                </p>
              </div>
              
              <div>
                <label className="block text-slate-300 mb-2">
                  Job Requirements/Description (Optional)
                </label>
                <textarea
                  value={jobRequirements}
                  onChange={(e) => setJobRequirements(e.target.value)}
                  placeholder="Enter job description, requirements, or leave empty for general analysis..."
                  className="neo-input w-full h-32 resize-none"
                />
                <p className="text-slate-500/70 text-xs mt-2">
                  Providing job requirements will improve the analysis accuracy and match percentage
                </p>
              </div>
              
              <div className="flex space-x-2">
                <motion.button
                  onClick={() => void handleAnalyze(selectedResume)}
                  disabled={loading}
                  className="neo-button flex-1 disabled:opacity-50"
                  whileHover={{ scale: loading ? 1 : 1.02 }}
                  whileTap={{ scale: loading ? 1 : 0.98 }}
                >
                  {loading ? 'Analyzing...' : 'Start Analysis'}
                </motion.button>
                <motion.button
                  onClick={() => {
                    setShowJobInput(false)
                    setShowAnalysisOptions(false)
                    setJobRequirements('')
                    setAnalysisFocus('')
                  }}
                  className="px-6 py-3 rounded-xl text-slate-400 hover:text-white transition-colors"
                  style={{
                    background: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                  }}
                  whileHover={{ background: 'rgba(59, 130, 246, 0.2)' }}
                >
                  Cancel
                </motion.button>
              </div>
              
              {/* Analysis Progress Indicator */}
              <AnimatePresence>
                {loading && analysisProgress.status !== 'idle' && (
                  <motion.div 
                    className="mt-4 p-4 rounded-xl"
                    style={{
                      background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(42, 15, 82, 0.15) 100%)',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                    }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        {analysisProgress.status === 'complete' ? (
                          <CheckCircle className="text-green-400" size={20} />
                        ) : analysisProgress.status === 'error' ? (
                          <AlertCircle className="text-red-400" size={20} />
                        ) : (
                          <Loader2 className="text-slate-500 animate-spin" size={20} />
                        )}
                        <span className="text-white font-medium">{analysisProgress.message}</span>
                      </div>
                      {analysisProgress.elapsedTime !== undefined && (
                        <div className="flex items-center space-x-2 text-slate-400">
                          <Clock size={16} />
                          <span className="font-mono text-sm">
                            {(analysisProgress.elapsedTime / 1000).toFixed(1)}s
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(59, 130, 246, 0.2)' }}>
                      <motion.div 
                        className="h-full"
                        style={{ 
                          background: analysisProgress.status === 'complete' 
                            ? 'linear-gradient(90deg, #22C55E, #10B981)' 
                            : analysisProgress.status === 'error'
                            ? 'linear-gradient(90deg, #EF4444, #DC2626)'
                            : 'linear-gradient(90deg, #3B82F6, #60A5FA)'
                        }}
                        initial={{ width: 0 }}
                        animate={{ 
                          width: analysisProgress.status === 'parsing' ? '25%' 
                               : analysisProgress.status === 'analyzing' ? '60%'
                               : analysisProgress.status === 'scoring' ? '85%'
                               : '100%'
                        }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                    
                    {/* Progress Steps */}
                    <div className="flex justify-between mt-3 text-xs">
                      {['Parse', 'AI Analysis', 'Score', 'Complete'].map((step, i) => {
                        const states = [['parsing', 'analyzing', 'scoring', 'complete'], ['analyzing', 'scoring', 'complete'], ['scoring', 'complete'], ['complete']]
                        const isActive = states[i].includes(analysisProgress.status)
                        return (
                          <div key={step} className={`flex items-center space-x-1 ${isActive ? 'text-slate-500' : 'text-slate-500/40'}`}>
                            <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-slate-500' : 'bg-slate-500/40'}`} />
                            <span>{step}</span>
                          </div>
                        )
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      )}

      <AnimatePresence>
        {showModePrompt && selectedResume && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="gradient-border-card max-w-lg w-full mx-4 p-6 relative"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <button
                onClick={() => setShowModePrompt(false)}
                className="absolute top-4 right-4 text-slate-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold text-white">Choose Your Analysis Mode</h3>
                  <p className="text-slate-400 text-sm mt-1">
                    Decide whether to apply your saved preferences or customize the analysis for <span className="text-white/80">{resumes.find(r => r.id === selectedResume)?.filename ?? 'this resume'}</span>.
                  </p>
                </div>
                {(() => {
                  const settings = getAnalysisSettings()
                  const hasSettings = settings.activeJobDescription || settings.analysisFocus || settings.selectedSkills.length > 0 || settings.targetJobTitle || settings.targetIndustry
                  if (!hasSettings) {
                    return (
                      <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 text-sm text-blue-100">
                        No saved analysis settings were found. Switch to advanced options to provide job details or adjust the focus before analyzing.
                      </div>
                    )
                  }
                  return (
                    <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 text-sm space-y-2 text-blue-100">
                      {settings.activeJobDescription && (
                        <div>
                          <p className="font-semibold text-white flex items-center justify-between">
                            <span>{settings.activeJobDescription.title}</span>
                            {settings.activeJobDescription.company && <span className="text-xs text-blue-200">{settings.activeJobDescription.company}</span>}
                          </p>
                          <p className="text-blue-200/80 text-xs mt-1 line-clamp-2">{settings.activeJobDescription.description}</p>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2 text-xs">
                        {settings.targetJobTitle && <span className="neo-tag">Target: {settings.targetJobTitle}</span>}
                        {settings.targetIndustry && <span className="neo-tag">Industry: {settings.targetIndustry}</span>}
                        {settings.analysisFocus && <span className="neo-tag">Focus: {settings.analysisFocus}</span>}
                      </div>
                      {settings.selectedSkills.length > 0 && (
                        <div className="flex flex-wrap gap-2 text-xs">
                          {settings.selectedSkills.slice(0, 6).map(skill => (
                            <span key={skill} className="neo-tag">{skill}</span>
                          ))}
                          {settings.selectedSkills.length > 6 && (
                            <span className="neo-tag">+{settings.selectedSkills.length - 6} more</span>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })()}
                <div className="grid sm:grid-cols-2 gap-3">
                  <motion.button
                    onClick={() => {
                      if (loading) return
                      setShowModePrompt(false)
                      void handleAnalyze(selectedResume)
                    }}
                    disabled={loading}
                    className={`neo-button flex items-center justify-center gap-2 ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    <span>{loading ? 'Analyzing...' : 'Continue with Saved Settings'}</span>
                  </motion.button>
                  <motion.button
                    onClick={() => {
                      setShowModePrompt(false)
                      setShowJobInput(true)
                      setShowAnalysisOptions(true)
                    }}
                    className="px-4 py-3 rounded-xl text-slate-300 border border-blue-500/40 hover:text-white hover:border-blue-400 transition"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Configure Advanced Options
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {selectedAnalysis && (
        <motion.div 
          className="premium-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-white">{selectedAnalysis.filename}</h3>
              <p className="text-slate-400 text-sm mt-1">
                Analyzed on {new Date(selectedAnalysis.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
            <div className="flex space-x-2">
              <motion.button
                onClick={() => {
                  setShowJobInput(true)
                  setSelectedResume(null)
                  setTimeout(() => {
                    setSelectedResume(selectedAnalysis.resume_id)
                    setJobRequirements('')
                  }, 100)
                }}
                className="neo-button text-sm"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Re-analyze
              </motion.button>
              <motion.button
                onClick={() => handleMarkBest(selectedAnalysis.resume_id)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  selectedAnalysis.is_best ? 'opacity-50' : ''
                }`}
                style={{
                  background: selectedAnalysis.is_best 
                    ? 'rgba(234, 179, 8, 0.2)'
                    : 'linear-gradient(135deg, rgba(234, 179, 8, 0.3) 0%, rgba(251, 191, 36, 0.3) 100%)',
                  border: '1px solid rgba(234, 179, 8, 0.4)',
                  color: '#FCD34D'
                }}
                whileHover={{ scale: selectedAnalysis.is_best ? 1 : 1.05 }}
                whileTap={{ scale: selectedAnalysis.is_best ? 1 : 0.95 }}
              >
                {selectedAnalysis.is_best ? '⭐ Best Resume' : 'Mark as Best'}
              </motion.button>
            </div>
          </div>

          {/* Score Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <motion.div 
              className="gradient-border-card p-6"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <h4 className="text-slate-300 font-semibold mb-3">ATS Score</h4>
              <div 
                className="text-5xl font-bold mb-2"
                style={{
                  background: 'linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {selectedAnalysis.gemini_analysis.ats_score.toFixed(0)}%
              </div>
              <div className="text-slate-400 text-sm">
                Match: {selectedAnalysis.gemini_analysis.match_percentage.toFixed(0)}%
              </div>
            </motion.div>

            <motion.div 
              className="gradient-border-card p-6"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <h4 className="text-slate-300 font-semibold mb-3">Component Scores</h4>
              <div className="space-y-3">
                {Object.entries(selectedAnalysis.component_scores).map(([key, value], i) => (
                  <motion.div 
                    key={key} 
                    className="flex items-center justify-between"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <span className="text-slate-300 text-sm capitalize">
                      {key.replace('_', ' ')}
                    </span>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(59, 130, 246, 0.2)' }}>
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: 'linear-gradient(90deg, #3B82F6, #60A5FA)' }}
                          initial={{ width: 0 }}
                          animate={{ width: `${value}%` }}
                          transition={{ delay: i * 0.1 + 0.3, duration: 0.5 }}
                        />
                      </div>
                      <span className="text-white text-sm font-semibold w-10 text-right">
                        {value.toFixed(0)}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Keywords and Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <motion.div 
              className="gradient-border-card p-6"
              whileHover={{ scale: 1.01 }}
            >
              <h4 className="text-slate-300 font-semibold mb-4">Keywords</h4>
              <div className="mb-4">
                <p className="text-slate-400 text-sm mb-2">Found ({selectedAnalysis.gemini_analysis.keyword_analysis.found.length})</p>
                <div className="flex flex-wrap gap-2">
                  {selectedAnalysis.gemini_analysis.keyword_analysis.found.map((kw, i) => (
                    <motion.span 
                      key={i} 
                      className="neo-tag text-xs"
                      style={{ background: 'rgba(34, 197, 94, 0.2)', borderColor: 'rgba(34, 197, 94, 0.4)', color: '#4ADE80' }}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.03 }}
                    >
                      {kw}
                    </motion.span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-slate-400 text-sm mb-2">Missing ({selectedAnalysis.gemini_analysis.keyword_analysis.missing.length})</p>
                <div className="flex flex-wrap gap-2">
                  {selectedAnalysis.gemini_analysis.keyword_analysis.missing.map((kw, i) => (
                    <motion.span 
                      key={i} 
                      className="neo-tag text-xs"
                      style={{ background: 'rgba(239, 68, 68, 0.2)', borderColor: 'rgba(239, 68, 68, 0.4)', color: '#F87171' }}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.03 }}
                    >
                      {kw}
                    </motion.span>
                  ))}
                </div>
              </div>
            </motion.div>

            <motion.div 
              className="gradient-border-card p-6"
              whileHover={{ scale: 1.01 }}
            >
              <h4 className="text-slate-300 font-semibold mb-4">Sections</h4>
              <div className="space-y-3">
                {selectedAnalysis.gemini_analysis.section_analysis.map((section, i) => (
                  <motion.div 
                    key={i} 
                    className="flex items-center justify-between"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ 
                          background: section.present 
                            ? 'linear-gradient(135deg, #22C55E, #10B981)' 
                            : 'linear-gradient(135deg, #EF4444, #DC2626)',
                          boxShadow: section.present 
                            ? '0 0 10px rgba(34, 197, 94, 0.5)'
                            : '0 0 10px rgba(239, 68, 68, 0.5)'
                        }}
                      />
                      <span className="text-slate-300 text-sm">{section.name}</span>
                    </div>
                    <span className="text-white text-sm font-semibold">{section.score}%</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Strengths, Weaknesses, Recommendations */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div 
              className="gradient-border-card p-6"
              whileHover={{ scale: 1.02 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h4 className="text-green-400 font-semibold mb-4 flex items-center space-x-2">
                <CheckCircle size={18} />
                <span>Strengths</span>
              </h4>
              <ul className="space-y-2">
                {selectedAnalysis.gemini_analysis.strengths.map((strength, i) => (
                  <motion.li 
                    key={i} 
                    className="text-green-300 text-sm flex items-start"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 + 0.3 }}
                  >
                    <span className="mr-2 text-green-400">✓</span>
                    <span>{strength}</span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>

            <motion.div 
              className="gradient-border-card p-6"
              whileHover={{ scale: 1.02 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h4 className="text-red-400 font-semibold mb-4 flex items-center space-x-2">
                <AlertCircle size={18} />
                <span>Weaknesses</span>
              </h4>
              <ul className="space-y-2">
                {selectedAnalysis.gemini_analysis.weaknesses.map((weakness, i) => (
                  <motion.li 
                    key={i} 
                    className="text-red-300 text-sm flex items-start"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 + 0.4 }}
                  >
                    <span className="mr-2 text-red-400">✗</span>
                    <span>{weakness}</span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>

            <motion.div 
              className="gradient-border-card p-6"
              whileHover={{ scale: 1.02 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <h4 className="text-blue-400 font-semibold mb-4 flex items-center space-x-2">
                <Sparkles size={18} />
                <span>Recommendations</span>
              </h4>
              <ul className="space-y-2">
                {selectedAnalysis.gemini_analysis.recommendations.map((rec, i) => (
                  <motion.li 
                    key={i} 
                    className="text-blue-300 text-sm flex items-start"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 + 0.5 }}
                  >
                    <span className="mr-2 text-blue-400">→</span>
                    <span>{rec}</span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}

