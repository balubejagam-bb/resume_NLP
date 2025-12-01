# 6. Results and Evaluation

## 6.1 Functional Outcomes
- Multi-format uploads (PDF, DOCX, TXT) complete successfully within acceptance size limits.
- Analyses return ATS and match scores within approximately 8–12 seconds under standard resume lengths.
- Settings persistence ensures that quick analyses respect stored job descriptions, skills, and target roles.
- Dashboard visualizations accurately reflect aggregate statistics and resume-specific highlights.

## 6.2 User Experience Feedback
Pilot users reported improved understanding of ATS criteria due to the combination of quantitative scores and qualitative tips. The glassmorphism UI and animated loaders reinforced perceived responsiveness, though participants requested downloadable PDF reports for sharing insights externally.

## 6.3 Performance Considerations
Empirical observation indicated that Gemini Pro calls dominate latency. Batched parsing and caching mitigated redundant requests. Memory usage remained stable thanks to streaming file reads and lazily loaded NLP models. Future profiling should instrument realtime metrics to support autoscaling decisions.

## 6.4 Reliability and Error Handling
The system gracefully handles unsupported file types, authentication lapses, and AI timeouts by surfacing descriptive alerts. MongoDB indexes prevent duplicate settings per user, preserving data consistency. However, continued investment in automated tests and load simulations is recommended before production deployment.
