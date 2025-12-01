from typing import Dict, List
import re
from models import ComponentScore
import logging

logger = logging.getLogger(__name__)

def calculate_scores(
    text: str,
    skills: List[str],
    experience_years: float,
    education: List[str],
    job_keywords: List[str] = None
) -> ComponentScore:
    """Calculate component scores for a resume"""
    
    skill_match = calculate_skill_match_score(skills, job_keywords)
    experience = calculate_experience_score(experience_years)
    education_score = calculate_education_score(education)
    format_score = calculate_format_score(text)
    keyword_density = calculate_keyword_density(text, job_keywords)
    timeline = calculate_timeline_score(text)
    
    return ComponentScore(
        skill_match=skill_match,
        experience=experience,
        education=education_score,
        format=format_score,
        keyword_density=keyword_density,
        timeline=timeline
    )

def calculate_skill_match_score(skills: List[str], job_keywords: List[str] = None) -> float:
    """Calculate skill match score (0-100)"""
    if not job_keywords:
        # Base score on number of skills
        return min(len(skills) * 5, 100)
    
    if not skills:
        return 0
    
    # Normalize to lowercase for comparison
    skills_lower = [s.lower() for s in skills]
    keywords_lower = [k.lower() for k in job_keywords]
    
    # Count matches
    matches = sum(1 for skill in skills_lower if any(kw in skill or skill in kw for kw in keywords_lower))
    
    # Score based on match percentage
    match_ratio = matches / len(keywords_lower) if keywords_lower else 0
    return min(match_ratio * 100, 100)

def calculate_experience_score(years: float) -> float:
    """Calculate experience score (0-100)"""
    if years == 0:
        return 20
    elif years < 1:
        return 40
    elif years < 2:
        return 60
    elif years < 5:
        return 80
    elif years < 10:
        return 90
    else:
        return 100

def calculate_education_score(education: List[str]) -> float:
    """Calculate education score (0-100)"""
    if not education:
        return 30
    
    text = " ".join(education).lower()
    
    score = 50  # Base score
    
    # Add points for higher education
    if any(term in text for term in ['phd', 'doctorate', 'ph.d']):
        score += 30
    elif any(term in text for term in ['master', 'mba', 'ms', 'ma', 'msc']):
        score += 20
    elif any(term in text for term in ['bachelor', 'bs', 'ba', 'bsc']):
        score += 10
    
    # Add points for multiple degrees
    if len(education) > 1:
        score += 10
    
    return min(score, 100)

def calculate_format_score(text: str) -> float:
    """Calculate format/quality score (0-100)"""
    score = 50  # Base score
    
    # Check for sections
    sections = ['experience', 'education', 'skills', 'summary', 'objective', 'contact']
    found_sections = sum(1 for section in sections if section in text.lower())
    score += (found_sections / len(sections)) * 30
    
    # Check for proper length
    word_count = len(text.split())
    if 200 <= word_count <= 2000:
        score += 10
    elif word_count < 200:
        score -= 20
    elif word_count > 2000:
        score -= 10
    
    # Check for bullet points or structured format
    if re.search(r'[•\-\*]\s+', text) or re.search(r'\d+\.\s+', text):
        score += 10
    
    return max(0, min(score, 100))

def calculate_keyword_density(text: str, keywords: List[str] = None) -> float:
    """Calculate keyword density score (0-100)"""
    if not keywords:
        return 50  # Neutral score
    
    text_lower = text.lower()
    keywords_lower = [k.lower() for k in keywords]
    
    # Count keyword occurrences
    total_occurrences = sum(text_lower.count(kw) for kw in keywords_lower)
    
    # Calculate density
    word_count = len(text.split())
    if word_count == 0:
        return 0
    
    density = (total_occurrences / word_count) * 100
    
    # Score based on optimal density (1-3%)
    if 1 <= density <= 3:
        return 100
    elif 0.5 <= density < 1 or 3 < density <= 5:
        return 80
    elif 0.1 <= density < 0.5 or 5 < density <= 7:
        return 60
    else:
        return 40

def calculate_timeline_score(text: str) -> float:
    """Calculate timeline/chronology score (0-100)"""
    # Look for date patterns
    date_pattern = r'(\d{4})\s*[-–]\s*(\d{4}|present|current)'
    dates = re.findall(date_pattern, text, re.IGNORECASE)
    
    if not dates:
        return 30
    
    # Check if dates are in reverse chronological order (most recent first)
    score = 50
    
    # Count valid date ranges
    valid_ranges = 0
    for start, end in dates[:5]:  # Check first 5 date ranges
        try:
            start_year = int(start)
            if end.lower() in ['present', 'current']:
                valid_ranges += 1
            else:
                end_year = int(end)
                if start_year <= end_year:
                    valid_ranges += 1
        except:
            pass
    
    if valid_ranges > 0:
        score += (valid_ranges / min(len(dates), 5)) * 50
    
    return min(score, 100)

