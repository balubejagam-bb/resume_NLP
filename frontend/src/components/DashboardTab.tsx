import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, AreaChart, Area } from 'recharts'
import { TrendingUp, FileText, Star, Award, Target, Users, Calendar, Zap, CheckCircle, AlertTriangle, Clock, LayoutDashboard } from 'lucide-react'
import { motion } from 'framer-motion'
import api from '../api/axios'
import { DashboardData } from '../types'
import { getErrorMessage } from '../utils/errorHandler'

const COLORS = ['#3B82F6', '#60A5FA', '#3B82F6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899']

export default function DashboardTab() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboard()
  }, [])

  const fetchDashboard = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await api.get('/dashboard')
      setDashboardData(response.data)
    } catch (err: any) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center text-slate-400 py-8">
        <div 
          className="animate-spin inline-block w-10 h-10 border-4 rounded-full mb-4"
          style={{ 
            borderColor: 'rgba(59, 130, 246, 0.3)',
            borderTopColor: '#3B82F6'
          }}
        ></div>
        <p>Loading dashboard...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center text-red-400 py-8">
        {error}
      </div>
    )
  }

  if (!dashboardData) {
    return null
  }

  const scoreData = [
    { name: 'Skill Match', value: dashboardData.average_scores.skill_match, fullMark: 100 },
    { name: 'Experience', value: dashboardData.average_scores.experience, fullMark: 100 },
    { name: 'Education', value: dashboardData.average_scores.education, fullMark: 100 },
    { name: 'Format', value: dashboardData.average_scores.format, fullMark: 100 },
    { name: 'Keywords', value: dashboardData.average_scores.keyword_density, fullMark: 100 },
    { name: 'Timeline', value: dashboardData.average_scores.timeline, fullMark: 100 },
  ]

  const skillData = Object.entries(dashboardData.skill_distribution)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, value]) => ({ name, value }))

  const expData = Object.entries(dashboardData.experience_distribution).map(([name, value]) => ({
    name,
    value,
  }))

  const totalExperience = expData.reduce((sum, item) => sum + item.value, 0)
  const dominantExperience = expData.length > 0
    ? expData.reduce((prev, curr) => (curr.value > prev.value ? curr : prev), expData[0])
    : null

  const dominantExperiencePercent = dominantExperience && totalExperience > 0
    ? (dominantExperience.value / totalExperience) * 100
    : 0

  const experienceWithPercentages = expData.map(item => ({
    ...item,
    percent: totalExperience > 0 ? (item.value / totalExperience) * 100 : 0,
  }))

  const sortedExperience = [...experienceWithPercentages].sort((a, b) => b.value - a.value)

  const renderExperienceLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent === 0) return null

    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.65
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    return (
      <text
        x={x}
        y={y}
        fill="#0F172A"
        fontSize={12}
        fontWeight={600}
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
      >
        {`${Math.round(percent * 100)}%`}
      </text>
    )
  }

  // Calculate insights
  const avgAtsScore = dashboardData.recent_analyses.length > 0
    ? dashboardData.recent_analyses.reduce((sum, a) => sum + a.ats_score, 0) / dashboardData.recent_analyses.length
    : 0
  
  const highScoreCount = dashboardData.recent_analyses.filter(a => a.ats_score >= 80).length
  const lowScoreCount = dashboardData.recent_analyses.filter(a => a.ats_score < 60).length
  
  // Score distribution for trend
  const scoreDistribution = [
    { range: '90-100', count: dashboardData.recent_analyses.filter(a => a.ats_score >= 90).length },
    { range: '80-89', count: dashboardData.recent_analyses.filter(a => a.ats_score >= 80 && a.ats_score < 90).length },
    { range: '70-79', count: dashboardData.recent_analyses.filter(a => a.ats_score >= 70 && a.ats_score < 80).length },
    { range: '60-69', count: dashboardData.recent_analyses.filter(a => a.ats_score >= 60 && a.ats_score < 70).length },
    { range: 'Below 60', count: dashboardData.recent_analyses.filter(a => a.ats_score < 60).length },
  ]

  // Radar chart data for component scores
  const radarData = scoreData.map(item => ({
    subject: item.name,
    score: item.value,
    fullMark: 100
  }))

  return (
    <motion.div 
      className="max-w-7xl mx-auto space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { 
            icon: FileText, 
            label: 'Total Resumes', 
            value: dashboardData.total_resumes, 
            subtitle: 'In database',
            gradient: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(59, 130, 246, 0.1) 100%)',
            borderColor: 'rgba(59, 130, 246, 0.4)',
            iconBg: 'rgba(59, 130, 246, 0.3)',
            iconColor: '#3B82F6'
          },
          { 
            icon: TrendingUp, 
            label: 'Avg ATS Score', 
            value: `${avgAtsScore.toFixed(0)}%`, 
            subtitle: avgAtsScore >= 75 ? '✓ Good average' : 'Needs improvement',
            gradient: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(34, 197, 94, 0.1) 100%)',
            borderColor: 'rgba(34, 197, 94, 0.4)',
            iconBg: 'rgba(34, 197, 94, 0.3)',
            iconColor: '#4ADE80'
          },
          { 
            icon: Award, 
            label: 'High Scores (80%+)', 
            value: highScoreCount, 
            subtitle: 'Strong candidates',
            gradient: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(59, 130, 246, 0.1) 100%)',
            borderColor: 'rgba(59, 130, 246, 0.4)',
            iconBg: 'rgba(59, 130, 246, 0.3)',
            iconColor: '#60A5FA'
          },
          { 
            icon: Target, 
            label: 'Need Review', 
            value: lowScoreCount, 
            subtitle: 'Below 60% threshold',
            gradient: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(245, 158, 11, 0.1) 100%)',
            borderColor: 'rgba(245, 158, 11, 0.4)',
            iconBg: 'rgba(245, 158, 11, 0.3)',
            iconColor: '#FBBF24'
          },
        ].map((card, index) => (
          <motion.div 
            key={card.label}
            className="gradient-border-card p-5"
            style={{ background: card.gradient, borderColor: card.borderColor }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.03, y: -5 }}
          >
            <div className="flex items-center space-x-3">
              <div 
                className="p-3 rounded-xl"
                style={{ background: card.iconBg }}
              >
                <card.icon style={{ color: card.iconColor }} size={28} />
              </div>
              <div>
                <p className="text-slate-400 text-sm">{card.label}</p>
                <p className="text-3xl font-bold text-white">{card.value}</p>
                <p className="text-xs mt-1" style={{ color: card.iconColor }}>{card.subtitle}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Best Resume Highlight */}
      {dashboardData.best_resume && (
        <motion.div 
          className="premium-card"
          style={{
            background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.15) 0%, rgba(251, 191, 36, 0.1) 50%, rgba(245, 158, 11, 0.05) 100%)',
            border: '1px solid rgba(234, 179, 8, 0.3)',
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          whileHover={{ scale: 1.01 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <motion.div 
                className="p-4 rounded-full"
                style={{ background: 'rgba(234, 179, 8, 0.2)' }}
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              >
                <Star className="text-yellow-400 fill-yellow-400" size={32} />
              </motion.div>
              <div>
                <p className="text-yellow-400 text-sm font-medium">🏆 Best Performing Resume</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {dashboardData.best_resume.filename}
                </p>
                <div className="flex items-center space-x-4 mt-2">
                  <span className="text-green-400 flex items-center space-x-1">
                    <CheckCircle size={16} />
                    <span>ATS: {dashboardData.best_resume.ats_score.toFixed(0)}%</span>
                  </span>
                  <span className="text-slate-500 flex items-center space-x-1">
                    <Zap size={16} />
                    <span>Top performer</span>
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div 
                className="text-5xl font-bold"
                style={{
                  background: 'linear-gradient(135deg, #FCD34D 0%, #F59E0B 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {dashboardData.best_resume.ats_score.toFixed(0)}%
              </div>
              <p className="text-slate-400 text-sm">ATS Score</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Score Distribution */}
        <motion.div 
          className="premium-card"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          whileHover={{ scale: 1.01 }}
        >
          <h3 className="text-xl font-bold text-white mb-2 flex items-center space-x-2">
            <BarChart className="text-slate-500" />
            <span>Score Distribution</span>
          </h3>
          <p className="text-slate-400 text-sm mb-4">Number of resumes in each score range</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={scoreDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(59, 130, 246, 0.2)" />
              <XAxis dataKey="range" stroke="#3B82F6" fontSize={12} />
              <YAxis stroke="#3B82F6" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#17092D',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                  borderRadius: '12px',
                }}
              />
              <Bar dataKey="count" fill="url(#colorGradient)" radius={[8, 8, 0, 0]} />
              <defs>
                <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#60A5FA" />
                  <stop offset="100%" stopColor="#3B82F6" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Component Scores Radar */}
        <motion.div 
          className="premium-card"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
          whileHover={{ scale: 1.01 }}
        >
          <h3 className="text-xl font-bold text-white mb-2 flex items-center space-x-2">
            <Target className="text-slate-500" />
            <span>Component Performance</span>
          </h3>
          <p className="text-slate-400 text-sm mb-4">Average scores across all resume components</p>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(59, 130, 246, 0.3)" />
              <PolarAngleAxis dataKey="subject" stroke="#3B82F6" fontSize={11} />
              <PolarRadiusAxis stroke="#3B82F6" domain={[0, 100]} />
              <Radar
                name="Score"
                dataKey="score"
                stroke="#60A5FA"
                fill="#3B82F6"
                fillOpacity={0.4}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#17092D',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                  borderRadius: '12px',
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Experience Distribution */}
        <motion.div 
          className="premium-card"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.7 }}
          whileHover={{ scale: 1.01 }}
        >
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                <Users className="text-slate-500" />
                <span>Experience Distribution</span>
              </h3>
              <p className="text-slate-400 text-sm mt-1">Years of experience breakdown</p>
            </div>
            {dominantExperience && (
              <span className="px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-200 text-xs font-semibold">
                Peak segment: {dominantExperience.name}
              </span>
            )}
          </div>

          <div className="grid md:grid-cols-[1.2fr,0.8fr] gap-6 items-center">
            <div className="relative">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <defs>
                    {sortedExperience.map((entry, index) => (
                      <linearGradient
                        key={`exp-gradient-${index}`}
                        id={`exp-gradient-${index}`}
                        x1="0%"
                        y1="0%"
                        x2="0%"
                        y2="100%"
                      >
                        <stop offset="5%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.95} />
                        <stop offset="95%" stopColor={COLORS[(index + 1) % COLORS.length]} stopOpacity={0.65} />
                      </linearGradient>
                    ))}
                  </defs>
                  <Pie
                    data={sortedExperience}
                    cx="50%"
                    cy="50%"
                    startAngle={90}
                    endAngle={-270}
                    innerRadius={60}
                    outerRadius={110}
                    paddingAngle={2}
                    dataKey="value"
                    labelLine={false}
                    label={renderExperienceLabel}
                    stroke="#0F172A"
                    strokeWidth={2}
                  >
                    {sortedExperience.map((entry, index) => (
                      <Cell key={`exp-cell-${index}`} fill={`url(#exp-gradient-${index})`} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      border: '1px solid rgba(96, 165, 250, 0.4)',
                      borderRadius: '12px',
                    }}
                    formatter={(value: number, name: string) => [
                      `${value} resumes (${((value as number) / (totalExperience || 1) * 100).toFixed(1)}%)`,
                      name,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xs uppercase tracking-widest text-slate-500">Total Resumes</span>
                <span className="text-3xl font-extrabold text-white mt-1">{totalExperience}</span>
                {dominantExperience && (
                  <span className="text-xs text-slate-500 mt-2">
                    {dominantExperiencePercent.toFixed(1)}% in {dominantExperience.name}
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl bg-slate-800/40 border border-slate-700/60 p-4">
                <p className="text-sm font-semibold text-slate-200 tracking-wide">Highlights</p>
                <div className="mt-3 space-y-2 text-sm text-slate-300">
                  <div className="flex items-center justify-between">
                    <span>Total categories</span>
                    <span className="font-semibold text-white">{expData.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Most common range</span>
                    <span className="font-semibold text-blue-300">{dominantExperience?.name ?? '--'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Coverage</span>
                    <span className="font-semibold text-emerald-300">{totalExperience > 0 ? '100%' : '0%'}</span>
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                {sortedExperience.map((item, index) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between rounded-2xl border border-slate-700/60 bg-slate-800/30 px-3 py-2.5"
                  >
                    <div className="flex items-center space-x-3">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <div>
                        <p className="text-sm font-semibold text-white leading-tight">{item.name}</p>
                        <p className="text-xs text-slate-400">{item.value} resumes</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-white leading-tight">{item.percent.toFixed(1)}%</p>
                      <p className="text-xs text-slate-500">share</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Component Scores Bar */}
        <motion.div 
          className="premium-card"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.8 }}
          whileHover={{ scale: 1.01 }}
        >
          <h3 className="text-xl font-bold text-white mb-2 flex items-center space-x-2">
            <BarChart className="text-slate-500" />
            <span>Average Component Scores</span>
          </h3>
          <p className="text-slate-400 text-sm mb-4">Detailed breakdown by category</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={scoreData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(59, 130, 246, 0.2)" />
              <XAxis type="number" stroke="#3B82F6" domain={[0, 100]} />
              <YAxis dataKey="name" type="category" stroke="#3B82F6" width={100} fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#17092D',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                  borderRadius: '12px',
                }}
                formatter={(value: number) => [`${value.toFixed(0)}%`, 'Score']}
              />
              <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                {scoreData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.value >= 80 ? '#10b981' : entry.value >= 60 ? '#f59e0b' : '#ef4444'} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Top Skills */}
      <motion.div 
        className="premium-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        whileHover={{ scale: 1.005 }}
      >
        <h3 className="text-xl font-bold text-white mb-2 flex items-center space-x-2">
          <Zap className="text-slate-500" />
          <span>Top Skills Across All Resumes</span>
        </h3>
        <p className="text-slate-400 text-sm mb-4">Most frequently appearing skills in the resume database</p>
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={skillData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(59, 130, 246, 0.2)" />
            <XAxis dataKey="name" stroke="#3B82F6" angle={-45} textAnchor="end" height={80} fontSize={11} />
            <YAxis stroke="#3B82F6" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#17092D',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                borderRadius: '12px',
              }}
            />
            <defs>
              <linearGradient id="skillGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#60A5FA" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="value" stroke="#60A5FA" fill="url(#skillGradient)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Recent Analyses */}
      <motion.div 
        className="premium-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0 }}
      >
        <h3 className="text-xl font-bold text-white mb-2 flex items-center space-x-2">
          <Clock className="text-slate-500" />
          <span>Recent Analyses</span>
        </h3>
        <p className="text-slate-400 text-sm mb-4">Latest resume analysis results</p>
        <div className="space-y-3">
          {dashboardData.recent_analyses.length > 0 ? (
            dashboardData.recent_analyses.map((analysis, index) => (
              <motion.div
                key={analysis.id}
                className="gradient-border-card p-4 flex items-center justify-between"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 + 1.1 }}
                whileHover={{ scale: 1.02, x: 5 }}
              >
                <div className="flex items-center space-x-4">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
                    style={{
                      background: analysis.ats_score >= 80 
                        ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.3), rgba(16, 185, 129, 0.3))'
                        : analysis.ats_score >= 60 
                        ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.3), rgba(234, 179, 8, 0.3))'
                        : 'linear-gradient(135deg, rgba(239, 68, 68, 0.3), rgba(220, 38, 38, 0.3))',
                      color: analysis.ats_score >= 80 ? '#4ADE80' : analysis.ats_score >= 60 ? '#FBBF24' : '#F87171'
                    }}
                  >
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-white font-semibold">{analysis.filename}</p>
                    <p className="text-slate-400 text-sm flex items-center space-x-2">
                      <Calendar size={14} />
                      <span>{new Date(analysis.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div 
                    className="px-3 py-1 rounded-full text-sm font-medium"
                    style={{
                      background: analysis.ats_score >= 80 
                        ? 'rgba(34, 197, 94, 0.2)'
                        : analysis.ats_score >= 60 
                        ? 'rgba(245, 158, 11, 0.2)'
                        : 'rgba(239, 68, 68, 0.2)',
                      color: analysis.ats_score >= 80 ? '#4ADE80' : analysis.ats_score >= 60 ? '#FBBF24' : '#F87171'
                    }}
                  >
                    {analysis.ats_score >= 80 ? 'Strong' :
                     analysis.ats_score >= 60 ? 'Average' : 'Needs Work'}
                  </div>
                  <div className="text-right min-w-[60px]">
                    <p 
                      className="text-2xl font-bold"
                      style={{
                        background: 'linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                      }}
                    >
                      {analysis.ats_score.toFixed(0)}%
                    </p>
                    <p className="text-slate-500 text-xs">ATS</p>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-8">
              <AlertTriangle className="mx-auto text-amber-400 mb-3" size={40} />
              <p className="text-slate-400">No analyses yet</p>
              <p className="text-slate-500 text-sm">Upload and analyze resumes to see results here</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Quick Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            icon: CheckCircle,
            title: 'Strengths',
            iconColor: '#4ADE80',
            borderColor: 'rgba(34, 197, 94, 0.3)',
            content: scoreData.filter(s => s.value >= 70).length > 0 
              ? `Strong in: ${scoreData.filter(s => s.value >= 70).map(s => s.name).join(', ')}`
              : 'Analyze more resumes to identify patterns'
          },
          {
            icon: AlertTriangle,
            title: 'Areas to Improve',
            iconColor: '#FBBF24',
            borderColor: 'rgba(245, 158, 11, 0.3)',
            content: scoreData.filter(s => s.value < 60).length > 0 
              ? `Focus on: ${scoreData.filter(s => s.value < 60).map(s => s.name).join(', ')}`
              : 'All components performing well!'
          },
          {
            icon: Target,
            title: 'Recommendation',
            iconColor: '#3B82F6',
            borderColor: 'rgba(59, 130, 246, 0.3)',
            content: avgAtsScore >= 80 
              ? 'Excellent resume quality! Ready for top positions.'
              : avgAtsScore >= 60
              ? 'Good foundation. Focus on keyword optimization.'
              : 'Consider restructuring and adding more relevant keywords.'
          }
        ].map((insight, index) => (
          <motion.div 
            key={insight.title}
            className="gradient-border-card p-5"
            style={{ borderColor: insight.borderColor }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 + 1.3 }}
            whileHover={{ scale: 1.03 }}
          >
            <div className="flex items-center space-x-3 mb-3">
              <insight.icon style={{ color: insight.iconColor }} size={24} />
              <h4 className="text-white font-semibold">{insight.title}</h4>
            </div>
            <p className="text-slate-400 text-sm">{insight.content}</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}

