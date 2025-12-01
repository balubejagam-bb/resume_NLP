import spacy
from sentence_transformers import SentenceTransformer
import re
from typing import List, Dict, Tuple, Optional
import logging
from config import settings
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

logger = logging.getLogger(__name__)

# Initialize models (lazy loading)
nlp = None
sentence_model = None

def get_nlp():
    """Lazy load spaCy model"""
    global nlp
    if nlp is None:
        try:
            nlp = spacy.load(settings.SPACY_MODEL)
        except OSError:
            logger.warning(f"spaCy model {settings.SPACY_MODEL} not found. Install with: python -m spacy download {settings.SPACY_MODEL}")
            nlp = spacy.load("en_core_web_sm")
    return nlp

def get_sentence_model():
    """Lazy load sentence transformer model"""
    global sentence_model
    if sentence_model is None:
        sentence_model = SentenceTransformer(settings.SENTENCE_TRANSFORMER_MODEL)
    return sentence_model

def mask_pii(text: str) -> str:
    """Mask PII (Personally Identifiable Information) in text"""
    # Email
    text = re.sub(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', '[EMAIL]', text)
    # Phone numbers
    text = re.sub(r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b', '[PHONE]', text)
    # Social Security Number pattern
    text = re.sub(r'\b\d{3}-\d{2}-\d{4}\b', '[SSN]', text)
    # Credit card pattern
    text = re.sub(r'\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b', '[CARD]', text)
    # Address patterns (simplified)
    text = re.sub(r'\b\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd)\b', '[ADDRESS]', text, flags=re.IGNORECASE)
    return text

def extract_skills(text: str) -> List[str]:
    """Extract skills from resume text"""
    nlp_model = get_nlp()
    doc = nlp_model(text)
    
    # Common skill keywords
    skill_keywords = [
        'python', 'java', 'javascript', 'react', 'angular', 'vue', 'node', 'sql',
        'mongodb', 'postgresql', 'mysql', 'aws', 'azure', 'docker', 'kubernetes',
        'git', 'agile', 'scrum', 'machine learning', 'deep learning', 'ai',
        'data science', 'analytics', 'tableau', 'power bi', 'excel', 'r',
        'tensorflow', 'pytorch', 'pandas', 'numpy', 'django', 'flask', 'fastapi',
        'html', 'css', 'typescript', 'redux', 'graphql', 'rest api', 'microservices'
    ]
    
    found_skills = []
    text_lower = text.lower()
    
    for skill in skill_keywords:
        if skill in text_lower:
            found_skills.append(skill.title())
    
    # Also extract noun phrases that might be skills
    for chunk in doc.noun_chunks:
        if len(chunk.text.split()) <= 3:
            chunk_lower = chunk.text.lower()
            if any(keyword in chunk_lower for keyword in skill_keywords):
                if chunk.text.title() not in found_skills:
                    found_skills.append(chunk.text.title())
    
    return list(set(found_skills))

def extract_experience(text: str) -> float:
    """Extract years of experience from resume"""
    years = 0
    months = 0
    
    # Pattern for years of experience
    year_patterns = [
        r'(\d+)\+?\s*(?:years?|yrs?)',
        r'(\d+)\+?\s*(?:y\.?o\.?e\.?)',
    ]
    
    # Pattern for months of experience
    month_pattern = r'(\d+)\+?\s*(?:months?|mos?)'
    
    for pattern in year_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        for match in matches:
            try:
                years = max(years, int(match))
            except (ValueError, TypeError):
                pass
    
    # Extract months
    month_matches = re.findall(month_pattern, text, re.IGNORECASE)
    for match in month_matches:
        try:
            months += int(match)
        except (ValueError, TypeError):
            pass
    
    # Convert months to years
    total_years = years + (months / 12)
    
    # If no explicit mention, estimate from work history
    if total_years == 0:
        # Look for date ranges
        date_pattern = r'(\d{4})\s*[-–]\s*(\d{4}|present|current)'
        date_matches = re.findall(date_pattern, text, re.IGNORECASE)
        if date_matches:
            # Simple estimation: assume each date range is 2-3 years
            total_years = len(date_matches) * 2.5
    
    return round(total_years, 1)

def extract_education(text: str) -> List[str]:
    """Extract education information"""
    education_keywords = [
        'bachelor', 'master', 'phd', 'doctorate', 'degree', 'diploma',
        'bsc', 'msc', 'mba', 'ba', 'ma', 'bs', 'ms', 'phd'
    ]
    
    nlp_model = get_nlp()
    doc = nlp_model(text)
    
    education = []
    sentences = [sent.text for sent in doc.sents]
    
    for sent in sentences:
        sent_lower = sent.lower()
        if any(keyword in sent_lower for keyword in education_keywords):
            # Extract the education line
            education.append(sent.strip())
    
    return education[:5]  # Limit to 5 entries

async def detect_duplicates(new_text: str, existing_texts: List[Tuple[str, str]]) -> Tuple[bool, Optional[str]]:
    """Detect if a resume is a duplicate using sentence embeddings"""
    if not existing_texts:
        return False, None
    
    try:
        model = get_sentence_model()
        
        # Generate embeddings
        new_embedding = model.encode([new_text])
        existing_embeddings = model.encode([text for _, text in existing_texts])
        
        # Calculate similarities
        similarities = cosine_similarity(new_embedding, existing_embeddings)[0]
        
        # Threshold for duplicate detection
        threshold = 0.95
        max_similarity = np.max(similarities)
        
        if max_similarity >= threshold:
            max_idx = np.argmax(similarities)
            return True, existing_texts[max_idx][0]  # Return the ID of duplicate
        
        return False, None
    except Exception as e:
        logger.error(f"Error detecting duplicates: {e}")
        return False, None

def process_resume_text(text: str) -> Dict:
    """Process resume text and extract all information"""
    masked = mask_pii(text)
    skills = extract_skills(text)
    experience = extract_experience(text)
    education = extract_education(text)
    
    return {
        "masked_text": masked,
        "skills": skills,
        "experience_years": experience,
        "education": education
    }

