// Minimal API helper for calling the backend from the Next.js app

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api";

export type TokenResponse = { access_token: string; token_type: string };

export async function demoSignup(name: string, email: string, password: string): Promise<TokenResponse> {
  const res = await fetch(`${API_BASE}/auth/demo/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Signup failed with status ${res.status}`);
  }
  return res.json();
}

export async function demoSignin(email: string, password: string): Promise<TokenResponse> {
  const res = await fetch(`${API_BASE}/auth/demo/signin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Signin failed with status ${res.status}`);
  }
  return res.json();
}

export function storeToken(token: string) {
  try { localStorage.setItem("ayursync_token", token); } catch {}
}

export function getToken(): string | null {
  try { return localStorage.getItem("ayursync_token"); } catch { return null; }
}

async function authFetch(path: string, init: RequestInit = {}) {
  const token = getToken() || "ABHA_demo"; // dev fallback if not signed in
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string> | undefined),
    Authorization: `Bearer ${token}`,
  };
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed (${res.status})`);
  }
  const ct = res.headers.get("content-type");
  if (ct && ct.includes("application/json")) return res.json();
  return res.text();
}

// Public endpoints (guarded)
export async function publicLookup(query: string) {
  const sp = new URLSearchParams({ query });
  return authFetch(`/public/lookup?${sp.toString()}`);
}

export async function publicTranslate(params: { system?: string; code?: string; icd_name?: string; release?: string }) {
  const sp = new URLSearchParams();
  if (params.system) sp.set("system", params.system);
  if (params.code) sp.set("code", params.code);
  if (params.icd_name) sp.set("icd_name", params.icd_name);
  if (params.release) sp.set("release", params.release);
  return authFetch(`/public/translate?${sp.toString()}`);
}

// Public endpoint: log a diagnosis event for analytics map
export type DiagnosisEventPayload = {
  doctor_id?: string;
  system: "ayurveda" | "siddha" | "unani";
  code?: string;
  term_name?: string;
  icd_name: string;
  city?: string;
  state?: string;
  latitude: number;
  longitude: number;
};

export async function publicLogDiagnosis(payload: DiagnosisEventPayload) {
  return authFetch(`/public/diagnosis`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

// FHIR endpoints
export async function fhirMetadata() {
  return authFetch(`/fhir/metadata`);
}

export async function fhirCodeSystemRead(systemKey: "ayurveda" | "siddha" | "unani") {
  return authFetch(`/fhir/CodeSystem/${systemKey}`);
}

export async function fhirLookup(system: string, code: string) {
  const sp = new URLSearchParams({ system, code });
  return authFetch(`/fhir/CodeSystem/$lookup?${sp.toString()}`);
}

export async function fhirExpand(system: string, filter?: string, count: number = 25) {
  const sp = new URLSearchParams({ system, count: String(count) });
  if (filter) sp.set("filter", filter);
  return authFetch(`/fhir/ValueSet/$expand?${sp.toString()}`);
}

export async function fhirTranslate(system: string, code: string, target?: string) {
  const sp = new URLSearchParams({ system, code });
  if (target) sp.set("target", target);
  return authFetch(`/fhir/ConceptMap/$translate?${sp.toString()}`);
}
