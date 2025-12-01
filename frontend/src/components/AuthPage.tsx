import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { User, Mail, Lock, Eye, EyeOff, Sparkles, ArrowRight, CheckCircle, Zap, Bot, ShieldCheck } from 'lucide-react'
import api from '../api/axios'

interface AuthPageProps {
  onAuthSuccess: (user: { name: string; email: string }) => void
}

// Floating particles component - subtle dots
const FloatingParticles = () => {
  const particles = Array.from({ length: 15 }, (_, i) => ({
    id: i,
    size: Math.random() * 3 + 1,
    x: Math.random() * 100,
    y: Math.random() * 100,
    duration: Math.random() * 15 + 10,
    delay: Math.random() * 5,
  }))

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full bg-blue-500/30"
          style={{
            width: particle.size,
            height: particle.size,
            left: `${particle.x}%`,
            top: `${particle.y}%`,
          }}
          animate={{
            y: [0, -20, 0],
            opacity: [0.1, 0.4, 0.1],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            delay: particle.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  )
}

export default function AuthPage({ onAuthSuccess }: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!formData.email || !formData.password) {
      setError('Please fill in all fields')
      setLoading(false)
      return
    }

    if (!isLogin && !formData.name) {
      setError('Please enter your name')
      setLoading(false)
      return
    }

    if (!isLogin && formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (!isLogin && formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    try {
      if (isLogin) {
        const response = await api.post('/auth/login', {
          email: formData.email,
          password: formData.password
        })
        
        if (response.data.success) {
          localStorage.setItem('authToken', response.data.token)
          localStorage.setItem('currentUser', JSON.stringify(response.data.user))
          setSuccess('Login successful!')
          setTimeout(() => onAuthSuccess(response.data.user), 1000)
        } else {
          setError(response.data.message || 'Login failed')
        }
      } else {
        const response = await api.post('/auth/register', {
          name: formData.name,
          email: formData.email,
          password: formData.password
        })
        
        if (response.data.success) {
          localStorage.setItem('authToken', response.data.token)
          localStorage.setItem('currentUser', JSON.stringify(response.data.user))
          setSuccess('Account created successfully!')
          setTimeout(() => onAuthSuccess(response.data.user), 1000)
        } else {
          setError(response.data.message || 'Registration failed')
        }
      }
    } catch (err: any) {
      if (err.response?.data?.detail) {
        setError(err.response.data.detail)
      } else if (err.response?.data?.message) {
        setError(err.response.data.message)
      } else {
        setError('Something went wrong. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const switchMode = (login: boolean) => {
    setIsLogin(login)
    setError('')
    setSuccess('')
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1e1b4b] via-[#312e81] to-[#3b82f6] px-6 py-12 overflow-hidden">
      <div className="absolute -top-48 -left-32 w-[32rem] h-[32rem] rounded-full bg-indigo-500/30 blur-3xl" />
      <div className="absolute -bottom-48 -right-24 w-[36rem] h-[36rem] rounded-full bg-blue-400/25 blur-3xl" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(96,165,250,0.25),transparent_55%)]" />

      <FloatingParticles />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-6xl grid md:grid-cols-[1.1fr,0.9fr] gap-12 items-center"
      >
        {/* Illustration + Marketing Copy */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.7 }}
          className="text-white space-y-6"
        >
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1 text-sm font-medium text-blue-100 backdrop-blur">
            <Sparkles className="w-4 h-4" /> Intelligent hiring workspace
          </span>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight">
            Sign in to accelerate your <span className="text-blue-200">resume intelligence</span>
          </h1>
          <p className="text-blue-100/80 max-w-xl">
            Upload resumes, benchmark candidates, and surface the perfect match in seconds. Your secure AI copilot keeps hiring organized, insightful, and human-friendly.
          </p>

          <div className="grid sm:grid-cols-2 gap-4 max-w-xl">
            <div className="rounded-2xl bg-white/10 px-5 py-4 backdrop-blur border border-white/20">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-blue-200" />
                <span className="text-sm font-semibold uppercase tracking-wide text-blue-100">Secure access</span>
              </div>
              <p className="text-sm text-blue-100/80 mt-2">Protect your candidate data with enterprise-grade identity management.</p>
            </div>
            <div className="rounded-2xl bg-white/10 px-5 py-4 backdrop-blur border border-white/20">
              <div className="flex items-center gap-3">
                <Zap className="w-5 h-5 text-blue-200" />
                <span className="text-sm font-semibold uppercase tracking-wide text-blue-100">AI summaries</span>
              </div>
              <p className="text-sm text-blue-100/80 mt-2">Instantly compare experience, skills, and ATS fit in one place.</p>
            </div>
          </div>

          <div className="relative mt-10 hidden md:block">
            <div className="relative w-full max-w-xs bg-white/90 rounded-3xl shadow-2xl px-6 py-6 text-slate-700">
              <div className="mx-auto h-10 w-10 rounded-full bg-blue-100 text-blue-500 flex items-center justify-center mb-4">
                <User className="w-5 h-5" />
              </div>
              <div className="space-y-3">
                <div className="space-y-2">
                  <div className="h-3 rounded-full bg-slate-200 w-24" />
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <div className="h-2.5 w-20 rounded-full bg-slate-300" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-3 rounded-full bg-slate-200 w-28" />
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <div className="h-2.5 w-24 rounded-full bg-slate-300" />
                  </div>
                </div>
                <div className="flex justify-between items-center mt-4">
                  <span className="text-sm font-semibold text-slate-500">Log in</span>
                  <div className="h-10 px-5 rounded-xl bg-blue-500 text-white text-sm font-semibold flex items-center gap-2">
                    <span>Continue</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -right-12 -bottom-12">
              <div className="relative">
                <div className="absolute -top-6 -left-6 w-24 h-24 rounded-full bg-blue-400/30 blur-xl" />
                <div className="relative w-32 h-32 rounded-3xl bg-white/90 shadow-xl border border-white/50 flex flex-col items-center justify-center text-blue-500">
                  <Bot className="w-14 h-14" />
                  <span className="mt-2 text-xs font-semibold text-slate-600">AI Copilot</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Auth Card */}
        <motion.div
          layout
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.7 }}
          className="relative bg-white/95 backdrop-blur-xl border border-white/80 shadow-2xl rounded-[32px] p-8 sm:p-10"
        >
          <div className="absolute inset-x-12 -top-12 hidden sm:flex items-center justify-center">
            <div className="flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-500 shadow-lg">
              <Sparkles className="w-9 h-9 text-white" />
            </div>
          </div>

          <div className="flex items-center justify-between mt-6 sm:mt-0">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">{isLogin ? 'Welcome back' : 'Create your account'}</h2>
              <p className="text-sm text-slate-500 mt-1">{isLogin ? 'Access your intelligent hiring dashboard.' : 'Start shaping smarter hiring decisions.'}</p>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="mt-6 mb-8 bg-slate-100 rounded-full p-1 flex">
            <motion.button
              onClick={() => switchMode(true)}
              className={`flex-1 py-2.5 rounded-full font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                isLogin ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-800'
              }`}
              whileTap={{ scale: 0.99 }}
            >
              <Zap className="w-4 h-4" />
              Sign In
            </motion.button>
            <motion.button
              onClick={() => switchMode(false)}
              className={`flex-1 py-2.5 rounded-full font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                !isLogin ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-800'
              }`}
              whileTap={{ scale: 0.99 }}
            >
              <User className="w-4 h-4" />
              Sign Up
            </motion.button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: -20 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    <input
                      type="text"
                      name="name"
                      placeholder="Full Name"
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full h-12 rounded-xl border border-slate-200 bg-white/90 px-4 pl-12 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-sm transition"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div 
              className="relative group"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="email"
                name="email"
                placeholder="Email Address"
                value={formData.email}
                onChange={handleChange}
                className="w-full h-12 rounded-xl border border-slate-200 bg-white/90 px-4 pl-12 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-sm transition"
              />
            </motion.div>

            <motion.div 
              className="relative group"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                className="w-full h-12 rounded-xl border border-slate-200 bg-white/90 px-4 pl-12 pr-12 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-sm transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </motion.div>

            {isLogin && (
              <div className="text-right text-sm">
                <a href="#" className="text-blue-500 hover:text-blue-600 font-medium">Forgot password?</a>
              </div>
            )}

            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: -20 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      placeholder="Confirm Password"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="w-full h-12 rounded-xl border border-slate-200 bg-white/90 px-4 pl-12 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-sm transition"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm text-center"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Success Message */}
            <AnimatePresence>
              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 text-sm text-center flex items-center justify-center space-x-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  <span>{success}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.01 }}
              whileTap={{ scale: loading ? 1 : 0.99 }}
              className="w-full py-3 flex items-center justify-center space-x-2 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-500 text-white font-semibold shadow-lg shadow-blue-500/30 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <motion.div 
                  className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
              ) : (
                <>
                  <span className="font-semibold">{isLogin ? 'Sign In' : 'Create Account'}</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </motion.button>
          </form>
          <p className="mt-6 text-xs text-slate-400 text-center">
            By continuing, you agree to our{' '}
            <a href="#" className="text-blue-500 hover:text-blue-600 font-medium">Terms of Service</a>
            {' '}and{' '}
            <a href="#" className="text-blue-500 hover:text-blue-600 font-medium">Privacy Policy</a>
          </p>
        </motion.div>
      </motion.div>
    </div>
  )
}
