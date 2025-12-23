"""Smoke test for google-genai client.
Lists available models and performs a simple generation using configured API key.
Run from repository root: `python backend/smoke_test_genai.py`
"""
import os
import sys

# Ensure project root is on path so `backend` package imports work
ROOT = os.path.dirname(os.path.dirname(__file__))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

try:
    from google import genai
except Exception:
    try:
        import genai
    except Exception:
        try:
            import google_genai as genai
        except Exception:
            genai = None

from backend.config import settings
from backend.gemini_service import send_prompt_to_model


def list_models(client):
    print("Available models:")
    try:
        # Try client.models.list()
        if client is not None and hasattr(client, "models") and hasattr(client.models, "list"):
            for m in client.models.list():
                try:
                    print(getattr(m, "name", str(m)))
                except Exception:
                    print(m)
            return

        # Try module-level helpers
        if hasattr(genai, "list_models"):
            for m in genai.list_models():
                print(m)
            return

        if hasattr(genai, "models") and hasattr(genai.models, "list"):
            for m in genai.models.list():
                print(getattr(m, "name", str(m)))
            return

        print("No model listing API available in this genai package version.")
    except Exception as e:
        print("Error listing models:", e)


if __name__ == "__main__":
    client = None
    if settings.GEMINI_API_KEY:
        try:
            client = genai.Client(api_key=settings.GEMINI_API_KEY)
        except Exception as e:
            print("Could not initialize genai.Client:", e)

    list_models(client)

    # Quick generation
    model = getattr(settings, "GEMINI_MODEL", "gemini-2.5-flash")
    prompt = "Write a single-line JSON object: {\"hello\": \"world\"}"
    generation_config = {"temperature": settings.GEMINI_TEMPERATURE, "max_output_tokens": settings.GEMINI_MAX_TOKENS}
    try:
        print(f"\nAttempting generation with model {model}...\n")
        text = send_prompt_to_model(model, prompt, generation_config)
        print("--- Generation output ---")
        print(text)
    except Exception as e:
        print("Generation failed:", e)
