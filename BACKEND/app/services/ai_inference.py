"""AI Inference utilities for structured ICD name, confidence, and justification extraction.

Provides synchronous helper plus background queue integration.
The goal is to replace heuristic line-splitting with a robust JSON oriented prompt.
"""
from __future__ import annotations

import json
import logging
import os
import traceback
import importlib
import pkgutil
from dataclasses import dataclass
from typing import Optional, Any, Dict

from sqlalchemy.orm import Session

# Use dedicated gemini service module (single source of truth)
_gemini_import_error: Optional[str] = None
try:
    from app.services.gemini import get_gemini_verification  # type: ignore
    _gemini_source = 'app.services.gemini'
except Exception as e_services:  # pragma: no cover
    _gemini_import_error = f"services import error={e_services}"
    def get_gemini_verification():  # type: ignore
        raise RuntimeError("Gemini verification client unavailable")
    _gemini_source = 'unavailable'

LOGGER = logging.getLogger(__name__)

def _collect_env(prefixes=("GEMINI", "GOOGLE", "GENAI", "AI_")) -> Dict[str, str]:
    out = {}
    for k, v in os.environ.items():
        if any(k.startswith(p) for p in prefixes):
            # Mask long secrets but keep last 4 chars for identification
            if isinstance(v, str) and len(v) > 12:
                out[k] = v[:4] + '...' + v[-4:]
            else:
                out[k] = v
    return out

def _diagnose_gemini_environment() -> Dict[str, Any]:
    info: Dict[str, Any] = {
        'import_source': globals().get('_gemini_source'),
        'import_error': _gemini_import_error,
        'env_keys': _collect_env(),
        'google_generativeai_present': False,
        'available_pkgs_sample': [],
    }
    try:
        import google.generativeai as genai  # type: ignore
        info['google_generativeai_present'] = True
        # Check if client key configured
        info['client_has_api_key'] = bool(os.getenv('GOOGLE_API_KEY') or os.getenv('GEMINI_API_KEY'))
    except Exception as e:  # pragma: no cover
        info['google_generativeai_import_error'] = repr(e)
    # Light package sample for context (avoid huge list)
    try:
        info['available_pkgs_sample'] = sorted([m.name for m in pkgutil.iter_modules() if m.name.startswith('google')][:10])
    except Exception:
        pass
    return info

STRUCTURED_PROMPT_TEMPLATE = (
    "You are an assistant that extracts the most likely ICD-11 concept name from a source clinical term.\n"
    "Return ONLY valid JSON with keys: name (string), confidence (0-100 integer), justification (short string).\n"
    "Input source term: {source_term}\n"
    "If you are uncertain set confidence <= 40 and explain briefly."
)

@dataclass
class InferenceResult:
    name: Optional[str]
    confidence: Optional[int]
    justification: Optional[str]
    raw_text: Optional[str] = None
    error: Optional[str] = None

    def as_mapping_kwargs(self) -> Dict[str, Any]:
        return {
            'suggested_icd_name': self.name,
            'ai_confidence': self.confidence,
            'ai_justification': self.justification,
        }


def _safe_parse_int(val: Any) -> Optional[int]:
    try:
        if val is None:
            return None
        iv = int(val)
        if iv < 0:
            return 0
        if iv > 100:
            return 100
        return iv
    except Exception:
        return None


def parse_structured_response(text: str) -> InferenceResult:
    """Attempt to parse model output into structured fields.

    The model is instructed to emit pure JSON; still we defensively extract the first JSON object.
    """
    if not text:
        return InferenceResult(None, None, None, raw_text=text, error="empty response")

    # Locate first '{' and last '}' to reduce preamble/postamble noise.
    start = text.find('{')
    end = text.rfind('}')
    if start == -1 or end == -1 or end <= start:
        return InferenceResult(None, None, None, raw_text=text, error="no json braces")
    snippet = text[start:end + 1]
    try:
        data = json.loads(snippet)
    except Exception as exc:  # Fallback: attempt to repair common issues
        LOGGER.warning("JSON parse failed: %s -- snippet: %s", exc, snippet)
        return InferenceResult(None, None, None, raw_text=text, error=f"json parse error: {exc}")

    name = data.get('name') if isinstance(data, dict) else None
    confidence = _safe_parse_int(data.get('confidence') if isinstance(data, dict) else None)
    justification = data.get('justification') if isinstance(data, dict) else None
    return InferenceResult(name=name, confidence=confidence, justification=justification, raw_text=text)


def infer_icd_name_structured(source_term: str) -> InferenceResult:
    """Perform a synchronous structured inference call.

    Returns an InferenceResult even on error (with error populated).
    """
    prompt = STRUCTURED_PROMPT_TEMPLATE.format(source_term=source_term.strip())
    debug_enabled = os.getenv('AI_DEBUG', '0') in ('1', 'true', 'yes', 'on')
    diag: Optional[Dict[str, Any]] = None
    try:
        if debug_enabled:
            diag = _diagnose_gemini_environment()
            LOGGER.warning("[AI_DEBUG] Starting structured inference term=%r diag=%s", source_term, json.dumps(diag, ensure_ascii=False))
        client = get_gemini_verification()  # type: ignore
        if debug_enabled:
            LOGGER.warning("[AI_DEBUG] Obtained gemini verification client from %s", globals().get('_gemini_source'))
        # We assume the client has a "generate_content" or similar method returning text.
        response = client.generate_content(prompt)  # type: ignore[attr-defined]
        if debug_enabled:
            LOGGER.warning("[AI_DEBUG] Raw response object type=%s attrs=%s", type(response), [a for a in dir(response) if not a.startswith('_')][:15])
        # Support different client return shapes
        if hasattr(response, 'text'):
            text = response.text  # type: ignore
        else:
            text = str(response)
        if debug_enabled:
            LOGGER.warning("[AI_DEBUG] Model raw text (first 300 chars)=%s", text[:300])
        return parse_structured_response(text)
    except Exception as exc:
        tb = traceback.format_exc()
        if diag is None:
            try:
                diag = _diagnose_gemini_environment()
            except Exception:  # pragma: no cover
                diag = {'diagnostics': 'failed'}
        LOGGER.error(
            "Inference failure for term %r error=%s diag=%s trace=%s",
            source_term,
            repr(exc),
            json.dumps(diag, ensure_ascii=False),
            tb
        )
        return InferenceResult(None, None, None, error=str(exc))


# --- Background Queue (simple threading executor) ---
from concurrent.futures import ThreadPoolExecutor, Future
import threading

_executor_lock = threading.Lock()
_executor: Optional[ThreadPoolExecutor] = None

def get_executor() -> ThreadPoolExecutor:
    global _executor
    with _executor_lock:
        if _executor is None:
            _executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="ai-inf")
        return _executor


def enqueue_inference(db: Session, ingestion_row_id: int, source_term: str, update_model) -> Future:
    """Enqueue background inference. update_model is a callable(Session, row_id, InferenceResult)."""
    def _task():
        result = infer_icd_name_structured(source_term)
        try:
            update_model(db, ingestion_row_id, result)
        except Exception:  # pragma: no cover
            LOGGER.exception("Failed updating ingestion row %s with inference result", ingestion_row_id)
        return result
    return get_executor().submit(_task)

__all__ = [
    'InferenceResult',
    'infer_icd_name_structured',
    'enqueue_inference',
]
