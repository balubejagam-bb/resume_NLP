from google import genai
try:
    import google.generativeai as genai_legacy
except ImportError:
    genai_legacy = None

from typing import Dict, List, Optional
import logging
import time
import json
import re
from dotenv import load_dotenv

# Load .env file before importing settings
load_dotenv()

from config import settings
from models import GeminiAnalysis, KeywordAnalysis, SectionAnalysis
from prompts import ATS_ANALYSIS_PROMPT, CHATBOT_SYSTEM_PROMPT, RESUME_OPTIMIZATION_PROMPT

logger = logging.getLogger(__name__)

# Initialize GenAI client (only if API key is provided)
client = None
if settings.GEMINI_API_KEY:
    try:
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
    except Exception as e:
        logger.error(f"Error initializing GenAI client: {e}")
        client = None
    
    # Configure legacy SDK if available
    if genai_legacy:
        try:
            genai_legacy.configure(api_key=settings.GEMINI_API_KEY)
        except Exception as e:
            logger.error(f"Error configuring legacy GenAI: {e}")
else:
    logger.warning("GEMINI_API_KEY not set. Gemini features will not work.")

def get_gemini_model(model_name: Optional[str] = None):
    """Return model name and generation config for use with the GenAI client"""
    generation_config = {
        "temperature": settings.GEMINI_TEMPERATURE,
        "max_output_tokens": settings.GEMINI_MAX_TOKENS,
    }
    return (model_name or settings.GEMINI_MODEL, generation_config)

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


