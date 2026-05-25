"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { getLiveIncidents } from "@/lib/api";

const TEAM_COLORS: Record<string, string> = {
  RedStar:"#E8002D", SilverArrow:"#00D2BE", PrancingHorse:"#DC0000",
  Bull:"#3671C6", Azure:"#0090FF", Orange:"#FF8000",
};
const TEAMS = ["RedStar","SilverArrow","PrancingHorse","Bull","Azure","Orange"];
const RC = (r: number) => r >= 0.65 ? "#FF2442" : r >= 0.45 ? "#FFB800" : r >= 0.25 ? "#00E5FF" : "#00FF88";
const RL = (r: number) => r >= 0.65 ? "CRITICAL" : r >= 0.45 ? "HIGH" : r >= 0.25 ? "ELEVATED" : "LOW";

export default function IncidentsPage() {
  const [incidentData, setIncidentData] = useState<any>(null);
  const [cars, setCars] = useState<any[]>([]);
  const [overallRisk, setOverallRisk] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const carsRef   = useRef<any[]>([]);
  const riskRef   = useRef<any[]>([]);
  const tRef      = useRef(0);

  // Poll real incident endpoint every 2 seconds
  useEffect(() => {
    const poll = () => {
      getLiveIncidents().then((data: any) => {
        setIncidentData(data);
        setOverallRisk(data.overall_risk ?? 0);
        riskRef.current = data.risk_zones ?? [];
      }).catch(() => {});
    };
    poll();
    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, []);

  // Physics simulation
  useEffect(() => {
    const interval = setInterval(() => {
      tRef.current += 0.05;
      const t = tRef.current;
      const newCars = TEAMS.map((team, i) => {
        const base = 2 * Math.PI * i / 6;
        const orbit = 0.007 + (6 - i) * 0.0005;
        const angle = base + t * orbit;
        const rx = 285 + 25 * Math.cos(2 * angle);
        const ry = 162 + 18 * Math.sin(2 * angle);
        return {
          car_id: i + 1, team,
          x: 300 + rx * Math.cos(angle) + (Math.random() - .5) * 2,
          y: 200 + ry * Math.sin(angle) + (Math.random() - .5) * 2,
          speed_kmh: 210 + 80 * Math.abs(Math.sin(angle * 2)) + (Math.random() - .5) * 18,
          heading: ((Math.atan2(Math.sin(angle+.08)-Math.sin(angle), Math.cos(angle+.08)-Math.cos(angle)) * 180 / Math.PI) + 360) % 360,
          brake: Math.max(0, .75 - .75 * Math.abs(Math.sin(angle * 2))),
        };
      });
      setCars(newCars);
      carsRef.current = newCars;
    }, 80);
    return () => clearInterval(interval);
  }, []);

  // Canvas render
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animId: number;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const W = canvas.width, H = canvas.height;

      ctx.strokeStyle = "rgba(0,229,255,0.07)"; ctx.lineWidth = 16;
      ctx.beginPath(); ctx.ellipse(W/2, H/2, 235, 136, 0, 0, Math.PI*2); ctx.stroke();
      ctx.strokeStyle = "rgba(0,229,255,0.13)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(W/2, H/2, 235, 136, 0, 0, Math.PI*2); ctx.stroke();
      ctx.strokeStyle = "rgba(0,229,255,0.05)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(W/2, H/2, 210, 115, 0, 0, Math.PI*2); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(W/2, H/2, 260, 157, 0, 0, Math.PI*2); ctx.stroke();

      // Risk zones from real API
      for (const zone of riskRef.current) {
        const zx = (zone.x / 600) * W, zy = (zone.y / 400) * H;
        const zr = (zone.radius / 600) * W;
        const c = RC(zone.risk_level);
        const g = ctx.createRadialGradient(zx, zy, 0, zx, zy, zr);
        g.addColorStop(0, c + "30"); g.addColorStop(0.7, c + "18"); g.addColorStop(1, "transparent");
        ctx.beginPath(); ctx.arc(zx, zy, zr, 0, Math.PI*2); ctx.fillStyle = g; ctx.fill();
        ctx.beginPath(); ctx.arc(zx, zy, zr, 0, Math.PI*2);
        ctx.strokeStyle = c + "55"; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]);
      }

      for (const car of carsRef.current) {
        const color = TEAM_COLORS[car.team] || "#fff";
        const cx = (car.x / 600) * W, cy = (car.y / 400) * H;
        const angle = (car.heading * Math.PI) / 180;
        const vLen = (car.speed_kmh / 330) * 34;
        // Velocity vector
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(angle)*vLen, cy + Math.sin(angle)*vLen);
        ctx.strokeStyle = color + "70"; ctx.lineWidth = 1.5; ctx.stroke();
        // Glow
        const g2 = ctx.createRadialGradient(cx, cy, 0, cx, cy, 14);
        g2.addColorStop(0, color + "55"); g2.addColorStop(1, "transparent");
        ctx.beginPath(); ctx.arc(cx, cy, 14, 0, Math.PI*2); ctx.fillStyle = g2; ctx.fill();
        // Dot
        ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI*2); ctx.fillStyle = color; ctx.fill();
        // Brake halo
        if (car.brake > 0.3) { ctx.beginPath(); ctx.arc(cx, cy, 18+car.brake*10, 0, Math.PI*2); ctx.strokeStyle=`rgba(255,36,66,${car.brake*.45})`; ctx.lineWidth=2; ctx.stroke(); }
        // Labels
        ctx.fillStyle = "#fff"; ctx.font = "bold 8px JetBrains Mono,monospace"; ctx.fillText(`${car.car_id}`, cx+7, cy-4);
        ctx.fillStyle = color+"CC"; ctx.font = "7px JetBrains Mono,monospace"; ctx.fillText(`${Math.round(car.speed_kmh)}`, cx+7, cy+6);
      }
      animId = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div className="min-h-screen bg-apex-black text-white">
      <div className="border-b border-apex-border/60 px-6 py-3 flex items-center gap-4 bg-apex-void/80 sticky top-0 z-50">
        <Link href="/dashboard" className="font-mono text-xs text-white/40 hover:text-apex-accent transition-colors tracking-widest">DASHBOARD</Link>
        <span className="text-white/20">/</span>
        <span className="font-mono text-xs text-apex-red tracking-widest">SAFETYNET AI</span>
        <div className="ml-auto flex items-center gap-2">
          <span className="status-dot status-active" />
          <span className="font-mono text-xs text-apex-green">PREDICTOR ARMED — LIVE</span>
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <div className="font-mono text-xs text-apex-red tracking-widest mb-1">MODULE 04</div>
            <h1 className="font-display font-black text-4xl tracking-tight">SAFETYNET AI</h1>
            <p className="text-white/40 text-sm mt-1 font-body">Real-time collision prediction and incident risk analysis</p>
          </div>
          <div className="apex-panel p-4 corner-cut text-center min-w-36">
            <div className="font-mono text-xs text-white/30 mb-1">OVERALL RISK</div>
            <div className="font-display font-black text-4xl data-value" style={{ color: RC(overallRisk), textShadow:`0 0 15px ${RC(overallRisk)}80` }}>
              {Math.round(overallRisk * 100)}%
            </div>
            <div className="font-mono text-xs mt-1" style={{ color: RC(overallRisk) }}>{RL(overallRisk)}</div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 lg:col-span-7 apex-panel corner-cut overflow-hidden">
            <div className="px-4 py-2.5 border-b border-apex-border/40 flex items-center justify-between">
              <span className="font-mono text-xs text-apex-red tracking-widest">LIVE RISK MAP — REAL-TIME</span>
              <span className="font-mono text-xs text-white/30">PHYSICS-BASED PREDICTION</span>
            </div>
            <canvas ref={canvasRef} width={600} height={400} className="w-full" />
          </div>

          <div className="col-span-12 lg:col-span-5 space-y-3">
            <div className="apex-panel p-4 corner-cut">
              <div className="font-mono text-xs text-apex-red tracking-widest mb-3">ACTIVE RISK ZONES</div>
              <div className="space-y-2">
                {(!incidentData?.risk_zones || incidentData.risk_zones.length === 0)
                  ? <div className="font-mono text-xs text-white/30 text-center py-4">No active risk zones</div>
                  : incidentData.risk_zones.slice(0, 5).map((zone: any) => (
                    <div key={zone.zone_id} className="flex items-center gap-3 bg-apex-panel/60 p-3 rounded border border-apex-border/30">
                      <div className="w-10 h-10 rounded flex items-center justify-center font-mono font-bold text-sm flex-shrink-0"
                        style={{ background: RC(zone.risk_level)+"20", color: RC(zone.risk_level), border:`1px solid ${RC(zone.risk_level)}40` }}>
                        {Math.round(zone.risk_level*100)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-mono text-xs font-bold" style={{ color: RC(zone.risk_level) }}>{RL(zone.risk_level)}</span>
                          <span className="font-mono text-xs text-white/30">{zone.zone_type.replace("_"," ").toUpperCase()}</span>
                        </div>
                        <p className="font-body text-xs text-white/55 truncate">{zone.description}</p>
                        {zone.time_to_incident_s && (
                          <span className="font-mono text-xs text-apex-red">TTI: {zone.time_to_incident_s.toFixed(1)}s</span>
                        )}
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>

            {incidentData?.alerts && incidentData.alerts.length > 0 && (
              <div className="apex-panel p-4 corner-cut border border-apex-red/20">
                <div className="font-mono text-xs text-apex-red tracking-widest mb-2">ACTIVE ALERTS</div>
                <div className="space-y-1.5">
                  {incidentData.alerts.map((a: any, i: number) => (
                    <div key={i} className={`flex items-center gap-2 p-2 rounded ${a.level==="CRITICAL"?"bg-apex-red/10 border border-apex-red/30":"bg-apex-amber/10 border border-apex-amber/30"}`}>
                      <span className={`font-mono text-xs font-bold ${a.level==="CRITICAL"?"text-apex-red":"text-apex-amber"}`}>{a.level}</span>
                      <span className="font-body text-xs text-white/70">{a.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="apex-panel p-4 corner-cut">
              <div className="font-mono text-xs text-white/40 tracking-widest mb-2">DETECTION METHODS</div>
              <div className="space-y-1.5">
                {[
                  { n:"Proximity Analysis",   s:"ACTIVE", d:"Pairwise car distance monitoring" },
                  { n:"Closing Rate Calc",     s:"ACTIVE", d:"Relative velocity convergence" },
                  { n:"Tyre Stress Model",     s:"ACTIVE", d:"Compound age and speed risk" },
                  { n:"Aggression Detection",  s:"ACTIVE", d:"Acceleration pattern analysis" },
                ].map(m => (
                  <div key={m.n} className="flex items-start gap-3 py-1 border-b border-apex-border/20 last:border-0">
                    <div className="flex items-center gap-1.5 mt-0.5"><span className="status-dot status-active w-1.5 h-1.5" /></div>
                    <div>
                      <div className="font-mono text-xs text-white/65">{m.n}</div>
                      <div className="font-mono text-xs text-white/30">{m.d}</div>
                    </div>
                    <span className="ml-auto font-mono text-xs text-apex-green">{m.s}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
