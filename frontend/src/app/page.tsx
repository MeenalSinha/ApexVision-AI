"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getHealth } from "@/lib/api";

const BOOT = [
  "INITIALIZING APEXVISION AI CORE...",
  "LOADING IBM GRANITE NEURAL ENGINE...",
  "CONNECTING WATSONX.AI INFERENCE...",
  "ACTIVATING YOLOV8 COMPUTER VISION PIPELINE...",
  "ENGAGING BYTETRACK MULTI-OBJECT TRACKER...",
  "LOADING FIA REGULATION KNOWLEDGE BASE VIA DOCLING...",
  "LANGFLOW MULTI-AGENT ORCHESTRATION — ACTIVE...",
  "SAFETYNET AI INCIDENT PREDICTOR — ARMED...",
  "RACEMIND STRATEGY ENGINE — READY...",
  "APEXCOACH DRIVER INTELLIGENCE — ONLINE...",
  "PITLANE PULSE IBM GRANITE COMMENTARY — LIVE...",
  "AR VISUALIZATION LAYER — INITIALIZED...",
  "ALL SYSTEMS OPERATIONAL.",
];

const MODULES = [
  { title: "Vision Track",  sub: "YOLOv8 + ByteTrack",     color: "#00E5FF", href: "/dashboard",  badge: "MODULE 01" },
  { title: "PitLane Pulse", sub: "IBM Granite Commentary",  color: "#7B61FF", href: "/dashboard",  badge: "MODULE 02" },
  { title: "ApexCoach AI",  sub: "Driver Intelligence",     color: "#00FF88", href: "/coaching",   badge: "MODULE 03" },
  { title: "SafetyNet AI",  sub: "Incident Prediction",     color: "#FF2442", href: "/incidents",  badge: "MODULE 04" },
  { title: "RaceMind AI",   sub: "Strategy Intelligence",   color: "#FFB800", href: "/strategy",   badge: "MODULE 05" },
  { title: "PitWall-IQ",    sub: "Docling + RAG",           color: "#00E5FF", href: "/regulation", badge: "MODULE 06" },
];

const IBM_TECH = [
  { name: "IBM Granite",  role: "Primary AI reasoning across all agents",            color: "#00E5FF" },
  { name: "Watsonx.ai",   role: "Inference endpoint for all LLM calls",              color: "#7B61FF" },
  { name: "LangFlow",     role: "Multi-agent pipeline orchestration",                color: "#00FF88" },
  { name: "Docling",      role: "PDF intelligence for FIA regulation parsing",       color: "#FFB800" },
];

