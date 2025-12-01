# 1. Introduction

## 1.1 Background
Recruitment teams increasingly rely on Applicant Tracking Systems (ATS) to screen large applicant pools, resulting in automation bias that often obscures the reasons behind candidate rejection. Job seekers typically lack visibility into ATS scoring heuristics, highlighting the need for accessible analytics that translate raw resume content into targeted improvements.

## 1.2 Problem Statement
Resume authors must contend with heterogeneous job descriptions, evolving skill taxonomies, and opaque ATS ranking methodologies. Manual tailoring is time-consuming, and existing tools seldom provide trustworthy feedback that blends linguistic analysis with modern large language model (LLM) insights. The project addresses the challenge of generating transparent, data-driven resume diagnostics that adapt to individual job targets.

## 1.3 Objectives
- Deliver a unified platform for uploading, parsing, and evaluating resumes across PDF, DOCX, and TXT formats.
- Combine deterministic NLP pipelines with Gemini Pro reasoning to compute ATS compatibility, keyword coverage, and narrative quality.
- Provide configurable analysis settings that persist across sessions, enabling comparative experimentation by candidates.
- Visualize metrics, component scores, and actionable recommendations through an interactive, responsive interface.

## 1.4 Scope
The scope encompasses ingestion of up to fifteen resumes per session, automated extraction of structured resume features, AI-assisted critique against saved job preferences, and analytics dashboards for longitudinal tracking. Integration with external job boards or live deployment orchestration is considered out of scope for the current iteration.
