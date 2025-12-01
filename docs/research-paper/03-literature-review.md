# 2. Literature Review

## 2.1 Automated Resume Screening
Early ATS platforms emphasized keyword matching and rule-based parsing, prioritizing term frequency over semantic context [1]. Subsequent approaches adopted statistical models and ontology-driven taxonomies to capture skill equivalence and career trajectory patterns [2]. Modern systems increasingly integrate embeddings and contextual language models to reduce false negatives, yet remain constrained by proprietary scoring heuristics and limited user transparency.

## 2.2 Natural Language Processing for Employability Analytics
NLP research has explored entity extraction of education, experience, and skills using conditional random fields, recurrent neural networks, and transformer architectures [3]. Sentence-transformer models offer efficient semantic similarity measures for duplicate detection and resume-job alignment, while spaCy pipelines continue to provide dependable tokenization and named entity recognition for preprocessing tasks.

## 2.3 Large Language Models in Career Services
Large language models (LLMs) such as GPT-4 and Gemini Pro extend resume feedback by generating qualitative critiques, highlighting missing competencies, and synthesizing improvement suggestions [4]. However, LLM outputs can drift from factual resume content or misinterpret industry-specific requirements. Hybrid frameworks that ground generative insights in structured resume data promise greater reliability.

## 2.4 Gaps Identified
The surveyed literature surfaces three persistent gaps: (1) limited end-user agency over personalization settings; (2) scarce integration of deterministic ATS scoring with generative feedback; and (3) insufficient visualization of analysis provenance. Resume Intelligence addresses these gaps through a configurable pipeline that blends NLP feature extraction, rule-based scoring, and Gemini-assisted commentary within an auditable interface.

> **Note:** Citations marked [1]–[4] denote placeholder references. Replace with specific studies, articles, or industry reports during the final write-up.
