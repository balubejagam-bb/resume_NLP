"""Quick demonstration script for showcasing RandomForest runtime metrics.

This creates a synthetic dataset, trains a RandomForestClassifier, and prints
simple timing details so stakeholders can reference a repeatable benchmark.
"""

from __future__ import annotations

import time
from dataclasses import dataclass

import numpy as np
from sklearn.datasets import make_classification
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
from sklearn.model_selection import train_test_split


@dataclass
class DemoConfig:
    """Configuration values for the synthetic RandomForest run."""

    samples: int = 2000
    features: int = 40
    informative: int = 10
    redundant: int = 5
    classes: int = 2
    n_estimators: int = 150
    max_depth: int | None = 12
    test_size: float = 0.2
    random_state: int = 42


def run_demo(config: DemoConfig | None = None) -> None:
    """Generate data, fit a RandomForest, and print timing metrics."""

    cfg = config or DemoConfig()

    print("Generating synthetic classification dataset...")
    X, y = make_classification(
        n_samples=cfg.samples,
        n_features=cfg.features,
        n_informative=cfg.informative,
        n_redundant=cfg.redundant,
        n_classes=cfg.classes,
        random_state=cfg.random_state,
    )

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=cfg.test_size, random_state=cfg.random_state
    )

    model = RandomForestClassifier(
        n_estimators=cfg.n_estimators,
        max_depth=cfg.max_depth,
        n_jobs=-1,
        random_state=cfg.random_state,
    )

    print(
        f"Training RandomForestClassifier with {cfg.n_estimators} trees on {X_train.shape[0]} samples..."
    )

    start_time = time.perf_counter()
    model.fit(X_train, y_train)
    training_duration = time.perf_counter() - start_time

    print(f"Training completed in {training_duration:.3f} seconds.")

    preds = model.predict(X_test)
    accuracy = accuracy_score(y_test, preds)
    print(f"Validation accuracy on hold-out set: {accuracy:.3%}")

    feature_importances = model.feature_importances_
    top_features = np.argsort(feature_importances)[-5:][::-1]
    print("Top contributing synthetic features (indices):", top_features)


if __name__ == "__main__":
    run_demo()
