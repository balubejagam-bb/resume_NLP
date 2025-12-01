from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

class FileType(str, Enum):
    PDF = "pdf"
    DOCX = "docx"
    TXT = "txt"

class ComponentScore(BaseModel):
    skill_match: float = Field(..., ge=0, le=100)
    experience: float = Field(..., ge=0, le=100)
    education: float = Field(..., ge=0, le=100)
    format: float = Field(..., ge=0, le=100)
    keyword_density: float = Field(..., ge=0, le=100)
    timeline: float = Field(..., ge=0, le=100)

class KeywordAnalysis(BaseModel):
    found: List[str]
    missing: List[str]
    density: float

class SectionAnalysis(BaseModel):
    name: str
    present: bool
    score: float
    feedback: str

class GeminiAnalysis(BaseModel):
    ats_score: float
    match_percentage: float
    keyword_analysis: KeywordAnalysis
    section_analysis: List[SectionAnalysis]
    strengths: List[str]
    weaknesses: List[str]
    recommendations: List[str]

class ResumeUpload(BaseModel):
    filename: str
    file_type: FileType
    upload_date: datetime
    file_size: int
    parsed_text: str
    masked_text: str
    skills: List[str]
    experience_years: float
    education: List[str]
    is_duplicate: bool
    duplicate_of: Optional[str] = None

class ResumeAnalysis(BaseModel):
    resume_id: str
    filename: str
    component_scores: ComponentScore
    gemini_analysis: GeminiAnalysis
    created_at: datetime
    is_best: bool = False


class JobDescriptionModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    title: str
    company: Optional[str] = None
    description: str
    requirements: List[str] = Field(default_factory=list)
    created_at: Optional[str] = Field(default=None, alias="createdAt")


class AnalysisSettingsPayload(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    selected_skills: List[str] = Field(default_factory=list, alias="selectedSkills")
    target_job_title: Optional[str] = Field(default="", alias="targetJobTitle")
    target_industry: Optional[str] = Field(default="", alias="targetIndustry")
    analysis_focus: Optional[str] = Field(default="", alias="analysisFocus")
    active_job_description: Optional[JobDescriptionModel] = Field(default=None, alias="activeJobDescription")
    job_descriptions: List[JobDescriptionModel] = Field(default_factory=list, alias="jobDescriptions")

class AnalyzeSingleRequest(BaseModel):
    resume_id: str
    job_description: Optional[str] = None
    analysis_focus: Optional[str] = None  # e.g., "ATS compatibility", "keyword optimization", "formatting"

class ChatbotRequest(BaseModel):
    message: str
    resume_id: Optional[str] = None
    job_description: Optional[str] = None

class ATSRequest(BaseModel):
    resume_id: str
    job_description: str

class FeedbackRequest(BaseModel):
    resume_id: str
    feedback_text: str
    rating: int = Field(..., ge=1, le=5)

class ExportRequest(BaseModel):
    resume_ids: List[str]
    format: str = "json"  # json, csv, pdf

class DashboardResponse(BaseModel):
    total_resumes: int
    best_resume: Optional[Dict[str, Any]]
    average_scores: ComponentScore
    recent_analyses: List[Dict[str, Any]]
    skill_distribution: Dict[str, int]
    experience_distribution: Dict[str, int]

class OntologyUpload(BaseModel):
    skills: List[str]
    job_titles: List[str]
    industries: List[str]
