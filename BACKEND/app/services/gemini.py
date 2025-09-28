"""Gemini service integration.

Provides a uniform zero-argument factory `get_gemini_verification()` that returns
an object exposing `generate_content(prompt: str) -> ResponseLike`.

This isolates model selection and configuration so other modules (e.g.,
`ai_inference.py`) do not need to know about API keys or fallback model names.
"""
from __future__ import annotations

import os
import json
import logging
from dataclasses import dataclass
from typing import Any

import google.generativeai as genai  # type: ignore

LOGGER = logging.getLogger(__name__)

# Primary + fallbacks (ordered)
_MODEL_CANDIDATES = [
    "models/gemini-1.5-flash-8b",
    "models/gemini-1.5-flash-8b-latest",
    "models/gemini-1.5-flash",
]

_configured = False
_selected_model: str | None = None
_last_error: str | None = None


def _configure():
    global _configured
    if _configured:
        return
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise RuntimeError("Missing GEMINI_API_KEY/GOOGLE_API_KEY environment variable")
    genai.configure(api_key=api_key)
    _configured = True


def _select_model():
    global _selected_model, _last_error
    if _selected_model:
        return _selected_model
    for name in _MODEL_CANDIDATES:
        try:
            m = genai.GenerativeModel(name)
            # Probe basic generation to validate auth/permission
            _ = m.generate_content("ping")
            _selected_model = name
            LOGGER.info("[GEMINI] Selected model %s", name)
            return _selected_model
        except Exception as e:  # pragma: no cover
            _last_error = f"{name}: {e}"
            LOGGER.warning("[GEMINI] Model candidate failed %s: %s", name, e)
            continue
    raise RuntimeError(f"All Gemini model candidates failed. Last error: {_last_error}")


@dataclass
class _VerificationClient:
    model: Any

    def generate_content(self, prompt: str):  # passthrough wrapper
        return self.model.generate_content(prompt)


def get_gemini_verification():
    """Return a lightweight verification client with generate_content()."""
    _configure()
    name = _select_model()
    model = genai.GenerativeModel(name)
    return _VerificationClient(model=model)


__all__ = ["get_gemini_verification"]
