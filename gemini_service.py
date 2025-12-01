import json
import re
import logging
from typing import Optional

import google.generativeai as genai

from config import settings
from models import GeminiAnalysis, KeywordAnalysis, SectionAnalysis
from prompts import ATS_ANALYSIS_PROMPT

logger = logging.getLogger(__name__)

if settings.GEMINI_API_KEY:
        genai.configure(api_key=settings.GEMINI_API_KEY)
        else:
                    logger.warning("GEMINI_API_KEY not set. Gemini features will not work.")
                    

def get_gemini_model():
            generation_config = {
                    "temperature": settings.GEMINI_TEMPERATURE,
                            "max_output_tokens": settings.GEMINI_MAX_TOKENS,
                                }
                                    return genai.GenerativeModel(
                                            settings.GEMINI_MODEL,
                                                    generation_config=generation_config,
                                                        )
                                                        

def parse_gemini_response(response_text: str) -> dict:
            cleaned = response_text.strip()
                if cleaned.startswith("```json"):
                                cleaned = cleaned[7:]
                                    elif cleaned.startswith("```"):
                                                    cleaned = cleaned[3:]
                                                        if cleaned.endswith("```"):
                                                                        cleaned = cleaned[:-3]
                                                                            cleaned = cleaned.strip()
                                                                            
    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if match:
                        cleaned = match.group(0)
                        
    return json.loads(cleaned)
    

async def analyze_with_gemini(resume_text: str, job_description: Optional[str] = None) -> GeminiAnalysis:
            if not settings.GEMINI_API_KEY:
                            logger.warning("GEMINI_API_KEY not configured. Returning default analysis.")
                                    return GeminiAnalysis(
                                                ats_score=70.0,
                                                            match_percentage=70.0,
                                                                        keyword_analysis=KeywordAnalysis(found=[], missing=[], density=0.0),
                                                                                    section_analysis=[],
                                                                                                strengths=["Resume structure is present"],
                                                                                                            weaknesses=["Gemini API key not configured"],
                                                                                                                        recommendations=["Configure GEMINI_API_KEY in .env file for full analysis"],
                                                                                                                                )
                                                                                                                                
    try:
                    model = get_gemini_model()
                            resume_content = resume_text[:8000]
                                    job_desc_section = (
                                                f"

Job Description/Requirements:
{job_description[:3000]}
"
                                                            if job_description
                                                                        else "

Note: No specific job description provided. Provide general ATS analysis.
"
                                                                                )
                                                                                
        prompt = ATS_ANALYSIS_PROMPT.format(
                    resume_text=resume_content,
                                job_description_section=job_desc_section,
                                        )
                                        
        response = model.generate_content(prompt)
                data = parse_gemini_response(response.text or "")
                
        keyword_analysis = KeywordAnalysis(**data["keyword_analysis"])
                section_analysis = [SectionAnalysis(**section) for section in data["section_analysis"]]
                
        return GeminiAnalysis(
                    ats_score=float(data.get("ats_score", 70)),
                                match_percentage=float(data.get("match_percentage", 70)),
                                            keyword_analysis=keyword_analysis,
                                                        section_analysis=section_analysis,
                                                                    strengths=data.get("strengths", []),
                                                                                weaknesses=data.get("weaknesses", []),
                                                                                            recommendations=data.get("recommendations", []),
                                                                                                    )
                                                                                                        except Exception as exc:
                                                                                                                        logger.error(f"Error in Gemini analysis: {exc}")
                                                                                                                                return GeminiAnalysis(
                                                                                                                                            ats_score=70.0,
                                                                                                                                                        match_percentage=70.0,
                                                                                                                                                                    keyword_analysis=KeywordAnalysis(found=[], missing=[], density=0.0),
                                                                                                                                                                                section_analysis=[],
                                                                                                                                                                                            strengths=["Resume structure is present"],
                                                                                                                                                                                                        weaknesses=["Unable to complete full analysis"],
                                                                                                                                                                                                                    recommendations=["Review resume formatting", "Ensure all sections are complete"],
                                                                                                                                                                                                                            )
                                                                                                                                                                                                                            

def get_ats_score(resume_text: str, job_description: str) -> float:
            analysis = await analyze_with_gemini(resume_text, job_description)
                return analysis.ats_score
                