export default function HomePage() {
  const [bootIdx, setBootIdx]     = useState(0);
  const [booted, setBooted]       = useState(false);
  const [show, setShow]           = useState(false);
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Boot sequence
  useEffect(() => {
    if (bootIdx < BOOT.length - 1) {
      const t = setTimeout(() => setBootIdx(i => i + 1), bootIdx === 0 ? 200 : 110 + Math.random() * 60);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => { setBooted(true); setShow(true); }, 600);
      return () => clearTimeout(t);
    }
  }, [bootIdx]);

  // API health check
  useEffect(() => {
    getHealth().then(() => setApiOnline(true)).catch(() => setApiOnline(false));
  }, []);

  // Canvas particle animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);

    const particles: {x:number;y:number;vx:number;vy:number;life:number;maxLife:number;size:number}[] = [];
    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        life: Math.random() * 200,
        maxLife: 150 + Math.random() * 100,
        size: Math.random() * 1.5 + 0.5,
      });
    }

    let animId: number;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Grid
      ctx.strokeStyle = "rgba(0,229,255,0.04)";
      ctx.lineWidth = 1;
      const gs = 60;
      for (let x = 0; x < canvas.width; x += gs) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gs) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      }

      // Scan line
      const t = Date.now() * 0.0004;
      const scanY = ((t % 1) * canvas.height * 2) % (canvas.height + 120) - 60;
      const sg = ctx.createLinearGradient(0, scanY - 80, 0, scanY + 80);
      sg.addColorStop(0, "transparent");
      sg.addColorStop(0.5, "rgba(0,229,255,0.04)");
      sg.addColorStop(1, "transparent");
      ctx.fillStyle = sg;
      ctx.fillRect(0, scanY - 80, canvas.width, 160);

      // Particles
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy; p.life++;
        if (p.life > p.maxLife) {
          p.x = Math.random() * canvas.width;
          p.y = Math.random() * canvas.height;
          p.life = 0;
        }
        const alpha = Math.sin((p.life / p.maxLife) * Math.PI) * 0.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,229,255,${alpha})`;
        ctx.fill();
      }

      animId = requestAnimationFrame(render);
    };
    render();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);

  return (
    <div className="relative min-h-screen bg-apex-black text-white overflow-hidden">
      {/* Background canvas */}
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />

      {/* Boot screen */}
      {!booted && (
        <div className="fixed inset-0 z-50 bg-apex-black flex flex-col items-center justify-center px-6">
          <div className="w-20 h-20 mb-8 border border-apex-accent/40 corner-cut-lg flex items-center justify-center">
            <span className="font-display font-black text-3xl text-apex-accent tracking-tighter">AV</span>
          </div>
          <div className="font-mono text-xs text-apex-accent/80 tracking-widest mb-6">IBM SKILLSBUILD AI BUILDERS CHALLENGE</div>
          <div className="w-full max-w-lg space-y-1">
            {BOOT.slice(0, bootIdx + 1).map((line, i) => (
              <div key={i} className={`font-mono text-xs flex items-center gap-2 transition-opacity duration-200 ${i === bootIdx ? "text-white" : "text-white/30"}`}>
                <span className={i === bootIdx ? "text-apex-accent" : "text-apex-accent/30"}>›</span>
                {line}
                {i === bootIdx && <span className="inline-block w-2 h-3 bg-apex-accent ml-1 animate-pulse" />}
              </div>
            ))}
          </div>
          <div className="mt-8 w-full max-w-lg bg-apex-panel h-1 rounded-full overflow-hidden">
            <div
              className="h-full bg-apex-accent transition-all duration-200"
              style={{ width: `${((bootIdx + 1) / BOOT.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className={`relative z-10 transition-opacity duration-700 ${show ? "opacity-100" : "opacity-0"}`}>

        {/* Header */}
        <header className="border-b border-apex-border/40 px-6 py-4 flex items-center justify-between sticky top-0 bg-apex-black/90 backdrop-blur-sm z-40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 border border-apex-accent/40 corner-cut flex items-center justify-center">
              <span className="font-display font-black text-sm text-apex-accent">AV</span>
            </div>
            <span className="font-display font-bold text-lg tracking-wide">APEXVISION AI</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${apiOnline === true ? "bg-apex-green animate-pulse" : apiOnline === false ? "bg-apex-red" : "bg-white/20 animate-pulse"}`} />
              <span className="font-mono text-xs text-white/40">
                {apiOnline === true ? "API ONLINE" : apiOnline === false ? "API OFFLINE" : "CHECKING..."}
              </span>
            </div>
            <Link href="/dashboard" className="bg-apex-accent text-apex-black font-display font-bold text-xs px-5 py-2 corner-cut hover:bg-white transition-colors tracking-widest">
              LAUNCH
            </Link>
          </div>
        </header>

        {/* Hero */}
        <section className="px-6 pt-24 pb-20 max-w-7xl mx-auto">
          <div className="max-w-4xl">
            <div className="font-mono text-xs text-apex-accent tracking-widest mb-4 flex items-center gap-2">
              <span className="status-dot status-active" />
              IBM SKILLSBUILD AI BUILDERS CHALLENGE — GRAND PRIZE SUBMISSION
            </div>
            <h1 className="font-display font-black text-6xl md:text-8xl tracking-tight leading-none mb-6">
              APEX<span className="text-apex-accent">VISION</span>{" "}
              <span className="text-white/20">AI</span>
            </h1>
            <p className="text-white/60 text-xl md:text-2xl font-body font-light leading-relaxed max-w-2xl mb-8">
              Real-Time Motorsport Intelligence Platform.{" "}
              <span className="text-white">IBM Granite</span> commentary.{" "}
              <span className="text-apex-accent">YOLOv8</span> computer vision.{" "}
              <span className="text-white">Watsonx.ai</span> strategy.{" "}
              <span className="text-apex-accent">LangFlow</span> orchestration.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/dashboard"
                className="group bg-apex-accent text-apex-black font-display font-black text-sm px-10 py-4 corner-cut-lg hover:bg-white transition-all duration-200 tracking-widest flex items-center gap-2"
              >
                LAUNCH COMMAND CENTER
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </Link>
              <Link
                href="/dashboard?demo=true"
                className="border border-apex-accent/30 text-apex-accent hover:border-apex-accent/60 font-mono text-xs px-10 py-4 corner-cut-lg transition-colors tracking-widest flex items-center gap-2"
              >
                DEMO MODE
              </Link>
            </div>
          </div>
        </section>

        {/* IBM Technology Strip */}
        <section className="border-y border-apex-border/40 px-6 py-5 bg-apex-void/40">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-6">
            <span className="font-mono text-xs text-white/25 tracking-widest">POWERED BY</span>
            {IBM_TECH.map((t) => (
              <div key={t.name} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: t.color }} />
                <span className="font-display font-bold text-sm tracking-wide" style={{ color: t.color }}>
                  {t.name}
                </span>
                <span className="text-white/30 text-xs font-body hidden md:block">— {t.role}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Modules Grid */}
        <section className="px-6 py-16 max-w-7xl mx-auto">
          <div className="mb-10">
            <div className="font-mono text-xs text-white/30 tracking-widest mb-2">INTELLIGENCE MODULES</div>
            <h2 className="font-display font-black text-3xl tracking-tight">SEVEN SYSTEMS. ONE PLATFORM.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {MODULES.map((m) => (
              <Link
                key={m.title}
                href={m.href}
                className="group apex-panel p-6 corner-cut hover:border-white/10 transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-4">
                  <div
                    className="w-10 h-10 corner-cut flex items-center justify-center text-apex-black font-display font-black text-sm"
                    style={{ background: m.color }}
                  >
                    {m.badge.slice(-2)}
                  </div>
                  <div className="font-mono text-xs tracking-widest" style={{ color: m.color }}>
                    {m.badge}
                  </div>
                </div>
                <h3 className="font-display font-black text-xl tracking-tight mb-1 group-hover:text-apex-accent transition-colors">
                  {m.title}
                </h3>
                <p className="font-mono text-xs tracking-wider" style={{ color: m.color + "90" }}>
                  {m.sub}
                </p>
              </Link>
            ))}
          </div>
        </section>

        {/* Quick nav links */}
        <section className="px-6 pb-16 max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              ["LIVE DASHBOARD",  "/dashboard",  "apex-accent"],
              ["RACE STRATEGY",   "/strategy",   "apex-amber"],
              ["ANALYTICS",       "/analytics",  "apex-accent"],
              ["REPLAY ANALYSIS", "/replay",     "apex-green"],
            ].map(([label, href, color]) => (
              <Link
                key={label}
                href={href}
                className={`apex-panel p-4 corner-cut hover:border-${color}/20 transition-colors text-center group`}
              >
                <div className={`font-mono text-xs text-${color}/60 group-hover:text-${color} transition-colors tracking-widest`}>
                  {label}
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-apex-border/40 px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="font-mono text-xs text-white/25">
            APEXVISION AI — IBM SKILLSBUILD AI BUILDERS CHALLENGE
          </div>
          <div className="flex items-center gap-4 font-mono text-xs text-white/25">
            <span>IBM GRANITE</span>
            <span className="text-white/10">|</span>
            <span>WATSONX.AI</span>
            <span className="text-white/10">|</span>
            <span>LANGFLOW</span>
            <span className="text-white/10">|</span>
            <span>DOCLING</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
