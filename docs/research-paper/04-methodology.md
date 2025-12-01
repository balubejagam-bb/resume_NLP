# 3. Methodology

## 3.1 Research Approach
The project follows a design science methodology, iteratively building and evaluating an artifact that delivers measurable improvements in resume analysis transparency. Each sprint focused on a core capability: document ingestion, NLP feature engineering, AI-assisted scoring, and user experience refinement.

## 3.2 Data Collection
User-provided resumes constitute the primary data source. The system accepts PDF, DOCX, and TXT formats and enforces per-file and batch limits to guard against ingestion abuse. Anonymized sample resumes generated during development supplemented testing scenarios. No personally identifiable information persists without user consent; the pipeline performs masking during preprocessing.

## 3.3 Processing Pipeline
1. **Upload & Storage:** Files enter the FastAPI backend via multipart requests and are persisted to the `uploads/` directory with normalized metadata.
2. **Parsing:** `pdfplumber`, `python-docx`, or plain-text readers extract raw text. Structural heuristics split sections such as experience and education.
3. **PII Masking:** `nlp_processor.py` applies spaCy-based entity detection to redact emails, phone numbers, and addresses before downstream processing.
4. **Feature Extraction:** Keyword lists, skill entities, experience durations, and education levels are derived using spaCy, sentence-transformers, and rule-based patterns.
5. **Component Scoring:** `scorer.py` computes six sub-scores (skill match, experience, education, formatting, keyword density, timeline) through weighted heuristics tuned during testing.
6. **Gemini Pro Analysis:** Structured resume features and optional job descriptions feed a prompt template hosted in `prompts.py`. The Gemini response augments deterministic metrics with qualitative feedback.
7. **Persistence:** Results, settings, and ontologies store in MongoDB collections with unique user-scoped indexes to ensure idempotency.

## 3.4 Personalization Workflow
A dedicated `analysis_settings` collection captures user preferences such as target roles, industries, custom skills, and active job descriptions. These settings enrich the job description passed to the analysis endpoint and can be toggled within the UI. A modal prompt enforces explicit user choice between quick (settings-driven) and advanced (manual) analysis modes, ensuring experimental control.

## 3.5 Evaluation Strategy
Evaluation centered on functional verification and user-centric heuristics:
- **Correctness:** Unit-style checks covering parsing accuracy, duplicate detection thresholds, and field extraction consistency.
- **Performance:** Manual timing of end-to-end analysis runs under varied resume sizes to maintain sub-10-second latency targets.
- **Usability:** Qualitative feedback from pilot testers on dashboard clarity, settings persistence, and interpretability of ATS scores.
- **Reliability:** Fault injection tests to confirm graceful error handling for unsupported file types, API failures, and expired credentials.
