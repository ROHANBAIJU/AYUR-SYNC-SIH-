"use client";

import { useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import {
  publicLookup,
  publicTranslate,
  fhirMetadata,
  fhirCodeSystemRead,
  fhirLookup,
  fhirExpand,
  fhirTranslate,
} from "@/lib/api";

type SystemKey = "ayurveda" | "siddha" | "unani";
type SystemPrimary = { code?: string; term?: string; name?: string };
type SystemMapping = { primary?: SystemPrimary };
type TranslateResult = {
  icd?: { name?: string; code?: string; description?: string; icd_uri?: string } | null;
  tm2?: { name?: string; code?: string; description?: string; icd_uri?: string } | null;
} & Partial<Record<SystemKey, SystemMapping>>;

export default function ClinicianPage() {
  // Patient card state
  const [patientName, setPatientName] = useState("");
  const [patientAge, setPatientAge] = useState<string>("");
  const [patientId, setPatientId] = useState("");

  // Search and mapping inputs
  const [system, setSystem] = useState<SystemKey>("ayurveda");
  const [namasteCode, setNamasteCode] = useState("");
  const [icdName, setIcdName] = useState("");
  const [query, setQuery] = useState("");

  // Results
  const [lookupRes, setLookupRes] = useState<unknown>(null);
  const [translateRes, setTranslateRes] = useState<TranslateResult | null>(null);
  const [fhirPanel, setFhirPanel] = useState<
    "meta" | "codesystem" | "lookup" | "expand" | "translate" | null
  >(null);
  const [fhirRes, setFhirRes] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Build a minimal FHIR Condition preview from translate result
  const conditionPreview = useMemo(() => {
    if (!translateRes) return null;
    const codes: Array<{ system: string; code?: string; display?: string }> = [];
    if (translateRes.icd?.code || translateRes.icd?.name) {
      codes.push({
        system: "http://id.who.int/icd/release/11/mms",
        code: translateRes.icd?.code || translateRes.icd?.name,
        display: translateRes.icd?.name,
      });
    }
    // Include NAMASTE source if we have it
  const primary = translateRes?.[system]?.primary;
    if (primary?.code || primary?.name || primary?.term) {
      codes.push({
        system: `https://ayur-sync.example/fhir/CodeSystem/${system}`,
        code: primary.code || primary.term || primary.name,
        display: primary.term || primary.name,
      });
    }
    const subjectRef = patientId ? `Patient/${patientId}` : undefined;
    const now = new Date().toISOString();
    return {
      resourceType: "Condition",
      id: "preview",
      clinicalStatus: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-clinical", code: "active" }] },
      category: [
        { coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-category", code: "encounter-diagnosis" }] },
      ],
      code: { coding: codes },
      subject: subjectRef ? { reference: subjectRef, display: patientName || undefined } : undefined,
      recordedDate: now,
      note: patientName
        ? [{ text: `Recorded for ${patientName}${patientAge ? ", age " + patientAge : ""}` }]
        : undefined,
    };
  }, [translateRes, patientId, patientName, patientAge, system]);

  // Actions
  async function runLookup() {
    setBusy(true);
    setErr(null);
    try {
      const res = await publicLookup(query || icdName || namasteCode);
      setLookupRes(res);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Lookup failed");
    } finally {
      setBusy(false);
    }
  }

  async function runTranslateByICD() {
    if (!icdName) return setErr("Please enter an ICD Name.");
    setBusy(true);
    setErr(null);
    try {
      const res = (await publicTranslate({ icd_name: icdName })) as TranslateResult;
      setTranslateRes(res);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Translate failed");
    } finally {
      setBusy(false);
    }
  }

  async function runTranslateByCode() {
    if (!namasteCode) return setErr("Please enter a NAMASTE code.");
    setBusy(true);
    setErr(null);
    try {
      const res = (await publicTranslate({ system, code: namasteCode })) as TranslateResult;
      setTranslateRes(res);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Translate failed");
    } finally {
      setBusy(false);
    }
  }

  async function runFhir(which: "meta" | "codesystem" | "lookup" | "expand" | "translate") {
    setBusy(true);
    setErr(null);
    setFhirPanel(which);
    try {
  let res: unknown = null;
      if (which === "meta") res = await fhirMetadata();
      if (which === "codesystem") res = await fhirCodeSystemRead(system);
      if (which === "lookup") {
        if (!namasteCode) throw new Error("Enter a NAMASTE code first");
        res = await fhirLookup(system, namasteCode);
      }
      if (which === "expand") res = await fhirExpand(system, query || undefined, 15);
      if (which === "translate") {
        if (!namasteCode) throw new Error("Enter a NAMASTE code first");
        res = await fhirTranslate(system, namasteCode);
      }
      setFhirRes(res);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "FHIR request failed");
    } finally {
      setBusy(false);
    }
  }

  function copyCondition() {
    try {
      const text = JSON.stringify(conditionPreview, null, 2);
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-teal-50 py-8">
      <div className="max-w-6xl mx-auto px-4 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-bold text-teal-700">Clinician Workspace</h1>
          {busy && <div className="text-sm text-gray-600">Working…</div>}
        </div>
        {err && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded">{err}</div>
        )}

        {/* Layout: Patient card (left) + FHIR tools (right) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Patient + Search Card */}
          <section className="bg-white rounded-2xl shadow-lg border border-amber-200 overflow-hidden">
            <div className="p-5 border-b bg-gradient-to-r from-white to-amber-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold">PT</div>
                <div>
                  <h2 className="font-semibold text-gray-800">Patient</h2>
                  <p className="text-xs text-gray-500">Enter optional patient context</p>
                </div>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Patient Name"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                />
                <input
                  className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Age"
                  inputMode="numeric"
                  value={patientAge}
                  onChange={(e) => setPatientAge(e.target.value)}
                />
                <input
                  className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Patient ID (optional)"
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-gray-600">System</label>
                  <select
                    className="mt-1 w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    value={system}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) => setSystem(e.target.value as SystemKey)}
                  >
                    <option value="ayurveda">Ayurveda</option>
                    <option value="siddha">Siddha</option>
                    <option value="unani">Unani</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-600">NAMASTE Code</label>
                  <input
                    className="mt-1 w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="e.g., AKK-12"
                    value={namasteCode}
                    onChange={(e) => setNamasteCode(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600">ICD Name</label>
                  <input
                    className="mt-1 w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="e.g., Dengue"
                    value={icdName}
                    onChange={(e) => setIcdName(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-600">Search any term/code</label>
                <div className="mt-1 flex gap-2">
                  <input
                    className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="Type a term (e.g., fever) or a code (e.g., AKK-12)"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  <button
                    onClick={runLookup}
                    className="px-4 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-700"
                    title="Search verified mappings across ICD and traditional systems"
                  >
                    Search
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={runTranslateByCode}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 text-white hover:brightness-110"
                  title="Translate a NAMASTE code to ICD-11 and TM2; builds a FHIR Condition preview"
                >
                  <span>Translate Code</span>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5h8"/></svg>
                </button>
                <button
                  onClick={runTranslateByICD}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white border border-teal-300 text-teal-700 hover:bg-teal-50"
                  title="Enrich by ICD name when you know the diagnosis; pulls WHO details and local mappings"
                >
                  <span>Translate by ICD Name</span>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
                </button>
              </div>

              {/* Quick Tips */}
              <div className="mt-2 text-xs text-gray-600 space-y-1">
                <p>• Enter either a NAMASTE code or an ICD Name, then click a translate button.</p>
                <p>• Use Search to browse verified mappings across systems.</p>
                <p>• The FHIR Condition preview updates after a successful translation.</p>
              </div>
            </div>
          </section>

          {/* FHIR Tools Card */}
          <section className="bg-white rounded-2xl shadow-lg border border-amber-200 overflow-hidden">
            <div className="p-5 border-b bg-gradient-to-r from-white to-amber-50">
              <h2 className="font-semibold text-gray-800">FHIR Tools</h2>
              <p className="text-xs text-gray-500">Quickly fetch server metadata, value sets, and translations.</p>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => runFhir("meta")}
                  className={`px-3 py-2 rounded-lg border ${fhirPanel === "meta" ? "bg-amber-600 text-white" : "bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100"}`}
                  title="Server capability statement"
                >
                  /metadata
                </button>
                <button
                  onClick={() => runFhir("codesystem")}
                  className={`px-3 py-2 rounded-lg border ${fhirPanel === "codesystem" ? "bg-amber-600 text-white" : "bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100"}`}
                  title="Read CodeSystem for the selected traditional system"
                >
                  CodeSystem/{"{"}system{"}"}
                </button>
                <button
                  onClick={() => runFhir("lookup")}
                  className={`px-3 py-2 rounded-lg border ${fhirPanel === "lookup" ? "bg-amber-600 text-white" : "bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100"}`}
                  title="Lookup details for a NAMASTE code"
                >
                  $lookup
                </button>
                <button
                  onClick={() => runFhir("expand")}
                  className={`px-3 py-2 rounded-lg border ${fhirPanel === "expand" ? "bg-amber-600 text-white" : "bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100"}`}
                  title="Expand a ValueSet for the selected system (optional text filter from Search)"
                >
                  $expand
                </button>
                <button
                  onClick={() => runFhir("translate")}
                  className={`px-3 py-2 rounded-lg border col-span-2 ${fhirPanel === "translate" ? "bg-amber-600 text-white" : "bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100"}`}
                  title="Translate NAMASTE → ICD-11 ConceptMap"
                >
                  $translate
                </button>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-1">FHIR Response</h3>
                <pre className="text-xs bg-gray-50 border border-gray-200 rounded-lg p-2 max-h-64 overflow-auto">
                  {JSON.stringify(fhirRes, null, 2) || "// Run a FHIR action to see the response"}
                </pre>
              </div>
            </div>
          </section>
        </div>

        {/* Results Zone */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="bg-white rounded-2xl shadow-lg border border-amber-200 p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-800">Search Results</h3>
              <span className="text-xs text-gray-500">Public Lookup</span>
            </div>
            <pre className="text-xs bg-gray-50 border border-gray-200 rounded-lg p-2 max-h-64 overflow-auto">
              {JSON.stringify(lookupRes, null, 2) || "// Use Search to fetch verified mappings"}
            </pre>
          </section>

          <section className="bg-white rounded-2xl shadow-lg border border-amber-200 p-5 lg:col-span-2">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-800">Translation</h3>
              <div className="text-xs text-gray-500">ICD & TM2 enrichment</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                <div className="text-xs text-emerald-700 mb-1">ICD</div>
                <div className="text-sm text-gray-800">
                  {translateRes?.icd?.name || "—"} {translateRes?.icd?.code ? (<span className="text-gray-500">({translateRes.icd.code})</span>) : null}
                </div>
                <div className="text-xs text-gray-600 mt-1 line-clamp-3">{translateRes?.icd?.description || ""}</div>
              </div>
              <div className="bg-sky-50 border border-sky-200 rounded-lg p-3">
                <div className="text-xs text-sky-700 mb-1">TM2</div>
                <div className="text-sm text-gray-800">
                  {translateRes?.tm2?.name || "—"} {translateRes?.tm2?.code ? (<span className="text-gray-500">({translateRes.tm2.code})</span>) : null}
                </div>
                <div className="text-xs text-gray-600 mt-1 line-clamp-3">{translateRes?.tm2?.description || ""}</div>
              </div>
            </div>
            <div className="mt-3">
              <h4 className="text-sm font-medium text-gray-700 mb-1">Raw</h4>
              <pre className="text-xs bg-gray-50 border border-gray-200 rounded-lg p-2 max-h-64 overflow-auto">
                {JSON.stringify(translateRes, null, 2) || "// Run a translate action"}
              </pre>
            </div>
          </section>
        </div>

        {/* FHIR Condition Preview */}
        <section className="bg-white rounded-2xl shadow-lg border border-amber-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-800">FHIR Condition (preview)</h3>
              <p className="text-xs text-gray-500">Copy this JSON into your EHR for testing.</p>
            </div>
            <button
              onClick={copyCondition}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-900 text-white hover:bg-black"
              title="Copy JSON to clipboard"
            >
              {copied ? "Copied" : "Copy JSON"}
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2M8 16h8a2 2 0 002-2v-4M8 16l-2 2m2-2l2 2"/></svg>
            </button>
          </div>
          <pre className="mt-2 text-xs bg-gray-50 border border-gray-200 rounded-lg p-2 max-h-96 overflow-auto">
            {JSON.stringify(conditionPreview, null, 2) || "// Translate first to build a Condition preview"}
          </pre>
        </section>

        {/* How to use */}
        <section className="bg-white rounded-2xl shadow-lg border border-amber-200 p-5">
          <h3 className="font-semibold text-gray-800 mb-2">How to use this page</h3>
          <ol className="list-decimal ml-5 text-sm text-gray-700 space-y-1">
            <li>Optionally enter patient context (Name/Age/ID).</li>
            <li>Choose a system and enter a NAMASTE code OR enter an ICD Name.</li>
            <li>Click “Translate Code” or “Translate by ICD Name”.</li>
            <li>Review the ICD/TM2 panels and the FHIR Condition preview.</li>
            <li>Use FHIR Tools to inspect CodeSystems, value sets, and server metadata.</li>
          </ol>
          <p className="text-xs text-gray-500 mt-2">Tip: The Search box looks up verified mappings across systems. Use it to discover alternative terms.</p>
        </section>
      </div>
    </div>
  );
}
