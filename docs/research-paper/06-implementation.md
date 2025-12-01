# 5. Implementation

## 5.1 Technology Stack
- **Backend:** FastAPI (Python 3.11), Motor, spaCy, sentence-transformers, pdfplumber, python-docx, Google Generative AI SDK.
- **Frontend:** React 18 with TypeScript, Vite, Tailwind CSS, Recharts, Framer Motion, Lucide icons.
- **Infrastructure:** Local filesystem storage for uploads/exports, MongoDB Atlas (or local instance) for persistence, `.env`-driven configuration management.

## 5.2 Feature Modules
### Resume Upload and Parsing
Users submit single or multiple resumes through a drag-and-drop interface. The backend queues parsing tasks, converts documents to plain text, and constructs structured records containing extracted sections, skill tokens, and metadata.

### Analysis Engine
`/analyze_single` orchestrates the hybrid analysis. It enriches optional job descriptions with persisted user preferences, invokes the scoring engine, and dispatches a prompt to Gemini Pro. The response merges with deterministic metrics before storage.

### Dashboard and Analytics
The dashboard aggregates resume counts, average ATS scores, and experience distributions using cached API routes. Recharts components animate data to convey comparative insights across resumes and time.

### Settings Synchronization
`SettingsTab` exposes switches for toggling saved preferences. The component writes settings to MongoDB via REST endpoints, mirrors them in local storage for offline resilience, and ensures quick analyze flows default to the most recent configuration.

### Error Handling and Feedback
Centralized helpers (`errorHandler.ts`) convert API errors into human-readable messages. Loading states, spinners, and animated progress bars maintain user awareness during longer AI inference cycles.

## 5.3 Notable Code Decisions
- **Asynchronous IO:** The backend leverages async/await semantics end-to-end, minimizing worker blocking during file I/O and network-bound AI requests.
- **Modular Prompts:** Prompt templates isolate Gemini instructions, simplifying future experiments with different tone or detail levels.
- **UI Consistency:** Glassmorphism styling and shared Tailwind utility classes deliver a cohesive brand across tabs.
- **Settings Enforcement:** A modal prompt in `ResultsTab` prevents accidental analyses by requiring users to choose between quick and advanced modes, aligning with experimental rigor.

## 5.4 Testing and Validation
Smoke tests confirmed multi-format upload support, while manual regression covered duplicate detection, best resume tracking, and modal workflows. The team documented a testing checklist to guide future automation efforts, including ATS checks, ontology updates, and export routines.
