import google.generativeai as genai
from typing import Dict, List, Optional
import logging
import time
import json
import re
from config import settings
from models import GeminiAnalysis, KeywordAnalysis, SectionAnalysis
from prompts import ATS_ANALYSIS_PROMPT, CHATBOT_SYSTEM_PROMPT, RESUME_OPTIMIZATION_PROMPT

logger = logging.getLogger(__name__)

# Initialize Gemini (only if API key is provided)
if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)
else:
    logger.warning("GEMINI_API_KEY not set. Gemini features will not work.")

def get_gemini_model(model_name: Optional[str] = None):
    """Get Gemini model instance with configuration"""
    try:
        generation_config = {
            "temperature": settings.GEMINI_TEMPERATURE,
            "max_output_tokens": settings.GEMINI_MAX_TOKENS,
        }
        return genai.GenerativeModel(
            model_name or settings.GEMINI_MODEL,
            generation_config=generation_config
        )
    except Exception as e:
        logger.error(f"Error initializing Gemini model: {e}")
        raise

def parse_gemini_json_response(response_text: str) -> dict:
    """Parse JSON from Gemini response, handling various formats"""
    text = response_text.strip()
    
    # Remove markdown code blocks
    if text.startswith("```json"):
        text = text[7:]
    elif text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    text = text.strip()
    
    # Try direct JSON parse
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    
    # Try to find JSON object in the text
    json_match = re.search(r'\{[\s\S]*\}', text)
    if json_match:
        try:
            return json.loads(json_match.group())
        except json.JSONDecodeError:
            pass
    
    raise ValueError("Could not parse JSON from response")

async def analyze_with_gemini(resume_text: str, job_description: str = None, max_retries: int = 3) -> GeminiAnalysis:
    """Analyze resume using Gemini Pro - Real-time API call with retry logic"""
    if not settings.GEMINI_API_KEY:
        logger.warning("GEMINI_API_KEY not configured. Returning default analysis.")
        return GeminiAnalysis(
            ats_score=70.0,
            match_percentage=70.0,
            keyword_analysis=KeywordAnalysis(found=[], missing=[], density=0.0),
            section_analysis=[],
            strengths=["Resume structure is present"],
            weaknesses=["Gemini API key not configured"],
            recommendations=["Configure GEMINI_API_KEY in .env file for full analysis"]
        )
    
    last_error = None
    
    for attempt in range(max_retries):
        try:
            logger.info(f"Calling Gemini API for real-time analysis (attempt {attempt + 1}/{max_retries})...")
            # Try configured model first, then fallbacks for availability
            candidate_models: List[str] = []
            if settings.GEMINI_MODEL:
                candidate_models.append(settings.GEMINI_MODEL)
            candidate_models.extend([
                "gemini-1.5-flash-8b",
                "gemini-1.0-pro",
            ])
            seen = set()
            candidate_models = [m for m in candidate_models if not (m in seen or seen.add(m))]

            response = None
            response_text = ""

            for model_name in candidate_models:
                try:
                    logger.info(f"Sending request to Gemini API using model {model_name}...")
                    model = get_gemini_model(model_name)
                    response = model.generate_content(prompt)
                    response_text = response.text
                    logger.info(f"Received response from Gemini API (model {model_name})")
                    break
                except Exception as model_err:
                    last_error = model_err
                    err_str = str(model_err).lower()
                    if "404" in err_str or "not found" in err_str:
                        logger.warning(f"Model {model_name} unavailable: {model_err}")
                        continue
                    raise

            if response is None:
                raise last_error or RuntimeError("No Gemini model responded")
            
            # Use full resume text (not truncated) for better analysis
            resume_content = resume_text[:8000]
            
            job_desc_section = ""
            if job_description:
                job_desc_section = f"\n\nJob Description/Requirements:\n{job_description[:3000]}\n"
            else:
                job_desc_section = "\n\nNote: No specific job description provided. Provide general ATS analysis.\n"
            
            # Use prompt template
            prompt = ATS_ANALYSIS_PROMPT.format(
                resume_text=resume_content,
                job_description_section=job_desc_section
            )
            
            # Make actual API call to Gemini
            logger.info("Sending request to Gemini API...")
            response = model.generate_content(prompt)
            response_text = response.text
            logger.info("Received response from Gemini API")
            
            # Parse JSON from response
            data = parse_gemini_json_response(response_text)
            
            # Convert to Pydantic models
            keyword_analysis = KeywordAnalysis(**data["keyword_analysis"])
            section_analysis = [SectionAnalysis(**section) for section in data.get("section_analysis", [])]
            
            result = GeminiAnalysis(
                ats_score=float(data.get("ats_score", 75)),
                match_percentage=float(data.get("match_percentage", 75)),
                keyword_analysis=keyword_analysis,
                section_analysis=section_analysis,
                strengths=data.get("strengths", []),
                weaknesses=data.get("weaknesses", []),
                recommendations=data.get("recommendations", [])
            )
            
            logger.info(f"Successfully analyzed resume. ATS Score: {result.ats_score}")
            return result
            
        except Exception as e:
            last_error = e
            logger.error(f"Error in Gemini analysis (attempt {attempt + 1}): {e}")
            
            # Check if it's a rate limit error
            error_str = str(e).lower()
            if "429" in error_str or "quota" in error_str or "rate" in error_str:
                wait_time = (attempt + 1) * 5  # Exponential backoff: 5s, 10s, 15s
                logger.info(f"Rate limited. Waiting {wait_time} seconds before retry...")
                time.sleep(wait_time)
            elif attempt < max_retries - 1:
                time.sleep(2)  # Small delay before retry for other errors
    
    # All retries failed - return default with error info
    logger.error(f"All {max_retries} attempts failed. Last error: {last_error}")
    return GeminiAnalysis(
        ats_score=70.0,
        match_percentage=70.0,
        keyword_analysis=KeywordAnalysis(found=[], missing=[], density=0.0),
        section_analysis=[],
        strengths=["Resume structure is present"],
        weaknesses=[f"Analysis failed after {max_retries} attempts: {str(last_error)[:100]}"],
        recommendations=["Please try again in a few moments", "Check if the resume file is readable"]
    )

async def get_ats_score(resume_text: str, job_description: str) -> float:
    """Get ATS score from Gemini"""
    analysis = await analyze_with_gemini(resume_text, job_description)
    return analysis.ats_score

