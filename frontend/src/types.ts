export interface Resume {
  id: string
  filename: string
  upload_date: string
  skills: string[]
  experience_years: number
  is_duplicate: boolean
}

export interface ComponentScore {
  skill_match: number
  experience: number
  education: number
  format: number
  keyword_density: number
  timeline: number
}

export interface KeywordAnalysis {
  found: string[]
  missing: string[]
  density: number
}

export interface SectionAnalysis {
  name: string
  present: boolean
  score: number
  feedback: string
}

export interface GeminiAnalysis {
  ats_score: number
  match_percentage: number
  keyword_analysis: KeywordAnalysis
  section_analysis: SectionAnalysis[]
  strengths: string[]
  weaknesses: string[]
  recommendations: string[]
}

export interface Analysis {
  id: string
  resume_id: string
  filename: string
  component_scores: ComponentScore
  gemini_analysis: GeminiAnalysis
  created_at: string
  is_best: boolean
}

export interface BulkAnalysisItem {
  analysis_id: string
  resume_id: string
  filename: string
  ats_score: number
  match_percentage: number
  final_score: number
  is_best: boolean
  created_at: string
  component_scores: ComponentScore
  gemini_analysis: GeminiAnalysis
}

export interface BulkAnalyzeResponse {
  total_resumes: number
  analyzed_count: number
  job_description_provided: boolean
  best_resume_reason?: string | null
  best_resume?: BulkAnalysisItem | null
  analyses: BulkAnalysisItem[]
  failures: Array<{
    resume_id: string
    filename?: string
    error: string
  }>
}

export interface ChatResumeContext {
  id: string
  filename?: string
  source: string
}

export interface ChatbotMultiResponse {
  response: string
  resume_count: number
  resumes: ChatResumeContext[]
}

export interface DashboardData {
  total_resumes: number
  best_resume: {
    id: string
    filename: string
    ats_score: number
  } | null
  average_scores: ComponentScore
  recent_analyses: Array<{
    id: string
    resume_id: string
    filename: string
    ats_score: number
    created_at: string
  }>
  skill_distribution: Record<string, number>
  experience_distribution: Record<string, number>
}

