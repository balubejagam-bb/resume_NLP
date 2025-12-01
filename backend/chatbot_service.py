"""
Chatbot service for interactive resume analysis using Gemini 2.0 Flash
"""
import google.generativeai as genai
from typing import List, Dict, Optional
import logging
from config import settings
from prompts import CHATBOT_SYSTEM_PROMPT, RESUME_OPTIMIZATION_PROMPT
from parser import parse_resume
from nlp_processor import process_resume_text

logger = logging.getLogger(__name__)

def get_chatbot_model():
    """Get Gemini model for chatbot with optimized settings"""
    try:
        generation_config = {
            "temperature": settings.GEMINI_TEMPERATURE,
            "max_output_tokens": settings.GEMINI_MAX_TOKENS,
        }
        return genai.GenerativeModel(
            settings.GEMINI_MODEL,
            generation_config=generation_config
        )
    except Exception as e:
        logger.error(f"Error initializing chatbot model: {e}")
        raise

async def chat_with_resume(
    user_message: str,
    resume_text: Optional[str] = None,
    job_description: Optional[str] = None,
    conversation_history: Optional[List[Dict]] = None
) -> str:
    """
    Chat with AI about resume analysis and optimization
    
    Args:
        user_message: User's message/question
        resume_text: Resume text if available
        job_description: Job description if available
        conversation_history: Previous conversation messages
    
    Returns:
        AI response
    """
    if not settings.GEMINI_API_KEY:
        return "Gemini API key is not configured. Please set GEMINI_API_KEY in your .env file."
    
    try:
        model = get_chatbot_model()
        
        # Build context
        context_parts = [CHATBOT_SYSTEM_PROMPT]
        if resume_text:
            context_parts.append(f"Resume Content:\n{resume_text[:2000]}\n")
        if job_description:
            context_parts.append(f"Job Description:\n{job_description[:1500]}\n")
        
        context = "\n".join(context_parts)
        
        # Build full prompt
        if context:
            full_message = f"{context}\n\nUser Question: {user_message}"
        else:
            full_message = f"{CHATBOT_SYSTEM_PROMPT}\n\nUser Question: {user_message}"
        
        # Use conversation history if available
        if conversation_history:
            # Format history for Gemini
            chat = model.start_chat(history=conversation_history)
            response = chat.send_message(full_message)
        else:
            response = model.generate_content(full_message)
        
        return response.text
    except Exception as e:
        logger.error(f"Error in chatbot: {e}")
        return f"I apologize, but I encountered an error: {str(e)}. Please try again."

async def analyze_resume_via_chat(
    resume_text: str,
    job_description: Optional[str] = None,
    analysis_focus: Optional[str] = None
) -> str:
    """
    Analyze resume via chatbot with specific focus
    
    Args:
        resume_text: Resume content
        job_description: Optional job description
        analysis_focus: What to focus on (e.g., "ATS compatibility", "keyword optimization", "formatting")
    
    Returns:
        Detailed analysis response
    """
    if not settings.GEMINI_API_KEY:
        return "Gemini API key is not configured."
    
    try:
        model = get_chatbot_model()
        
        focus_instruction = ""
        if analysis_focus:
            focus_instruction = f"\n\nFocus your analysis on: {analysis_focus}\n"
        
        job_desc_str = ""
        if job_description:
            job_desc_str = f"Job Description:\n{job_description[:2000]}\n"

        prompt = f"""Analyze this resume in detail{focus_instruction}

Resume:
{resume_text[:4000]}

{job_desc_str}

Provide a comprehensive analysis covering:
1. ATS Compatibility Score (0-100)
2. Key Strengths
3. Areas for Improvement
4. Specific Recommendations
5. Missing Keywords (if job description provided)
6. Formatting Suggestions

Be detailed and actionable."""
        
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        logger.error(f"Error in resume analysis via chat: {e}")
        return f"Error analyzing resume: {str(e)}"

async def get_resume_optimization_suggestions(
    resume_text: str,
    job_description: str
) -> str:
    """
    Get specific optimization suggestions for resume based on job description
    """
    if not settings.GEMINI_API_KEY:
        return "Gemini API key is not configured."
    
    try:
        model = get_chatbot_model()
        
        prompt = RESUME_OPTIMIZATION_PROMPT.format(
            resume_text=resume_text[:4000],
            job_description=job_description[:2000]
        )
        
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        logger.error(f"Error getting optimization suggestions: {e}")
        return f"Error generating suggestions: {str(e)}"

