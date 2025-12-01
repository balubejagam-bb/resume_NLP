import { useState, useEffect, useCallback } from 'react'
import { CheckCircle, Save, Plus, X, Briefcase, Settings2, Target, FileText, Trash2, Cog } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../api/axios'
import { getErrorMessage } from '../utils/errorHandler'

// Predefined options for dropdowns
const SKILL_OPTIONS = [
  'Python', 'JavaScript', 'TypeScript', 'React', 'Node.js', 'Java', 'C++', 'C#',
  'SQL', 'MongoDB', 'PostgreSQL', 'AWS', 'Azure', 'Docker', 'Kubernetes',
  'Machine Learning', 'Data Analysis', 'TensorFlow', 'PyTorch', 'Git',
  'REST APIs', 'GraphQL', 'HTML', 'CSS', 'Tailwind CSS', 'Vue.js', 'Angular',
  'Django', 'Flask', 'FastAPI', 'Spring Boot', 'Express.js', 'Next.js',
  'Communication', 'Leadership', 'Problem Solving', 'Team Collaboration',
  'Project Management', 'Agile', 'Scrum', 'CI/CD', 'DevOps'
]

const JOB_TITLE_OPTIONS = [
  'Software Engineer', 'Senior Software Engineer', 'Full Stack Developer',
  'Frontend Developer', 'Backend Developer', 'Data Scientist', 'Data Analyst',
  'Machine Learning Engineer', 'DevOps Engineer', 'Cloud Engineer',
  'Product Manager', 'Project Manager', 'UI/UX Designer', 'QA Engineer',
  'Mobile Developer', 'iOS Developer', 'Android Developer', 'Technical Lead',
  'Engineering Manager', 'Solutions Architect', 'System Administrator',
  'Database Administrator', 'Security Engineer', 'Network Engineer'
]

const INDUSTRY_OPTIONS = [
  'Technology', 'Healthcare', 'Finance', 'Education', 'E-commerce', 'Retail',
  'Manufacturing', 'Telecommunications', 'Media & Entertainment', 'Gaming',
  'Automotive', 'Aerospace', 'Energy', 'Real Estate', 'Consulting',
  'Legal', 'Government', 'Non-profit', 'Insurance', 'Logistics'
]

const ANALYSIS_FOCUS_OPTIONS = [
  { value: '', label: 'General Analysis (All aspects)' },
  { value: 'ATS compatibility', label: 'ATS Compatibility' },
  { value: 'keyword optimization', label: 'Keyword Optimization' },
  { value: 'formatting and structure', label: 'Formatting & Structure' },
  { value: 'skills alignment', label: 'Skills Alignment' },
  { value: 'experience relevance', label: 'Experience Relevance' },
  { value: 'education match', label: 'Education Match' },
  { value: 'career progression', label: 'Career Progression' },
  { value: 'achievements impact', label: 'Achievements & Impact' }
]

interface JobDescription {
  id: string
  title: string
  company: string
  description: string
  requirements: string[]
  createdAt: string
}

interface AnalysisSettings {
  selectedSkills: string[]
  targetJobTitle: string
  targetIndustry: string
  analysisFocus: string
  activeJobDescription: JobDescription | null
}

const persistAnalysisSettingsLocally = (settings: AnalysisSettings, jobs: JobDescription[]) => {
  localStorage.setItem('analysisSettings', JSON.stringify(settings))
  localStorage.setItem('jobDescriptions', JSON.stringify(jobs))
}

// Export settings getter for other components
export const getAnalysisSettings = (): AnalysisSettings => {
  const saved = localStorage.getItem('analysisSettings')
  if (saved) {
    return JSON.parse(saved)
  }
  return {
    selectedSkills: [],
    targetJobTitle: '',
    targetIndustry: '',
    analysisFocus: '',
    activeJobDescription: null
  }
}