def send_prompt_to_model(model_name: str, prompt: str, generation_config: dict) -> str:
    """Send prompt to Gemini/GenAI using available client APIs and return text output.

    Tries in order: 
    1. client.models.generate_content (New SDK)
    2. client.responses.create (New SDK early versions)
    3. client.generate (New SDK alternative)
    4. genai.GenerativeModel.generate_content (Old SDK via google.genai if available)
    5. genai_legacy.GenerativeModel.generate_content (Old SDK via google.generativeai)
    6. genai.responses.create (Module level)
    7. genai.generate (Module level)
    """
    last_exc = None
    attempts = []

    # 1) Client-level models.generate_content (Standard for google-genai >= 0.9)
    try:
        if client is not None and hasattr(client, "models") and hasattr(client.models, "generate_content"):
            # Adapt config keys if necessary. 
            resp = client.models.generate_content(model=model_name, contents=prompt, config=generation_config)
            if hasattr(resp, "text"):
                return resp.text
            return str(resp)
        else:
            attempts.append(("client.models.generate_content", "not available"))
    except Exception as e:
        last_exc = e
        attempts.append(("client.models.generate_content", str(e)))

    # 2) New Responses API on client
    try:
        if client is not None and hasattr(client, "responses") and hasattr(client.responses, "create"):
            resp = client.responses.create(model=model_name, input=prompt, **generation_config)
            if hasattr(resp, "output_text") and resp.output_text:
                return resp.output_text
            out = getattr(resp, "output", None)
            if out:
                pieces = []
                if isinstance(out, list):
                    for o in out:
                        if isinstance(o, dict):
                            for c in o.get("content", []):
                                if isinstance(c, dict) and c.get("text"):
                                    pieces.append(c.get("text"))
                        elif isinstance(o, str):
                            pieces.append(o)
                elif isinstance(out, dict):
                    for c in out.get("content", []):
                        if isinstance(c, dict) and c.get("text"):
                            pieces.append(c.get("text"))
                if pieces:
                    return "\n".join(pieces)
            return str(resp)
        else:
            attempts.append(("client.responses.create", "not available"))
    except Exception as e:
        last_exc = e
        attempts.append(("client.responses.create", str(e)))

    # 3) Client-level generate (some versions)
    try:
        if client is not None and hasattr(client, "generate"):
            resp = client.generate(model=model_name, prompt=prompt, **generation_config)
            if hasattr(resp, "text"):
                return resp.text
            return str(resp)
    except Exception as e:
        last_exc = e
        attempts.append(("client.generate", str(e)))

    # 4) Legacy GenerativeModel (from older SDKs via google.genai)
    try:
        if hasattr(genai, "GenerativeModel"):
            gen_model = genai.GenerativeModel(model_name, generation_config=generation_config)
            resp = gen_model.generate_content(prompt)
            if hasattr(resp, "text"):
                return resp.text
            return str(resp)
    except Exception as e:
        last_exc = e
        attempts.append(("genai.GenerativeModel.generate_content", str(e)))

    # 5) Legacy GenerativeModel (via google.generativeai)
    try:
        if genai_legacy and hasattr(genai_legacy, "GenerativeModel"):
            gen_model = genai_legacy.GenerativeModel(model_name, generation_config=generation_config)
            resp = gen_model.generate_content(prompt)
            if hasattr(resp, "text"):
                return resp.text
            return str(resp)
        else:
            attempts.append(("genai_legacy.GenerativeModel.generate_content", "not available"))
    except Exception as e:
        last_exc = e
        attempts.append(("genai_legacy.GenerativeModel.generate_content", str(e)))

    # 6) Module-level Responses API (some genai versions expose this)
    try:
        if hasattr(genai, "responses") and hasattr(genai.responses, "create"):
            resp = genai.responses.create(model=model_name, input=prompt, **generation_config)
            if hasattr(resp, "output_text") and resp.output_text:
                return resp.output_text
            out = getattr(resp, "output", None)
            if out:
                pieces = []
                if isinstance(out, list):
                    for o in out:
                        if isinstance(o, dict):
                            for c in o.get("content", []):
                                if isinstance(c, dict) and c.get("text"):
                                    pieces.append(c.get("text"))
                        elif isinstance(o, str):
                            pieces.append(o)
                elif isinstance(out, dict):
                    for c in out.get("content", []):
                        if isinstance(c, dict) and c.get("text"):
                            pieces.append(c.get("text"))
                if pieces:
                    return "\n".join(pieces)
            return str(resp)
        else:
            attempts.append(("genai.responses.create", "not available"))
    except Exception as e:
        last_exc = e
        attempts.append(("genai.responses.create", str(e)))

    # 7) Module-level genai.generate
    try:
        if hasattr(genai, "generate"):
            resp = genai.generate(model=model_name, prompt=prompt, **generation_config)
            if isinstance(resp, dict) and resp.get("output"):
                out = resp.get("output")
                if isinstance(out, str):
                    return out
                if isinstance(out, list):
                    return "\n".join([str(i) for i in out])
            if hasattr(resp, "text"):
                return resp.text
            return str(resp)
    except Exception as e:
        last_exc = e
        attempts.append(("genai.generate", str(e)))

    # If nothing worked, raise a helpful error with attempted methods
    attempt_msgs = "; ".join([f"{name}: {msg}" for name, msg in attempts])
    raise RuntimeError(f"No compatible GenAI generation API available. Attempts: {attempt_msgs}")

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
            # Try configured model first, then updated fallbacks for availability
            candidate_models: List[str] = []
            if settings.GEMINI_MODEL:
                candidate_models.append(settings.GEMINI_MODEL)
            # Updated (Dec 2025) recommended model names
            candidate_models.extend([
                "gemini-2.5-flash",
                "gemini-3-pro-preview",
                "gemini-2.5-flash-lite",
            ])
            seen = set()
            candidate_models = [m for m in candidate_models if not (m in seen or seen.add(m))]

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

            response_text = None

            for model_name in candidate_models:
                try:
                    logger.info(f"Sending request to Gemini API using model {model_name} (API {getattr(settings, 'GEMINI_API_VERSION', 'v1')})...")
                    generation_config = {
                        "temperature": settings.GEMINI_TEMPERATURE,
                        "max_output_tokens": settings.GEMINI_MAX_TOKENS,
                    }
                    response_text = send_prompt_to_model(model_name, prompt, generation_config)

                    logger.info(f"Received response from Gemini API (model {model_name})")
                    break
                except Exception as model_err:
                    last_error = model_err
                    err_str = str(model_err).lower()
                    if "404" in err_str or "not found" in err_str:
                        logger.warning(f"Model {model_name} unavailable: {model_err}")
                        continue
                    raise

            if response_text is None:
                raise last_error or RuntimeError("No Gemini model responded")
            
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

