# Quick Setup Guide

## Prerequisites

1. **Python 3.11+** - [Download](https://www.python.org/downloads/)
2. **Node.js 18+** - [Download](https://nodejs.org/)
3. **MongoDB** - [Download](https://www.mongodb.com/try/download/community)
4. **Google Gemini API Key** - [Get API Key](https://makersuite.google.com/app/apikey)

## Step-by-Step Setup

### 1. Clone/Download the Project

```bash
cd crusor
```

### 2. Backend Setup

#### Option A: Using Conda (Recommended)

```bash
# Create conda environment
conda create -n resume-intelligence python=3.11
conda activate resume-intelligence

# Install dependencies
pip install -r requirements.txt

# Download spaCy model
python -m spacy download en_core_web_sm
```

#### Option B: Using venv

```bash
# Create virtual environment
python3.11 -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Activate (Linux/Mac)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Download spaCy model
python -m spacy download en_core_web_sm
```

#### Configure Backend

1. Create `.env` file in `backend/` directory:

```bash
cd backend
cp ../.env.example .env
```

2. Edit `backend/.env` and add your Gemini API key:

```env
GEMINI_API_KEY=your_actual_api_key_here
```

3. Ensure MongoDB is running:

```bash
# Windows (if installed as service, it should auto-start)
# Or start manually:
mongod

# Linux/Mac
sudo systemctl start mongod
# Or:
mongod
```

4. Start the backend server:

```bash
cd backend
uvicorn main:app --reload
```

Backend will run on `http://localhost:8000`

### 3. Frontend Setup

1. Install dependencies:

```bash
cd frontend
npm install
```

2. Start the development server:

```bash
npm run dev
```

Frontend will run on `http://localhost:5173`

### 4. Access the Application

Open your browser and navigate to:
```
http://localhost:5173
```

## Verification

### Check Backend

Visit `http://localhost:8000/docs` to see the API documentation (Swagger UI)

### Check Frontend

The application should load with the glassmorphism UI and navigation tabs.

## Common Issues

### MongoDB Not Running

**Error**: `pymongo.errors.ServerSelectionTimeoutError`

**Solution**: 
- Start MongoDB service
- Check `MONGODB_URL` in `.env` file
- Verify MongoDB is accessible on port 27017

### spaCy Model Not Found

**Error**: `OSError: [E050] Can't find model 'en_core_web_sm'`

**Solution**:
```bash
python -m spacy download en_core_web_sm
```

### Gemini API Error

**Error**: `google.api_core.exceptions.InvalidArgument`

**Solution**:
- Verify `GEMINI_API_KEY` is set correctly in `.env`
- Check API key is valid and has quota
- Ensure internet connection for API calls

### Port Already in Use

**Backend**:
```bash
uvicorn main:app --reload --port 8001
```

**Frontend**: Edit `vite.config.ts` and change port

### Import Errors

**Solution**:
- Ensure you're in the correct directory
- Activate virtual environment
- Reinstall dependencies: `pip install -r requirements.txt`

## Next Steps

1. Upload a test resume (PDF/DOCX/TXT)
2. Analyze it using the Single Analysis tab
3. Try ATS Check with a job description
4. Explore the Dashboard for insights

## Production Deployment

For production:

1. **Backend**: Use a production ASGI server like Gunicorn with Uvicorn workers
2. **Frontend**: Build and serve static files: `npm run build`
3. **Environment**: Set proper CORS origins and security settings
4. **Database**: Use a managed MongoDB service (MongoDB Atlas)
5. **File Storage**: Consider cloud storage for production

## Support

If you encounter issues:
1. Check the troubleshooting section in README.md
2. Review error logs in the console
3. Verify all services are running
4. Check environment variables are set correctly

