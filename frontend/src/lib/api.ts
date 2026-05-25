/**
 * ApexVision AI — Typed API client
 * All frontend→backend communication goes through these functions.
 */

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

// ── Commentary ───────────────────────────────────────────────
export interface CommentaryResult {
  commentary: string;
  event_type: string;
  excitement_level: number;
  tts_ready: string;
  tactical_insight: string | null;
  _watsonx_error?: string;
}

export async function generateCommentary(raceState: object): Promise<CommentaryResult> {
  return apiFetch("/api/commentary/generate", {
    method: "POST",
    body: JSON.stringify({ session_id: "live", ...raceState }),
  });
}

export async function getDemoCommentary(): Promise<{ commentary_lines: CommentaryResult[] }> {
  return apiFetch("/api/commentary/demo/stream", { method: "POST" });
}

// ── Strategy ─────────────────────────────────────────────────
export interface StrategyResult {
  action: string;
  confidence: number;
  primary_recommendation: string;
  tyre_recommendation: string;
  undercut_available: boolean;
  risk_level: string;
  reasoning: string;
  tyre_degradation_pct?: number;
  car_id?: number;
}

export async function getDemoStrategy(): Promise<{ cars: StrategyResult[] }> {
  return apiFetch("/api/strategy/demo/all-cars");
}

export async function getTyreDegradation() {
  return apiFetch("/api/strategy/tyres/degradation");
}

// ── Coaching ─────────────────────────────────────────────────
export async function getCoachingPerformance(carId: number) {
  return apiFetch(`/api/coaching/demo/performance/${carId}`);
}

export async function getCoachingComparison() {
  return apiFetch("/api/coaching/demo/comparison");
}

// ── Incidents ────────────────────────────────────────────────
export async function getLiveIncidents() {
  return apiFetch("/api/incidents/demo/live");
}

// ── Regulation ───────────────────────────────────────────────
export interface RegulationResult {
  answer: string;
  confidence: number;
  regulatory_article: string;
  source: string;
  penalty_risk: string;
  compliance_status: string;
  precedents: string[];
  _watsonx_error?: string;
}

export async function queryRegulation(question: string): Promise<RegulationResult> {
  return apiFetch("/api/regulation/query", {
    method: "POST",
    body: JSON.stringify({ question }),
  });
}

export async function getRegulationDocs() {
  return apiFetch("/api/regulation/documents");
}

// ── Analytics ────────────────────────────────────────────────
export async function getRaceSummary(sessionId: string) {
  return apiFetch(`/api/analytics/race-summary/${sessionId}`);
}

export async function getPositionHistory(sessionId: string) {
  return apiFetch(`/api/analytics/positions/${sessionId}`);
}

export async function getSpeedTrace(sessionId: string, carId: number) {
  return apiFetch(`/api/analytics/speed-trace/${sessionId}/${carId}`);
}

export async function getHeatmap(sessionId: string, carId: number) {
  return apiFetch(`/api/analytics/heatmap/${sessionId}/${carId}`);
}

// ── Demo ─────────────────────────────────────────────────────
export async function getDemoFullState() {
  return apiFetch("/api/demo/full-state");
}

// ── Health ───────────────────────────────────────────────────
export async function getHealth() {
  return apiFetch("/api/health");
}
