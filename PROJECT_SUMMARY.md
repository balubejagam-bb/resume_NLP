# Resume Intelligence - Project Summary

## Overview

Resume Intelligence is a full-stack web application for analyzing resumes, checking ATS (Applicant Tracking System) compatibility, and providing actionable recommendations using AI-powered analysis.

## Architecture

### Backend (FastAPI + Python 3.11)
- **Framework**: FastAPI with async/await support
- **Database**: MongoDB with Motor (async driver)
- **NLP**: spaCy for text processing, sentence-transformers for embeddings
- **AI**: Google Gemini Pro for intelligent analysis
- **File Parsing**: pdfplumber (PDF), python-docx (DOCX), native (TXT)
- **Storage**: Local file system (uploads/ and exports/ directories)

### Frontend (React + TypeScript + Vite)
- **Framework**: React 18.2 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with custom glassmorphism design
- **Charts**: Recharts for data visualization
- **Icons**: Lucide React
- **HTTP Client**: Axios

## Key Features

### 1. Resume Upload & Processing
- Upload up to 15 resumes (or single file)
- Support for PDF, DOCX, and TXT formats
- Automatic text extraction and parsing
- PII (Personally Identifiable Information) masking
- Duplicate detection using semantic similarity

### 2. NLP Processing
- Skill extraction from resume text
- Experience years calculation
- Education information extraction
- Keyword analysis
- Text normalization and cleaning

### 3. Component Scoring
Six-component scoring system:
- **Skill Match**: How well skills match job requirements
- **Experience**: Years of experience scoring
- **Education**: Education level and quality
- **Format**: Resume structure and formatting
- **Keyword Density**: Optimal keyword usage
- **Timeline**: Chronological order and consistency

### 4. AI-Powered Analysis (Gemini Pro)
- ATS compatibility score (0-100)
- Match percentage with job description
- Keyword analysis (found vs missing)
- Section analysis (Contact, Summary, Experience, Education, Skills)
- Strengths identification
- Weaknesses identification
- Actionable recommendations

### 5. Dashboard & Analytics
- Total resumes count
- Best resume tracking
- Average scores across all resumes
- Skill distribution charts
- Experience distribution
- Recent analyses timeline

### 6. ATS Check
- Compare resume against job description
- Real-time compatibility scoring
- Detailed match analysis
- Improvement suggestions

## File Structure

```
.
├── backend/
│   ├── main.py              # FastAPI app entry point
│   ├── config.py            # Configuration management
│   ├── database.py          # MongoDB connection
│   ├── models.py            # Pydantic data models
│   ├── storage.py           # File storage utilities
│   ├── parser.py            # Resume parsing (PDF/DOCX/TXT)
│   ├── nlp_processor.py     # NLP processing & PII masking
│   ├── scorer.py            # Component scoring logic
│   ├── gemini_service.py    # Gemini Pro integration
│   ├── api_routes.py        # All API endpoints
│   ├── uploads/             # Uploaded files (auto-created)
│   └── exports/              # Exported data (auto-created)
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   │   ├── Navbar.tsx
│   │   │   ├── UploadTab.tsx
│   │   │   ├── ResultsTab.tsx
│   │   │   ├── SingleAnalysisTab.tsx
│   │   │   ├── ATSCheckTab.tsx
│   │   │   ├── DashboardTab.tsx
│   │   │   └── SettingsTab.tsx
│   │   ├── hooks/           # Custom React hooks
│   │   │   └── useResumes.ts
│   │   ├── api/             # API client
│   │   │   └── axios.ts
│   │   ├── types.ts         # TypeScript definitions
│   │   ├── App.tsx          # Main app component
│   │   ├── main.tsx         # Entry point
│   │   └── index.css        # Global styles
│   ├── package.json
│   └── vite.config.ts
├── requirements.txt         # Python dependencies
├── .env.example            # Environment template
├── README.md               # Main documentation
├── SETUP.md                # Setup guide
└── .gitignore
```

## API Endpoints

### Upload & Analysis
- `POST /api/upload` - Upload resumes (multipart/form-data)
- `POST /api/analyze_single` - Analyze single resume
- `POST /api/ats_check` - ATS check with job description

### Data Retrieval
- `GET /api/resumes` - Get all uploaded resumes
- `GET /api/analyses/{resume_id}` - Get analysis for resume
- `GET /api/dashboard` - Get dashboard statistics

### Data Management
- `POST /api/mark_best` - Mark resume as best
- `POST /api/feedback` - Submit feedback
- `POST /api/export` - Export data (JSON/CSV)
- `POST /api/ontology` - Update ontology

## UI Components

### Tabs
1. **Upload**: Drag-and-drop file upload with preview
2. **Results**: Browse and view all resume analyses
3. **Single Analysis**: Detailed analysis for one resume
4. **ATS Check**: Compare resume with job description
5. **Dashboard**: Analytics and visualizations
6. **Settings**: Update ontology and preferences

### Design Features
- Glassmorphism UI with backdrop blur
- Gradient buttons with hover effects
- Animated progress bars
- Responsive grid layouts
- Color-coded tags (found/missing keywords)
- Interactive charts and graphs

## Security Features

- PII masking (emails, phones, SSNs, addresses)
- File size limits (10MB per file)
- File type validation
- CORS configuration
- Environment variable management

## Performance Optimizations

- Async/await throughout backend
- Lazy loading of NLP models
- Efficient MongoDB queries with indexes
- React component memoization
- Optimized file parsing

## Dependencies

### Backend
- FastAPI 0.104.1
- Motor 3.3.2 (MongoDB async)
- spaCy 3.7.2
- sentence-transformers 2.2.2
- google-generativeai 0.3.1
- pdfplumber 0.10.3
- python-docx 1.1.0

### Frontend
- React 18.2.0
- TypeScript 5.2.2
- Vite 5.0.8
- Tailwind CSS 3.3.6
- Axios 1.6.2
- Recharts 2.10.3

## Configuration

All configuration is managed through:
- `.env` file (backend)
- `config.py` (Python settings)
- `vite.config.ts` (Frontend build)

## Development Workflow

1. Start MongoDB
2. Start backend: `cd backend && uvicorn main:app --reload`
3. Start frontend: `cd frontend && npm run dev`
4. Access: `http://localhost:5173`

## Testing Checklist

- [ ] Upload single PDF resume
- [ ] Upload multiple resumes (up to 15)
- [ ] Analyze single resume
- [ ] ATS check with job description
- [ ] View dashboard statistics
- [ ] Mark resume as best
- [ ] Update ontology in settings
- [ ] Export data (JSON/CSV)
- [ ] Verify PII masking
- [ ] Test duplicate detection

## Future Enhancements

- User authentication
- Resume templates
- Job recommendation engine
- Batch processing
- Cloud storage integration
- Advanced analytics
- PDF export of reports
- Email notifications

## License

Educational use only.