export default function SettingsTab() {
  // Settings state
  const [settings, setSettings] = useState<AnalysisSettings>({
    selectedSkills: [],
    targetJobTitle: '',
    targetIndustry: '',
    analysisFocus: '',
    activeJobDescription: null
  })
  
  // Job descriptions management
  const [jobDescriptions, setJobDescriptions] = useState<JobDescription[]>([])
  const [showAddJob, setShowAddJob] = useState(false)
  const [newJob, setNewJob] = useState({
    title: '',
    company: '',
    description: '',
    requirements: ''
  })
  
  // UI state
  const [loading, setLoading] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'analysis' | 'jobs' | 'ontology'>('analysis')
  
  // Ontology state
  const [customSkills, setCustomSkills] = useState('')
  const [customJobTitles, setCustomJobTitles] = useState('')
  const [customIndustries, setCustomIndustries] = useState('')

  const syncSettingsWithServer = useCallback(async (
    settingsData: AnalysisSettings,
    jobsData: JobDescription[],
    options: { withFeedback?: boolean; suppressError?: boolean } = {}
  ): Promise<boolean> => {
    const { withFeedback = false, suppressError = false } = options
    if (withFeedback) {
      setSavingSettings(true)
      setError(null)
    }

    try {
      await api.post('/settings/analysis', {
        selectedSkills: settingsData.selectedSkills,
        targetJobTitle: settingsData.targetJobTitle,
        targetIndustry: settingsData.targetIndustry,
        analysisFocus: settingsData.analysisFocus,
        activeJobDescription: settingsData.activeJobDescription,
        jobDescriptions: jobsData,
      })

      if (!withFeedback && !suppressError) {
        setError(null)
      }

      if (withFeedback) {
        setSuccess(true)
        setTimeout(() => setSuccess(false), 2000)
      }

      return true
    } catch (err: any) {
      const message = getErrorMessage(err)
      if (!suppressError) {
        setError(message)
      } else {
        console.error('Failed to sync analysis settings:', message)
      }
      return false
    } finally {
      if (withFeedback) {
        setSavingSettings(false)
      }
    }
  }, [])

  // Load saved settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('analysisSettings')
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings))
    }
    
    const savedJobs = localStorage.getItem('jobDescriptions')
    if (savedJobs) {
      setJobDescriptions(JSON.parse(savedJobs))
    }
  }, [])

  useEffect(() => {
    const fetchRemoteSettings = async () => {
      try {
        const response = await api.get('/settings/analysis')
        const remote = response.data?.settings

        if (!remote) {
          return
        }

        const hasRemoteData = Boolean(
          (remote.selectedSkills && remote.selectedSkills.length > 0) ||
          remote.targetJobTitle ||
          remote.targetIndustry ||
          remote.analysisFocus ||
          (remote.jobDescriptions && remote.jobDescriptions.length > 0) ||
          remote.activeJobDescription
        )

        if (hasRemoteData) {
          const remoteSettings: AnalysisSettings = {
            selectedSkills: remote.selectedSkills || [],
            targetJobTitle: remote.targetJobTitle || '',
            targetIndustry: remote.targetIndustry || '',
            analysisFocus: remote.analysisFocus || '',
            activeJobDescription: remote.activeJobDescription || null,
          }

          const remoteJobs: JobDescription[] = remote.jobDescriptions || []

          setSettings(remoteSettings)
          setJobDescriptions(remoteJobs)
          persistAnalysisSettingsLocally(remoteSettings, remoteJobs)
        } else {
          const localSettingsRaw = localStorage.getItem('analysisSettings')
          const localJobsRaw = localStorage.getItem('jobDescriptions')

          if (localSettingsRaw || localJobsRaw) {
            const parsedSettings: AnalysisSettings = localSettingsRaw
              ? JSON.parse(localSettingsRaw)
              : {
                  selectedSkills: [],
                  targetJobTitle: '',
                  targetIndustry: '',
                  analysisFocus: '',
                  activeJobDescription: null,
                }
            const parsedJobs: JobDescription[] = localJobsRaw ? JSON.parse(localJobsRaw) : []

            const hasLocalData = Boolean(
              parsedSettings.selectedSkills.length > 0 ||
              parsedSettings.targetJobTitle ||
              parsedSettings.targetIndustry ||
              parsedSettings.analysisFocus ||
              parsedSettings.activeJobDescription ||
              parsedJobs.length > 0
            )

            if (hasLocalData) {
              await syncSettingsWithServer(parsedSettings, parsedJobs, { suppressError: true })
            }
          }
        }
      } catch (err) {
        console.error('Failed to load analysis settings', err)
      }
    }

    fetchRemoteSettings()
  }, [syncSettingsWithServer])

  // Save settings to backend and local cache
  const saveSettings = async () => {
    persistAnalysisSettingsLocally(settings, jobDescriptions)
    await syncSettingsWithServer(settings, jobDescriptions, { withFeedback: true })
  }

  // Add a new job description
  const handleAddJobDescription = async () => {
    if (!newJob.title.trim() || !newJob.description.trim()) {
      setError('Please fill in job title and description')
      return
    }
    
    const job: JobDescription = {
      id: Date.now().toString(),
      title: newJob.title,
      company: newJob.company,
      description: newJob.description,
      requirements: newJob.requirements.split('\n').filter(r => r.trim()),
      createdAt: new Date().toISOString()
    }
    
    const updatedJobs = [...jobDescriptions, job]
    setJobDescriptions(updatedJobs)

    persistAnalysisSettingsLocally(settings, updatedJobs)
    const synced = await syncSettingsWithServer(settings, updatedJobs)

    setNewJob({ title: '', company: '', description: '', requirements: '' })
    setShowAddJob(false)

    if (synced) {
      setSuccess(true)
      setTimeout(() => setSuccess(false), 2000)
    }
  }

  // Delete a job description
  const handleDeleteJob = async (id: string) => {
    const updatedJobs = jobDescriptions.filter(j => j.id !== id)
    setJobDescriptions(updatedJobs)

    let updatedSettings = settings
    if (settings.activeJobDescription?.id === id) {
      const nextSettings = { ...settings, activeJobDescription: null }
      setSettings(nextSettings)
      updatedSettings = nextSettings
    }

    persistAnalysisSettingsLocally(updatedSettings, updatedJobs)
    await syncSettingsWithServer(updatedSettings, updatedJobs)
  }

  // Select a job description for analysis
  const selectJobDescription = (job: JobDescription) => {
    setSettings(prev => {
      const updated = { ...prev, activeJobDescription: job }
      persistAnalysisSettingsLocally(updated, jobDescriptions)
      void syncSettingsWithServer(updated, jobDescriptions)
      return updated
    })
  }

  // Handle skill selection
  const toggleSkill = (skill: string) => {
    setSettings(prev => ({
      ...prev,
      selectedSkills: prev.selectedSkills.includes(skill)
        ? prev.selectedSkills.filter(s => s !== skill)
        : [...prev.selectedSkills, skill]
    }))
  }

  // Submit ontology
  const handleOntologySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setLoading(true)
      setError(null)

      const ontology = {
        skills: customSkills.split(',').map(s => s.trim()).filter(s => s),
        job_titles: customJobTitles.split(',').map(t => t.trim()).filter(t => t),
        industries: customIndustries.split(',').map(i => i.trim()).filter(i => i),
      }

      await api.post('/ontology', ontology)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 2000)
    } catch (err: any) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div 
      className="max-w-6xl mx-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <motion.div 
        className="flex items-center space-x-3 mb-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div 
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)',
            boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)',
          }}
        >
          <Cog className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">Settings</h2>
          <p className="text-slate-400 text-sm">
            Configure analysis preferences and job descriptions
          </p>
        </div>
      </motion.div>

      {/* Tab Navigation */}
      <motion.div 
        className="flex space-x-2 mb-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {[
          { id: 'analysis', icon: Target, label: 'Analysis Settings' },
          { id: 'jobs', icon: Briefcase, label: 'Job Descriptions' },
          { id: 'ontology', icon: Settings2, label: 'Custom Ontology' },
        ].map((tab) => (
          <motion.button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all ${
              activeTab === tab.id
                ? ''
                : ''
            }`}
            style={{
              background: activeTab === tab.id 
                ? 'linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)'
                : 'rgba(59, 130, 246, 0.1)',
              border: activeTab === tab.id
                ? 'none'
                : '1px solid rgba(59, 130, 246, 0.3)',
              color: activeTab === tab.id ? 'white' : '#C4B5FD'
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <tab.icon size={18} />
            <span>{tab.label}</span>
          </motion.button>
        ))}
      </motion.div>

      {/* Success/Error Messages */}
      <AnimatePresence>
        {error && (
          <motion.div 
            className="mb-4 p-4 rounded-xl text-red-300"
            style={{
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(220, 38, 38, 0.2) 100%)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
            }}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {error}
          </motion.div>
        )}
        {success && (
          <motion.div 
            className="mb-4 p-4 rounded-xl"
            style={{
              background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(16, 185, 129, 0.2) 100%)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
            }}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="flex items-center space-x-2 text-green-300">
              <CheckCircle size={20} />
              <span>Settings saved successfully!</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Analysis Settings Tab */}
      {activeTab === 'analysis' && (
        <motion.div 
          className="space-y-6"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Analysis Focus */}
          <div className="premium-card">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
              <Target className="text-slate-500" size={24} />
              <span>Analysis Focus</span>
            </h3>
            <p className="text-slate-400 mb-4">
              Select what aspect of the resume analysis to prioritize
            </p>
            <select
              value={settings.analysisFocus}
              onChange={(e) => setSettings(prev => ({ ...prev, analysisFocus: e.target.value }))}
              className="neo-input w-full"
            >
              {ANALYSIS_FOCUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Target Job Title */}
          <div className="premium-card">
            <h3 className="text-xl font-bold text-white mb-4">Target Job Title</h3>
            <p className="text-slate-400 mb-4">
              Select the job title you're targeting for better matching
            </p>
            <select
              value={settings.targetJobTitle}
              onChange={(e) => setSettings(prev => ({ ...prev, targetJobTitle: e.target.value }))}
              className="neo-input w-full"
            >
              <option value="">-- Select Job Title --</option>
              {JOB_TITLE_OPTIONS.map(title => (
                <option key={title} value={title}>{title}</option>
              ))}
            </select>
          </div>

          {/* Target Industry */}
          <div className="premium-card">
            <h3 className="text-xl font-bold text-white mb-4">Target Industry</h3>
            <p className="text-slate-400 mb-4">
              Select the industry for industry-specific recommendations
            </p>
            <select
              value={settings.targetIndustry}
              onChange={(e) => setSettings(prev => ({ ...prev, targetIndustry: e.target.value }))}
              className="neo-input w-full"
            >
              <option value="">-- Select Industry --</option>
              {INDUSTRY_OPTIONS.map(industry => (
                <option key={industry} value={industry}>{industry}</option>
              ))}
            </select>
          </div>

          {/* Required Skills */}
          <div className="premium-card">
            <h3 className="text-xl font-bold text-white mb-4">Required Skills to Check</h3>
            <p className="text-slate-400 mb-4">
              Select skills that should be present in the resume (click to toggle)
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              {SKILL_OPTIONS.map((skill, index) => (
                <motion.button
                  key={skill}
                  onClick={() => toggleSkill(skill)}
                  className="px-3 py-1 rounded-full text-sm transition-all"
                  style={{
                    background: settings.selectedSkills.includes(skill)
                      ? 'linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)'
                      : 'rgba(59, 130, 246, 0.1)',
                    border: settings.selectedSkills.includes(skill)
                      ? 'none'
                      : '1px solid rgba(59, 130, 246, 0.3)',
                    color: settings.selectedSkills.includes(skill) ? 'white' : '#C4B5FD'
                  }}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.02 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {skill}
                </motion.button>
              ))}
            </div>
            <AnimatePresence>
              {settings.selectedSkills.length > 0 && (
                <motion.div 
                  className="mt-4 p-3 rounded-xl"
                  style={{
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(42, 15, 82, 0.15) 100%)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                  }}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <p className="text-slate-400 text-sm mb-2">Selected Skills ({settings.selectedSkills.length}):</p>
                  <div className="flex flex-wrap gap-2">
                    {settings.selectedSkills.map(skill => (
                      <motion.span 
                        key={skill} 
                        className="neo-tag text-xs flex items-center space-x-1"
                        style={{ background: 'rgba(34, 197, 94, 0.2)', borderColor: 'rgba(34, 197, 94, 0.4)', color: '#4ADE80' }}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                      >
                        <span>{skill}</span>
                        <X 
                          size={12} 
                          className="cursor-pointer hover:text-red-400" 
                          onClick={() => toggleSkill(skill)}
                        />
                      </motion.span>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Active Job Description */}
          <AnimatePresence>
            {settings.activeJobDescription && (
              <motion.div 
                className="premium-card"
                style={{ borderColor: 'rgba(59, 130, 246, 0.5)', borderWidth: '2px' }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <h3 className="text-xl font-bold text-white mb-2 flex items-center space-x-2">
                  <Briefcase className="text-slate-500" size={24} />
                  <span>Active Job Description</span>
                </h3>
                <div className="gradient-border-card p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-white font-semibold">{settings.activeJobDescription.title}</p>
                      {settings.activeJobDescription.company && (
                        <p className="text-slate-400 text-sm">{settings.activeJobDescription.company}</p>
                      )}
                    </div>
                    <motion.button
                      onClick={() => setSettings(prev => {
                        const updated = { ...prev, activeJobDescription: null }
                        persistAnalysisSettingsLocally(updated, jobDescriptions)
                        void syncSettingsWithServer(updated, jobDescriptions)
                        return updated
                      })}
                      className="text-slate-400 hover:text-red-400"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <X size={18} />
                    </motion.button>
                  </div>
                  <p className="text-slate-300 text-sm line-clamp-3">
                    {settings.activeJobDescription.description}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Save Button */}
          <motion.button
            onClick={saveSettings}
            disabled={savingSettings}
            className={`neo-button w-full flex items-center justify-center space-x-2 ${savingSettings ? 'opacity-70 cursor-not-allowed' : ''}`}
            whileHover={{ scale: savingSettings ? 1 : 1.02 }}
            whileTap={{ scale: savingSettings ? 1 : 0.98 }}
          >
            <Save size={20} />
            <span>{savingSettings ? 'Saving...' : 'Save Analysis Settings'}</span>
          </motion.button>
        </motion.div>
      )}

      {/* Job Descriptions Tab */}
      {activeTab === 'jobs' && (
        <motion.div 
          className="space-y-6"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="premium-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                <Briefcase className="text-slate-500" size={24} />
                <span>Saved Job Descriptions</span>
              </h3>
              <motion.button
                onClick={() => setShowAddJob(true)}
                className="neo-button flex items-center space-x-2"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Plus size={18} />
                <span>Add New</span>
              </motion.button>
            </div>
            <p className="text-slate-400 mb-4">
              Save job descriptions to use for resume analysis. The active job description will be used when analyzing resumes.
            </p>

            {/* Add Job Form */}
            <AnimatePresence>
              {showAddJob && (
                <motion.div 
                  className="gradient-border-card p-4 mb-4"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <h4 className="text-white font-semibold mb-3">Add New Job Description</h4>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-300 text-sm mb-1">Job Title *</label>
                        <input
                          type="text"
                          value={newJob.title}
                          onChange={(e) => setNewJob(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="e.g., Senior Software Engineer"
                          className="neo-input w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-300 text-sm mb-1">Company</label>
                        <input
                          type="text"
                          value={newJob.company}
                          onChange={(e) => setNewJob(prev => ({ ...prev, company: e.target.value }))}
                          placeholder="e.g., Google"
                          className="neo-input w-full"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-slate-300 text-sm mb-1">Job Description *</label>
                      <textarea
                        value={newJob.description}
                        onChange={(e) => setNewJob(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Paste the full job description here..."
                        className="neo-input w-full h-32 resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 text-sm mb-1">Key Requirements (one per line)</label>
                      <textarea
                        value={newJob.requirements}
                        onChange={(e) => setNewJob(prev => ({ ...prev, requirements: e.target.value }))}
                        placeholder="5+ years experience in Python&#10;Experience with cloud platforms&#10;Strong communication skills"
                        className="neo-input w-full h-24 resize-none"
                      />
                    </div>
                    <div className="flex space-x-2">
                      <motion.button
                        onClick={handleAddJobDescription}
                        className="neo-button flex-1"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        Save Job Description
                      </motion.button>
                      <motion.button
                        onClick={() => {
                          setShowAddJob(false)
                          setNewJob({ title: '', company: '', description: '', requirements: '' })
                        }}
                        className="px-4 py-2 rounded-xl text-slate-400 hover:text-white transition-colors"
                        style={{
                          background: 'rgba(59, 130, 246, 0.1)',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                        }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        Cancel
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Job Descriptions List */}
            {jobDescriptions.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <FileText size={48} className="mx-auto mb-3 opacity-50" />
                <p>No job descriptions saved yet.</p>
                <p className="text-sm text-slate-500">Add a job description to use for resume analysis.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {jobDescriptions.map((job, index) => (
                  <motion.div
                    key={job.id}
                    className={`gradient-border-card p-4 cursor-pointer transition-all ${
                      settings.activeJobDescription?.id === job.id
                        ? 'ring-2 ring-blue-500'
                        : ''
                    }`}
                    style={{
                      background: settings.activeJobDescription?.id === job.id 
                        ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(42, 15, 82, 0.3) 100%)'
                        : undefined
                    }}
                    onClick={() => selectJobDescription(job)}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ scale: 1.01, x: 5 }}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <p className="text-white font-semibold">{job.title}</p>
                          {settings.activeJobDescription?.id === job.id && (
                            <span 
                              className="px-2 py-0.5 rounded-full text-xs text-white"
                              style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)' }}
                            >
                              Active
                            </span>
                          )}
                        </div>
                        {job.company && (
                          <p className="text-slate-500 text-sm">{job.company}</p>
                        )}
                        <p className="text-slate-400 text-sm mt-1 line-clamp-2">
                          {job.description}
                        </p>
                        {job.requirements.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {job.requirements.slice(0, 3).map((req, i) => (
                              <span key={i} className="neo-tag text-xs">{req}</span>
                            ))}
                            {job.requirements.length > 3 && (
                              <span className="neo-tag text-xs">+{job.requirements.length - 3} more</span>
                            )}
                          </div>
                        )}
                      </div>
                      <motion.button
                        onClick={(e) => {
                          e.stopPropagation()
                          void handleDeleteJob(job.id)
                        }}
                        className="text-slate-500 hover:text-red-400 p-2"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <Trash2 size={18} />
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Custom Ontology Tab */}
      {activeTab === 'ontology' && (
        <motion.div 
          className="premium-card"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h3 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
            <Settings2 className="text-slate-500" size={24} />
            <span>Custom Ontology</span>
          </h3>
          <p className="text-slate-400 mb-6">
            Add custom skills, job titles, and industries to improve matching accuracy. These will be added to the system's knowledge base.
          </p>

          <form onSubmit={handleOntologySubmit} className="space-y-6">
            <div>
              <label className="block text-slate-300 mb-2">Custom Skills</label>
              <textarea
                value={customSkills}
                onChange={(e) => setCustomSkills(e.target.value)}
                placeholder="Enter custom skills separated by commas (e.g., GraphQL, Rust, WebAssembly)"
                className="neo-input w-full h-24 resize-none"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-2">Custom Job Titles</label>
              <textarea
                value={customJobTitles}
                onChange={(e) => setCustomJobTitles(e.target.value)}
                placeholder="Enter custom job titles separated by commas"
                className="neo-input w-full h-24 resize-none"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-2">Custom Industries</label>
              <textarea
                value={customIndustries}
                onChange={(e) => setCustomIndustries(e.target.value)}
                placeholder="Enter custom industries separated by commas"
                className="neo-input w-full h-24 resize-none"
              />
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              className="neo-button w-full disabled:opacity-50"
              whileHover={{ scale: loading ? 1 : 1.02 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
            >
              {loading ? 'Saving...' : 'Save Custom Ontology'}
            </motion.button>
          </form>
        </motion.div>
      )}
    </motion.div>
  )
}

