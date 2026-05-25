"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getDemoStrategy, getTyreDegradation } from "@/lib/api";

const TEAM_COLORS: Record<number, string> = { 44:"#00D2BE", 1:"#E8002D", 11:"#E8002D", 16:"#DC0000", 63:"#00D2BE", 55:"#3671C6" };
const TYRE_COLORS: Record<string, string> = { Soft:"#FF2442", Medium:"#FFB800", Hard:"#FFFFFF", Inter:"#39B54A", Wet:"#0066FF" };
const ACTION_COLOR: Record<string, string> = { PIT_NOW:"#FF2442", PIT_UNDERCUT:"#FFB800", PIT_OVERCUT:"#FFB800", PIT_SAFETY_CAR:"#FFB800", STAY_OUT:"#00FF88" };

export default function StrategyPage() {
  const [cars, setCars] = useState<any[]>([]);
  const [degCurves, setDegCurves] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [safetyCar, setSafetyCar] = useState(false);
  const [lap, setLap] = useState(42);

  useEffect(() => {
    Promise.all([getDemoStrategy(), getTyreDegradation()]).then(([strat, deg]: any[]) => {
      setCars(strat.cars ?? []);
      setDegCurves(deg.degradation_curves ?? null);
      setLoading(false);
    }).catch(() => setLoading(false));

    const interval = setInterval(() => setLap(l => Math.min(78, l + 0.05)), 1000);
    return () => clearInterval(interval);
  }, []);

  const chartW = 480, chartH = 110;

  return (
    <div className="min-h-screen bg-apex-black text-white">
      <div className="border-b border-apex-border/60 px-6 py-3 flex items-center gap-4 bg-apex-void/80 sticky top-0 z-50">
        <Link href="/dashboard" className="font-mono text-xs text-white/40 hover:text-apex-accent transition-colors tracking-widest">DASHBOARD</Link>
        <span className="text-white/20">/</span>
        <span className="font-mono text-xs text-apex-amber tracking-widest">RACEMIND AI</span>
        <div className="ml-auto flex items-center gap-4">
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-white/40">LAP</span>
            <span className="text-apex-accent font-bold data-value">{Math.floor(lap)}/78</span>
          </div>
          <button onClick={() => setSafetyCar(v => !v)}
            className={`font-mono text-xs px-3 py-1 border transition-colors ${safetyCar?"border-apex-amber/40 text-apex-amber bg-apex-amber/10 animate-pulse":"border-apex-border text-white/40"}`}>
            SC: {safetyCar ? "ACTIVE" : "OFF"}
          </button>
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-5">
          <div className="font-mono text-xs text-apex-amber tracking-widest mb-1">MODULE 05</div>
          <h1 className="font-display font-black text-4xl tracking-tight">RACEMIND AI</h1>
          <p className="text-white/40 text-sm mt-1 font-body">Race strategy intelligence powered by IBM Granite via Watsonx.ai</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="font-mono text-xs text-apex-amber/60 animate-pulse tracking-widest">IBM GRANITE ANALYZING STRATEGY...</div>
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-4">
            {/* Strategy cards */}
            <div className="col-span-12 lg:col-span-8 space-y-3">
              {cars.map(car => {
                const action = safetyCar ? "PIT_SAFETY_CAR" : car.action;
                const deg = car.tyre_degradation_pct ?? 50;
                const ac = ACTION_COLOR[action] ?? "#00FF88";
                return (
                  <div key={car.car_id} className="apex-panel p-4 corner-cut border border-apex-border/30 hover:border-apex-border/60 transition-colors">
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="flex items-center gap-2 w-28">
                        <span className="font-mono text-xs text-white/30">P{car.position}</span>
                        <div className="w-2 h-2 rounded-full" style={{ background: TEAM_COLORS[car.car_id]||"#fff" }} />
                        <span className="font-display font-bold text-sm">{`CAR ${car.car_id}`}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ background: TYRE_COLORS[car.tyre_compound]||"#fff" }} />
                        <span className="font-mono text-xs">{car.tyre_compound}</span>
                        <span className="font-mono text-xs text-white/40">{car.tyre_age}L</span>
                      </div>
                      <div className="flex-1 min-w-32">
                        <div className="flex justify-between mb-1">
                          <span className="font-mono text-xs text-white/30">DEGRADATION</span>
                          <span className="font-mono text-xs data-value" style={{ color: deg>70?"#FF2442":deg>50?"#FFB800":"#00FF88" }}>{deg}%</span>
                        </div>
                        <div className="h-1.5 bg-apex-panel rounded overflow-hidden">
                          <div className="h-full rounded" style={{ width:`${deg}%`, background: deg>70?"#FF2442":deg>50?"#FFB800":"#00FF88" }} />
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs text-white/30">CONF:</span>
                        <span className="font-mono text-xs data-value text-white">{Math.round((car.confidence??0.8)*100)}%</span>
                      </div>
                      <div className="font-mono text-xs font-bold px-3 py-1.5 rounded tracking-widest"
                        style={{ color:ac, background:ac+"20", border:`1px solid ${ac}40` }}>
                        {action.replace(/_/g," ")}
                      </div>
                    </div>
                    {car.reasoning && (
                      <p className="mt-2 text-xs text-white/50 font-body">{car.reasoning}</p>
                    )}
                    {safetyCar && (
                      <p className="mt-1 text-xs text-apex-amber font-body">Safety car active — free pit window. Minimal time loss.</p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Sidebar */}
            <div className="col-span-12 lg:col-span-4 space-y-4">
              <div className="apex-panel p-4 corner-cut">
                <div className="font-mono text-xs text-white/40 tracking-widest mb-3">RACE CONDITIONS</div>
                <div className="space-y-2">
                  {[
                    { l:"CIRCUIT",    v:"Monaco" },
                    { l:"WEATHER",    v:"Dry",    c:"text-apex-accent" },
                    { l:"TRACK TEMP", v:"44°C",   c:"text-apex-amber" },
                    { l:"AIR TEMP",   v:"24°C" },
                    { l:"LAPS LEFT",  v:`${78-Math.floor(lap)}` },
                    { l:"SAFETY CAR", v:safetyCar?"ACTIVE":"OFF", c:safetyCar?"text-apex-amber":"text-white/40" },
                  ].map(item => (
                    <div key={item.l} className="flex justify-between">
                      <span className="font-mono text-xs text-white/30">{item.l}</span>
                      <span className={`font-mono text-xs data-value ${item.c||"text-white"}`}>{item.v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Degradation curves */}
              {degCurves && (
                <div className="apex-panel p-4 corner-cut">
                  <div className="font-mono text-xs text-white/40 tracking-widest mb-3">TYRE DEGRADATION CURVES</div>
                  <svg width="100%" viewBox={`0 0 ${chartW} ${chartH+20}`} className="overflow-visible">
                    {[25,50,75].map(v => (
                      <line key={v} x1="0" y1={chartH-(v/100)*chartH} x2={chartW} y2={chartH-(v/100)*chartH}
                        stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                    ))}
                    <line x1="0" y1={chartH-0.7*chartH} x2={chartW} y2={chartH-0.7*chartH}
                      stroke="rgba(255,36,66,0.35)" strokeWidth="1" strokeDasharray="4 4" />
                    <text x={chartW-2} y={chartH-0.7*chartH-3} fill="rgba(255,36,66,0.5)" fontSize="7" textAnchor="end" fontFamily="JetBrains Mono">THRESHOLD</text>
                    {/* Current lap marker */}
                    <line x1={(Math.floor(lap)/54)*chartW} y1="0" x2={(Math.floor(lap)/54)*chartW} y2={chartH}
                      stroke="rgba(0,229,255,0.5)" strokeWidth="1" strokeDasharray="3 3" />
                    {["Soft","Medium","Hard"].map(name => {
                      const curve = degCurves[name];
                      if (!curve) return null;
                      const pts = (curve.points as {lap:number;degradation:number}[]).map(p =>
                        `${(p.lap/54)*chartW},${chartH-(p.degradation/100)*chartH}`
                      ).join(" ");
                      return <polyline key={name} points={pts} fill="none" stroke={curve.color} strokeWidth="1.5" opacity="0.85" />;
                    })}
                    {["Soft","Medium","Hard"].map((name, i) => {
                      const curve = degCurves[name];
                      if (!curve) return null;
                      return (
                        <g key={name} transform={`translate(${i*100},${chartH+12})`}>
                          <line x1="0" y1="4" x2="14" y2="4" stroke={curve.color} strokeWidth="2" />
                          <text x="18" y="8" fill={curve.color} fontSize="8" fontFamily="JetBrains Mono">{name}</text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              )}

              <div className="apex-panel p-4 corner-cut">
                <div className="font-mono text-xs text-apex-amber tracking-widest mb-2">AI STRATEGIC INSIGHT</div>
                <p className="text-white/65 text-sm font-body leading-relaxed">
                  {safetyCar
                    ? "Safety car deployed — optimal pit window for all cars. Near-zero time loss. Strategic reset opportunity."
                    : "Two-stop strategy favoured for Soft compound runners. Undercut window opens laps 44-47. Monitor rival responses — P2 likely to react within 2 laps."}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
