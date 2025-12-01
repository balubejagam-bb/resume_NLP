from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Query, Header
from fastapi.responses import JSONResponse, FileResponse
from typing import List, Optional
import logging
from datetime import datetime
from bson import ObjectId
import json
import csv
from io import StringIO

from database import get_db
from models import (
    ResumeUpload, ResumeAnalysis, ATSRequest, FeedbackRequest,
    ExportRequest, DashboardResponse, OntologyUpload, ComponentScore,
    AnalyzeSingleRequest, ChatbotRequest, AnalysisSettingsPayload
)
from storage import save_uploaded_file, get_file_path, delete_file, get_file_size
from parser import parse_resume
from nlp_processor import process_resume_text, detect_duplicates
from scorer import calculate_scores
from gemini_service import analyze_with_gemini
from chatbot_service import chat_with_resume, analyze_resume_via_chat, get_resume_optimization_suggestions
from config import settings
from auth import (
    UserRegister, UserLogin, AuthResponse,
    register_user, login_user, verify_token, logout_user
)

logger = logging.getLogger(__name__)
router = APIRouter()


# ==================== AUTH ROUTES ====================

@router.post("/auth/register", response_model=AuthResponse)
async def register(user_data: UserRegister):
    """Register a new user"""
    return await register_user(user_data)

@router.post("/auth/login", response_model=AuthResponse)
async def login(user_data: UserLogin):
    """Login an existing user"""
    return await login_user(user_data)

@router.get("/auth/verify")
async def verify(authorization: Optional[str] = Header(None)):
    """Verify user token and return user info"""
    if not authorization:
        return {"success": False, "message": "No token provided"}
    
    token = authorization.replace("Bearer ", "")
    user = await verify_token(token)
    
    if user:
        return {"success": True, "user": user}
    else:
        return {"success": False, "message": "Invalid or expired token"}

@router.post("/auth/logout")
async def logout(authorization: Optional[str] = Header(None)):
    """Logout user by invalidating token"""
    if not authorization:
        return {"success": False, "message": "No token provided"}
    
    token = authorization.replace("Bearer ", "")
    success = await logout_user(token)
    
    return {"success": success}


# ==================== SETTINGS ROUTES ====================

@router.get("/settings/analysis")
async def get_analysis_settings(
    authorization: Optional[str] = Header(None),
    db = Depends(get_db)
):
    """Retrieve analysis settings for the authenticated user"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing")

    token = authorization.replace("Bearer ", "")
    user = await verify_token(token)

    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    settings_doc = await db.analysis_settings.find_one({"user_id": user.id})

    if settings_doc:
        settings_doc.pop("_id", None)
        settings_doc.pop("user_id", None)
        settings_doc.pop("updated_at", None)
        payload = AnalysisSettingsPayload(**settings_doc)
    else:
        payload = AnalysisSettingsPayload()

    return {"settings": payload.dict(by_alias=True)}


@router.post("/settings/analysis")
async def save_analysis_settings(
    payload: AnalysisSettingsPayload,
    authorization: Optional[str] = Header(None),
    db = Depends(get_db)
):
    """Persist analysis settings for the authenticated user"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing")

    token = authorization.replace("Bearer ", "")
    user = await verify_token(token)

    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    data = payload.model_dump(by_alias=False)

    normalized_jobs = []
    for job in data.get("job_descriptions", []):
        normalized_jobs.append({
            "id": job["id"],
            "title": job["title"],
            "company": job.get("company"),
            "description": job["description"],
            "requirements": job.get("requirements", []),
            "created_at": job.get("created_at") or datetime.utcnow().isoformat()
        })
    data["job_descriptions"] = normalized_jobs

    active_job = data.get("active_job_description")
    if active_job:
        data["active_job_description"] = {
            "id": active_job["id"],
            "title": active_job["title"],
            "company": active_job.get("company"),
            "description": active_job["description"],
            "requirements": active_job.get("requirements", []),
            "created_at": active_job.get("created_at") or datetime.utcnow().isoformat()
        }

    data["user_id"] = user.id
    data["updated_at"] = datetime.utcnow().isoformat()

    await db.analysis_settings.update_one(
        {"user_id": user.id},
        {"$set": data},
        upsert=True
    )

    return {"success": True}


# ==================== FILE ROUTES ====================

