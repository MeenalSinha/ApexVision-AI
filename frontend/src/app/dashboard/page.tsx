"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { generateCommentary, getLiveIncidents, getCoachingComparison } from "@/lib/api";

// ── Types ────────────────────────────────────────────────────────────────────
interface Car {
  car_id: number; driver: string; team: string; position: number;
  x: number; y: number; angle: number; speed_kmh: number;
  tyre_compound: string; tyre_age: number; gap: number;
  drs: boolean; ers_deploy: number; brake: number; throttle: number;
}
interface Commentary { text: string; excitement: number; event_type: string; }
interface RiskAlert  { risk_level: number; cars: number[]; description: string; }

// ── Constants ────────────────────────────────────────────────────────────────
const TEAM_COLORS: Record<string, string> = {
  RedStar: "#E8002D", SilverArrow: "#00D2BE", PrancingHorse: "#DC0000",
  Bull: "#3671C6", Azure: "#0090FF", Orange: "#FF8000",
};
const TYRE_COLORS: Record<string, string> = {
  Soft: "#FF2442", Medium: "#FFB800", Hard: "#FFFFFF", Inter: "#39B54A", Wet: "#0066FF",
};
const TEAMS = ["RedStar","SilverArrow","PrancingHorse","Bull","Azure","Orange"];
const COMPOUNDS = ["Soft","Medium","Hard","Medium","Soft","Hard"];
const MODULES = ["VISION TRACK","PITLANE PULSE","SAFETYNET AI","RACEMIND AI","APEXCOACH AI","PITWALL-IQ","AR OVERLAY"];
const DEMO_COMMENTARY = [
  "Driver 11 has arrived 14 meters later into Turn 4 — generating overtaking pressure while risking rear tyre instability.",
  "The undercut window is live for Car 44. Out-lap pace on fresh Mediums is three-tenths faster than anything on track.",
  "SafetyNet flags elevated proximity risk at Turn 9. Three cars converging simultaneously in the braking zone.",
  "Sector 2 gap: Car 11 has found 0.4 seconds through the medium-speed complex via later throttle application.",
  "Tyre degradation alert for Car 16. Rear graining pattern indicates threshold approach in 3 to 4 laps.",
  "DRS train forming. Cars 7 and 44 within eight-tenths at the detection point. Overtake probability 72 percent.",
  "Weather radar indicates 67 percent rain probability in 18 minutes. RaceMind recommending intermediate preparation.",
];

