"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { getDemoFullState, generateCommentary, getLiveIncidents } from "@/lib/api";

const TEAM_COLORS: Record<string, string> = {
  SilverArrow: "#00D2BE", RedStar: "#E8002D",
  PrancingHorse: "#DC0000", Bull: "#3671C6",
  Azure: "#0090FF", Orange: "#FF8000",
};
const TYRE_COLORS: Record<string, string> = {
  Soft: "#FF2442", Medium: "#FFB800", Hard: "#FFFFFF", Inter: "#39B54A", Wet: "#0066FF",
};

interface Car {
  id: number; name: string; team: string; color: string;
  position: number; lap: number; gap: number;
  speed_kmh: number; tyre_compound: string; tyre_age: number;
  drs: boolean; ers_deploy: number; x: number; y: number; heading: number;
}

interface Commentary {
  commentary: string; excitement_level: number; event_type: string;
}

export default function ReplayPage() {
  const [cars, setCars] = useState<Car[]>([]);
  const [commentary, setCommentary] = useState<Commentary[]>([]);
  const [incidents, setIncidents] = useState<any>(null);
  const [lap, setLap] = useState(42);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [aiActive, setAiActive] = useState(false);
  const [loadingAI, setLoadingAI] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tRef = useRef(0);
  const carsRef = useRef<Car[]>([]);
  const playingRef = useRef(true);
  const speedRef = useRef(1);
  playingRef.current = playing;
  speedRef.current = speed;

  // Load initial AI state from backend
  useEffect(() => {
    getDemoFullState().then((data: any) => {
      if (data.cars) {
        setCars(data.cars);
        carsRef.current = data.cars;
      }
      if (data.ai_snapshot?.commentary) {
        setCommentary([data.ai_snapshot.commentary]);
      }
      setAiActive(true);
      setLoadingAI(false);
    }).catch(() => { setLoadingAI(false); });

    getLiveIncidents().then(setIncidents).catch(() => {});
  }, []);

  // Physics simulation loop
  useEffect(() => {
    let animId: number;
    let commentaryTimer = 0;

    const tick = () => {
      if (!playingRef.current) { animId = requestAnimationFrame(tick); return; }
      tRef.current += 0.04 * speedRef.current;
      const t = tRef.current;
      setLap(42 + t * 0.004);

      const updated: Car[] = carsRef.current.map((car, i) => {
        const baseAngle = 2 * Math.PI * i / 6;
        const orbit = 0.007 + (6 - i) * 0.0005;
        const angle = baseAngle + t * orbit;
        const rx = 285 + 25 * Math.cos(2 * angle);
        const ry = 162 + 18 * Math.sin(2 * angle);
        return {
          ...car,
          x: 400 + rx * Math.cos(angle) + (Math.random() - 0.5) * 1.5,
          y: 220 + ry * Math.sin(angle) + (Math.random() - 0.5) * 1.5,
          heading: (Math.atan2(Math.sin(angle + 0.08) - Math.sin(angle), Math.cos(angle + 0.08) - Math.cos(angle)) * 180 / Math.PI + 360) % 360,
          speed_kmh: Math.round(220 + 80 * Math.abs(Math.sin(angle * 2)) + (Math.random() - 0.5) * 12),
          drs: Math.sin(angle) > 0.42,
          gap: i === 0 ? 0 : i * (1.4 + Math.sin(t * 0.08 + i) * 0.6),
        };
      });
      setCars(updated);
      carsRef.current = updated;

      // Fetch real AI commentary every ~10 seconds
      commentaryTimer++;
      if (commentaryTimer % 250 === 0) {
        const raceState = {
          lap: Math.floor(42 + t * 0.004), total_laps: 78, leader: "Driver 44",
          gap_p1_p2: updated[1]?.gap ?? 1.8, safety_car: false, weather: "dry",
          recent_events: ["Replay analysis active"],
          cars: updated.slice(0, 6).map(c => ({ car_id: c.id, position: c.position, tyre_compound: c.tyre_compound, tyre_age: c.tyre_age, speed_kmh: c.speed_kmh, gap: c.gap })),
        };
        generateCommentary(raceState).then(result => {
          setCommentary(prev => [result, ...prev.slice(0, 7)]);
        }).catch(() => {});
      }

      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, []);

  // AR Canvas renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animId: number;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const W = canvas.width, H = canvas.height;

      // Track
      ctx.strokeStyle = "rgba(0,229,255,0.07)"; ctx.lineWidth = 16;
      ctx.beginPath(); ctx.ellipse(W/2, H/2, 240, 140, 0, 0, Math.PI*2); ctx.stroke();
      ctx.strokeStyle = "rgba(0,229,255,0.14)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(W/2, H/2, 240, 140, 0, 0, Math.PI*2); ctx.stroke();
      ctx.strokeStyle = "rgba(0,229,255,0.05)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(W/2, H/2, 215, 122, 0, 0, Math.PI*2); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(W/2, H/2, 265, 158, 0, 0, Math.PI*2); ctx.stroke();

      for (const car of carsRef.current) {
        const color = TEAM_COLORS[car.team] || "#00E5FF";
        const cx = (car.x / 760) * W, cy = (car.y / 440) * H;
        const angle = (car.heading * Math.PI) / 180;
        const vLen = (car.speed_kmh / 340) * 38;

        // Trajectory prediction arc
        ctx.beginPath();
        for (let s = 0; s <= 12; s++) {
          const px = cx + Math.cos(angle) * (vLen * s / 4);
          const py = cy + Math.sin(angle) * (vLen * s / 4);
          if (s === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.strokeStyle = color + "40"; ctx.lineWidth = 1; ctx.setLineDash([3, 4]); ctx.stroke(); ctx.setLineDash([]);

        // Speed vector
        ctx.beginPath(); ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(angle) * vLen, cy + Math.sin(angle) * vLen);
        ctx.strokeStyle = color + "90"; ctx.lineWidth = 2; ctx.stroke();

        // Car marker
        ctx.beginPath(); ctx.arc(cx, cy, 5.5, 0, Math.PI*2);
        ctx.fillStyle = color; ctx.fill();

        // Glow
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 16);
        g.addColorStop(0, color + "55"); g.addColorStop(1, "transparent");
        ctx.beginPath(); ctx.arc(cx, cy, 16, 0, Math.PI*2); ctx.fillStyle = g; ctx.fill();

        // Tyre ring
        ctx.beginPath(); ctx.arc(cx, cy, 8, 0, Math.PI*2);
        ctx.strokeStyle = (TYRE_COLORS[car.tyre_compound] || "#fff") + "80"; ctx.lineWidth = 1.5; ctx.stroke();

        // DRS indicator
        if (car.drs) {
          ctx.fillStyle = "#00FF8890"; ctx.font = "7px JetBrains Mono, monospace";
          ctx.fillText("DRS", cx - 9, cy + 18);
        }

        // Labels
        ctx.fillStyle = "#fff"; ctx.font = "bold 8px JetBrains Mono, monospace";
        ctx.fillText(`P${car.position}`, cx + 8, cy - 6);
        ctx.fillStyle = color + "CC"; ctx.font = "7px JetBrains Mono, monospace";
        ctx.fillText(`${Math.round(car.speed_kmh)}`, cx + 8, cy + 4);
      }

      // Risk zones overlay
      if (incidents?.risk_zones) {
        for (const zone of incidents.risk_zones.slice(0, 3)) {
          const zx = (zone.x / 760) * W, zy = (zone.y / 440) * H;
          const zr = (zone.radius / 760) * W;
          const rColor = zone.risk_level > 0.65 ? "#FF2442" : zone.risk_level > 0.45 ? "#FFB800" : "#00E5FF";
          const grad = ctx.createRadialGradient(zx, zy, 0, zx, zy, zr);
          grad.addColorStop(0, rColor + "30"); grad.addColorStop(1, "transparent");
          ctx.beginPath(); ctx.arc(zx, zy, zr, 0, Math.PI*2); ctx.fillStyle = grad; ctx.fill();
          ctx.beginPath(); ctx.arc(zx, zy, zr, 0, Math.PI*2);
          ctx.strokeStyle = rColor + "50"; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]);
        }
      }

      animId = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(animId);
  }, [incidents]);

  return (
    <div className="min-h-screen bg-apex-black text-white">
      <div className="border-b border-apex-border/60 px-6 py-3 flex items-center gap-4 bg-apex-void/80 sticky top-0 z-50">
        <Link href="/dashboard" className="font-mono text-xs text-white/40 hover:text-apex-accent transition-colors tracking-widest">DASHBOARD</Link>
        <span className="text-white/20">/</span>
        <span className="font-mono text-xs text-apex-accent tracking-widest">REPLAY ANALYSIS</span>
        <div className="ml-auto flex items-center gap-3">
          {aiActive && <><span className="status-dot status-active" /><span className="font-mono text-xs text-apex-green">IBM GRANITE LIVE</span></>}
        </div>
      </div>

      <div className="p-4 max-w-7xl mx-auto">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="font-mono text-xs text-apex-accent tracking-widest mb-1">REPLAY ANALYSIS MODE</div>
            <h1 className="font-display font-black text-3xl tracking-tight">RACE REPLAY</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-white/40">SPEED</span>
            {[0.5, 1, 2, 4].map(s => (
              <button key={s} onClick={() => setSpeed(s)}
                className={`font-mono text-xs px-3 py-1.5 border transition-colors ${speed === s ? "border-apex-accent text-apex-accent bg-apex-accent/10" : "border-apex-border text-white/40 hover:text-white"}`}>
                {s}x
              </button>
            ))}
            <button onClick={() => setPlaying(v => !v)}
              className="bg-apex-accent text-apex-black font-mono text-xs font-bold px-5 py-1.5 corner-cut">
              {playing ? "PAUSE" : "PLAY"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-4">
          {/* Main track canvas */}
          <div className="col-span-8 apex-panel corner-cut overflow-hidden relative">
            <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
              <span className="font-mono text-xs text-apex-accent/60">LAP {Math.floor(lap)}/78</span>
              <span className="font-mono text-xs text-white/20">CIRCUIT DE MONACO</span>
            </div>
            <canvas ref={canvasRef} width={760} height={440} className="w-full" />
          </div>

          {/* Right: order + commentary */}
          <div className="col-span-4 space-y-3">
            {/* Race order */}
            <div className="apex-panel corner-cut overflow-hidden">
              <div className="px-3 py-2 border-b border-apex-border/40 font-mono text-xs text-white/40 tracking-widest">RACE ORDER</div>
              {cars.map(car => (
                <div key={car.id} className="px-3 py-2 border-b border-apex-border/20 last:border-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-white/30 w-5">P{car.position}</span>
                    <div className="w-2 h-2 rounded-full" style={{ background: TEAM_COLORS[car.team] }} />
                    <span className="font-display font-bold text-xs">{car.name.replace("Driver ","")}</span>
                    <span className="ml-auto font-mono text-xs data-value" style={{ color: TYRE_COLORS[car.tyre_compound] }}>
                      {car.tyre_compound[0]}{Math.floor(car.tyre_age)}L
                    </span>
                  </div>
                  <div className="h-0.5 bg-apex-panel overflow-hidden">
                    <div className="h-full" style={{ width: `${(car.speed_kmh / 340) * 100}%`, background: TEAM_COLORS[car.team] }} />
                  </div>
                </div>
              ))}
            </div>

            {/* IBM Granite Commentary */}
            <div className="apex-panel corner-cut">
              <div className="px-3 py-2 border-b border-apex-border/40 flex items-center gap-2">
                <span className="status-dot status-active" />
                <span className="font-mono text-xs text-apex-accent tracking-widest">IBM GRANITE COMMENTARY</span>
              </div>
              <div className="p-3 space-y-2 max-h-52 overflow-y-auto">
                {commentary.length === 0 ? (
                  <div className="font-mono text-xs text-white/30 text-center py-4">Awaiting AI analysis...</div>
                ) : commentary.map((c, i) => (
                  <div key={i} className={`transition-opacity ${i === 0 ? "opacity-100" : "opacity-50"}`}>
                    <div className="flex items-center gap-2 mb-0.5">
                      <div className="flex gap-0.5">
                        {Array.from({ length: Math.round((c.excitement_level ?? 0.5) * 5) }).map((_, j) => (
                          <div key={j} className="w-1 h-1 bg-apex-accent rounded-full" style={{ opacity: (j + 1) / 5 }} />
                        ))}
                      </div>
                      <span className="font-mono text-xs text-white/25">{c.event_type}</span>
                    </div>
                    <p className="text-xs font-body text-white/80 leading-relaxed">{c.commentary}</p>
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
