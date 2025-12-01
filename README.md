# Resume Intelligence Platform

A full-stack Resume Analysis & Job Recommender platform built with FastAPI (Python 3.11) backend and React + TypeScript + Vite frontend. The system uses advanced NLP processing, Gemini Pro AI, and MongoDB for comprehensive resume analysis and ATS compatibility checking.

## Features

- **Multi-format Resume Upload**: Support for PDF, DOCX, and TXT files (up to 15 files or single file)
- **Advanced Parsing**: Extract text from PDFs using pdfplumber and DOCX using python-docx
- **NLP Processing**: 
  - Skill extraction using spaCy
  - Experience and education extraction
  - PII (Personally Identifiable Information) masking
  - Duplicate detection using sentence transformers
- **Component Scoring**: 
  - Skill match score
  - Experience score
  - Education score
  - Format/quality score
  - Keyword density score
  - Timeline/chronology score
- **AI-Powered Analysis**: Gemini Pro integration for:
  - ATS compatibility score
  - Match percentage
  - Keyword analysis (found/missing)
  - Section analysis
  - Strengths and weaknesses identification
  - Actionable recommendations
- **Dashboard**: Visual analytics with charts and statistics
- **Modern UI**: Glassmorphism design with gradient animations and responsive layout

## Tech Stack

### Backend
- FastAPI 0.104.1
- Python 3.11
- MongoDB (Motor async driver)
- spaCy for NLP
- sentence-transformers for embeddings
- pdfplumber for PDF parsing
- python-docx for DOCX parsing
- Google Generative AI (Gemini Pro)

### Frontend
- React 18.2
- TypeScript
- Vite
- Tailwind CSS
- Axios
- Recharts for data visualization
- Lucide React for icons

## Prerequisites

- Python 3.11+
- Node.js 18+ and npm
- MongoDB (local or remote instance)
- Google Generative AI API key (for Gemini Pro)

## Installation

### 1. Backend Setup

#### Create Conda Environment (Recommended)

```bash
conda create -n resume-intelligence python=3.11
conda activate resume-intelligence
```

#### Install Python Dependencies

```bash
cd backend
pip install -r ../requirements.txt
```

#### Install spaCy Model

```bash
python -m spacy download en_core_web_sm
```

#### Environment Configuration

Create a `.env` file in the `backend` directory:

```env
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=resume_intelligence
GEMINI_API_KEY=your_gemini_api_key_here
SECRET_KEY=your-secret-key-change-in-production
```

#### Run Backend Server

```bash
cd backend
uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`

### 2. Frontend Setup

#### Install Dependencies

```bash
cd frontend
npm install
```

#### Run Development Server