// ── Main component ────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [cars, setCars] = useState<Car[]>([]);
  const [lap, setLap] = useState(42);
  const [safetyCar, setSafetyCar] = useState(false);
  const [commentary, setCommentary] = useState<Commentary[]>([]);
  const [riskAlerts, setRiskAlerts] = useState<RiskAlert[]>([]);
  const [wsStatus, setWsStatus] = useState<"connecting"|"connected"|"offline">("connecting");
  const [coachScores, setCoachScores] = useState<Record<number,number>>({});
  const [selectedCar, setSelectedCar] = useState<Car|null>(null);
  const [arEnabled, setArEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState<"track"|"telemetry"|"strategy"|"coaching">("track");

  // Load real coaching scores from IBM Granite when tab opens
  useEffect(() => {
    if (activeTab !== "coaching") return;
    getCoachingComparison().then((data: any) => {
      const scores: Record<number,number> = {};
      (data.comparison ?? []).forEach((c: any) => { scores[c.car_id] = c.overall_score; });
      setCoachScores(scores);
    }).catch(() => {});
  }, [activeTab]);

  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const wsRef      = useRef<WebSocket|null>(null);
  const carsRef    = useRef<Car[]>([]);
  const arRef      = useRef(true);
  const commentIdx = useRef(0);
  arRef.current = arEnabled;

  // ── WebSocket ────────────────────────────────────────────────────────────────
  const startLocalSim = useCallback(() => {
    setWsStatus("connected");
    let t = 0;
    const interval = setInterval(() => {
      t += 0.08;
      const newCars: Car[] = TEAMS.map((team, i) => {
        const base = 2 * Math.PI * i / 6;
        const orbit = 0.007 + (6 - i) * 0.0005;
        const angle = base + t * orbit;
        const rx = 285 + 25 * Math.cos(2 * angle);
        const ry = 162 + 18 * Math.sin(2 * angle);
        return {
          car_id: i + 1, driver: `Driver ${String(i + 1).padStart(2,"0")}`,
          team, position: i + 1,
          x: 380 + rx * Math.cos(angle) + (Math.random() - .5) * 2,
          y: 220 + ry * Math.sin(angle) + (Math.random() - .5) * 2,
          angle: (Math.atan2(Math.sin(angle+0.08)-Math.sin(angle), Math.cos(angle+0.08)-Math.cos(angle)) * 180 / Math.PI + 360) % 360,
          speed_kmh: 220 + 80 * Math.abs(Math.sin(angle * 2)) + (Math.random() - .5) * 18,
          tyre_compound: COMPOUNDS[i], tyre_age: Math.min(50, 12 + i * 3 + t * 0.05),
          gap: i === 0 ? 0 : i * (1.2 + Math.sin(t * .1 + i) * .5),
          drs: Math.sin(angle) > 0.42,
          ers_deploy: Math.max(0, Math.min(4, 2 + Math.sin(t * .3 + i) * 1.5)),
          brake: Math.max(0, .8 - .8 * Math.abs(Math.sin(angle * 2))),
          throttle: Math.min(1, .4 + .6 * Math.abs(Math.sin(angle * 2))),
        };
      });
      setCars(newCars);
      carsRef.current = newCars;
      setLap(prev => Math.min(78, 42 + t * 0.003));

      // Real Granite commentary every ~10 s
      if (Math.round(t * 10) % 100 === 0) {
        const raceState = {
          lap: Math.floor(42 + t * .003), total_laps: 78, leader: "Car 01",
          gap_p1_p2: newCars[1]?.gap ?? 1.8, safety_car: false, weather: "dry",
          recent_events: [],
          cars: newCars.map(c => ({ car_id: c.car_id, position: c.position, tyre_compound: c.tyre_compound, tyre_age: Math.floor(c.tyre_age), speed_kmh: Math.round(c.speed_kmh), gap: c.gap })),
        };
        generateCommentary(raceState).then(result => {
          setCommentary(prev => [{
            text: result.commentary || result.tts_ready,
            excitement: result.excitement_level ?? 0.7,
            event_type: result.event_type ?? "general",
          }, ...prev.slice(0, 8)]);
        }).catch(() => {
          // Fallback to pre-written lines
          const line = DEMO_COMMENTARY[commentIdx.current % DEMO_COMMENTARY.length];
          commentIdx.current++;
          setCommentary(prev => [{ text: line, excitement: 0.70 + (commentIdx.current % 7) * 0.04, event_type: "general" }, ...prev.slice(0, 8)]);
        });
      }

      // Risk alerts
      if (Math.round(t * 10) % 50 === 0) {
        getLiveIncidents().then((data: any) => {
          const zones = data?.risk_zones ?? [];
          const critical = zones.filter((z: any) => z.risk_level > .55);
          if (critical.length > 0) {
            setRiskAlerts(prev => [{ risk_level: critical[0].risk_level, cars: critical[0].cars_involved, description: critical[0].description }, ...prev.slice(0, 3)]);
            setTimeout(() => setRiskAlerts(prev => prev.slice(0, -1)), 9000);
          }
        }).catch(() => {});
      }
    }, 80);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const sessionId = "live_" + Math.random().toString(36).slice(2,8);
    const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000"}/ws/race/${sessionId}`;
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.onopen  = () => setWsStatus("connected");
      ws.onclose = () => { setWsStatus("offline"); startLocalSim(); };
      ws.onerror = () => { setWsStatus("offline"); startLocalSim(); };
      ws.onmessage = (evt) => {
        try {
          const d = JSON.parse(evt.data);
          if (d.type === "telemetry") { setCars(d.cars||[]); carsRef.current = d.cars||[]; setLap(d.lap||42); setSafetyCar(d.safety_car||false); }
          if (d.type === "commentary") setCommentary(prev => [{ text: d.text, excitement: d.excitement, event_type: "general" }, ...prev.slice(0,8)]);
          if (d.type === "risk_alert") { setRiskAlerts(prev => [{ risk_level: d.risk_level, cars: d.cars, description: d.description }, ...prev.slice(0,3)]); setTimeout(() => setRiskAlerts(prev => prev.slice(0,-1)), 8000); }
        } catch {}
      };
    } catch { startLocalSim(); }
    return () => wsRef.current?.close();
  }, [startLocalSim]);

  // ── AR Canvas ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animId: number;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (!arRef.current) { animId = requestAnimationFrame(render); return; }
      const W = canvas.width, H = canvas.height;
      // Track oval
      ctx.strokeStyle = "rgba(0,229,255,0.07)"; ctx.lineWidth = 16;
      ctx.beginPath(); ctx.ellipse(W/2, H/2, 240, 140, 0, 0, Math.PI*2); ctx.stroke();
      ctx.strokeStyle = "rgba(0,229,255,0.15)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(W/2, H/2, 240, 140, 0, 0, Math.PI*2); ctx.stroke();
      // Inner edge
      ctx.strokeStyle = "rgba(0,229,255,0.05)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(W/2, H/2, 215, 118, 0, 0, Math.PI*2); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(W/2, H/2, 265, 162, 0, 0, Math.PI*2); ctx.stroke();

      for (const car of carsRef.current) {
        const color = TEAM_COLORS[car.team] || "#00E5FF";
        const cx = (car.x / 760) * W, cy = (car.y / 440) * H;
        const ang = (car.angle * Math.PI) / 180;
        const vLen = (car.speed_kmh / 340) * 40;
        // Predicted trajectory (dashed)
        ctx.beginPath();
        for (let s = 0; s <= 10; s++) { const px = cx + Math.cos(ang)*vLen*s/4, py = cy + Math.sin(ang)*vLen*s/4; s===0?ctx.moveTo(px,py):ctx.lineTo(px,py); }
        ctx.strokeStyle = color+"35"; ctx.lineWidth=1; ctx.setLineDash([3,5]); ctx.stroke(); ctx.setLineDash([]);
        // Speed vector
        ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx+Math.cos(ang)*vLen, cy+Math.sin(ang)*vLen);
        ctx.strokeStyle = color+"90"; ctx.lineWidth = 2; ctx.stroke();
        // Glow
        const g = ctx.createRadialGradient(cx,cy,0,cx,cy,15);
        g.addColorStop(0, color+"50"); g.addColorStop(1,"transparent");
        ctx.beginPath(); ctx.arc(cx,cy,15,0,Math.PI*2); ctx.fillStyle=g; ctx.fill();
        // Dot
        ctx.beginPath(); ctx.arc(cx,cy,5.5,0,Math.PI*2); ctx.fillStyle=color; ctx.fill();
        // Tyre ring
        const tc = TYRE_COLORS[car.tyre_compound]||"#fff";
        ctx.beginPath(); ctx.arc(cx,cy,8,0,Math.PI*2); ctx.strokeStyle=tc+"80"; ctx.lineWidth=1.5; ctx.stroke();
        // Brake halo
        if (car.brake > 0.3) { ctx.beginPath(); ctx.arc(cx,cy,20+car.brake*10,0,Math.PI*2); ctx.strokeStyle=`rgba(255,36,66,${car.brake*0.45})`; ctx.lineWidth=2; ctx.stroke(); }
        // DRS
        if (car.drs) { ctx.fillStyle="#00FF8888"; ctx.font="7px JetBrains Mono,monospace"; ctx.fillText("DRS",cx-9,cy+19); }
        // Labels
        ctx.fillStyle="#fff"; ctx.font="bold 8px JetBrains Mono,monospace"; ctx.fillText(`P${car.position}`,cx+8,cy-5);
        ctx.fillStyle=color+"CC"; ctx.font="7px JetBrains Mono,monospace"; ctx.fillText(`${Math.round(car.speed_kmh)}`,cx+8,cy+5);
      }
      animId = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(animId);
  }, []);

  // ── Tyre degradation calc ─────────────────────────────────────────────────────
  const tyreColor = (compound: string) => TYRE_COLORS[compound] || "#fff";
  const degPct = (compound: string, age: number) => {
    const rate = { Soft: 0.034, Medium: 0.022, Hard: 0.014 }[compound] ?? 0.022;
    return Math.min(100, Math.round(age * rate * 100));
  };

  return (
    <div className="min-h-screen bg-apex-black text-white overflow-hidden">
      {/* Command bar */}
      <div className="border-b border-apex-border/60 px-4 py-2 flex items-center justify-between bg-apex-void/80 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-6 h-6 bg-apex-accent corner-cut flex items-center justify-center">
              <span className="text-apex-black font-display font-black text-xs">AV</span>
            </div>
            <span className="font-display font-black text-sm tracking-widest text-apex-accent">APEXVISION</span>
          </Link>
          <div className="hidden lg:flex items-center gap-1">
            {MODULES.map(m => (
              <div key={m} className="flex items-center gap-1 px-2 py-1 bg-apex-panel/60 border border-apex-border/40 text-xs font-mono">
                <span className="status-dot status-active w-1.5 h-1.5" />
                <span className="text-white/50">{m}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-white/40">LAP</span>
            <span className="text-apex-accent font-bold text-base glow-accent data-value">{Math.floor(lap)}/78</span>
          </div>
          {safetyCar && <div className="bg-apex-amber/20 border border-apex-amber/40 text-apex-amber font-mono text-xs px-3 py-1 animate-pulse">SAFETY CAR</div>}
          <div className={`flex items-center gap-1.5 font-mono text-xs ${wsStatus==="connected"?"text-apex-green":"text-apex-red"}`}>
            <span className={`status-dot ${wsStatus==="connected"?"status-active":"status-danger"}`} />
            {wsStatus==="connected"?"LIVE":"OFFLINE"}
          </div>
          <button onClick={() => setArEnabled(v => !v)}
            className={`font-mono text-xs px-3 py-1 border transition-colors ${arEnabled?"border-apex-accent/40 text-apex-accent bg-apex-accent/10":"border-apex-border text-white/40"}`}>
            AR {arEnabled?"ON":"OFF"}
          </button>
          <Link href="/replay" className="font-mono text-xs px-3 py-1 border border-apex-border text-white/40 hover:text-apex-accent hover:border-apex-accent/40 transition-colors">REPLAY</Link>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-12 gap-0 h-[calc(100vh-44px)]">
        {/* Left: race order */}
        <div className="col-span-2 border-r border-apex-border/40 flex flex-col overflow-hidden">
          <div className="px-3 py-2 border-b border-apex-border/40">
            <span className="font-mono text-xs text-apex-accent tracking-widest">RACE ORDER</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {cars.map(car => (
              <div key={car.car_id}
                onClick={() => setSelectedCar(prev => prev?.car_id === car.car_id ? null : car)}
                className={`px-3 py-2.5 border-b border-apex-border/20 cursor-pointer hover:bg-apex-panel/50 transition-colors ${selectedCar?.car_id === car.car_id ? "bg-apex-accent/10 border-l-2 border-l-apex-accent" : ""}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs text-white/30 w-4">P{car.position}</span>
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: TEAM_COLORS[car.team]||"#fff", boxShadow:`0 0 5px ${TEAM_COLORS[car.team]||"#fff"}` }} />
                  <span className="font-display font-bold text-xs text-white truncate">{car.driver.replace("Driver ","")}</span>
                </div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-xs" style={{ color: tyreColor(car.tyre_compound) }}>{car.tyre_compound[0]} {Math.floor(car.tyre_age)}L</span>
                  <span className="font-mono text-xs text-white/40 data-value">{car.position===1?"LEAD":`+${car.gap.toFixed(1)}s`}</span>
                </div>
                <div className="h-0.5 bg-apex-panel/80 overflow-hidden">
                  <div className="h-full transition-all duration-300" style={{ width:`${(car.speed_kmh/340)*100}%`, background: TEAM_COLORS[car.team]||"#00E5FF" }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Center: track + tabs */}
        <div className="col-span-7 flex flex-col">
          <div className="border-b border-apex-border/40 flex">
            {(["track","telemetry","strategy","coaching"] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-5 py-2.5 font-mono text-xs tracking-widest border-b-2 transition-colors ${activeTab===tab?"border-apex-accent text-apex-accent":"border-transparent text-white/40 hover:text-white/70"}`}>
                {tab.toUpperCase()}
              </button>
            ))}
            <Link href="/incidents" className="ml-auto px-4 py-2.5 font-mono text-xs text-apex-red/60 hover:text-apex-red tracking-widest">SAFETYNET</Link>
            <Link href="/analytics" className="px-4 py-2.5 font-mono text-xs text-white/40 hover:text-apex-accent tracking-widest">ANALYTICS</Link>
          </div>

          {activeTab === "track" && (
            <div className="flex-1 relative bg-apex-void/40 overflow-hidden">
              <canvas ref={canvasRef} width={760} height={440} className="absolute inset-0 w-full h-full" />
              <div className="absolute top-3 left-3 font-mono text-xs text-white/25 tracking-widest">CIRCUIT DE MONACO — MONTE CARLO</div>
              {selectedCar && (
                <div className="absolute bottom-3 left-3 apex-panel p-4 w-52 corner-cut">
                  <div className="font-display font-bold text-white text-sm mb-2">{selectedCar.driver}</div>
                  <div className="space-y-1.5">
                    {[
                      { l:"SPEED",    v:`${Math.round(selectedCar.speed_kmh)} km/h`, c:"text-apex-accent" },
                      { l:"TYRE",     v:`${selectedCar.tyre_compound} ${Math.floor(selectedCar.tyre_age)}L`, c:"" },
                      { l:"ERS DEPLOY",v:`${selectedCar.ers_deploy.toFixed(1)} MJ`, c:"text-apex-green" },
                      { l:"DRS",      v:selectedCar.drs?"ACTIVE":"OFF", c:selectedCar.drs?"text-apex-green":"text-white/40" },
                    ].map(item => (
                      <div key={item.l} className="flex justify-between">
                        <span className="font-mono text-xs text-white/40">{item.l}</span>
                        <span className={`font-mono text-xs data-value ${item.c||"text-white"}`}>{item.v}</span>
                      </div>
                    ))}
                    {[
                      { l:"THROTTLE", v:selectedCar.throttle, c:"#00FF88" },
                      { l:"BRAKE",    v:selectedCar.brake,    c:"#FF2442" },
                    ].map(bar => (
                      <div key={bar.l}>
                        <div className="flex justify-between mb-0.5">
                          <span className="font-mono text-xs text-white/40">{bar.l}</span>
                          <span className="font-mono text-xs data-value text-white">{Math.round(bar.v*100)}%</span>
                        </div>
                        <div className="h-1 bg-apex-panel rounded overflow-hidden">
                          <div className="h-full rounded transition-all" style={{ width:`${bar.v*100}%`, background:bar.c }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "telemetry" && (
            <div className="flex-1 p-3 overflow-y-auto grid grid-cols-2 gap-3 content-start">
              {cars.map(car => (
                <div key={car.car_id} className="apex-panel p-4 corner-cut">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: TEAM_COLORS[car.team] }} />
                    <span className="font-display font-bold text-sm">{car.driver}</span>
                    <span className="font-mono text-xs text-white/30 ml-auto">P{car.position}</span>
                  </div>
                  {[
                    { l:"SPEED",   v:Math.round(car.speed_kmh), max:340, unit:"km/h", c:TEAM_COLORS[car.team]||"#00E5FF" },
                    { l:"THROTTLE",v:Math.round(car.throttle*100), max:100, unit:"%", c:"#00FF88" },
                    { l:"BRAKE",   v:Math.round(car.brake*100),    max:100, unit:"%", c:"#FF2442" },
                    { l:"ERS",     v:Math.round(car.ers_deploy*25),max:100, unit:"%", c:"#FFB800" },
                  ].map(m => (
                    <div key={m.l} className="mb-2">
                      <div className="flex justify-between mb-0.5">
                        <span className="font-mono text-xs text-white/40">{m.l}</span>
                        <span className="font-mono text-xs data-value text-white">{m.v}{m.unit}</span>
                      </div>
                      <div className="h-1.5 bg-apex-panel rounded overflow-hidden telemetry-bar">
                        <div className="h-full rounded transition-all duration-150" style={{ width:`${(m.v/m.max)*100}%`, background:m.c }} />
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {activeTab === "strategy" && (
            <div className="flex-1 p-3 overflow-y-auto space-y-3">
              <div className="apex-panel p-4 corner-cut">
                <div className="font-mono text-xs text-apex-amber tracking-widest mb-3">RACEMIND AI — TYRE STATUS</div>
                <div className="space-y-2">
                  {cars.map(car => {
                    const deg = degPct(car.tyre_compound, Math.floor(car.tyre_age));
                    const action = deg > 70 ? "PIT NOW" : deg > 50 ? "PIT SOON" : "STAY OUT";
                    const ac = deg > 70 ? "#FF2442" : deg > 50 ? "#FFB800" : "#00FF88";
                    return (
                      <div key={car.car_id} className="flex items-center gap-3 p-2 bg-apex-panel/50 rounded">
                        <div className="w-2 h-2 rounded-full" style={{ background: TEAM_COLORS[car.team] }} />
                        <span className="font-display font-bold text-xs w-20">P{car.position} {car.driver.replace("Driver ","")}</span>
                        <span className="font-mono text-xs w-16" style={{ color: tyreColor(car.tyre_compound) }}>{car.tyre_compound} {Math.floor(car.tyre_age)}L</span>
                        <div className="flex-1 h-1.5 bg-apex-panel rounded overflow-hidden">
                          <div className="h-full rounded" style={{ width:`${deg}%`, background:ac }} />
                        </div>
                        <span className="font-mono text-xs data-value w-8 text-right" style={{ color:ac }}>{deg}%</span>
                        <span className="font-mono text-xs font-bold tracking-wider w-16 text-right" style={{ color:ac }}>{action}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="apex-panel p-4 corner-cut">
                <div className="font-mono text-xs text-apex-amber tracking-widest mb-2">STRATEGIC INSIGHT</div>
                <p className="text-white/65 text-sm font-body leading-relaxed">Two-stop strategy favoured for Soft compound runners. Undercut window opens laps 44-47. Safety car probability 18% given current incident density. Intermediate preparation recommended — weather radar shows 67% rain in 18 minutes.</p>
              </div>
            </div>
          )}

          {activeTab === "coaching" && (
            <div className="flex-1 p-3 overflow-y-auto space-y-3">
              <div className="apex-panel p-4 corner-cut">
                <div className="font-mono text-xs text-apex-green tracking-widest mb-3">APEXCOACH AI — PERFORMANCE INDEX</div>
                <div className="grid grid-cols-2 gap-2">
                  {cars.map(car => {
                    const score = coachScores[car.car_id] ?? Math.floor(65 + (6 - car.position) * 4.5);
                    const sc = score >= 85 ? "#00FF88" : score >= 70 ? "#FFB800" : "#FF2442";
                    return (
                      <Link key={car.car_id} href="/coaching" className="bg-apex-panel/60 p-3 rounded hover:bg-apex-panel transition-colors">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full" style={{ background: TEAM_COLORS[car.team] }} />
                            <span className="font-display font-bold text-xs">{car.driver.replace("Driver ","CAR ")}</span>
                          </div>
                          <span className="font-mono font-bold text-sm data-value" style={{ color:sc }}>{score}</span>
                        </div>
                        <div className="h-1.5 bg-apex-panel rounded overflow-hidden">
                          <div className="h-full rounded" style={{ width:`${score}%`, background:sc }} />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
              <div className="apex-panel p-4 corner-cut">
                <div className="font-mono text-xs text-apex-green tracking-widest mb-2">KEY COACHING INSIGHTS</div>
                <div className="space-y-2">
                  {[
                    "Car 11: Braking 8m too early at Turn 1 — reference 100m board. Potential gain 0.3s/lap.",
                    "Car 44: Throttle application 15% below optimal at Turn 7 exit — earlier progressive power.",
                    "Car 16: Racing line 1.2m wide at Turn 4 — tighter entry enables earlier acceleration.",
                    "Car 1: Steering variance at Turn 9 indicates inconsistent line — lateral G 0.3 below peak.",
                  ].map((t, i) => (
                    <div key={i} className="flex gap-2 p-2 bg-apex-panel/50 rounded">
                      <span className="text-apex-green font-mono text-xs mt-0.5 flex-shrink-0">—</span>
                      <span className="text-white/65 text-xs font-body leading-relaxed">{t}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: AI feed */}
        <div className="col-span-3 border-l border-apex-border/40 flex flex-col overflow-hidden">
          {riskAlerts.length > 0 && (
            <div className="border-b border-apex-red/30 p-3 bg-apex-red/5">
              <div className="flex items-center gap-2 mb-1"><span className="status-dot status-danger" /><span className="font-mono text-xs text-apex-red tracking-widest">SAFETYNET ALERT</span></div>
              {riskAlerts.slice(0,2).map((a,i) => (
                <div key={i} className="text-xs font-body text-white/80">
                  <span className="font-mono text-apex-red">{Math.round(a.risk_level*100)}% </span>{a.description}
                </div>
              ))}
            </div>
          )}

          <div className="border-b border-apex-border/40 px-3 py-2 flex items-center gap-2">
            <span className="status-dot status-active" />
            <span className="font-mono text-xs text-apex-accent tracking-widest">IBM GRANITE — PITLANE PULSE</span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {commentary.length === 0
              ? <div className="font-mono text-xs text-white/25 text-center pt-8">Connecting to IBM Granite...</div>
              : commentary.map((c,i) => (
                <div key={i} className={i===0?"opacity-100":"opacity-50"}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-white/25">L{Math.floor(lap)}</span>
                    <div className="flex gap-0.5">{Array.from({length:Math.round(c.excitement*5)}).map((_,j)=><div key={j} className="w-1 h-1 bg-apex-accent rounded-full" style={{opacity:(j+1)/5}}/>)}</div>
                  </div>
                  <p className={`text-sm font-body leading-relaxed ${i===0?"text-white":"text-white/55"} commentary-ticker`}>{c.text}</p>
                  {i===0 && <div className="mt-1 h-px bg-gradient-to-r from-apex-accent/30 to-transparent" />}
                </div>
              ))
            }
          </div>

          <div className="border-t border-apex-border/40 p-3">
            <div className="font-mono text-xs text-white/25 tracking-widest mb-2">LIVE METRICS</div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { l:"LEADER", v:cars[0]?.driver.replace("Driver","Car ")||"Car 01" },
                { l:"P2 GAP", v:`${cars[1]?.gap?.toFixed(1)||"1.4"}s` },
                { l:"FASTEST", v:"1:24.805" },
                { l:"STATUS", v:safetyCar?"SAFETY CAR":"GREEN FLAG" },
              ].map(m => (
                <div key={m.l} className="bg-apex-panel/60 p-2 rounded">
                  <div className="font-mono text-xs text-white/25 mb-0.5">{m.l}</div>
                  <div className="font-display font-bold text-xs text-white data-value">{m.v}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-apex-border/40 p-3">
            <div className="font-mono text-xs text-white/25 tracking-widest mb-2">AI SYSTEMS</div>
            <div className="space-y-1">
              {[
                { n:"IBM Granite",   s:"ACTIVE" },
                { n:"Vision Engine", s:"TRACKING" },
                { n:"SafetyNet AI",  s:"ARMED" },
                { n:"RAG Pipeline",  s:"READY" },
              ].map(sys => (
                <div key={sys.n} className="flex items-center justify-between">
                  <span className="font-mono text-xs text-white/45">{sys.n}</span>
                  <div className="flex items-center gap-1.5"><span className="status-dot status-active" /><span className="font-mono text-xs text-apex-green">{sys.s}</span></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
