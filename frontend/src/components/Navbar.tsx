import { FileText, BarChart3, Settings, Upload, MessageCircle, LogOut, User, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'

interface NavbarProps {
  activeTab: string
  setActiveTab: (tab: string) => void
  user?: { name: string; email: string }
  onLogout?: () => void
}

const tabs = [
  { id: 'upload', label: 'Upload', icon: Upload },
  { id: 'results', label: 'Results', icon: FileText },
  { id: 'chatbot', label: 'AI Assistant', icon: MessageCircle },
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
]

export default function Navbar({ activeTab, setActiveTab, user, onLogout }: NavbarProps) {
  return (
    <motion.nav 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="neo-nav sticky top-0 z-50 mb-8"
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-4">
          {/* Logo */}
          <motion.div 
            className="flex items-center space-x-3"
            whileHover={{ scale: 1.01 }}
          >
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-600">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-white">
              Resume Intelligence
            </h1>
          </motion.div>

          <div className="flex items-center space-x-4">
            {/* Nav Tabs */}
            <div className="flex space-x-1 p-1 rounded-lg bg-slate-800/80">
              {tabs.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                return (
                  <motion.button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative flex items-center space-x-2 px-4 py-2 rounded-md transition-all duration-200 ${
                      isActive ? 'text-white bg-blue-600' : 'text-slate-400 hover:text-white hover:bg-slate-700'
                    }`}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Icon size={18} />
                    <span className="hidden md:inline font-medium">{tab.label}</span>
                    {isActive && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-blue-400"
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      />
                    )}
                  </motion.button>
                )
              })}
            </div>
            
            {/* User Menu */}
            {user && (
              <div className="flex items-center space-x-3 ml-2 pl-4 border-l border-slate-700">
                <motion.div 
                  className="flex items-center space-x-2"
                  whileHover={{ scale: 1.01 }}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-600">
                    <User size={16} className="text-white" />
                  </div>
                  <span className="text-slate-300 text-sm hidden lg:inline font-medium">{user.name}</span>
                </motion.div>
                <motion.button
                  onClick={onLogout}
                  className="flex items-center space-x-1.5 px-3 py-2 rounded-lg transition-all duration-200 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20"
                  whileTap={{ scale: 0.98 }}
                  title="Logout"
                >
                  <LogOut size={16} className="text-red-400" />
                  <span className="hidden md:inline text-sm text-red-400 font-medium">Logout</span>
                </motion.button>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.nav>
  )
}

