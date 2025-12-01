# Resume Intelligence Runbook

This runbook provides step-by-step instructions to set up Python environments, install dependencies, and run both backend and frontend services for the Resume Intelligence platform. Commands are written for Windows PowerShell unless stated otherwise.

---

## 1. Prerequisites

- **Python 3.11 or later** installed and available on your PATH.
- **Node.js 18 or later** with npm.
- **MongoDB Atlas cluster** or a local MongoDB instance.
- **Google Generative AI API key** (Gemini Pro) for analysis features.

> Verify installation versions:
>
> ```powershell
> python --version
> node --version
> npm --version
> ```

---

## 2. Create & Activate Python Environment

### 2.1 Using `venv` (built-in, recommended for light setups)

```powershell
# From the project root
cd C:\Local Disk D_7182025857\FINALYEARPROJECTS\dhanujay\crusor
python -m venv .venv

# Activate the virtual environment
.\.venv\Scripts\Activate.ps1

# Confirm environment is active
Get-Command python
```

### 2.2 Using Conda (if Anaconda/Miniconda is installed)

```powershell
conda create -n resume-intelligence python=3.11
conda activate resume-intelligence
```

> **Tip:** Choose one method. Do not mix `venv` and Conda environments simultaneously.

---

## 3. Backend Setup (FastAPI)

### 3.1 Install Dependencies

```powershell
# Ensure your Python environment is active
pip install --upgrade pip
pip install -r requirements.txt
```

### 3.2 Configure Environment Variables

1. Copy `.env.example` to `.env` inside the `backend` folder.
2. Update values for MongoDB, Gemini API key, and secrets.

```powershell
cd backend
Copy-Item ..\.env.example .\.env
# Edit .env with your preferred editor to set credentials
```

### 3.3 Download spaCy Model (first-time setup)

```powershell
python -m spacy download en_core_web_sm
```

### 3.4 Run the Backend Server

```powershell
cd backend
uvicorn main:app --reload
```

- API base URL: `http://localhost:8000`
- Interactive docs: `http://localhost:8000/docs`

> Leave this terminal running while the frontend consumes the API.

---

## 4. Frontend Setup (React + Vite)

### 4.1 Install Node Dependencies

```powershell
cd C:\Local Disk D_7182025857\FINALYEARPROJECTS\dhanujay\crusor\frontend
npm install
```

### 4.2 Run the Frontend Dev Server

```powershell
npm run dev
```

- Frontend URL: `http://localhost:5173`
- Press `Ctrl+C` to stop the dev server.

### 4.3 Production Build (optional)

```powershell
npm run build
# Preview production build
npm run preview
```

---

## 5. Typical Workflow Summary

1. **Activate Python env** (`.venv` or Conda).
2. **Start backend**: `uvicorn main:app --reload`.
3. **Open new terminal**, navigate to `frontend/`, and run `npm run dev`.
4. Access the app at `http://localhost:5173`, ensure backend is reachable at `http://localhost:8000`.

---

## 6. Troubleshooting

- **Backend cannot connect to MongoDB:** Verify connection string in `.env`; ensure MongoDB service or Atlas cluster is accessible.
- **Missing spaCy model:** Re-run `python -m spacy download en_core_web_sm`.
- **Frontend API errors (CORS or 404):** Confirm backend is running on port 8000 and .env proxy settings or `vite.config.ts` are correct.
- **Module not found (frontend):** Delete `node_modules`, run `npm install` again.
- **Python dependency build failure on Windows:** Ensure Visual C++ Build Tools are installed, or use precompiled wheels when available.

---

## 7. Helpful Commands Reference

```powershell
# Deactivate Python environment
deactivate

# Remove existing virtual environment
Remove-Item -Recurse -Force .venv

# Clean Node modules (if needed)
Remove-Item -Recurse -Force node_modules
npm install
```

Keep this runbook in sync with environment changes or new deployment targets. Contributions and updates are welcome via pull requests.
