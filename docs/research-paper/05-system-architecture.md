# 4. System Architecture

## 4.1 High-Level Overview
Resume Intelligence adopts a client-server architecture comprising a FastAPI backend, a MongoDB data layer, and a React-based frontend. Asynchronous processing and modular services enable scalable ingestion and analysis, while a tailored Axios client ensures authenticated communication between the UI and REST endpoints.

## 4.2 Backend Components
- **API Gateway (`main.py`, `api_routes.py`):** Exposes REST endpoints for upload, analysis, dashboard metrics, ontology updates, and settings persistence.
- **Configuration (`config.py`):** Centralizes environment variables, file size limits, and Gemini credentials.
- **Data Access (`database.py`):** Manages Motor client connections, index creation, and collection helpers.
- **Parsing Layer (`parser.py`):** Handles file-type specific extraction logic.
- **NLP Layer (`nlp_processor.py`):** Performs text normalization, entity masking, and skill extraction.
- **Scoring Engine (`scorer.py`):** Computes heuristic sub-scores to complement AI results.
- **AI Integration (`gemini_service.py`):** Interacts with Gemini Pro using secure API calls and structured prompts.
- **Storage Utilities (`storage.py`):** Controls upload directory structure and cleanup routines.

## 4.3 Frontend Modules
- **State Management:** React hooks such as `useResumes` coordinate data fetching and caching with suspense-friendly patterns.
- **UI Components:** Tailwind-styled components (e.g., `UploadTab`, `ResultsTab`, `DashboardTab`) provide interactive drag-and-drop uploads, modal flows, and charts.
- **Visualization:** Recharts renders skill distributions, experience timelines, and ATS score trends.
- **Settings Panel:** `SettingsTab` synchronizes user preferences with the backend and local storage, offering immediate feedback on save operations.

## 4.4 Data Model
Key MongoDB collections include:
- `resumes`: Metadata, extracted features, and storage paths for uploaded documents.
- `analyses`: Aggregated ATS scores, component metrics, and Gemini feedback for each resume.
- `analysis_settings`: User-specific targets, skills, and active job descriptions.
- `ontology`: Lists of canonical skills, industries, and job titles curated through the settings interface.

## 4.5 Sequence Flow
1. User uploads resume files via the frontend.
2. FastAPI validates and stores files; parsing and masking commence.
3. NLP and scoring layers compute features; Gemini Pro produces narrative analysis.
4. Results persist to MongoDB and return to the frontend.
5. Dashboard and results tabs query cached analyses, presenting scores, highlights, and recommendations.
6. Users adjust settings, which update the `analysis_settings` collection and influence subsequent analyses.

## 4.6 Security and Compliance Considerations
- **Authentication:** Token-based middleware (planned) integrates with the Axios interceptor for secure endpoints.
- **PII Protection:** Masking prevents sensitive data from leaving the secure execution environment or appearing in logs.
- **Rate Limiting:** File upload routes enforce batch limits to deter abuse.
- **Configuration Hygiene:** `.env` variables separate secret management from source control.
