"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCoachingPerformance, getCoachingComparison } from "@/lib/api";

const DRIVERS = [
  { id: 44, name: "Driver 44", team: "SilverArrow", color: "#00D2BE" },
  { id: 1,  name: "Driver 01", team: "RedStar",     color: "#E8002D" },
  { id: 11, name: "Driver 11", team: "RedStar",     color: "#E8002D" },
  { id: 16, name: "Driver 16", team: "PrancingHorse",color:"#DC0000" },
  { id: 63, name: "Driver 63", team: "SilverArrow", color: "#00D2BE" },
  { id: 55, name: "Driver 55", team: "Bull",        color: "#3671C6" },
];

const SC = (s: number) => s >= 85 ? "#00FF88" : s >= 70 ? "#FFB800" : "#FF2442";

export default function CoachingPage() {
  const [selectedId, setSelectedId] = useState(44);
  const [data, setData] = useState<any>(null);
  const [comparison, setComparison] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getCoachingPerformance(selectedId),
      getCoachingComparison(),
    ]).then(([perf, comp]: any[]) => {
      setData(perf);
      setComparison(comp.comparison ?? []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [selectedId]);

  const driver = DRIVERS.find(d => d.id === selectedId)!;
  const lapTimes: {lap:number;time_ms:number}[] = data?.lap_times ?? [];
  const sectorScores: {sector:string;score:number;delta:number}[] = data?.sector_scores ?? [];
  const bestLap = lapTimes.length ? Math.min(...lapTimes.map(l => l.time_ms)) : 87341;
  const avgLap  = lapTimes.length ? lapTimes.reduce((a,b) => a+b.time_ms,0)/lapTimes.length : 88100;
  const fmtLap  = (ms: number) => { const m = Math.floor(ms/60000); const s = ((ms%60000)/1000).toFixed(3); return `${m}:${parseFloat(s)<10?"0":""}${s}`; };

  return (
    <div className="min-h-screen bg-apex-black text-white">
      <div className="border-b border-apex-border/60 px-6 py-3 flex items-center gap-4 bg-apex-void/80 sticky top-0 z-50">
        <Link href="/dashboard" className="font-mono text-xs text-white/40 hover:text-apex-accent transition-colors tracking-widest">DASHBOARD</Link>
        <span className="text-white/20">/</span>
        <span className="font-mono text-xs text-apex-green tracking-widest">APEXCOACH AI</span>
        <div className="ml-auto flex items-center gap-2">
          <span className="status-dot status-active" />
          <span className="font-mono text-xs text-apex-green">IBM GRANITE COACHING</span>
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-5">
          <div className="font-mono text-xs text-apex-green tracking-widest mb-1">MODULE 03</div>
          <h1 className="font-display font-black text-4xl tracking-tight">APEXCOACH AI</h1>
          <p className="text-white/40 text-sm mt-1 font-body">Driver performance analysis powered by IBM Granite via Watsonx.ai</p>
        </div>

        {/* Driver selector */}
        <div className="flex gap-2 flex-wrap mb-5">
          {DRIVERS.map(d => (
            <button key={d.id} onClick={() => setSelectedId(d.id)}
              className={`flex items-center gap-2 px-4 py-2 corner-cut font-mono text-xs transition-all border ${selectedId===d.id?"bg-apex-accent/10 border-apex-accent/40 text-apex-accent":"border-apex-border/40 text-white/50 hover:text-white hover:border-apex-border"}`}>
              <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
              {d.name}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="font-mono text-xs text-apex-green/60 animate-pulse tracking-widest">IBM GRANITE ANALYZING...</div>
          </div>
        ) : data && (
          <div className="grid grid-cols-12 gap-4">
            {/* Score card */}
            <div className="col-span-12 md:col-span-3 apex-panel p-5 corner-cut">
              <div className="font-mono text-xs text-white/40 tracking-widest mb-4">PERFORMANCE INDEX</div>
              <div className="text-center mb-5">
                <div className="font-display font-black text-7xl data-value" style={{ color: SC(data.overall_score??74), textShadow:`0 0 20px ${SC(data.overall_score??74)}60` }}>
                  {data.overall_score??74}
                </div>
                <div className="font-mono text-xs text-white/30 mt-1">OVERALL</div>
              </div>
              <div className="space-y-3">
                {[
                  { l:"CONSISTENCY", v:data.consistency_score??80 },
                  { l:"AGGRESSION",  v:Math.round((data.aggression_index??0.6)*100) },
                ].map(m => (
                  <div key={m.l}>
                    <div className="flex justify-between mb-1">
                      <span className="font-mono text-xs text-white/40">{m.l}</span>
                      <span className="font-mono text-xs data-value" style={{ color: SC(m.v) }}>{m.v}</span>
                    </div>
                    <div className="h-1 bg-apex-panel rounded overflow-hidden">
                      <div className="h-full rounded" style={{ width:`${m.v}%`, background: SC(m.v) }} />
                    </div>
                  </div>
                ))}
                <div className="pt-2 border-t border-apex-border/40">
                  <div className="flex justify-between">
                    <span className="font-mono text-xs text-white/40">LAP DELTA</span>
                    <span className="font-mono text-xs text-apex-amber data-value">{data.lap_delta_potential??"-0.4"}s</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sector scores */}
            <div className="col-span-12 md:col-span-5 apex-panel p-5 corner-cut">
              <div className="font-mono text-xs text-white/40 tracking-widest mb-4">SECTOR ANALYSIS</div>
              <div className="space-y-1.5">
                {sectorScores.map((s) => (
                  <div key={s.sector} className="flex items-center gap-3">
                    <span className="font-mono text-xs text-white/30 w-6">{s.sector}</span>
                    <div className="flex-1 h-3 bg-apex-panel rounded overflow-hidden">
                      <div className="h-full rounded" style={{ width:`${s.score}%`, background: SC(s.score) }} />
                    </div>
                    <span className="font-mono text-xs data-value w-6 text-right" style={{ color: SC(s.score) }}>{Math.round(s.score)}</span>
                    <span className={`font-mono text-xs data-value w-14 text-right ${s.delta < 0 ? "text-apex-green" : "text-apex-red"}`}>
                      {s.delta >= 0 ? "+" : ""}{s.delta.toFixed(3)}s
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Lap consistency */}
            <div className="col-span-12 md:col-span-4 apex-panel p-5 corner-cut flex flex-col">
              <div className="font-mono text-xs text-white/40 tracking-widest mb-3">LAP CONSISTENCY</div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-apex-panel/60 p-3 rounded">
                  <div className="font-mono text-xs text-white/30 mb-1">BEST LAP</div>
                  <div className="font-display font-bold text-apex-green text-lg data-value">{fmtLap(bestLap)}</div>
                </div>
                <div className="bg-apex-panel/60 p-3 rounded">
                  <div className="font-mono text-xs text-white/30 mb-1">AVERAGE</div>
                  <div className="font-display font-bold text-white text-lg data-value">{fmtLap(avgLap)}</div>
                </div>
              </div>
              <div className="flex-1 flex items-end gap-0.5 min-h-16">
                {lapTimes.map((lt, i) => {
                  const mn = Math.min(...lapTimes.map(l=>l.time_ms));
                  const mx = Math.max(...lapTimes.map(l=>l.time_ms));
                  const n = mx===mn ? 0.5 : (lt.time_ms-mn)/(mx-mn);
                  const h = 20 + (1-n)*80;
                  const c = lt.time_ms===mn ? "#00FF88" : n < .3 ? "#00E5FF" : n > .7 ? "#FF2442" : "#FFB800";
                  return <div key={i} className="flex-1 rounded-t" style={{ height:`${h}%`, background:c, opacity:.7+(.3*(1-n)) }} title={`L${i+1}: ${fmtLap(lt.time_ms)}`} />;
                })}
              </div>
              <div className="mt-1 flex justify-between font-mono text-xs text-white/25"><span>LAP 1</span><span>LAP 20</span></div>
            </div>

            {/* IBM Granite coaching */}
            <div className="col-span-12 apex-panel p-5 corner-cut">
              <div className="font-mono text-xs text-apex-green tracking-widest mb-4">IBM GRANITE COACHING RECOMMENDATIONS</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(data.key_improvements ?? []).concat(data.strengths ? [`Strength: ${data.strengths[0]}`] : []).map((rec: string, i: number) => (
                  <div key={i} className="flex gap-3 bg-apex-panel/50 p-4 rounded">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center font-display font-black text-xs flex-shrink-0 mt-0.5"
                      style={{ background:"#00FF8820", color:"#00FF88", border:"1px solid #00FF8840" }}>
                      {i+1}
                    </div>
                    <p className="text-white/75 text-sm font-body leading-relaxed">{rec}</p>
                  </div>
                ))}
              </div>
              {(data.braking_analysis || data.throttle_analysis) && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {data.braking_analysis && (
                    <div className="bg-apex-panel/40 p-3 rounded">
                      <div className="font-mono text-xs text-apex-red/80 mb-1">BRAKING ANALYSIS</div>
                      <p className="text-white/65 text-xs font-body leading-relaxed">{data.braking_analysis}</p>
                    </div>
                  )}
                  {data.throttle_analysis && (
                    <div className="bg-apex-panel/40 p-3 rounded">
                      <div className="font-mono text-xs text-apex-green/80 mb-1">THROTTLE ANALYSIS</div>
                      <p className="text-white/65 text-xs font-body leading-relaxed">{data.throttle_analysis}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Driver comparison */}
            {comparison.length > 0 && (
              <div className="col-span-12 apex-panel p-5 corner-cut">
                <div className="font-mono text-xs text-white/40 tracking-widest mb-3">DRIVER COMPARISON</div>
                <div className="space-y-2">
                  {comparison.map((c: any, rank: number) => (
                    <div key={c.car_id} className={`flex items-center gap-4 p-2 rounded ${c.car_id === selectedId ? "bg-apex-accent/10 border border-apex-accent/20" : "bg-apex-panel/40"}`}>
                      <span className="font-mono text-xs text-white/30 w-4">#{rank+1}</span>
                      <span className="font-display font-bold text-xs w-20">{c.driver}</span>
                      <div className="flex-1 h-2 bg-apex-panel rounded overflow-hidden">
                        <div className="h-full rounded" style={{ width:`${c.overall_score}%`, background: SC(c.overall_score) }} />
                      </div>
                      <span className="font-mono text-xs data-value w-8 text-right" style={{ color: SC(c.overall_score) }}>{c.overall_score}</span>
                      <span className="font-mono text-xs text-apex-amber data-value w-14 text-right">{c.lap_delta_potential?.toFixed(2) ?? "0.00"}s</span>
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