@router.post("/upload")
async def upload_resumes(
    files: List[UploadFile] = File(...),
    db = Depends(get_db)
):
    """Upload and process resumes (up to 15 files)"""
    try:
        if len(files) > settings.MAX_FILES:
            raise HTTPException(
                status_code=400,
                detail=f"Maximum {settings.MAX_FILES} files allowed"
            )
        
        uploaded_resumes = []
        
        for file in files:
            # Validate file
            file_ext = file.filename.split('.')[-1].lower() if '.' in file.filename else ''
            if f".{file_ext}" not in settings.ALLOWED_EXTENSIONS:
                raise HTTPException(
                    status_code=400,
                    detail=f"File type .{file_ext} not allowed. Allowed: {settings.ALLOWED_EXTENSIONS}"
                )
            
            # Read file content
            content = await file.read()
            if len(content) > settings.MAX_FILE_SIZE:
                raise HTTPException(
                    status_code=400,
                    detail=f"File {file.filename} exceeds maximum size of {settings.MAX_FILE_SIZE} bytes"
                )
            
            # Save file
            file_path = await save_uploaded_file(content, file.filename)
            
            # Parse resume
            parsed_data = await parse_resume(file_path)
            text = parsed_data["text"]
            
            # Process with NLP
            nlp_data = process_resume_text(text)
            
            # Check for duplicates
            existing_resumes = await db.resumes.find({}).to_list(length=100)
            existing_texts = [(str(r["_id"]), r.get("parsed_text", "")) for r in existing_resumes]
            is_duplicate, duplicate_of = await detect_duplicates(text, existing_texts)
            
            # Create resume document
            resume_doc = {
                "filename": file.filename,
                "file_type": parsed_data["file_type"],
                "upload_date": datetime.utcnow(),
                "file_size": len(content),
                "file_path": file_path,
                "parsed_text": text,
                "masked_text": nlp_data["masked_text"],
                "skills": nlp_data["skills"],
                "experience_years": nlp_data["experience_years"],
                "education": nlp_data["education"],
                "is_duplicate": is_duplicate,
                "duplicate_of": duplicate_of
            }
            
            # Insert into database
            result = await db.resumes.insert_one(resume_doc)
            resume_id = str(result.inserted_id)
            
            uploaded_resumes.append({
                "id": resume_id,
                "filename": file.filename,
                "is_duplicate": is_duplicate,
                "duplicate_of": duplicate_of
            })
            
            logger.info(f"Uploaded resume: {file.filename} (ID: {resume_id})")
        
        return {
            "message": f"Successfully uploaded {len(uploaded_resumes)} resume(s)",
            "resumes": uploaded_resumes
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading resumes: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/analyze_single")
async def analyze_single_resume(
    request: AnalyzeSingleRequest,
    db = Depends(get_db)
):
    """Analyze a single resume"""
    try:
        resume_id = request.resume_id
        job_description = request.job_description
        analysis_focus = request.analysis_focus
        
        # Get resume
        resume = await db.resumes.find_one({"_id": ObjectId(resume_id)})
        if not resume:
            raise HTTPException(status_code=404, detail="Resume not found")
        
        # Extract job keywords if job description provided
        job_keywords = []
        if job_description:
            nlp_data = process_resume_text(job_description)
            job_keywords = nlp_data["skills"]
        
        # Calculate component scores
        component_scores = calculate_scores(
            resume["parsed_text"],
            resume["skills"],
            resume["experience_years"],
            resume["education"],
            job_keywords
        )
        
        # Enhance job description with analysis focus if provided
        enhanced_job_desc = job_description
        if analysis_focus and job_description:
            enhanced_job_desc = f"{job_description}\n\nAnalysis Focus: {analysis_focus}"
        elif analysis_focus:
            enhanced_job_desc = f"Analysis Focus: {analysis_focus}"
        
        # Get Gemini analysis with focus
        gemini_analysis = await analyze_with_gemini(
            resume["parsed_text"],
            enhanced_job_desc
        )
        
        # Create analysis document
        analysis_doc = {
            "resume_id": resume_id,
            "filename": resume["filename"],
            "component_scores": component_scores.dict(),
            "gemini_analysis": gemini_analysis.dict(),
            "created_at": datetime.utcnow(),
            "is_best": False
        }
        
        # Insert analysis
        result = await db.analyses.insert_one(analysis_doc)
        analysis_id = str(result.inserted_id)
        
        logger.info(f"Analysis created: {analysis_id} for resume {resume_id}")
        
        return {
            "analysis_id": analysis_id,
            "resume_id": resume_id,
            "filename": resume["filename"],
            "component_scores": component_scores.dict(),
            "gemini_analysis": gemini_analysis.dict()
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error analyzing resume: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/ats_check")
async def ats_check(
    request: ATSRequest,
    db = Depends(get_db)
):
    """Perform ATS check with job description"""
    try:
        # Get resume
        resume = await db.resumes.find_one({"_id": ObjectId(request.resume_id)})
        if not resume:
            raise HTTPException(status_code=404, detail="Resume not found")
        
        # Get Gemini analysis with job description
        gemini_analysis = await analyze_with_gemini(
            resume["parsed_text"],
            request.job_description
        )
        
        # Calculate scores
        job_keywords = process_resume_text(request.job_description)["skills"]
        component_scores = calculate_scores(
            resume["parsed_text"],
            resume["skills"],
            resume["experience_years"],
            resume["education"],
            job_keywords
        )
        
        return {
            "resume_id": request.resume_id,
            "ats_score": gemini_analysis.ats_score,
            "match_percentage": gemini_analysis.match_percentage,
            "component_scores": component_scores.dict(),
            "gemini_analysis": gemini_analysis.dict()
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in ATS check: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/mark_best")
async def mark_best_resume(
    resume_id: str = Query(..., description="Resume ID to mark as best"),
    db = Depends(get_db)
):
    """Mark a resume as the best one"""
    try:
        # Unmark all other resumes
        await db.analyses.update_many(
            {"is_best": True},
            {"$set": {"is_best": False}}
        )
        
        # Mark this resume as best
        result = await db.analyses.update_one(
            {"resume_id": resume_id},
            {"$set": {"is_best": True}},
            upsert=False
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Resume analysis not found")
        
        logger.info(f"Marked resume {resume_id} as best")
        
        return {"message": "Resume marked as best", "resume_id": resume_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error marking best resume: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/feedback")
async def submit_feedback(
    request: FeedbackRequest,
    db = Depends(get_db)
):
    """Submit feedback for a resume"""
    try:
        feedback_doc = {
            "resume_id": request.resume_id,
            "feedback_text": request.feedback_text,
            "rating": request.rating,
            "created_at": datetime.utcnow()
        }
        
        result = await db.feedback.insert_one(feedback_doc)
        
        logger.info(f"Feedback submitted for resume {request.resume_id}")
        
        return {
            "message": "Feedback submitted successfully",
            "feedback_id": str(result.inserted_id)
        }
    except Exception as e:
        logger.error(f"Error submitting feedback: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/export")
async def export_data(
    request: ExportRequest,
    db = Depends(get_db)
):
    """Export resume data"""
    try:
        # Get analyses
        analyses = []
        for resume_id in request.resume_ids:
            analysis = await db.analyses.find_one({"resume_id": resume_id})
            if analysis:
                analyses.append(analysis)
        
        if request.format == "json":
            # Export as JSON
            export_data = []
            for analysis in analyses:
                export_data.append({
                    "resume_id": analysis["resume_id"],
                    "filename": analysis["filename"],
                    "component_scores": analysis["component_scores"],
                    "gemini_analysis": analysis["gemini_analysis"],
                    "created_at": analysis["created_at"].isoformat()
                })
            
            return JSONResponse(content=export_data)
        
        elif request.format == "csv":
            # Export as CSV
            output = StringIO()
            writer = csv.writer(output)
            
            # Header
            writer.writerow([
                "Resume ID", "Filename", "ATS Score", "Match %",
                "Skill Match", "Experience", "Education", "Format",
                "Keyword Density", "Timeline"
            ])
            
            # Data rows
            for analysis in analyses:
                scores = analysis["component_scores"]
                gemini = analysis["gemini_analysis"]
                writer.writerow([
                    analysis["resume_id"],
                    analysis["filename"],
                    gemini["ats_score"],
                    gemini["match_percentage"],
                    scores["skill_match"],
                    scores["experience"],
                    scores["education"],
                    scores["format"],
                    scores["keyword_density"],
                    scores["timeline"]
                ])
            
            return JSONResponse(content={"csv": output.getvalue()})
        
        else:
            raise HTTPException(status_code=400, detail="Unsupported export format")
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error exporting data: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/dashboard")
async def get_dashboard(db = Depends(get_db)):
    """Get dashboard statistics"""
    try:
        # Get all resumes
        all_resumes = await db.resumes.find({}).to_list(length=1000)
        total_resumes = len(all_resumes)
        
        # Get all analyses
        all_analyses = await db.analyses.find({}).to_list(length=1000)
        
        # Get best resume
        best_analysis = await db.analyses.find_one({"is_best": True})
        best_resume = None
        if best_analysis:
            resume = await db.resumes.find_one({"_id": ObjectId(best_analysis["resume_id"])})
            if resume:
                best_resume = {
                    "id": str(resume["_id"]),
                    "filename": resume["filename"],
                    "ats_score": best_analysis["gemini_analysis"]["ats_score"]
                }
        
        # Calculate average scores
        if all_analyses:
            avg_scores = {
                "skill_match": sum(a["component_scores"]["skill_match"] for a in all_analyses) / len(all_analyses),
                "experience": sum(a["component_scores"]["experience"] for a in all_analyses) / len(all_analyses),
                "education": sum(a["component_scores"]["education"] for a in all_analyses) / len(all_analyses),
                "format": sum(a["component_scores"]["format"] for a in all_analyses) / len(all_analyses),
                "keyword_density": sum(a["component_scores"]["keyword_density"] for a in all_analyses) / len(all_analyses),
                "timeline": sum(a["component_scores"]["timeline"] for a in all_analyses) / len(all_analyses)
            }
        else:
            avg_scores = {
                "skill_match": 0, "experience": 0, "education": 0,
                "format": 0, "keyword_density": 0, "timeline": 0
            }
        
        # Recent analyses
        recent_analyses = sorted(
            all_analyses,
            key=lambda x: x["created_at"],
            reverse=True
        )[:5]
        
        recent_data = []
        for analysis in recent_analyses:
            recent_data.append({
                "id": str(analysis["_id"]),
                "resume_id": analysis["resume_id"],
                "filename": analysis["filename"],
                "ats_score": analysis["gemini_analysis"]["ats_score"],
                "created_at": analysis["created_at"].isoformat()
            })
        
        # Skill distribution
        skill_dist = {}
        for resume in all_resumes:
            for skill in resume.get("skills", []):
                skill_dist[skill] = skill_dist.get(skill, 0) + 1
        
        # Experience distribution
        exp_dist = {"0-1": 0, "1-3": 0, "3-5": 0, "5-10": 0, "10+": 0}
        for resume in all_resumes:
            years = resume.get("experience_years", 0)
            if years < 1:
                exp_dist["0-1"] += 1
            elif years < 3:
                exp_dist["1-3"] += 1
            elif years < 5:
                exp_dist["3-5"] += 1
            elif years < 10:
                exp_dist["5-10"] += 1
            else:
                exp_dist["10+"] += 1
        
        return DashboardResponse(
            total_resumes=total_resumes,
            best_resume=best_resume,
            average_scores=ComponentScore(**avg_scores),
            recent_analyses=recent_data,
            skill_distribution=skill_dist,
            experience_distribution=exp_dist
        )
    except Exception as e:
        logger.error(f"Error getting dashboard: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/ontology")
async def upload_ontology(
    ontology: OntologyUpload,
    db = Depends(get_db)
):
    """Upload ontology (skills, job titles, industries)"""
    try:
        ontology_doc = {
            "skills": ontology.skills,
            "job_titles": ontology.job_titles,
            "industries": ontology.industries,
            "updated_at": datetime.utcnow()
        }
        
        # Upsert ontology
        await db.ontology.update_one(
            {"_id": "main"},
            {"$set": ontology_doc},
            upsert=True
        )
        
        logger.info("Ontology updated")
        
        return {"message": "Ontology updated successfully"}
    except Exception as e:
        logger.error(f"Error updating ontology: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/resumes")
async def get_all_resumes(db = Depends(get_db)):
    """Get all uploaded resumes"""
    try:
        resumes = await db.resumes.find({}).to_list(length=1000)
        return {
            "resumes": [
                {
                    "id": str(r["_id"]),
                    "filename": r["filename"],
                    "upload_date": r["upload_date"].isoformat(),
                    "skills": r.get("skills", []),
                    "experience_years": r.get("experience_years", 0),
                    "is_duplicate": r.get("is_duplicate", False)
                }
                for r in resumes
            ]
        }
    except Exception as e:
        logger.error(f"Error getting resumes: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/resumes/{resume_id}")
async def delete_resume(resume_id: str, db = Depends(get_db)):
    """Delete a resume and its associated analysis"""
    try:
        # Get resume to find file path
        resume = await db.resumes.find_one({"_id": ObjectId(resume_id)})
        if not resume:
            raise HTTPException(status_code=404, detail="Resume not found")
        
        # Delete the file from storage
        file_path = resume.get("file_path")
        if file_path:
            try:
                delete_file(file_path)
            except Exception as e:
                logger.warning(f"Could not delete file {file_path}: {e}")
        
        # Delete associated analysis
        await db.analyses.delete_many({"resume_id": resume_id})
        
        # Delete the resume document
        result = await db.resumes.delete_one({"_id": ObjectId(resume_id)})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Resume not found")
        
        logger.info(f"Deleted resume {resume_id}")
        
        return {"message": "Resume deleted successfully", "resume_id": resume_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting resume: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/resumes")
async def delete_all_resumes(db = Depends(get_db)):
    """Delete all resumes and their associated analyses"""
    try:
        # Get all resumes to find file paths
        resumes = await db.resumes.find({}).to_list(length=1000)
        
        # Delete all files from storage
        for resume in resumes:
            file_path = resume.get("file_path")
            if file_path:
                try:
                    delete_file(file_path)
                except Exception as e:
                    logger.warning(f"Could not delete file {file_path}: {e}")
        
        # Delete all analyses
        await db.analyses.delete_many({})
        
        # Delete all resumes
        result = await db.resumes.delete_many({})
        
        logger.info(f"Deleted {result.deleted_count} resumes")
        
        return {"message": f"Successfully deleted {result.deleted_count} resume(s)"}
    except Exception as e:
        logger.error(f"Error deleting all resumes: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/analyses/{resume_id}")
async def get_analysis(resume_id: str, db = Depends(get_db)):
    """Get analysis for a specific resume"""
    try:
        analysis = await db.analyses.find_one(
            {"resume_id": resume_id},
            sort=[("created_at", -1)]
        )
        
        if not analysis:
            raise HTTPException(status_code=404, detail="Analysis not found")
        
        return {
            "id": str(analysis["_id"]),
            "resume_id": analysis["resume_id"],
            "filename": analysis["filename"],
            "component_scores": analysis["component_scores"],
            "gemini_analysis": analysis["gemini_analysis"],
            "created_at": analysis["created_at"].isoformat(),
            "is_best": analysis.get("is_best", False)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/chatbot/chat")
async def chatbot_chat(
    request: ChatbotRequest,
    db = Depends(get_db)
):
    """Chat with AI assistant about resume analysis"""
    try:
        resume_text = None
        if request.resume_id:
            resume = await db.resumes.find_one({"_id": ObjectId(request.resume_id)})
            if resume:
                resume_text = resume.get("parsed_text", "")
        
        response = await chat_with_resume(
            user_message=request.message,
            resume_text=resume_text,
            job_description=request.job_description
        )
        
        return {"response": response}
    except Exception as e:
        logger.error(f"Error in chatbot: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/chatbot/analyze")
async def chatbot_analyze(
    request: AnalyzeSingleRequest,
    db = Depends(get_db)
):
    """Analyze resume via chatbot"""
    try:
        resume = await db.resumes.find_one({"_id": ObjectId(request.resume_id)})
        if not resume:
            raise HTTPException(status_code=404, detail="Resume not found")
        
        analysis = await analyze_resume_via_chat(
            resume_text=resume["parsed_text"],
            job_description=request.job_description,
            analysis_focus=request.analysis_focus
        )
        
        return {"analysis": analysis}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in chatbot analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/chatbot/optimize")
async def chatbot_optimize(
    request: ATSRequest,
    db = Depends(get_db)
):
    """Get optimization suggestions for resume"""
    try:
        resume = await db.resumes.find_one({"_id": ObjectId(request.resume_id)})
        if not resume:
            raise HTTPException(status_code=404, detail="Resume not found")
        
        suggestions = await get_resume_optimization_suggestions(
            resume_text=resume["parsed_text"],
            job_description=request.job_description
        )
        
        return {"suggestions": suggestions}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting optimization suggestions: {e}")
        raise HTTPException(status_code=500, detail=str(e))

