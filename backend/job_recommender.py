import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

LOGGER = logging.getLogger(__name__)


class JobRecommender:
    """Hybrid job recommendation engine using TF-IDF, cosine similarity, and RandomForest."""

    def __init__(self, dataset_path: Optional[Path] = None) -> None:
        base_dir = Path(__file__).resolve().parent
        self.dataset_path = dataset_path or base_dir / "data" / "job_dataset.json"
        self.vectorizer: Optional[TfidfVectorizer] = None
        self.classifier: Optional[RandomForestClassifier] = None
        self.jobs: List[Dict[str, Any]] = []
        self.job_matrix = None
        self.category_to_index: Dict[str, int] = {}
        self.index_to_category: Dict[int, str] = {}
        self._load_dataset()
        if self.jobs:
            self._build_models()

    def _load_dataset(self) -> None:
        if not self.dataset_path.exists():
            LOGGER.warning("Job dataset not found at %s", self.dataset_path)
            self.jobs = []
            return

        try:
            with self.dataset_path.open("r", encoding="utf-8") as handle:
                payload = json.load(handle)
        except json.JSONDecodeError as exc:
            LOGGER.error("Failed to parse job dataset: %s", exc)
            self.jobs = []
            return

        jobs = payload.get("jobs") if isinstance(payload, dict) else payload
        if not isinstance(jobs, list):
            LOGGER.error("Job dataset must be a list or include a 'jobs' list")
            self.jobs = []
            return

        self.jobs = []
        for entry in jobs:
            if not isinstance(entry, dict):
                continue
            if "id" not in entry or "title" not in entry or "description" not in entry:
                continue
            normalized = {
                "id": str(entry["id"]),
                "title": entry["title"],
                "company": entry.get("company"),
                "location": entry.get("location"),
                "category": entry.get("category", "general"),
                "description": entry.get("description", ""),
                "requirements": entry.get("requirements", []),
                "skills": entry.get("skills", []),
                "tags": entry.get("tags", []),
            }
            self.jobs.append(normalized)

    def _build_models(self) -> None:
        corpus = []
        categories: List[str] = []
        for job in self.jobs:
            doc_parts = [job.get("description", "")]
            doc_parts.extend(job.get("requirements", []))
            doc_parts.extend(job.get("skills", []))
            doc_parts.extend(job.get("tags", []))
            corpus.append(" ".join(doc_parts))
            categories.append(job.get("category", "general"))

        self.vectorizer = TfidfVectorizer(stop_words="english", max_features=5000)
        self.job_matrix = self.vectorizer.fit_transform(corpus)

        unique_categories = sorted(set(categories))
        self.category_to_index = {cat: idx for idx, cat in enumerate(unique_categories)}
        self.index_to_category = {idx: cat for cat, idx in self.category_to_index.items()}

        if len(unique_categories) < 2:
            LOGGER.info("Insufficient category variety for RandomForest training; falling back to similarity scoring only.")
            self.classifier = None
            return

        y = np.array([self.category_to_index[cat] for cat in categories])
        X = self.job_matrix.toarray()

        self.classifier = RandomForestClassifier(
            n_estimators=200,
            max_depth=None,
            random_state=42,
            class_weight="balanced"
        )
        self.classifier.fit(X, y)

    def recommend(self, resume_text: str, top_n: int = 5) -> List[Dict[str, Any]]:
        if not resume_text.strip():
            return []
        if not self.jobs or not self.vectorizer or self.job_matrix is None:
            return []

        resume_vector = self.vectorizer.transform([resume_text])
        similarity_scores = cosine_similarity(resume_vector, self.job_matrix)[0]

        probability_scores = np.zeros(len(self.jobs), dtype=float)
        if self.classifier is not None:
            resume_dense = resume_vector.toarray()
            class_probabilities = self.classifier.predict_proba(resume_dense)[0]
            category_probabilities: Dict[str, float] = {}
            for class_idx, probability in zip(self.classifier.classes_, class_probabilities):
                category = self.index_to_category.get(int(class_idx))
                if category is not None:
                    category_probabilities[category] = float(probability)
            for idx, job in enumerate(self.jobs):
                category = job.get("category")
                probability_scores[idx] = category_probabilities.get(category, 0.0)

        combined_scores = 0.6 * similarity_scores + 0.4 * probability_scores
        ranked_indices = np.argsort(combined_scores)[::-1]

        recommendations: List[Dict[str, Any]] = []
        for idx in ranked_indices[: top_n]:
            job = self.jobs[idx].copy()
            job["similarity_score"] = float(similarity_scores[idx])
            job["probability_score"] = float(probability_scores[idx])
            job["final_score"] = float(combined_scores[idx])
            recommendations.append(job)
        return recommendations

    def list_jobs(self) -> List[Dict[str, Any]]:
        return [job.copy() for job in self.jobs]

    def refresh(self) -> None:
        self._load_dataset()
        if self.jobs:
            self._build_models()
        else:
            self.vectorizer = None
            self.classifier = None
            self.job_matrix = None
            self.category_to_index = {}
            self.index_to_category = {}


def build_job_recommender() -> JobRecommender:
    recommender = JobRecommender()
    if not recommender.jobs:
        LOGGER.warning("Job recommender initialised without jobs; add dataset at %s.", recommender.dataset_path)
    return recommender


job_recommender = build_job_recommender()