```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

## Project Structure

```
.
├── backend/
│   ├── main.py              # FastAPI application entry point
│   ├── config.py            # Configuration and settings
│   ├── database.py          # MongoDB connection and setup
│   ├── models.py            # Pydantic models
│   ├── storage.py            # File storage utilities
│   ├── parser.py            # Resume parsing (PDF/DOCX/TXT)
│   ├── nlp_processor.py     # NLP processing and PII masking
│   ├── scorer.py            # Component scoring logic
│   ├── gemini_service.py    # Gemini Pro integration
│   ├── api_routes.py        # API endpoints
│   ├── uploads/             # Uploaded resume files (created automatically)
│   └── exports/              # Exported data (created automatically)
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── api/             # API client setup
│   │   ├── types.ts         # TypeScript type definitions
│   │   ├── App.tsx          # Main app component
│   │   └── main.tsx         # Entry point
│   ├── package.json
│   └── vite.config.ts
├── requirements.txt         # Python dependencies
└── README.md
```

## API Endpoints

### Upload & Analysis
- `POST /api/upload` - Upload resumes (up to 15 files)
- `POST /api/analyze_single` - Analyze a single resume
- `POST /api/ats_check` - ATS compatibility check with job description

### Data Management
- `GET /api/resumes` - Get all uploaded resumes
- `GET /api/analyses/{resume_id}` - Get analysis for a resume
- `POST /api/mark_best` - Mark a resume as best
- `POST /api/feedback` - Submit feedback for a resume
- `POST /api/export` - Export resume data (JSON/CSV)

### Dashboard & Settings
- `GET /api/dashboard` - Get dashboard statistics
- `POST /api/ontology` - Update ontology (skills, job titles, industries)

## Usage

### 1. Upload Resumes

1. Navigate to the **Upload** tab
2. Drag and drop resume files or click to select
3. Upload up to 15 files (PDF, DOCX, or TXT)
4. Files are automatically parsed and processed

### 2. View Results

1. Go to the **Results** tab
2. Browse uploaded resumes
3. Click on a resume to view detailed analysis
4. Click "Analyze" to generate analysis if not already done

### 3. Single Analysis

1. Go to the **Single Analysis** tab
2. Select a resume from the dropdown
3. Click "Analyze Resume" to get detailed analysis

### 4. ATS Check

1. Go to the **ATS Check** tab
2. Select a resume
3. Paste the job description
4. Click "Check ATS Compatibility" to get match score and recommendations

### 5. Dashboard

1. Go to the **Dashboard** tab
2. View statistics, charts, and analytics
3. See average scores, skill distribution, and recent analyses

### 6. Settings

1. Go to the **Settings** tab
2. Update ontology with custom skills, job titles, and industries
3. This improves matching accuracy

## Troubleshooting

### Backend Issues

#### MongoDB Connection Error
- Ensure MongoDB is running: `mongod` or check your MongoDB service
- Verify `MONGODB_URL` in `.env` file
- Check if MongoDB is accessible on the specified port

#### spaCy Model Not Found
```bash
python -m spacy download en_core_web_sm
```

#### Gemini API Error
- Verify your `GEMINI_API_KEY` in `.env` file
- Check API key validity and quota
- Ensure internet connection for API calls

#### File Upload Errors
- Check file size limits (default: 10MB)
- Verify file extensions are allowed (.pdf, .docx, .txt)
- Ensure `uploads/` directory has write permissions

#### Import Errors
- Ensure all dependencies are installed: `pip install -r requirements.txt`
- Verify Python version is 3.11+
- Check virtual environment is activated

### Frontend Issues

#### Build Errors
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Check Node.js version (18+ required)
- Verify TypeScript configuration

#### API Connection Errors
- Ensure backend is running on `http://localhost:8000`
- Check CORS settings in backend config
- Verify proxy configuration in `vite.config.ts`

#### Styling Issues
- Ensure Tailwind CSS is properly configured
- Check `tailwind.config.js` and `postcss.config.js`
- Verify CSS imports in `index.css`

### General Issues

#### Port Already in Use
- Backend: Change port in `uvicorn main:app --reload --port 8001`
- Frontend: Change port in `vite.config.ts` or use `npm run dev -- --port 5174`

#### Slow Performance
- Check MongoDB indexes are created
- Reduce number of uploaded files
- Optimize Gemini API calls (may have rate limits)

## Environment Variables

### Backend (.env)

```env
# MongoDB
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=resume_intelligence

# File Storage
UPLOAD_DIR=uploads
EXPORT_DIR=exports
MAX_FILE_SIZE=10485760
MAX_FILES=15

# Gemini AI
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-pro

# NLP Models
SPACY_MODEL=en_core_web_sm
SENTENCE_TRANSFORMER_MODEL=all-MiniLM-L6-v2

# CORS
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# Security
SECRET_KEY=your-secret-key-change-in-production
```

## Development

### Running in Development Mode

**Backend:**
```bash
cd backend
uvicorn main:app --reload
```

**Frontend:**
```bash
cd frontend
npm run dev
```

### Building for Production

**Frontend:**
```bash
cd frontend
npm run build
```

The built files will be in `frontend/dist/`

## License

This project is for educational purposes.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review error logs in the console
3. Verify all dependencies are correctly installed
4. Ensure MongoDB and API services are running

## Notes

- The system uses local file storage (no AWS/Docker required)
- PII masking is performed automatically on uploaded resumes
- Duplicate detection uses semantic similarity (95% threshold)
- Gemini Pro API requires valid API key and may have usage limits
- All file operations are async for better performance

