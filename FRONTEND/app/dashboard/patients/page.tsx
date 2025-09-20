// app/dashboard/patients/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { fhirMetadata, fhirCodeSystemRead, fhirLookup, fhirTranslate, publicLookup, publicTranslate, publicLogDiagnosis, type DiagnosisEventPayload } from "@/lib/api";

// Define patient type
type Patient = {
  id: number;
  name: string;
  age: number;
  gender: string;
  condition: string;
  lastVisit: string;
  nextAppointment: string;
  treatment: string;
  notes: string;
  status: string;
  avatar: string;
  dob: string;
  contact: string;
  abhaNo: string;
  doctorName?: string;
  location?: string;
};

// Top-level Add Patient Modal to keep focus stable across re-renders
type AddPatientModalProps = {
  open: boolean;
  newPatient: {
    name: string; dob: string; age: string; gender: string; contact: string; abhaNo: string; doctorName: string; location: string; condition: string; notes: string; consentFlag: boolean;
  };
  setNewPatient: React.Dispatch<React.SetStateAction<{
    name: string; dob: string; age: string; gender: string; contact: string; abhaNo: string; doctorName: string; location: string; condition: string; notes: string; consentFlag: boolean;
  }>>;
  onSave: () => void;
  onClose: () => void;
};

const AddPatientModalTop: React.FC<AddPatientModalProps> = ({ open, newPatient, setNewPatient, onSave, onClose }) => {
  // Stepper state: 1) Patient details + consent  2) Diagnosis (lookup)  3) Translate + FHIR
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [condOpen, setCondOpen] = useState(false);
  const [condBusy, setCondBusy] = useState(false);
  type Suggestion = {
    system: 'icd11' | 'ayurveda' | 'siddha' | 'unani' | 'tm2' | 'unknown';
    tmName?: string;      // Traditional medicine term
    tmCode?: string;      // NAMASTE code
    icdName?: string;     // ICD display
    icdCode?: string;     // ICD code
    vernacular?: string;  // e.g., Hindi script
    display: string;      // main line used for quick view
    primary?: boolean;
  };
  const [condSuggestions, setCondSuggestions] = useState<Suggestion[]>([]);
  const [activeIdx, setActiveIdx] = useState<number>(-1);
  type SystemOverview = { system: 'ayurveda'|'siddha'|'unani'; primaryCode?: string; primaryName?: string; aliasesCount: number };
  type CompositeSuggestion = { systems: Record<'ayurveda'|'siddha'|'unani', SystemOverview> };
  const [composite, setComposite] = useState<CompositeSuggestion | null>(null);
  const lookupSeq = useRef(0);
  const [namasteOut, setNamasteOut] = useState("");
  type NamasteEntry = { code?: string; name?: string };
  type NamasteSystemSummary = { primary?: NamasteEntry; aliases: NamasteEntry[] };
  type NamasteSummary = { ayurveda: NamasteSystemSummary; siddha: NamasteSystemSummary; unani: NamasteSystemSummary };
  const [namasteStruct, setNamasteStruct] = useState<NamasteSummary | null>(null);
  const [icdCodes, setIcdCodes] = useState<string[]>([]);

  // Local FHIR dev state (scoped to modal)
  const [uiBusy, setUiBusy] = useState(false);
  const [fhirSystem, setFhirSystem] = useState<'ayurveda'|'siddha'|'unani'>('ayurveda');
  const [namasteCode, setNamasteCode] = useState<string>("");
  const [icdName, setIcdName] = useState<string>("");
  const [fhirOutputTitle, setFhirOutputTitle] = useState<string>("");
  const [fhirOutputData, setFhirOutputData] = useState<unknown>(null);
  const [translateJson, setTranslateJson] = useState<unknown>(null);
  const [translateCards, setTranslateCards] = useState<Array<{ system: string; code?: string; name?: string; confidence?: number | string; justification?: string; shortDefinition?: string; longDefinition?: string; vernacular?: string; uri?: string; sourceRow?: number }>>([]);
  const [selectedIcd, setSelectedIcd] = useState<{ code?: string; name?: string; shortDefinition?: string; longDefinition?: string; system?: string } | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  // Demo location catalog for logging to India map
  const cityCatalog: Record<string, { city: string; state: string; latitude: number; longitude: number }> = {
    "Bangalore": { city: "Bangalore", state: "Karnataka", latitude: 12.9716, longitude: 77.5946 },
    "New Delhi": { city: "New Delhi", state: "Delhi", latitude: 28.6139, longitude: 77.2090 },
    "Chennai": { city: "Chennai", state: "Tamil Nadu", latitude: 13.0827, longitude: 80.2707 },
    "Hyderabad": { city: "Hyderabad", state: "Telangana", latitude: 17.385, longitude: 78.4867 },
    "Mumbai": { city: "Mumbai", state: "Maharashtra", latitude: 19.076, longitude: 72.8777 },
  };

  const handleGenderChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setNewPatient(prev => ({ ...prev, gender: e.target.value }));
  }, [setNewPatient]);

  const handleAbhaChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNewPatient(prev => ({ ...prev, abhaNo: e.target.value }));
  }, [setNewPatient]);

  const handleConditionChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNewPatient(prev => ({ ...prev, condition: e.target.value }));
  }, [setNewPatient]);

  const handleConsentChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNewPatient(prev => ({ ...prev, consentFlag: e.target.checked }));
  }, [setNewPatient]);

  const normalizeSuggestions = useCallback((data: unknown) => {
    // Produce rich TM/ICD suggestions with consistent fields
    const out: Suggestion[] = [];
    const normSystem = (s?: unknown): Suggestion['system'] => {
      const v = String(s || '').toLowerCase();
      if (v.includes('icd')) return 'icd11';
      if (v.includes('ayur')) return 'ayurveda';
      if (v.includes('siddha')) return 'siddha';
      if (v.includes('unani')) return 'unani';
      if (v.includes('tm2')) return 'tm2';
      return 'unknown';
    };
    const push = (p: Partial<Suggestion> & { display?: string }) => {
      const display = (p.display || p.tmName || p.icdName || p.tmCode || p.icdCode || '').toString().trim();
      if (!display) return;
      const rec: Suggestion = {
        system: p.system || 'unknown',
        tmName: p.tmName,
        tmCode: p.tmCode,
        icdName: p.icdName,
        icdCode: p.icdCode,
        vernacular: p.vernacular,
        display,
        primary: p.primary,
      } as Suggestion;
      // Heuristic: if system unknown but a NAMASTE/TM code exists, classify as Ayurveda by default
      if (rec.system === 'unknown' && rec.tmCode) {
        rec.system = 'ayurveda';
      }
      out.push(rec);
    };
    try {
      const handleObj = (obj: Record<string, unknown>, fallbackSystem?: string) => {
        const system = normSystem(obj.system ?? obj.trad_system ?? fallbackSystem);
        const tmName = (obj.term as string) || (obj.name as string) || (obj.display as string) || (obj.title as string);
        const tmCode = (obj.code as string) || (obj.namaste_code as string);
        const icdName = (obj.icd_name as string);
        const icdCode = (obj.icd_code as string);
        const vernacular = (obj.vernacular as string) || (obj.local as string) || (obj.hi as string);
        const primary = Boolean((obj.primary as unknown) || false);
        push({ system, tmName, tmCode, icdName, icdCode, vernacular, display: tmName || icdName || tmCode || icdCode, primary });
      };
      if (Array.isArray(data)) {
        data.forEach((it) => {
          if (!it) return;
          if (typeof it === 'string') push({ system: 'unknown', display: it });
          else if (typeof it === 'object') handleObj(it as Record<string, unknown>);
        });
      } else if (data && typeof data === 'object') {
        const obj = data as Record<string, unknown>;
        const groups = ['verified','icd11','icd','ayurveda','siddha','unani','tm2','results','items','mappings'];
        let pushed = false;
        for (const key of groups) {
          const v = obj[key];
          if (Array.isArray(v)) {
            v.forEach((it) => { if (it && typeof it === 'object') handleObj(it as Record<string, unknown>, key); });
            pushed = true;
          } else if (v && typeof v === 'object') {
            const container = v as Record<string, unknown>;
            if (container.primary && typeof container.primary === 'object') {
              handleObj(container.primary as Record<string, unknown>, key);
              pushed = true;
            }
            const aliases = container.aliases as unknown[] | undefined;
            if (Array.isArray(aliases)) {
              aliases.forEach((al) => { if (al && typeof al === 'object') handleObj(al as Record<string, unknown>, key); });
              pushed = true;
            }
          }
        }
        if (!pushed) handleObj(obj);
      }
    } catch { /* ignore */ }
    // Dedup by system+tmCode+icdCode+display
    const seen = new Set<string>();
    return out.filter((s) => {
      const k = `${s.system}|${s.tmCode || ''}|${s.icdCode || ''}|${s.display}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    }).slice(0, 20);
  }, []);

  // Helpers
  const addIcdCodes = useCallback((...codes: Array<string | undefined>) => {
    setIcdCodes(prev => {
      const set = new Set(prev);
      codes.filter(Boolean).forEach(c => set.add(String(c)));
      return Array.from(set);
    });
  }, []);

  const parseTranslateToCards = useCallback((data: unknown) => {
    const cards: Array<{ system: string; code?: string; name?: string; confidence?: number | string; justification?: string; shortDefinition?: string; longDefinition?: string; vernacular?: string; uri?: string; sourceRow?: number }> = [];
    const push = (system: string, obj: Record<string, unknown> | string) => {
      if (typeof obj === 'string') {
        cards.push({ system, name: obj });
        return;
      }
      const code = (obj.icd_code as string) || (obj.code as string) || (obj.targetCode as string);
      const name = (obj.icd_name as string) || (obj.name as string) || (obj.display as string) || (obj.term as string) || (obj.title as string);
      const confidence = (obj.ai_confidence as number) ?? (obj.confidence as number | string);
      const justification = (obj.ai_justification as string) ?? (obj.justification as string);
      const descrRaw = (obj.description as string) || (obj.definition as string) || (obj.long_definition as string) || (obj.longDescription as string) || (obj.longDefinition as string) || (obj.source_long_definition as string);
      const cleanDef = (s?: string): string | undefined => {
        const t = (s || '').trim();
        if (!t) return undefined;
        const low = t.toLowerCase();
        if (low === 'n/a' || low === 'na' || low === 'not available' || low === 'none' || low === 'null') return undefined;
        return t;
      };
      const longDefinition = cleanDef(descrRaw);
      // Short definition can come from explicit short fields; if missing, try first sentence of long
      let shortDefinition: string | undefined = cleanDef((obj.source_short_definition as string) || (obj.short_definition as string) || (obj.shortDescription as string) || (obj.shortDefinition as string));
      if (!shortDefinition && typeof descrRaw === 'string') {
        const firstSentence = descrRaw.split(/\.(\s|$)/)[0];
        shortDefinition = cleanDef(firstSentence);
      }
      const vernacular = (obj.vernacular as string) || (obj.local as string);
      const uri = (obj.icd_uri as string) || (obj.uri as string) || (obj.url as string);
      type ExtraRow = { extra?: { source_row?: unknown } };
      const sr = (obj as ExtraRow).extra?.source_row;
      const sourceRow = typeof sr === 'number' ? sr : undefined;
      cards.push({ system, code, name, confidence, justification, shortDefinition, longDefinition, vernacular, uri, sourceRow });
    };
    try {
      if (!data) return cards;
      if (Array.isArray(data)) {
        data.forEach((it) => push('unknown', (it ?? {}) as Record<string, unknown>));
      } else if (typeof data === 'object') {
        const obj = data as Record<string, unknown>;
        const groups = ['verified', 'icd11', 'icd', 'ayurveda', 'siddha', 'unani', 'tm2', 'results', 'items', 'mappings'];
        let any = false;
        for (const key of groups) {
          const val = obj[key];
          if (Array.isArray(val)) {
            any = true;
            val.forEach((it: unknown) => push(key, (it ?? {}) as Record<string, unknown>));
          } else if (val && typeof val === 'object') {
            // Handle container objects like { primary, aliases }
            const container = val as Record<string, unknown>;
            const hasPrimary = typeof container.primary === 'object';
            const hasAliases = Array.isArray(container.aliases);
            if (hasPrimary || hasAliases) {
              any = true;
              if (hasPrimary) push(key, container.primary as Record<string, unknown>);
              if (hasAliases) (container.aliases as unknown[]).forEach((al) => push(key, (al ?? {}) as Record<string, unknown>));
            } else {
              any = true;
              push(key, container);
            }
          }
        }
        // Special-case: flatten bare icd or tm2 objects if groups missed them
        if (!any) {
          if (obj.icd && typeof obj.icd === 'object') { any = true; push('icd', obj.icd as Record<string, unknown>); }
          if (obj.tm2 && typeof obj.tm2 === 'object') { any = true; push('tm2', obj.tm2 as Record<string, unknown>); }
        }
        if (!any) push('unknown', obj);
      } else if (typeof data === 'string') {
        cards.push({ system: 'unknown', name: data });
      }
    } catch {
      // ignore
    }
    // Dedup by system+code+name
    const seen = new Set<string>();
    return cards.filter(c => {
      const k = `${c.system}|${c.code || ''}|${c.name || ''}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }, []);

  const condQuery = newPatient.condition?.trim() || "";
  useEffect(() => {
    if (!open) { setCondSuggestions([]); setCondOpen(false); return; }
    const q = condQuery;
    if (!q || q.length < 2) {
      setCondSuggestions([]); setComposite(null); setActiveIdx(-1);
      return;
    }
    const seq = ++lookupSeq.current;
    const t = window.setTimeout(async () => {
      try {
        setCondBusy(true);
        const data = await publicLookup(q);
        if (lookupSeq.current !== seq) return;
        const list = normalizeSuggestions(data);
        // Build composite: combine lookup cards + optional translate enrichment
        let cards = parseTranslateToCards(data);
        const hasTM = cards.some(c => /(ayur|siddha|unani)/i.test(c.system));
        if (!hasTM) {
          try {
            const tData = await publicTranslate({ icd_name: q });
            const more = parseTranslateToCards(tData);
            cards = [...cards, ...more];
          } catch { /* ignore */ }
        }
        const sysKeys: Array<'ayurveda'|'siddha'|'unani'> = ['ayurveda','siddha','unani'];
        const norm = (s?: string) => (s||'').toLowerCase();
        const choosePrimary = (sys: 'ayurveda'|'siddha'|'unani') => {
          const listC = cards.filter(c => new RegExp(sys,'i').test(c.system));
          if (listC.length === 0) return { primaryCode: undefined, primaryName: undefined, aliasesCount: 0 };
          // Prefer exact code match
          const byCode = listC.find(c => c.code && norm(c.code) === norm(q));
          if (byCode) {
            const aliases = Array.from(new Set(listC.map(c => c.code).filter((x): x is string => Boolean(x && x !== byCode.code))));
            return { primaryCode: byCode.code, primaryName: byCode.name, aliasesCount: aliases.length };
          }
          // Prefer exact name match
          const byName = listC.find(c => c.name && norm(c.name) === norm(q));
          if (byName) {
            const aliases = Array.from(new Set(listC.map(c => c.code).filter((x): x is string => Boolean(x && x !== byName.code))));
            return { primaryCode: byName.code, primaryName: byName.name, aliasesCount: aliases.length };
          }
          // Fallback to first best
          const first = listC[0];
          const aliases = Array.from(new Set(listC.map(c => c.code).filter((x): x is string => Boolean(x && x !== first.code))));
          return { primaryCode: first.code, primaryName: first.name, aliasesCount: aliases.length };
        };
        const comp: CompositeSuggestion = { systems: { ayurveda: { system: 'ayurveda', ...choosePrimary('ayurveda') }, siddha: { system: 'siddha', ...choosePrimary('siddha') }, unani: { system: 'unani', ...choosePrimary('unani') } } };
        const anySystem = sysKeys.some(k => comp.systems[k].primaryCode || comp.systems[k].primaryName || comp.systems[k].aliasesCount > 0);
        setComposite(anySystem ? comp : null);
        setCondSuggestions(list); // keep for fallback/debug
        setCondOpen(true);
        setActiveIdx(0);
      } catch {
        if (lookupSeq.current === seq) { setCondSuggestions([]); setComposite(null); setActiveIdx(-1); }
      } finally {
        if (lookupSeq.current === seq) setCondBusy(false);
      }
    }, 250);
    return () => window.clearTimeout(t);
  }, [condQuery, normalizeSuggestions, open, parseTranslateToCards]);

  const extractNamasteCode = useCallback((resp: unknown): string => {
    try {
      if (!resp) return "";
      if (typeof resp === "string") return resp;
      if (Array.isArray(resp)) {
        const first = resp[0] as Record<string, unknown> | undefined;
        const code = first?.code as string | undefined;
        if (code) return code;
      }
      if (typeof resp === "object") {
        const obj = resp as Record<string, unknown>;
        if (obj.namaste_code) return String(obj.namaste_code);
        if (obj.code) return String(obj.code);
        const targetCode = (obj as Record<string, unknown>).targetCode;
        if (typeof targetCode === 'string') return targetCode;
        type Coding = { code?: string | number };
        const hasCode = (x: unknown): x is Coding => {
          if (!x || typeof x !== 'object') return false;
          const c = (x as { code?: unknown }).code;
          return typeof c === 'string' || typeof c === 'number';
        };
        const result = obj.result as { coding?: unknown } | undefined;
        let codingArr: Coding[] = [];
        if (result && Array.isArray(result.coding)) {
          codingArr = (result.coding as unknown[]).filter(hasCode) as Coding[];
        } else if (Array.isArray(obj.coding as unknown)) {
          codingArr = ((obj.coding as unknown[]) || []).filter(hasCode) as Coding[];
        }
        if (codingArr.length > 0) {
          const c0 = codingArr[0].code;
          if (c0 !== undefined) return String(c0);
        }
      }
      return "";
    } catch {
      return "";
    }
  }, []);

  // Build a per-system summary of NAMASTE codes: Ayurveda/Siddha/Unani with Primary and Aliases
  const summarizeNamasteCodes = useCallback((resp: unknown): { summary: string; primaryCode?: string } => {
    type CodeLike = { code?: unknown; icd_code?: unknown; namaste_code?: unknown; name?: unknown; display?: unknown; term?: unknown; title?: unknown } | string;
    const getCode = (x: CodeLike): string | undefined => {
      if (!x) return undefined;
      if (typeof x === 'string') return x.trim() || undefined;
      const c = (x.code ?? x.icd_code ?? x.namaste_code) as unknown;
      if (typeof c === 'string' || typeof c === 'number') return String(c);
      return undefined;
    };
    const getName = (x: CodeLike): string | undefined => {
      if (!x || typeof x === 'string') return undefined;
      const n = (x.name ?? x.display ?? x.term ?? x.title) as unknown;
      if (typeof n === 'string') return n.trim() || undefined;
      return undefined;
    };
    const systems: Array<'ayurveda'|'siddha'|'unani'> = ['ayurveda','siddha','unani'];
    const result: Record<string, { primary?: { code?: string; name?: string }; aliases: Array<{ code?: string; name?: string }> }> = {
      ayurveda: { aliases: [] },
      siddha: { aliases: [] },
      unani: { aliases: [] },
    };
    // Try structured response first
    if (resp && typeof resp === 'object') {
      const obj = resp as Record<string, unknown>;
      for (const sys of systems) {
        const val = obj[sys] as unknown;
        if (val && typeof val === 'object') {
          const container = val as Record<string, unknown>;
          // primary
          const p = container.primary as CodeLike | undefined;
          if (p) {
            const pc = getCode(p);
            const pn = getName(p);
            if (pc || pn) result[sys].primary = { code: pc, name: pn };
          }
          // aliases array
          const aliases = Array.isArray(container.aliases) ? (container.aliases as unknown[]) : undefined;
          if (aliases) {
            for (const a of aliases) {
              const code = getCode((a as Record<string, unknown>) as CodeLike);
              const name = getName((a as Record<string, unknown>) as CodeLike);
              if (code || name) result[sys].aliases.push({ code, name });
            }
          }
          // If still empty, check if container is an array of entries
          if (!result[sys].primary && !result[sys].aliases.length && Array.isArray(val)) {
            const arr = val as unknown[];
            const entries = (arr as CodeLike[]).map((e) => ({ code: getCode(e), name: getName(e) })).filter(en => en.code || en.name);
            if (entries.length) {
              result[sys].primary = entries[0];
              // Dedupe by code+name string
              const seen = new Set<string>();
              const rest = entries.slice(1).filter(en => { const k = `${en.code||''}|${en.name||''}`; if (seen.has(k)) return false; seen.add(k); return true; });
              result[sys].aliases = rest;
            }
          }
        } else if (Array.isArray(val)) {
          const arr = val as unknown[];
          const entries = (arr as CodeLike[]).map((e) => ({ code: getCode(e), name: getName(e) })).filter(en => en.code || en.name);
          if (entries.length) {
            result[sys].primary = entries[0];
            const seen = new Set<string>();
            const rest = entries.slice(1).filter(en => { const k = `${en.code||''}|${en.name||''}`; if (seen.has(k)) return false; seen.add(k); return true; });
            result[sys].aliases = rest;
          }
        }
      }
    }
    // Fallback: derive from cards
    const haveAny = systems.some(s => result[s].primary || result[s].aliases.length);
    if (!haveAny) {
      const cards = parseTranslateToCards(resp);
      for (const sys of systems) {
        const list = cards.filter(c => new RegExp(sys, 'i').test(c.system));
        const entries = list.map(c => ({ code: c.code, name: c.name })).filter(en => en.code || en.name);
        if (entries.length) {
          result[sys].primary = entries[0];
          const seen = new Set<string>();
          const rest = entries.slice(1).filter(en => { const k = `${en.code||''}|${en.name||''}`; if (seen.has(k)) return false; seen.add(k); return true; });
          result[sys].aliases = rest;
        }
      }
    }
    const lines: string[] = [];
    let primaryCode: string | undefined;
    for (const sys of systems) {
      const { primary, aliases } = result[sys];
      if (!primary && aliases.length === 0) continue;
      const title = sys.charAt(0).toUpperCase() + sys.slice(1);
      const pretty = (en?: { code?: string; name?: string }) => {
        if (!en) return '—';
        if (en.code && en.name) return `${en.code} — ${en.name}`;
        return en.code || en.name || '—';
      };
      const aliasStr = aliases.length ? aliases.map(pretty).join(', ') : '—';
      lines.push(`${title} code:`);
      lines.push(`  Primary: ${pretty(primary)}`);
      lines.push(`  Aliases: ${aliasStr}`);
      if (!primaryCode && primary?.code) primaryCode = primary.code; // choose first available primary code as global primary
    }
    return { summary: lines.join('\n'), primaryCode };
  }, [parseTranslateToCards]);

  // Structured variant for UI rendering
  const summarizeNamasteCodesStruct = useCallback((resp: unknown): { summary: NamasteSummary; primaryCode?: string } => {
    type CodeLike = { code?: unknown; icd_code?: unknown; namaste_code?: unknown; name?: unknown; display?: unknown; term?: unknown; title?: unknown } | string;
    const getCode = (x: CodeLike): string | undefined => {
      if (!x) return undefined;
      if (typeof x === 'string') return x.trim() || undefined;
      const c = (x.code ?? x.icd_code ?? x.namaste_code) as unknown;
      if (typeof c === 'string' || typeof c === 'number') return String(c);
      return undefined;
    };
    const getName = (x: CodeLike): string | undefined => {
      if (!x || typeof x === 'string') return undefined;
      const n = (x.name ?? x.display ?? x.term ?? x.title) as unknown;
      if (typeof n === 'string') return n.trim() || undefined;
      return undefined;
    };
    const systems: Array<'ayurveda'|'siddha'|'unani'> = ['ayurveda','siddha','unani'];
    const result: NamasteSummary = {
      ayurveda: { aliases: [] },
      siddha: { aliases: [] },
      unani: { aliases: [] },
    };
    let primaryCode: string | undefined;
    if (resp && typeof resp === 'object') {
      const obj = resp as Record<string, unknown>;
      for (const sys of systems) {
        const val = obj[sys] as unknown;
        if (val && typeof val === 'object') {
          const container = val as Record<string, unknown>;
          const p = container.primary as CodeLike | undefined;
          if (p) {
            const pc = getCode(p);
            const pn = getName(p);
            if (pc || pn) result[sys].primary = { code: pc, name: pn };
          }
          const aliases = Array.isArray(container.aliases) ? (container.aliases as unknown[]) : undefined;
          if (aliases) {
            for (const a of aliases) {
              const code = getCode((a as Record<string, unknown>) as CodeLike);
              const name = getName((a as Record<string, unknown>) as CodeLike);
              if (code || name) result[sys].aliases.push({ code, name });
            }
          }
          if (!result[sys].primary && !result[sys].aliases.length && Array.isArray(val)) {
            const arr = val as unknown[];
            const entries = (arr as CodeLike[]).map((e) => ({ code: getCode(e), name: getName(e) })).filter(en => en.code || en.name);
            if (entries.length) {
              result[sys].primary = entries[0];
              const seen = new Set<string>();
              const rest = entries.slice(1).filter(en => { const k = `${en.code||''}|${en.name||''}`; if (seen.has(k)) return false; seen.add(k); return true; });
              result[sys].aliases = rest;
            }
          }
        } else if (Array.isArray(val)) {
          const arr = val as unknown[];
          const entries = (arr as CodeLike[]).map((e) => ({ code: getCode(e), name: getName(e) })).filter(en => en.code || en.name);
          if (entries.length) {
            result[sys].primary = entries[0];
            const seen = new Set<string>();
            const rest = entries.slice(1).filter(en => { const k = `${en.code||''}|${en.name||''}`; if (seen.has(k)) return false; seen.add(k); return true; });
            result[sys].aliases = rest;
          }
        }
      }
    }
    const haveAny = systems.some(s => result[s].primary || result[s].aliases.length);
    if (!haveAny) {
      const cards = parseTranslateToCards(resp);
      for (const sys of systems) {
        const list = cards.filter(c => new RegExp(sys, 'i').test(c.system));
        const entries = list.map(c => ({ code: c.code, name: c.name })).filter(en => en.code || en.name);
        if (entries.length) {
          result[sys].primary = entries[0];
          const seen = new Set<string>();
          const rest = entries.slice(1).filter(en => { const k = `${en.code||''}|${en.name||''}`; if (seen.has(k)) return false; seen.add(k); return true; });
          result[sys].aliases = rest;
        }
      }
    }
    for (const sys of systems) {
      const pri = result[sys].primary;
      if (!primaryCode && pri?.code) primaryCode = pri.code;
    }
    return { summary: result, primaryCode };
  }, [parseTranslateToCards]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Busy overlay */}
        {uiBusy && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-20">
            <div className="flex flex-col items-center gap-3">
              <svg className="animate-spin h-8 w-8 text-teal-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
              </svg>
              <div className="text-sm text-gray-700">Working…</div>
            </div>
          </div>
        )}
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800">Add New Patient</h2>
          <div className="flex items-center space-x-4">
            <button onClick={onSave} className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">Save Patient</button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6">
          {/* Stepper */}
          <div className="flex items-center justify-between mb-6">
            {[
              { n: 1, label: 'Patient Details & Consent' },
              { n: 2, label: 'Add Diagnosis (Lookup)' },
              { n: 3, label: 'Translate & FHIR' },
            ].map((s) => (
              <div key={s.n} className="flex-1 flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border ${step >= (s.n as 1|2|3) ? 'bg-teal-600 text-white border-teal-600' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>{s.n}</div>
                <div className={`text-xs ${step === (s.n as 1|2|3) ? 'text-teal-700 font-medium' : 'text-gray-500'}`}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Top Section - Name and Basic Details */}
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Step 1: Patient details and consent</h3>
            <p className="text-sm text-gray-600 mb-6">Enter basic demographics. Toggle consent to confirm the patient permits use of AYUR‑SYNC APIs for lookup/translation.</p>
            {step === 1 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                <input type="text" value={newPatient.name} onChange={(e)=>setNewPatient(prev=>({...prev,name:e.target.value}))} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" placeholder="Enter patient name"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth *</label>
                <input type="text" value={newPatient.dob} onChange={(e)=>setNewPatient(prev=>({...prev,dob:e.target.value}))} onFocus={(e)=>e.target.type='date'} onBlur={(e)=>{ if(!e.target.value){ e.target.type='text'; } }} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" placeholder="DD/MM/YYYY or use date picker"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Age</label>
                <input type="number" value={newPatient.age} onChange={(e)=>setNewPatient(prev=>({...prev,age:e.target.value}))} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" placeholder="Age"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Gender *</label>
                <select value={newPatient.gender} onChange={handleGenderChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent">
                  <option value="">Select Gender</option>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="O">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contact Number *</label>
                <input type="tel" value={newPatient.contact} onChange={(e)=>setNewPatient(prev=>({...prev,contact:e.target.value}))} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" placeholder="+91 XXXXXXXXXX"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ABHA Number</label>
                <input type="text" value={newPatient.abhaNo} onChange={handleAbhaChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" placeholder="14-XXXX-XXXX-XXXX"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Doctor Name</label>
                <input type="text" value={newPatient.doctorName} onChange={(e)=>setNewPatient(prev=>({...prev,doctorName:e.target.value}))} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" placeholder="Dr. A. Kumar"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                <select value={newPatient.location} onChange={(e)=>setNewPatient(prev=>({...prev,location:e.target.value}))} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent">
                  <option value="">Select City</option>
                  <option value="Bangalore">Bangalore</option>
                  <option value="New Delhi">New Delhi</option>
                  <option value="Chennai">Chennai</option>
                  <option value="Hyderabad">Hyderabad</option>
                  <option value="Mumbai">Mumbai</option>
                </select>
              </div>
            </div>) : (
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 flex items-center justify-between">
                <div>
                  <span className="font-medium">Patient:</span> {newPatient.name || '—'}
                  <span className="ml-3"><span className="font-medium">Age:</span> {newPatient.age || '—'}</span>
                  <span className="ml-3"><span className="font-medium">Doctor:</span> {newPatient.doctorName || '—'}</span>
                  <span className="ml-3"><span className="font-medium">Location:</span> {newPatient.location || '—'}</span>
                  <span className="ml-3"><span className="font-medium">Consent:</span> {newPatient.consentFlag ? 'Yes' : 'No'}</span>
                </div>
                <button className="text-xs text-teal-700 hover:underline" onClick={()=>setStep(1)}>Edit</button>
              </div>
            )}
            <div className="mt-6">
              <div className="flex items-center space-x-3">
                <input type="checkbox" id="consent" checked={newPatient.consentFlag} onChange={handleConsentChange} className="w-5 h-5 text-teal-600 border-gray-300 rounded focus:ring-teal-500"/>
                <label htmlFor="consent" className="text-sm font-medium text-gray-700">Patient has provided consent for data collection and treatment</label>
              </div>
              {!newPatient.consentFlag && (
                <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded">Consent is required to proceed to diagnosis and FHIR export.</p>
              )}
              <div className="mt-4">
                <button
                  disabled={!newPatient.consentFlag}
                  onClick={() => setStep(2)}
                  className={`px-4 py-2 rounded-lg ${newPatient.consentFlag ? 'bg-teal-600 text-white hover:bg-teal-700' : 'bg-gray-200 text-gray-500'}`}
                >Continue to Add Diagnosis</button>
              </div>
            </div>
          </div>

          {/* Bottom Section - Two Column Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-gray-50 p-6 rounded-lg">
              <div className="flex items-center justify-between mb-2"><h3 className="text-lg font-semibold text-gray-800">Step 2: Add a diagnosis</h3></div>
              <p className="text-sm text-gray-600 mb-4">Click “Start diagnosis” to search ICD or NAMASTE (Ayurveda/Siddha/Unani) by code or name. Choose a suggestion to focus the translation.</p>
              <div className="mb-3">
                <button onClick={() => { setStep(2); setCondOpen(true); }} className="px-3 py-2 rounded bg-teal-600 text-white hover:bg-teal-700">Start diagnosis</button>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Primary Condition</label>
                <div className="relative">
                  <input
                    type="text"
                    value={newPatient.condition}
                    onChange={handleConditionChange}
                    onFocus={()=>setCondOpen(condSuggestions.length>0)}
                    onBlur={()=>setTimeout(()=>setCondOpen(false),150)}
                    onKeyDown={(e)=>{
                      if (!condOpen) return;
                      const haveComposite = Boolean(composite);
                      const maxIdx = haveComposite ? 0 : Math.max(0, condSuggestions.length-1);
                      if (e.key==='ArrowDown') { e.preventDefault(); setActiveIdx(i=> Math.min(maxIdx, i+1)); }
                      else if (e.key==='ArrowUp') { e.preventDefault(); setActiveIdx(i=> Math.max(0, i-1)); }
                      else if (e.key==='Enter') {
                        e.preventDefault();
                        if (haveComposite) {
                          setCondOpen(false); setStep(3);
                        } else if (activeIdx>=0 && condSuggestions[activeIdx]) {
                          const s = condSuggestions[activeIdx];
                          setNewPatient(prev=>({...prev,condition:s.display}));
                          setIcdName(s.icdName || s.display);
                          if (s.tmCode) setSelectedIcd({ code: s.tmCode, name: s.tmName || s.display, system: s.system });
                          setCondOpen(false); setStep(3);
                        }
                      }
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="Type ICD or Ayurveda/Siddha/Unani name/code (e.g., प्रवाहिका or SM38(EB-9))"
                  />
                  <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                  {condOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-[70vh] overflow-auto">
                      {condBusy && (
                        <div className="px-3 py-3 text-sm text-gray-600 flex items-center gap-2">
                          <svg className="animate-spin h-4 w-4 text-teal-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                          </svg>
                          Searching…
                        </div>
                      )}
                      {!condBusy && !composite && condSuggestions.length === 0 && (<div className="px-3 py-2 text-sm text-gray-500">No suggestions</div>)}
                      {!condBusy && composite && (
                        <button
                          type="button"
                          className={`w-full text-left px-3 py-3 hover:bg-teal-50 ${activeIdx===0 ? 'bg-teal-50' : ''}`}
                          onMouseDown={(e)=>{ e.preventDefault(); setCondOpen(false); setStep(3); }}
                          onClick={()=>{ setCondOpen(false); setStep(3); }}
                        >
                          <div className="text-xs text-gray-500 mb-2">Systems overview</div>
                          <div className="grid grid-cols-1 gap-2">
                            {(['ayurveda','siddha','unani'] as const).map(sys => {
                              const o = composite.systems[sys];
                              const badge = sys==='ayurveda' ? 'bg-amber-600' : sys==='siddha' ? 'bg-indigo-600' : 'bg-emerald-600';
                              return (
                                <div key={sys} className="border rounded p-2">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-[10px] text-white px-2 py-0.5 rounded ${badge} uppercase tracking-wide`}>{sys}</span>
                                  </div>
                                  <div className="text-sm text-gray-800 break-words">
                                    {o.primaryCode || o.primaryName ? (
                                      <>
                                        <div className="font-medium">Primary: <span className="font-mono">{o.primaryCode || '—'}</span>{o.primaryName ? <> — {o.primaryName}</> : null}</div>
                                        <div className="text-xs text-gray-600">Aliases: {o.aliasesCount}</div>
                                      </>
                                    ) : (
                                      <div className="text-xs text-gray-500">No matches</div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          <div className="mt-2 text-[11px] text-gray-500">Press Enter to use this mapping</div>
                        </button>
                      )}
                      {!condBusy && !composite && condSuggestions.map((s, idx) => {
                        const active = idx === activeIdx;
                        const badgeColor = s.system==='icd11' ? 'bg-teal-600' : s.system==='ayurveda' ? 'bg-amber-600' : s.system==='siddha' ? 'bg-indigo-600' : s.system==='unani' ? 'bg-emerald-600' : 'bg-gray-600';
                        return (
                          <button key={`${s.system}-${s.tmCode || s.icdCode || s.display}-${idx}`} type="button" className={`w-full text-left px-3 py-2 hover:bg-teal-50 ${active ? 'bg-teal-50' : ''}`} onMouseDown={(e)=>{ e.preventDefault(); setNewPatient(prev=>({...prev,condition:s.display})); setIcdName(s.icdName || s.display); if (s.tmCode) setSelectedIcd({ code: s.tmCode, name: s.tmName || s.display, system: s.system }); setCondOpen(false); setStep(3); }}>
                            <div className="flex items-start gap-2">
                              <span className={`text-[10px] text-white px-2 py-0.5 rounded ${badgeColor} uppercase tracking-wide`}>{s.system}</span>
                              <div className="flex-1">
                                <div className="text-sm text-gray-800 line-clamp-1">{s.tmName || s.icdName || s.display} {s.tmCode || s.icdCode ? <span className="text-gray-500">• {(s.tmCode || s.icdCode)}</span> : null}</div>
                                <div className="text-[11px] text-gray-600 line-clamp-1">
                                  {s.vernacular ? <span>{s.vernacular}</span> : null}
                                  {(s.vernacular && (s.icdName || s.icdCode || s.tmName || s.tmCode)) ? <span> • </span> : null}
                                  {s.icdName || s.icdCode ? <span>ICD: {s.icdName || ''}{s.icdCode ? ` (${s.icdCode})` : ''}</span> : null}
                                  {(s.icdName || s.icdCode) && (s.tmName || s.tmCode) ? <span> • </span> : null}
                                  {s.tmName || s.tmCode ? <span>TM: {s.tmName || ''}{s.tmCode ? ` • ${s.tmCode}` : ''}</span> : null}
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">ICD Code</label>
                <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-700">
                  {selectedIcd ? (
                    <div className="space-y-1">
                      {selectedIcd.code && (
                        <div className="text-sm"><span className="opacity-70">Code:</span> <span className="font-mono font-semibold">{selectedIcd.code}</span></div>
                      )}
                      {selectedIcd.name && (
                        <div className="text-sm"><span className="opacity-70">Name:</span> {selectedIcd.name}</div>
                      )}
                      {(() => {
                        const short = selectedIcd.shortDefinition?.trim();
                        const long = selectedIcd.longDefinition?.trim();
                        const defn = short || long;
                        if (defn) {
                          return (<div className="text-xs"><span className="opacity-70">Definition:</span> {defn}</div>);
                        }
                        return null;
                      })()}
                    </div>
                  ) : (
                    <span className="italic text-gray-500">Select a suggestion, then proceed to translation…</span>
                  )}
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">ICD Codes</label>
                <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white min-h-[46px] flex flex-wrap gap-2">
                  {icdCodes.length === 0 ? (
                    <span className="italic text-gray-400">ICD codes will appear here…</span>
                  ) : (
                    icdCodes.map((c) => (
                      <span key={c} className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-2 py-1 rounded-full text-xs">
                        <code className="font-mono">{c}</code>
                        <button className="text-amber-700 hover:text-amber-900" onClick={() => setIcdCodes(prev => prev.filter(x => x !== c))} aria-label="Remove code">×</button>
                      </span>
                    ))
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Clinical Notes</label>
                <textarea value={newPatient.notes} onChange={(e)=>setNewPatient(p=>({...p,notes:e.target.value}))} rows={4} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" placeholder="Enter clinical notes and observations..."/>
              </div>
            </div>
            <div className="bg-gray-50 p-6 rounded-lg">
              <div className="flex items-center space-x-3 mb-2"><div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center"><svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg></div><h3 className="text-lg font-semibold text-gray-800">Step 3: Translate & review backend info</h3></div>
              <p className="text-sm text-gray-600 mb-4">After selecting a suggestion, click Translate to fetch ICD‑11/TM2 and system‑specific details from the backend. We’ll display a summary and the raw JSON for verification.</p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Namaste Codes</label>
                <div className="w-full border border-gray-200 rounded-lg bg-white p-3">
                  {!namasteStruct ? (
                    <div className="text-sm text-gray-400 italic">Namaste code summary will appear here…</div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs text-gray-500">Primary used for FHIR: <span className="font-mono font-semibold text-gray-700">{namasteCode || '—'}</span></div>
                        <button
                          type="button"
                          className="text-xs text-teal-700 hover:underline"
                          onClick={() => { if (namasteOut) navigator.clipboard.writeText(namasteOut); }}
                        >Copy summary</button>
                      </div>
                      <div className="space-y-2">
                        {(['ayurveda','siddha','unani'] as const).map(sys => {
                          const data = namasteStruct?.[sys];
                          if (!data) return null;
                          const hasContent = data.primary || (data.aliases && data.aliases.length);
                          if (!hasContent) return null;
                          const badge = sys==='ayurveda' ? 'bg-amber-600' : sys==='siddha' ? 'bg-indigo-600' : 'bg-emerald-600';
                          const title = sys.charAt(0).toUpperCase()+sys.slice(1);
                          return (
                            <div key={sys} className="rounded border border-gray-200 p-3">
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`text-[10px] text-white px-2 py-0.5 rounded ${badge} uppercase tracking-wide`}>{title}</span>
                                <span className="text-xs text-gray-500">Aliases: {data.aliases?.length || 0}</span>
                              </div>
                              {data.primary ? (
                                <div className="text-sm text-gray-800"><span className="opacity-70">Primary:</span> <span className="font-mono font-semibold">{data.primary.code || '—'}</span>{data.primary.name ? <> — {data.primary.name}</> : null}</div>
                              ) : (
                                <div className="text-sm text-gray-500 italic">No primary match</div>
                              )}
                              {data.aliases && data.aliases.length > 0 && (
                                <ul className="mt-2 text-xs text-gray-700 list-disc pl-5 space-y-1">
                                  {data.aliases.map((a, i) => (
                                    <li key={i}><span className="font-mono">{a.code || '—'}</span>{a.name ? <> — {a.name}</> : null}</li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex space-x-3">
                <button disabled={uiBusy} className={`flex-1 ${uiBusy ? 'bg-teal-400 cursor-not-allowed' : 'bg-teal-500 hover:bg-teal-600'} text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2`} onClick={async ()=>{
                  try {
                    setUiBusy(true);
                    // Prefer translating by system+code when suggestion contains a code; otherwise try icd_name
                    let data: unknown;
                    if (selectedIcd?.code && selectedIcd?.system && /ayur|siddha|unani/i.test(selectedIcd.system)) {
                      const sys = (selectedIcd.system!.toLowerCase() as 'ayurveda'|'siddha'|'unani');
                      data = await publicTranslate({ system: sys, code: selectedIcd.code });
                    } else if (selectedIcd?.code && /icd/i.test(selectedIcd?.system || '')) {
                      // If ICD code, attempt by icd_name fallback (backend accepts icd_name best)
                      data = await publicTranslate({ icd_name: newPatient.condition });
                    } else {
                      data = await publicTranslate({ icd_name: newPatient.condition });
                    }
                    setTranslateJson(data);
                    setShowRaw(true);
                    // Build per-system NAMASTE summary for textarea; prefer first primary as global code
                    const { summary, primaryCode } = summarizeNamasteCodes(data);
                    if (summary && summary.trim()) setNamasteOut(summary);
                    const structRes = summarizeNamasteCodesStruct(data);
                    setNamasteStruct(structRes.summary);
                    const code = primaryCode || extractNamasteCode(data);
                    setNamasteCode(code);
                    const cards = parseTranslateToCards(data);
                    setTranslateCards(cards);
                    // Auto-select the first ICD-11 result, if present
                    const firstIcd = cards.find(c => (c.system || '').toLowerCase().includes('icd'));
                    if (firstIcd) {
                      setSelectedIcd({ code: firstIcd.code, name: firstIcd.name, shortDefinition: firstIcd.shortDefinition, longDefinition: firstIcd.longDefinition });
                    } else {
                      setSelectedIcd(null);
                    }
                    // Add ICD11 codes, if present
                    const icdCodesFound = cards.filter(c => c.system.toLowerCase().includes('icd')).map(c => c.code).filter(Boolean) as string[];
                    if (icdCodesFound.length) addIcdCodes(...icdCodesFound);

                    // Fire-and-forget: log diagnosis event for admin map using selected demo location (fallback to geolocation if not chosen)
                    try {
                      let loc = newPatient.location && cityCatalog[newPatient.location] ? cityCatalog[newPatient.location] : undefined;
                      if (!loc) {
                        const geo = await new Promise<GeolocationPosition | null>((resolve) => {
                          if (!navigator.geolocation) return resolve(null);
                          navigator.geolocation.getCurrentPosition(
                            (pos) => resolve(pos),
                            () => resolve(null),
                            { enableHighAccuracy: false, timeout: 3000, maximumAge: 60000 }
                          );
                        });
                        if (geo) {
                          loc = { city: '', state: '', latitude: geo.coords.latitude, longitude: geo.coords.longitude };
                        }
                      }
                      if (loc && selectedIcd) {
                        const sysGuess = (selectedIcd.system && /(ayurveda|siddha|unani)/i.test(selectedIcd.system))
                          ? (selectedIcd.system.toLowerCase() as 'ayurveda'|'siddha'|'unani')
                          : (fhirSystem || 'ayurveda');
                        const payload: DiagnosisEventPayload = {
                          doctor_id: newPatient.doctorName || undefined,
                          system: sysGuess,
                          code: namasteCode || selectedIcd.code,
                          term_name: newPatient.condition || selectedIcd.name,
                          icd_name: selectedIcd.name || icdName || newPatient.condition || 'Unknown',
                          city: loc.city || undefined,
                          state: loc.state || undefined,
                          latitude: loc.latitude,
                          longitude: loc.longitude,
                        };
                        publicLogDiagnosis(payload).catch(()=>{});
                      }
                    } catch {}
                  } catch (e) {
                    setTranslateJson({ error: String(e) });
                    setTranslateCards([]);
                    setSelectedIcd(null);
                  } finally {
                    setUiBusy(false);
                  }
                }}>{uiBusy ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg>
                    <span>Translating…</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg><span>Translate</span>
                  </>
                )}</button>
                <div className="flex items-center text-xs text-gray-500">Select a suggestion first, then click Translate</div>
              </div>
              {/* Stylish translate cards grouped by system */}
              {translateCards.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-semibold text-gray-800 mb-3">Translation Results</h4>
                  {(() => {
                    const grouped = translateCards.reduce((acc, c) => {
                      const sys = (c.system || '').toLowerCase();
                      const key = sys.includes('icd') ? 'icd11' : sys.includes('ayur') ? 'ayurveda' : sys.includes('siddha') ? 'siddha' : sys.includes('unani') ? 'unani' : sys.includes('tm2') ? 'tm2' : 'other';
                      (acc[key] ||= []).push(c);
                      return acc;
                    }, {} as Record<string, typeof translateCards>);
                    const order = ['icd11', 'ayurveda', 'siddha', 'unani', 'tm2', 'other'];
                    return order.map((key) => {
                      const list = grouped[key] || [];
                      if (list.length === 0) return null;
                      const label = key === 'icd11' ? 'ICD-11' : key === 'tm2' ? 'ICD Entity' : key.charAt(0).toUpperCase() + key.slice(1);
                      return (
                        <div key={key} className="mb-5">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="text-sm font-semibold text-gray-900">{label}</h5>
                            <span className="text-xs text-gray-500">{list.length}</span>
                          </div>
                          <div className="grid grid-cols-1 md:[grid-template-columns:repeat(auto-fit,minmax(380px,1fr))] gap-3">
                            {list.map((c, idx) => {
                              const sys = (c.system || 'unknown').toLowerCase();
                              const color = sys.includes('icd')
                                ? 'border-teal-200 bg-teal-50 text-teal-800'
                                : sys.includes('ayur')
                                ? 'border-amber-200 bg-amber-50 text-amber-800'
                                : sys.includes('siddha')
                                ? 'border-indigo-200 bg-indigo-50 text-indigo-800'
                                : sys.includes('unani')
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                : 'border-gray-200 bg-gray-50 text-gray-700';
                              return (
                                <div key={`${key}-${idx}`} className={`rounded-lg border p-3 w-full break-words ${color}`}>
                                  <div className="flex items-start justify-between">
                                    <span className="text-xs uppercase tracking-wide opacity-80">{c.system}</span>
                                    <div className="flex items-center gap-2">
                                      {c.code && (
                                        <button
                                          className="text-xs underline opacity-90 hover:opacity-100"
                                          onClick={() => { navigator.clipboard.writeText(c.code!); addIcdCodes(c.code!); }}
                                          title="Copy & add to ICD codes"
                                        >Copy</button>
                                      )}
                                      <button
                                        className="text-xs underline opacity-90 hover:opacity-100"
                                        onClick={() => {
                                          setSelectedIcd({ code: c.code, name: c.name, shortDefinition: c.shortDefinition, longDefinition: c.longDefinition });
                                          if (c.code) addIcdCodes(c.code);
                                        }}
                                        title="Select to fill ICD panel"
                                      >Select</button>
                                    </div>
                                  </div>
                                  {c.code && (<div className="mt-2 text-sm font-mono"><span className="opacity-70">Code:</span> <span className="font-semibold">{c.code}</span></div>)}
                                  {c.name && (<div className="text-sm"><span className="opacity-70">Name:</span> {c.name}</div>)}
                                  {c.vernacular && (<div className="text-xs italic opacity-90">{c.vernacular}</div>)}
                                  {(() => {
                                    const short = c.shortDefinition?.trim();
                                    const long = c.longDefinition?.trim();
                                    const sys = (c.system || '').toLowerCase();
                                    const isICD = sys.includes('icd');
                                    const isTM = sys.includes('ayur') || sys.includes('siddha') || sys.includes('unani');
                                    if (isICD) {
                                      const defn = short || long;
                                      if (defn) return (<div className="mt-1 text-xs"><span className="opacity-70">Definition:</span> {defn}</div>);
                                      return null;
                                    }
                                    if (isTM) {
                                      if (short && long) {
                                        if (short === long) return (<div className="mt-1 text-xs"><span className="opacity-70">Definition:</span> {short}</div>);
                                        return (<>
                                          <div className="mt-1 text-xs"><span className="opacity-70">Short:</span> {short}</div>
                                          <div className="mt-1 text-xs"><span className="opacity-70">Long:</span> {long}</div>
                                        </>);
                                      }
                                      if (short) return (<div className="mt-1 text-xs"><span className="opacity-70">Short:</span> {short}</div>);
                                      if (long) return (<div className="mt-1 text-xs"><span className="opacity-70">Long:</span> {long}</div>);
                                      return null;
                                    }
                                    const defn = short || long;
                                    if (defn) return (<div className="mt-1 text-xs"><span className="opacity-70">Definition:</span> {defn}</div>);
                                    return null;
                                  })()}
                                  {c.uri && (<div className="mt-1 text-xs"><span className="opacity-70">URI:</span> <a className="underline break-all" href={c.uri} target="_blank" rel="noreferrer">{c.uri}</a></div>)}
                                  {typeof c.sourceRow === 'number' && (<div className="mt-1 text-[11px] text-gray-600">Source row: {c.sourceRow}</div>)}
                                  {c.confidence !== undefined && (
                                    <div className="mt-1 text-xs"><span className="opacity-70">Confidence:</span> {String(c.confidence)}</div>
                                  )}
                                  {c.justification && (
                                    <div className="mt-1 text-xs opacity-90"><span className="opacity-70">Why:</span> {c.justification}</div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    });
                  })()}
                  <div className="mt-3">
                    <button className="text-xs text-teal-700 hover:underline" onClick={() => setShowRaw(v => !v)}>
                      {showRaw ? 'Hide raw translate JSON' : 'Show raw translate JSON'}
                    </button>
                    {showRaw && (
                      <pre className="mt-2 text-xs bg-white border rounded p-2 max-h-60 overflow-auto">{JSON.stringify(translateJson, null, 2)}</pre>
                    )}
                  </div>
                </div>
              )}
              <div className="mt-8 border-t pt-6">
                <details className="group">
                  <summary className="cursor-pointer list-none flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">Developer tools (FHIR)</h3>
                      <p className="text-sm text-gray-600">Inspect FHIR endpoints and public mapping APIs. Output shows the most recent response.</p>
                    </div>
                    <span className="text-sm text-teal-700 group-open:hidden">Expand</span>
                    <span className="text-sm text-teal-700 hidden group-open:inline">Collapse</span>
                  </summary>
                  <div className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="col-span-1">
                    <label className="block text-xs text-gray-600 mb-1">System</label>
                    <select value={fhirSystem} onChange={(e)=>setFhirSystem(e.target.value as 'ayurveda'|'siddha'|'unani')} className="w-full px-3 py-2 border rounded">
                      <option value="ayurveda">Ayurveda</option>
                      <option value="siddha">Siddha</option>
                      <option value="unani">Unani</option>
                    </select>
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs text-gray-600 mb-1">NAMASTE Code</label>
                    <input value={namasteCode} onChange={(e)=>setNamasteCode(e.target.value)} className="w-full px-3 py-2 border rounded" placeholder="e.g., SM38(EB-9)"/>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-600 mb-1">ICD Name (optional)</label>
                    <input value={icdName} onChange={(e)=>setIcdName(e.target.value)} className="w-full px-3 py-2 border rounded" placeholder="e.g., Dengue fever"/>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-2">
                  <button disabled={uiBusy} title="Server capability statement" className={`${uiBusy ? 'bg-amber-400 cursor-not-allowed' : 'bg-amber-600'} text-white px-3 py-2 rounded`} onClick={async ()=>{ try { setUiBusy(true); const data = await fhirMetadata(); setFhirOutputTitle('FHIR /metadata'); setFhirOutputData(data); } catch (e) { setFhirOutputTitle('FHIR /metadata (error)'); setFhirOutputData({ error: String(e) }); } finally { setUiBusy(false); } }}>FHIR /metadata</button>
                  <button disabled={uiBusy} title="Read the code system for counts and metadata" className={`${uiBusy ? 'bg-amber-400 cursor-not-allowed' : 'bg-amber-600'} text-white px-3 py-2 rounded`} onClick={async ()=>{ try { setUiBusy(true); const data = await fhirCodeSystemRead(fhirSystem); setFhirOutputTitle(`CodeSystem/${fhirSystem}`); setFhirOutputData(data); } catch (e) { setFhirOutputTitle('CodeSystem error'); setFhirOutputData({ error: String(e) }); } finally { setUiBusy(false); } }}>CodeSystem/{'{'}system{'}'}</button>
                  <button disabled={uiBusy} title="Lookup a NAMASTE code to view properties" className={`${uiBusy ? 'bg-amber-400 cursor-not-allowed' : 'bg-amber-600'} text-white px-3 py-2 rounded`} onClick={async ()=>{ try { setUiBusy(true); const data = await fhirLookup(fhirSystem, namasteCode); setFhirOutputTitle('$lookup'); setFhirOutputData(data); } catch (e) { setFhirOutputTitle('$lookup (error)'); setFhirOutputData({ error: String(e) }); } finally { setUiBusy(false); } }}>$lookup</button>
                  <button disabled={uiBusy} title="Translate NAMASTE → ICD‑11 via ConceptMap" className={`${uiBusy ? 'bg-amber-400 cursor-not-allowed' : 'bg-amber-600'} text-white px-3 py-2 rounded`} onClick={async ()=>{ try { setUiBusy(true); const data = await fhirTranslate(fhirSystem, namasteCode, 'icd11'); setFhirOutputTitle('$translate'); setFhirOutputData(data); } catch (e) { setFhirOutputTitle('$translate (error)'); setFhirOutputData({ error: String(e) }); } finally { setUiBusy(false); } }}>$translate</button>
                  <button disabled={uiBusy} title="Public endpoint: general search across systems" className={`${uiBusy ? 'bg-teal-400 cursor-not-allowed' : 'bg-teal-600'} text-white px-3 py-2 rounded`} onClick={async ()=>{ try { setUiBusy(true); const data = await publicLookup(newPatient.condition || icdName); setFhirOutputTitle('Public Lookup'); setFhirOutputData(data); } catch (e) { setFhirOutputTitle('Public Lookup (error)'); setFhirOutputData({ error: String(e) }); } finally { setUiBusy(false); } }}>Public Lookup</button>
                  <button disabled={uiBusy} title="Public endpoint: translate TM code or ICD name" className={`${uiBusy ? 'bg-teal-400 cursor-not-allowed' : 'bg-teal-600'} text-white px-3 py-2 rounded`} onClick={async ()=>{ try { setUiBusy(true); const params: { system?: string; code?: string; icd_name?: string; release?: string } = {}; if (fhirSystem) params.system = fhirSystem; if (namasteCode) params.code = namasteCode; if (icdName) params.icd_name = icdName; const data = await publicTranslate(params); setFhirOutputTitle('Public Translate'); setFhirOutputData(data); } catch (e) { setFhirOutputTitle('Public Translate (error)'); setFhirOutputData({ error: String(e) }); } finally { setUiBusy(false); } }}>Public Translate</button>
                </div>
                <div className="mt-2 text-xs text-gray-600">Guide: 1) /metadata verifies the server. 2) CodeSystem shows overall counts. 3) $lookup inspects a specific NAMASTE code. 4) $translate maps it to ICD‑11. Public endpoints mirror these without FHIR packaging.</div>

                <div className="mt-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-800">Output: {fhirOutputTitle || '—'}</h4>
                    {uiBusy && <span className="text-xs text-gray-500">Loading…</span>}
                  </div>
                  <pre className="text-xs bg-white border rounded p-2 max-h-60 overflow-auto">{JSON.stringify(fhirOutputData, null, 2)}</pre>
                </div>
                  </div>
                </details>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Top-level Edit Patient Modal to keep focus stable
type EditPatientModalProps = {
  open: boolean;
  patient: Patient | null;
  onChange: (field: string, value: string | number | boolean) => void;
  onSave: () => void;
  onClose: () => void;
};

const EditPatientModalTop: React.FC<EditPatientModalProps> = ({ open, patient, onChange, onSave, onClose }) => {
  if (!open || !patient) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800">Edit Patient Details</h2>
          <div className="flex items-center space-x-4">
            <button onClick={onSave} className="bg-teal-500 hover:bg-teal-600 text-white px-6 py-2 rounded-lg font-medium transition-colors">UPDATE PATIENT</button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-6 text-center">PATIENT INFORMATION</h3>
              <div className="mb-4"><label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label><input type="text" value={patient.name} onChange={(e)=>onChange('name', e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"/></div>
              <div className="mb-4"><label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth *</label><input type="text" value={patient.dob} onChange={(e)=>onChange('dob', e.target.value)} onFocus={(e)=>{ (e.target as HTMLInputElement).type='date'; }} onBlur={(e)=>{ const el = e.target as HTMLInputElement; if(!el.value){ el.type='text'; } }} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" placeholder="DD/MM/YYYY or use date picker"/></div>
              <div className="mb-4"><label className="block text-sm font-medium text-gray-700 mb-2">Age</label><input type="number" value={patient.age} onChange={(e)=>onChange('age', parseInt(e.target.value,10) || 0)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"/></div>
              <div className="mb-4"><label className="block text-sm font-medium text-gray-700 mb-2">Gender *</label><select value={patient.gender} onChange={(e)=>onChange('gender', e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"><option value="M">Male</option><option value="F">Female</option><option value="O">Other</option></select></div>
              <div className="mb-4"><label className="block text-sm font-medium text-gray-700 mb-2">Contact Number *</label><input type="tel" value={patient.contact} onChange={(e)=>onChange('contact', e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"/></div>
              <div className="mb-4"><label className="block text-sm font-medium text-gray-700 mb-2">ABHA Number</label><input type="text" value={patient.abhaNo} onChange={(e)=>onChange('abhaNo', e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"/></div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-6 text-center">MEDICAL INFORMATION</h3>
              <div className="mb-4"><label className="block text-sm font-medium text-gray-700 mb-2">Primary Condition</label><input type="text" value={patient.condition} onChange={(e)=>onChange('condition', e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"/></div>
              <div className="mb-4"><label className="block text-sm font-medium text-gray-700 mb-2">Current Treatment</label><input type="text" value={patient.treatment} onChange={(e)=>onChange('treatment', e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"/></div>
              <div className="mb-4"><label className="block text-sm font-medium text-gray-700 mb-2">Status</label><select value={patient.status} onChange={(e)=>onChange('status', e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"><option>Active</option><option>In Treatment</option><option>Monitoring</option></select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">Clinical Notes</label><textarea value={patient.notes} onChange={(e)=>onChange('notes', e.target.value)} rows={6} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"/></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const initialPatients: Patient[] = [
    {
      id: 1,
      name: "Rajesh Kumar",
      age: 45,
      gender: "M",
      condition: "Chronic Arthritis",
      lastVisit: "14/11/24",
      nextAppointment: "21/11/24",
      treatment: "Panchakarma Therapy",
      notes: "Patient responds well to Abhyanga massage. Continue with current herbal medications. Recommended dietary changes are being followed.",
      status: "Active",
      avatar: "RK",
      dob: "15/03/1994",
      contact: "+91 9876543210",
      abhaNo: "14-1234-5678-9012"
    },
    {
      id: 2,
      name: "Priya Sharma",
      age: 32,
      gender: "F",
      condition: "Migraine & Stress",
      lastVisit: "12/11/24",
      nextAppointment: "19/11/24",
      treatment: "Shirodhara Therapy",
      notes: "Significant improvement in sleep patterns. Continue meditation practices. Herbal tea blend helping with stress levels.",
      status: "Active",
      avatar: "PS",
      dob: "22/07/1992",
      contact: "+91 9876543211",
      abhaNo: "14-1234-5678-9013"
    },
    {
      id: 3,
      name: "Michael Chen",
      age: 38,
      gender: "M",
      condition: "Digestive Issues",
      lastVisit: "10/11/24",
      nextAppointment: "17/11/24",
      treatment: "Virechana Detox",
      notes: "Patient completing first phase of Panchakarma. Dietary restrictions being followed. Slight improvement in digestion.",
      status: "In Treatment",
      avatar: "MC",
      dob: "05/09/1987",
      contact: "+91 9876543212",
      abhaNo: "14-1234-5678-9014"
    },
    {
      id: 4,
      name: "Sarah Johnson",
      age: 29,
      gender: "F",
      condition: "Anxiety & Insomnia",
      lastVisit: "15/11/24",
      nextAppointment: "22/11/24",
      treatment: "Yoga & Meditation",
      notes: "Regular yoga practice established. Herbal supplements for sleep showing positive results. Stress levels decreasing.",
      status: "Active",
      avatar: "SJ",
      dob: "12/12/1995",
      contact: "+91 9876543213",
      abhaNo: "14-1234-5678-9015"
    },
    {
      id: 5,
      name: "David Wilson",
      age: 52,
      gender: "M",
      condition: "Lower Back Pain",
      lastVisit: "13/11/24",
      nextAppointment: "20/11/24",
      treatment: "Kati Basti",
      notes: "Localized oil treatment showing excellent results. Patient reports 60% pain reduction. Continue current protocol.",
      status: "Active",
      avatar: "DW",
      dob: "08/03/1973",
      contact: "+91 9876543214",
      abhaNo: "14-1234-5678-9016"
    },
    {
      id: 6,
      name: "Lisa Anderson",
      age: 41,
      gender: "F",
      condition: "Skin Disorders",
      lastVisit: "11/11/24",
      nextAppointment: "18/11/24",
      treatment: "Herbal Applications",
      notes: "Skin condition improving with Neem and Turmeric applications. Patient following dietary guidelines strictly.",
      status: "Active",
      avatar: "LA",
      dob: "25/06/1984",
      contact: "+91 9876543215",
      abhaNo: "14-1234-5678-9017"
    },
    {
      id: 7,
      name: "Jennifer Brown",
      age: 35,
      gender: "F",
      condition: "Hormonal Imbalance",
      lastVisit: "09/11/24",
      nextAppointment: "16/11/24",
      treatment: "Ayurvedic Medicines",
      notes: "Ashwagandha and Shatavari showing positive effects. Menstrual cycle regularizing. Continue for 2 more months.",
      status: "Active",
      avatar: "JB",
      dob: "18/04/1990",
      contact: "+91 9876543216",
      abhaNo: "14-1234-5678-9018"
    },
    {
      id: 8,
      name: "Robert Taylor",
      age: 47,
      gender: "M",
      condition: "High Blood Pressure",
      lastVisit: "08/11/24",
      nextAppointment: "15/11/24",
      treatment: "Lifestyle Modification",
      notes: "Blood pressure stabilizing with Arjuna and lifestyle changes. Meditation practice helping with stress management.",
      status: "Monitoring",
      avatar: "RT",
      dob: "30/11/1978",
      contact: "+91 9876543217",
      abhaNo: "14-1234-5678-9019"
    }
];

const Patients = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'details'>('cards');
  const [symptomSearch, setSymptomSearch] = useState("");
  const [unifiedBusy, setUnifiedBusy] = useState(false);
  const [unifiedResults, setUnifiedResults] = useState<unknown>(null);
  const [showAddPatientModal, setShowAddPatientModal] = useState(false);
  const [showEditPatientModal, setShowEditPatientModal] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [newPatient, setNewPatient] = useState({
    name: "",
    dob: "",
    age: "",
    gender: "",
    contact: "",
    abhaNo: "",
    doctorName: "",
    location: "",
    condition: "",
    notes: "",
    consentFlag: false
  });

  useEffect(() => {
    try {
      const storedPatients = localStorage.getItem('patients');
      if (storedPatients) {
        setPatients(JSON.parse(storedPatients));
      } else {
        localStorage.setItem('patients', JSON.stringify(initialPatients));
        setPatients(initialPatients);
      }
    } catch (error) {
      console.error("Failed to parse patients from localStorage", error);
      localStorage.setItem('patients', JSON.stringify(initialPatients));
      setPatients(initialPatients);
    }
  }, []);

  const handleViewDetails = (patient: Patient) => {
    setSelectedPatient(patient);
    setViewMode('details');
  };

  const handleBackToCards = () => {
    setViewMode('cards');
    setSelectedPatient(null);
  };

  const handleAddPatient = () => {
    setShowAddPatientModal(true);
  };

  const handleCloseModal = () => {
    setShowAddPatientModal(false);
    setShowEditPatientModal(false);
    setEditingPatient(null);
    setNewPatient({
      name: "",
      dob: "",
      age: "",
      gender: "",
      contact: "",
      abhaNo: "",
      doctorName: "",
      location: "",
      condition: "",
      notes: "",
      consentFlag: false
    });
  };

  // Stable handlers to prevent focus loss

  const handleEditPatientChange = useCallback((field: string, value: string | number | boolean) => {
    setEditingPatient(prev => prev ? ({
      ...prev,
      [field]: value
    }) : prev);
  }, []);

  // Input handlers live inside AddPatientModalTop; parent keeps only edit modal change handler

  const handleSavePatient = () => {
    const getInitials = (name: string) => {
        const nameParts = name.trim().split(' ');
        if (nameParts.length > 1 && nameParts[0] && nameParts[nameParts.length - 1]) {
            return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
        } else if (nameParts[0] && nameParts[0].length > 1) {
            return nameParts[0].substring(0, 2).toUpperCase();
        }
        return '??';
    };

    const newId = patients.length > 0 ? Math.max(...patients.map(p => p.id)) + 1 : 1;

    const patientToAdd: Patient = {
        ...newPatient,
        id: newId,
        age: parseInt(newPatient.age, 10) || 0,
        avatar: getInitials(newPatient.name),
        lastVisit: new Date().toLocaleDateString('en-GB'),
        nextAppointment: 'N/A',
        treatment: 'Initial Consultation',
        status: 'Active',
    };

    const newPatientsList = [...patients, patientToAdd];
    setPatients(newPatientsList);
    localStorage.setItem('patients', JSON.stringify(newPatientsList));
    handleCloseModal();
  };
  
  const handleEditClick = (patient: Patient) => {
    setEditingPatient(patient);
    setShowEditPatientModal(true);
  };

  const handleUpdatePatient = () => {
    if (!editingPatient) return;

    const getInitials = (name: string) => {
        const nameParts = name.trim().split(' ');
        if (nameParts.length > 1 && nameParts[0] && nameParts[nameParts.length - 1]) {
            return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
        } else if (nameParts[0] && nameParts[0].length > 1) {
            return nameParts[0].substring(0, 2).toUpperCase();
        }
        return '??';
    };
    
    const updatedPatient = {
      ...editingPatient,
      avatar: getInitials(editingPatient.name)
    };

    const updatedPatients = patients.map(p =>
        p.id === updatedPatient.id ? updatedPatient : p
    );

    setPatients(updatedPatients);
    localStorage.setItem('patients', JSON.stringify(updatedPatients));
    handleCloseModal();
  };


  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-green-100 text-green-800 border-green-200";
      case "In Treatment":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "Monitoring":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Legacy inline AddPatientModal removed entirely (replaced by AddPatientModalTop)

  


  // Three-column details view
  if (viewMode === 'details') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-teal-50">
        <div className="flex">
          {/* Sidebar */}
          <div className={`${isSidebarCollapsed ? 'w-20' : 'w-64'} transition-all duration-300 bg-gray-900 text-white min-h-screen fixed left-0 top-0 z-40 flex flex-col`}>
            {/* Header with hamburger menu */}
            <div className={`${isSidebarCollapsed ? 'p-3' : 'p-4'} border-b border-gray-700`}>
              <div className="flex items-center justify-between">
                {!isSidebarCollapsed && (
                  <div className="flex flex-col">
                    <span className="text-lg font-semibold">AYUR-SYNC v1 beta</span>
                    <div className="mt-1">
                      <span className="text-xs text-gray-300 bg-gray-800 px-2 py-1 rounded-full border border-gray-700 opacity-80">AI Powered</span>
                    </div>
                  </div>
                )}
                <button
                  onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                  className={`p-2 rounded-lg hover:bg-gray-800 transition-colors ${isSidebarCollapsed ? 'mx-auto' : 'ml-auto'}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>

            <nav className={`flex-1 ${isSidebarCollapsed ? 'px-2 py-4' : 'p-4'} space-y-1`}>
              {!isSidebarCollapsed && <div className="text-gray-400 text-xs uppercase tracking-wider mb-4">General</div>}
              
              <a href="/dashboard" className={`flex items-center ${isSidebarCollapsed ? 'p-2 justify-center' : 'p-3 space-x-3'} rounded-lg hover:bg-gray-800 transition-colors`}>
                <div className={`${isSidebarCollapsed ? 'w-8 h-8' : 'w-7 h-7'} flex items-center justify-center`}>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
                  </svg>
                </div>
                {!isSidebarCollapsed && <span>Dashboard</span>}
              </a>
              
              <a href="/dashboard/schedule" className={`flex items-center ${isSidebarCollapsed ? 'p-2 justify-center' : 'p-3 space-x-3'} rounded-lg hover:bg-gray-800 transition-colors`}>
                <div className={`${isSidebarCollapsed ? 'w-8 h-8' : 'w-7 h-7'} flex items-center justify-center`}>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/>
                  </svg>
                </div>
                {!isSidebarCollapsed && <span>Schedule</span>}
              </a>
              
              <a href="/dashboard/patients" className={`flex items-center ${isSidebarCollapsed ? 'p-2 justify-center' : 'p-3 space-x-3'} rounded-lg bg-teal-600 text-white`}>
                <div className={`${isSidebarCollapsed ? 'w-8 h-8' : 'w-7 h-7'} flex items-center justify-center`}>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
                  </svg>
                </div>
                {!isSidebarCollapsed && <span>Patients</span>}
              </a>
              
              <a href="/dashboard/india-map" className={`flex items-center ${isSidebarCollapsed ? 'p-2 justify-center' : 'p-3 space-x-3'} rounded-lg hover:bg-gray-800 transition-colors`}>
                <div className={`${isSidebarCollapsed ? 'w-8 h-8' : 'w-7 h-7'} flex items-center justify-center`}>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                  </svg>
                </div>
                {!isSidebarCollapsed && <span>India Map</span>}
              </a>
              
              <a href="/dashboard/chatbot" className={`flex items-center ${isSidebarCollapsed ? 'p-2 justify-center' : 'p-3 space-x-3'} rounded-lg hover:bg-gray-800 transition-colors`}>
                <div className={`${isSidebarCollapsed ? 'w-8 h-8' : 'w-7 h-7'} flex items-center justify-center`}>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd"/>
                  </svg>
                </div>
                {!isSidebarCollapsed && <span>Chatbot</span>}
              </a>
              
              <a href="/dashboard/profile" className={`flex items-center ${isSidebarCollapsed ? 'p-2 justify-center' : 'p-3 space-x-3'} rounded-lg hover:bg-gray-800 transition-colors`}>
                <div className={`${isSidebarCollapsed ? 'w-8 h-8' : 'w-7 h-7'} flex items-center justify-center`}>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
                  </svg>
                </div>
                {!isSidebarCollapsed && <span>My profile</span>}
              </a>

              {!isSidebarCollapsed && <div className="border-t border-gray-700 my-4"></div>}
              {isSidebarCollapsed && <div className="w-full h-px bg-gray-700 my-3"></div>}
              
              <Link href="/" className={`flex items-center ${isSidebarCollapsed ? 'p-2 justify-center' : 'p-3 space-x-3'} rounded-lg hover:bg-gray-800 transition-colors`}>
                <div className={`${isSidebarCollapsed ? 'w-8 h-8' : 'w-7 h-7'} flex items-center justify-center`}>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>
                  </svg>
                </div>
                {!isSidebarCollapsed && <span>Home</span>}
              </Link>

              {!isSidebarCollapsed && <div className="border-t border-gray-700 my-4"></div>}
              {isSidebarCollapsed && <div className="w-full h-px bg-gray-700 my-3"></div>}
              
              <a href="#" className={`flex items-center ${isSidebarCollapsed ? 'p-2 justify-center' : 'p-3 space-x-3'} rounded-lg hover:bg-gray-800 transition-colors`}>
                <div className={`${isSidebarCollapsed ? 'w-8 h-8' : 'w-7 h-7'} flex items-center justify-center`}>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/>
                  </svg>
                </div>
                {!isSidebarCollapsed && <span>Settings</span>}
              </a>

              {!isSidebarCollapsed && <div className="border-t border-gray-700 my-4"></div>}
              {isSidebarCollapsed && <div className="w-full h-px bg-gray-700 my-3"></div>}
              
              <a href="#" className={`flex items-center ${isSidebarCollapsed ? 'p-2 justify-center' : 'p-3 space-x-3'} rounded-lg hover:bg-gray-800 transition-colors text-red-400`}>
                <div className={`${isSidebarCollapsed ? 'w-8 h-8' : 'w-7 h-7'} flex items-center justify-center`}>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd"/>
                  </svg>
                </div>
                {!isSidebarCollapsed && <span>Log out</span>}
              </a>
            </nav>
          </div>

          {/* Main Content - Three Column Layout */}
          <div className={`${isSidebarCollapsed ? 'ml-20' : 'ml-64'} transition-all duration-300 flex-1 p-6`}>
            {/* Back Button */}
            <div className="mb-6">
              <button
                onClick={handleBackToCards}
                className="flex items-center space-x-2 text-teal-600 hover:text-teal-800 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Back to Patients</span>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-6 h-[calc(100vh-120px)]">
              
              {/* Section 1: Patients List */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Patients</h2>
                
                {/* Patient List */}
                <div className="space-y-3">
                  {patients.map((patient) => (
                    <div
                      key={patient.id}
                      onClick={() => setSelectedPatient(patient)}
                      className={`p-4 rounded-lg cursor-pointer transition-all border ${
                        selectedPatient?.id === patient.id 
                          ? 'bg-teal-50 border-teal-200' 
                          : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-gray-800">{patient.name}</h3>
                          <p className="text-sm text-gray-500">{patient.age} {patient.gender}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(patient.status)}`}>
                          {patient.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 2: Patient Details */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-800">Patient details</h2>
                  <div className="w-12 h-12 bg-teal-600 rounded-full flex items-center justify-center text-white font-bold">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>

                {selectedPatient ? (
                  <div className="space-y-6">
                    {/* Name Field */}
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-2">Name</label>
                      <input
                        type="text"
                        value={selectedPatient.name}
                        readOnly
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-800"
                      />
                    </div>

                    {/* DOB Field */}
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-2">DOB</label>
                      <input
                        type="text"
                        value={selectedPatient.dob}
                        readOnly
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-800"
                      />
                    </div>

                    {/* Age Field */}
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-2">Age</label>
                      <input
                        type="text"
                        value={`${selectedPatient.age} years`}
                        readOnly
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-800"
                      />
                    </div>

                    {/* Contact Info Field */}
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-2">Contact Info</label>
                      <input
                        type="text"
                        value={selectedPatient.contact}
                        readOnly
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-800"
                      />
                    </div>

                    {/* ABHA No Field */}
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-2">ABHA No</label>
                      <input
                        type="text"
                        value={selectedPatient.abhaNo}
                        readOnly
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-800"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <p className="text-gray-500">Select a patient to view details</p>
                  </div>
                )}
              </div>

              {/* Section 3: Find ICD Code */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-800">Find ICD Code</h2>
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>

                {/* Unified Search: ICD code/name or TM code/name */}
                <div className="relative mb-6">
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Enter ICD code/name or NAMASTE code/name"
                    value={symptomSearch}
                    onChange={(e) => setSymptomSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-gray-50"
                  />
                  <button
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-teal-600 text-white text-sm px-3 py-1.5 rounded"
                    onClick={async ()=>{
                      if (!symptomSearch || symptomSearch.trim().length < 2) return;
                      try {
                        setUnifiedBusy(true);
                        const data = await publicLookup(symptomSearch.trim());
                        setUnifiedResults(data);
                      } catch (e: unknown) {
                        const msg = e instanceof Error ? e.message : String(e);
                        setUnifiedResults({ error: msg });
                      } finally {
                        setUnifiedBusy(false);
                      }
                    }}
                  >{unifiedBusy ? 'Searching…' : 'Search'}</button>
                </div>

                {/* Results Area */}
                <div className="py-4">
                  {unifiedResults ? (
                    <>
                      <h4 className="font-medium text-gray-800 mb-2">Unified Lookup Results</h4>
                      <pre className="text-xs bg-gray-50 border rounded p-2 max-h-60 overflow-auto">{JSON.stringify(unifiedResults, null, 2)}</pre>
                    </>
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <p className="text-gray-500 text-sm">Search for ICD or NAMASTE terms/codes</p>
                      <p className="text-gray-400 text-xs mt-1">The unified Lookup handles names or codes across systems</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Add/Edit Patient Modals */}
        <AddPatientModalTop
          open={showAddPatientModal}
          newPatient={newPatient}
          setNewPatient={setNewPatient}
          onSave={handleSavePatient}
          onClose={handleCloseModal}
        />
        <EditPatientModalTop
          open={showEditPatientModal}
          patient={editingPatient}
          onChange={handleEditPatientChange}
          onSave={handleUpdatePatient}
          onClose={handleCloseModal}
        />
      </div>
    );
  }

  // Default cards view
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-teal-50">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-gray-900 text-white min-h-screen p-4 fixed left-0 top-0">
          <div className="mb-8">
            <div className="flex items-center space-x-3 mb-6">
              <div className="flex flex-col">
                <span className="text-lg font-semibold">AYUR-SYNC v1 beta</span>
                <div className="mt-1">
                  <span className="text-xs text-gray-300 bg-gray-800 px-2 py-1 rounded-full border border-gray-700">AI Powered</span>
                </div>
              </div>
            </div>
          </div>

          <nav className="space-y-2">
            <div className="text-gray-400 text-xs uppercase tracking-wider mb-4">General</div>
            
            <a href="/dashboard" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
              <div className="w-7 h-7 flex items-center justify-center">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
                </svg>
              </div>
              <span>Dashboard</span>
            </a>
            
            <a href="/dashboard/schedule" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
              <div className="w-7 h-7 flex items-center justify-center">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/>
                </svg>
              </div>
              <span>Schedule</span>
            </a>
            
            <a href="/dashboard/patients" className="flex items-center space-x-3 p-3 rounded-lg bg-teal-600 text-white">
              <div className="w-7 h-7 flex items-center justify-center">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
                </svg>
              </div>
              <span>Patients</span>
            </a>
            
            <a href="/dashboard/india-map" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
              <div className="w-7 h-7 flex items-center justify-center">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                </svg>
              </div>
              <span>India Map</span>
            </a>
            
            <a href="/dashboard/chatbot" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
              <div className="w-7 h-7 flex items-center justify-center">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd"/>
                </svg>
              </div>
              <span>Chatbot</span>
            </a>
            
            <a href="/dashboard/profile" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
              <div className="w-7 h-7 flex items-center justify-center">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
                </svg>
              </div>
              <span>My profile</span>
            </a>

            <div className="border-t border-gray-700 my-4"></div>
            
            <Link href="/" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
              <div className="w-7 h-7 bg-gray-600 rounded flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>
                </svg>
              </div>
              <span>Home</span>
            </Link>

            <div className="border-t border-gray-700 my-4"></div>
            
            <a href="#" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
              <div className="w-7 h-7 flex items-center justify-center">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/>
                </svg>
              </div>
              <span>Settings</span>
            </a>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 ml-64 p-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-800 mb-2">Patient Records</h1>
                <p className="text-gray-600">Manage and view all patient information</p>
              </div>
              <div className="flex space-x-4">
                <button className="bg-white border border-amber-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-amber-50 transition-colors">
                  Export
                </button>
                <button 
                  onClick={handleAddPatient}
                  className="bg-gradient-to-r from-teal-600 to-teal-700 text-white px-6 py-2 rounded-lg hover:from-teal-700 hover:to-teal-800 transition-all shadow-lg"
                >
                  Add New Patient
                </button>
              </div>
            </div>

            {/* Search and Filter Bar */}
            <div className="flex space-x-4 mb-6">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search patients..."
                  className="w-full px-4 py-3 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              <select className="px-4 py-3 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white">
                <option>All Status</option>
                <option>Active</option>
                <option>In Treatment</option>
                <option>Monitoring</option>
              </select>
              <select className="px-4 py-3 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white">
                <option>All Conditions</option>
                <option>Arthritis</option>
                <option>Migraine</option>
                <option>Digestive Issues</option>
                <option>Anxiety</option>
              </select>
            </div>
          </div>

          {/* Patient Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
            {patients.map((patient) => (
              <div
                key={patient.id}
                className="bg-white rounded-2xl shadow-lg border border-amber-200 p-6 hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                {/* Patient Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full flex items-center justify-center text-white font-bold shadow-md">
                      {patient.avatar}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800 text-lg">{patient.name}</h3>
                      <p className="text-sm text-gray-500">Age: {patient.age}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(patient.status)}`}>
                    {patient.status}
                  </span>
                </div>

                {/* Condition */}
                <div className="mb-4">
                  <h4 className="font-semibold text-gray-700 mb-1">Primary Condition</h4>
                  <p className="text-gray-600 text-sm">{patient.condition}</p>
                </div>

                {/* Treatment */}
                <div className="mb-4">
                  <h4 className="font-semibold text-gray-700 mb-1">Current Treatment</h4>
                  <p className="text-teal-600 text-sm font-medium">{patient.treatment}</p>
                </div>

                {/* Dates */}
                <div className="border-t border-gray-100 pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Last Visit:</span>
                    <span className="text-gray-700 font-medium">{patient.lastVisit}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Next Appointment:</span>
                    <span className="text-teal-600 font-medium">{patient.nextAppointment}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-4 flex space-x-2">
                  <button 
                    onClick={() => handleViewDetails(patient)}
                    className="flex-1 bg-gradient-to-r from-teal-50 to-teal-100 text-teal-700 py-2 px-3 rounded-lg hover:from-teal-100 hover:to-teal-200 transition-all text-sm font-medium"
                  >
                    View Details
                  </button>
                  <button onClick={() => handleEditClick(patient)} className="flex-1 bg-gradient-to-r from-amber-50 to-amber-100 text-amber-700 py-2 px-3 rounded-lg hover:from-amber-100 hover:to-amber-200 transition-all text-sm font-medium">
                    Edit Record
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Load More Button */}
          <div className="mt-8 text-center">
            <button className="bg-white border-2 border-teal-200 text-teal-600 px-8 py-3 rounded-lg hover:bg-teal-50 transition-colors font-medium">
              Load More Patients
            </button>
          </div>
        </div>
      </div>
      
      {/* Add/Edit Patient Modals */}
      <AddPatientModalTop
        open={showAddPatientModal}
        newPatient={newPatient}
        setNewPatient={setNewPatient}
        onSave={handleSavePatient}
        onClose={handleCloseModal}
      />
      <EditPatientModalTop
        open={showEditPatientModal}
        patient={editingPatient}
        onChange={handleEditPatientChange}
        onSave={handleUpdatePatient}
        onClose={handleCloseModal}
      />
    </div>
  );
};

export default Patients;


