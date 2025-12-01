import { useState, useEffect } from 'react'
import Navbar from './components/Navbar'
import UploadTab from './components/UploadTab'
import ResultsTab from './components/ResultsTab'
import ChatbotTab from './components/ChatbotTab'
import DashboardTab from './components/DashboardTab'
import SettingsTab from './components/SettingsTab'
import AuthPage from './components/AuthPage'
import api from './api/axios'

interface User {
  name: string
  email: string
}

function App() {
  const [activeTab, setActiveTab] = useState('upload')
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Check for existing session on mount
  useEffect(() => {
    const verifySession = async () => {
      const token = localStorage.getItem('authToken')
      const savedUser = localStorage.getItem('currentUser')
      
      if (token && savedUser) {
        try {
          // Verify token with backend
          const response = await api.get('/auth/verify', {
            headers: { Authorization: `Bearer ${token}` }
          })
          
          if (response.data.success) {
            setUser(JSON.parse(savedUser))
          } else {
            // Token invalid, clear storage
            localStorage.removeItem('authToken')
            localStorage.removeItem('currentUser')
          }
        } catch (error) {
          // On error, still try to use saved user (offline support)
          setUser(JSON.parse(savedUser))
        }
      }
      setIsLoading(false)
    }
    
    verifySession()
  }, [])

  const handleAuthSuccess = (authenticatedUser: User) => {
    setUser(authenticatedUser)
  }

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('authToken')
      if (token) {
        await api.post('/auth/logout', null, {
          headers: { Authorization: `Bearer ${token}` }
        })
      }
    } catch (error) {
      // Continue with logout even if API call fails
    }
    
    localStorage.removeItem('authToken')
    localStorage.removeItem('currentUser')
    setUser(null)
    setActiveTab('upload')
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Show auth page if not logged in
  if (!user) {
    return <AuthPage onAuthSuccess={handleAuthSuccess} />
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'upload':
        return <UploadTab />
      case 'results':
        return <ResultsTab />
      case 'chatbot':
        return <ChatbotTab />
      case 'dashboard':
        return <DashboardTab />
      case 'settings':
        return <SettingsTab />
      default:
        return <UploadTab />
    }
  }

  return (
    <div className="min-h-screen relative">
      {/* Aurora animated background */}
      <div className="aurora-bg" />
      
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} user={user} onLogout={handleLogout} />
      <main className="container mx-auto px-4 py-8 relative z-10">
        {renderTabContent()}
      </main>
    </div>
  )
}

export default App

