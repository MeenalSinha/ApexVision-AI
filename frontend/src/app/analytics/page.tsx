"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getRaceSummary, getPositionHistory, getSpeedTrace, getHeatmap } from "@/lib/api";

const SESSION = "demo_analytics";
const CAR_IDS = [44, 1, 11, 16, 63, 55];
const TEAM_COLORS: Record<number, string> = { 44: "#00D2BE", 1: "#E8002D", 11: "#E8002D", 16: "#DC0000", 63: "#00D2BE", 55: "#3671C6" };

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<any>(null);
  const [positions, setPositions] = useState<any>(null);
  const [speedTrace, setSpeedTrace] = useState<any>(null);
  const [selectedCar, setSelectedCar] = useState(44);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getRaceSummary(SESSION),
      getPositionHistory(SESSION),
      getSpeedTrace(SESSION, selectedCar),
    ]).then(([s, p, st]) => {
      setSummary(s);
      setPositions(p);
      setSpeedTrace(st);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    getSpeedTrace(SESSION, selectedCar).then(setSpeedTrace).catch(() => {});
  }, [selectedCar]);

  const posHistory = positions?.position_history ?? {};
  const chartW = 600, chartH = 120;
  const maxLap = 78;

  return (
    <div className="min-h-screen bg-apex-black text-white">
      <div className="border-b border-apex-border/60 px-6 py-3 flex items-center gap-4 bg-apex-void/80 sticky top-0 z-50">
        <Link href="/dashboard" className="font-mono text-xs text-white/40 hover:text-apex-accent transition-colors tracking-widest">DASHBOARD</Link>
        <span className="text-white/20">/</span>
        <span className="font-mono text-xs text-apex-accent tracking-widest">RACE ANALYTICS</span>
      </div>

      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="font-mono text-xs text-apex-accent tracking-widest mb-1">ANALYTICS</div>
          <h1 className="font-display font-black text-4xl tracking-tight">RACE ANALYTICS</h1>
          <p className="text-white/40 text-sm mt-1 font-body">Comprehensive race statistics, position history, and speed analysis</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="font-mono text-xs text-apex-accent/60 tracking-widest animate-pulse">LOADING RACE DATA...</div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary Cards */}
            {summary && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "OVERTAKES", value: summary.total_overtakes, color: "text-apex-accent" },
                  { label: "AVG SPEED", value: `${summary.avg_speed_kmh} km/h`, color: "text-apex-green" },
                  { label: "PIT STOPS", value: summary.pit_stops, color: "text-apex-amber" },
                  { label: "INCIDENTS", value: summary.incidents_detected, color: "text-apex-red" },
                ].map((m) => (
                  <div key={m.label} className="apex-panel p-4 corner-cut">
                    <div className="font-mono text-xs text-white/30 mb-1">{m.label}</div>
                    <div className={`font-display font-black text-3xl data-value ${m.color}`}>{m.value}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Position History Chart */}
            {Object.keys(posHistory).length > 0 && (
              <div className="apex-panel p-5 corner-cut">
                <div className="font-mono text-xs text-white/40 tracking-widest mb-4">POSITION HISTORY — ALL CARS</div>
                <svg width="100%" viewBox={`0 0 ${chartW} ${chartH + 30}`} className="overflow-visible">
                  {[1,2,3,4,5,6].map(pos => (
                    <line key={pos} x1="0" y1={(pos - 0.5) * (chartH / 6)} x2={chartW} y2={(pos - 0.5) * (chartH / 6)}
                      stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                  ))}
                  {CAR_IDS.map((carId) => {
                    const hist: {lap: number; position: number}[] = posHistory[String(carId)] ?? [];
                    if (!hist.length) return null;
                    const pts = hist.map(p =>
                      `${(p.lap / maxLap) * chartW},${((p.position - 0.5) / 6) * chartH}`
                    ).join(" ");
                    return (
                      <polyline key={carId} points={pts} fill="none"
                        stroke={TEAM_COLORS[carId] ?? "#fff"} strokeWidth="1.5" opacity="0.85" />
                    );
                  })}
                  {CAR_IDS.map((carId) => {
                    const hist: {lap: number; position: number}[] = posHistory[String(carId)] ?? [];
                    if (!hist.length) return null;
                    const last = hist[hist.length - 1];
                    const y = ((last.position - 0.5) / 6) * chartH;
                    return (
                      <g key={`label_${carId}`}>
                        <circle cx={chartW + 4} cy={y} r="3" fill={TEAM_COLORS[carId] ?? "#fff"} />
                        <text x={chartW + 10} y={y + 4} fill={TEAM_COLORS[carId] ?? "#fff"} fontSize="8" fontFamily="JetBrains Mono">{carId}</text>
                      </g>
                    );
                  })}
                  {["P1","P2","P3","P4","P5","P6"].map((label, i) => (
                    <text key={label} x="-4" y={(i + 0.5) * (chartH / 6) + 3} fill="rgba(255,255,255,0.25)"
                      fontSize="7" textAnchor="end" fontFamily="JetBrains Mono">{label}</text>
                  ))}
                </svg>
              </div>
            )}

            {/* Speed Trace */}
            <div className="apex-panel p-5 corner-cut">
              <div className="flex items-center justify-between mb-4">
                <div className="font-mono text-xs text-white/40 tracking-widest">SPEED TRACE — ONE LAP</div>
                <div className="flex gap-2">
                  {CAR_IDS.map(id => (
                    <button key={id} onClick={() => setSelectedCar(id)}
                      className={`font-mono text-xs px-2 py-1 rounded transition-colors ${selectedCar === id ? "text-apex-black" : "text-white/40 hover:text-white"}`}
                      style={selectedCar === id ? { background: TEAM_COLORS[id] } : {}}>
                      {id}
                    </button>
                  ))}
                </div>
              </div>
              {speedTrace && (
                <svg width="100%" viewBox="0 0 600 80" className="overflow-visible">
                  {[100, 200, 300].map(v => (
                    <line key={v} x1="0" y1={80 - (v / 340) * 80} x2="600" y2={80 - (v / 340) * 80}
                      stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                  ))}
                  <polyline
                    points={(speedTrace.trace ?? []).map((p: any, i: number) =>
                      `${(i / speedTrace.trace.length) * 600},${80 - (p.speed_kmh / 340) * 80}`
                    ).join(" ")}
                    fill="none" stroke={TEAM_COLORS[selectedCar] ?? "#00E5FF"} strokeWidth="1.5"
                  />
                  <polyline
                    points={(speedTrace.trace ?? []).map((p: any, i: number) =>
                      `${(i / speedTrace.trace.length) * 600},${80 - p.throttle * 80}`
                    ).join(" ")}
                    fill="none" stroke="#00FF8850" strokeWidth="1"
                  />
                  <polyline
                    points={(speedTrace.trace ?? []).map((p: any, i: number) =>
                      `${(i / speedTrace.trace.length) * 600},${80 - p.brake * 80}`
                    ).join(" ")}
                    fill="none" stroke="#FF244250" strokeWidth="1"
                  />
                </svg>
              )}
              <div className="flex gap-4 mt-2 font-mono text-xs text-white/30">
                <span style={{color: TEAM_COLORS[selectedCar]}}>SPEED</span>
                <span className="text-apex-green/60">THROTTLE</span>
                <span className="text-apex-red/60">BRAKE</span>
              </div>
            </div>

            {/* Tyre Strategy Summary */}
            {summary?.tyre_strategy && (
              <div className="apex-panel p-5 corner-cut">
                <div className="font-mono text-xs text-white/40 tracking-widest mb-3">TYRE STRATEGY BREAKDOWN</div>
                <div className="flex gap-6">
                  {Object.entries(summary.tyre_strategy).map(([strategy, count]) => (
                    <div key={strategy} className="text-center">
                      <div className="font-display font-black text-3xl text-apex-amber data-value">{count as number}</div>
                      <div className="font-mono text-xs text-white/40 mt-1">{strategy.replace("_", " ").toUpperCase()}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
