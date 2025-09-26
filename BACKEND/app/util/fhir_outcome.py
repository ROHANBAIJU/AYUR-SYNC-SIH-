"""Utility helpers to construct FHIR OperationOutcome resources consistently.
Minimal subset sufficient for hackathon demo.
"""
from typing import List, Dict, Optional


def _issue(severity: str, code: str, text: str) -> Dict:
    return {
        "severity": severity,
        "code": code,
        "details": {"text": text}
    }


def build_outcome(issues: List[Dict], extensions: Optional[List[Dict]] = None) -> Dict:
    oo = {"resourceType": "OperationOutcome", "issue": issues}
    if extensions:
        oo["extension"] = extensions
    return oo

# Convenience factories

def outcome_error(text: str, code: str = "processing") -> Dict:
    return build_outcome([_issue("error", code, text)])

def outcome_not_found(text: str) -> Dict:
    return build_outcome([_issue("error", "not-found", text)])

def outcome_validation(text: str) -> Dict:
    return build_outcome([_issue("error", "invalid", text)])

def outcome_warning(text: str) -> Dict:
    return build_outcome([_issue("warning", "informational", text)])

def outcome_informational(text: str) -> Dict:
    return build_outcome([_issue("information", "informational", text)])
