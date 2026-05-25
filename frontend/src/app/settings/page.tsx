"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getHealth, getRegulationDocs } from "@/lib/api";

interface SystemStatus {
  status: string;
  ibm_granite: string;
  watsonx_configured: boolean;
  modules: string[];
}

export default function SettingsPage() {
  const [health, setHealth] = useState<SystemStatus | null>(null);
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiUrl] = useState(process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000");
  const [wsUrl]  = useState(process.env.NEXT_PUBLIC_WS_URL  || "ws://localhost:8000");

  useEffect(() => {
    Promise.all([
      getHealth().then((h: any) => setHealth(h)).catch(() => {}),
      getRegulationDocs().then((d: any) => setDocs(d.documents ?? [])).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const modules = [
    { id:"vision",     name:"Vision Tracking",   tech:"YOLOv8 + ByteTrack + Optical Flow", desc:"Real-time car detection, trajectory mapping, overtake detection",          color:"#00E5FF", ok:true },
    { id:"commentary", name:"PitLane Pulse",      tech:"IBM Granite via Watsonx.ai",        desc:"Contextual race commentary, event narration, TTS-ready output",              color:"#7B61FF", ok:health?.watsonx_configured ?? false },
    { id:"coaching",   name:"ApexCoach AI",       tech:"IBM Granite + Racing Line Analysis",desc:"Corner scoring, braking optimization, lap consistency, throttle analysis",   color:"#00FF88", ok:health?.watsonx_configured ?? false },
    { id:"incidents",  name:"SafetyNet AI",       tech:"Physics Engine + Risk Model",       desc:"Collision prediction, closing-rate analysis, tyre stress, aggression detect",color:"#FF2442", ok:true },
    { id:"strategy",   name:"RaceMind AI",        tech:"IBM Granite + Tyre Degradation",    desc:"Pit-stop windows, undercut/overcut prediction, safety car strategy",         color:"#FFB800", ok:true },
    { id:"regulation", name:"PitWall-IQ",         tech:"Docling + ChromaDB + Granite RAG",  desc:"FIA regulation Q&A, penalty prediction, compliance reasoning",               color:"#00E5FF", ok:true },
    { id:"ar",         name:"AR Visualization",   tech:"Canvas2D + WebGL",                  desc:"Speed vectors, risk zones, trajectory arcs, tyre indicators, braking halos", color:"#7B61FF", ok:true },
  ];

  return (
    <div className="min-h-screen bg-apex-black text-white">
      <div className="border-b border-apex-border/60 px-6 py-3 flex items-center gap-4 bg-apex-void/80 sticky top-0 z-50">
        <Link href="/dashboard" className="font-mono text-xs text-white/40 hover:text-apex-accent transition-colors tracking-widest">DASHBOARD</Link>
        <span className="text-white/20">/</span>
        <span className="font-mono text-xs text-apex-accent tracking-widest">SYSTEM STATUS</span>
      </div>

      <div className="p-6 max-w-5xl mx-auto">
        <div className="mb-8">
          <div className="font-mono text-xs text-apex-accent tracking-widest mb-1">SYSTEM</div>
          <h1 className="font-display font-black text-4xl tracking-tight">AI MODULE STATUS</h1>
          <p className="text-white/40 text-sm mt-1 font-body">System health, IBM Granite connection, and module diagnostics</p>
        </div>

        {/* Connection status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          {[
            { l:"API BACKEND", v:loading?"Checking...":health?"ONLINE":"OFFLINE", ok:!!health, sub:apiUrl },
            { l:"IBM GRANITE", v:loading?"Checking...":health?.watsonx_configured?"CONFIGURED":"NOT CONFIGURED", ok:health?.watsonx_configured??false, sub:health?.ibm_granite??"ibm/granite-13b-instruct-v2" },
            { l:"WEBSOCKET", v:"ACTIVE", ok:true, sub:wsUrl },
          ].map(item => (
            <div key={item.l} className="apex-panel p-4 corner-cut">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs text-white/40">{item.l}</span>
                <span className={`status-dot ${item.ok?"status-active":"status-danger"}`} />
              </div>
              <div className={`font-display font-bold text-lg ${item.ok?"text-apex-green":"text-apex-red"}`}>{item.v}</div>
              <div className="font-mono text-xs text-white/25 mt-1 truncate">{item.sub}</div>
            </div>
          ))}
        </div>

        {/* AI modules */}
        <div className="apex-panel p-5 corner-cut mb-6">
          <div className="font-mono text-xs text-white/40 tracking-widest mb-4">AI MODULE DIAGNOSTICS</div>
          <div className="space-y-3">
            {modules.map(m => (
              <div key={m.id} className="flex items-center gap-4 p-3 bg-apex-panel/60 rounded hover:bg-apex-panel transition-colors">
                <div className={`status-dot ${m.ok?"status-active":"status-warning"}`} />
                <div className="w-8 h-8 corner-cut flex items-center justify-center font-display font-black text-sm flex-shrink-0"
                  style={{ background: m.color+"20", color: m.color, border:`1px solid ${m.color}40` }}>
                  {m.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="font-display font-bold text-sm">{m.name}</span>
                    <span className="font-mono text-xs px-2 py-0.5 rounded" style={{ background:m.color+"15", color:m.color }}>{m.tech}</span>
                  </div>
                  <div className="font-body text-xs text-white/45 mt-0.5 truncate">{m.desc}</div>
                </div>
                <div className={`font-mono text-xs font-bold tracking-wider ${m.ok?"text-apex-green":"text-apex-amber"}`}>
                  {m.ok ? "ACTIVE" : "DEMO MODE"}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RAG documents */}
        {docs.length > 0 && (
          <div className="apex-panel p-5 corner-cut mb-6">
            <div className="font-mono text-xs text-white/40 tracking-widest mb-4">PITWALL-IQ KNOWLEDGE BASE</div>
            <div className="space-y-2">
              {docs.map((d: any) => (
                <div key={d.name} className="flex items-center gap-3 p-3 bg-apex-panel/60 rounded">
                  <span className="status-dot status-active" />
                  <span className="font-mono text-xs text-white/70 flex-1">{d.name}</span>
                  <span className="font-mono text-xs text-white/30">{d.articles} articles</span>
                  <span className="font-mono text-xs text-apex-green">INDEXED</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* IBM setup guide */}
        {!health?.watsonx_configured && (
          <div className="apex-panel p-5 corner-cut border border-apex-amber/20">
            <div className="font-mono text-xs text-apex-amber tracking-widest mb-3">IBM WATSONX.AI CONFIGURATION REQUIRED</div>
            <p className="text-white/65 text-sm font-body leading-relaxed mb-4">
              Add your IBM Watsonx.ai credentials to enable real IBM Granite AI inference. Without credentials, all AI modules operate in high-fidelity fallback mode with physics-based responses.
            </p>
            <div className="bg-apex-void p-4 rounded font-mono text-xs text-apex-green space-y-1">
              <div className="text-white/30"># backend/.env</div>
              <div>IBM_WATSONX_URL=https://us-south.ml.cloud.ibm.com</div>
              <div>IBM_WATSONX_API_KEY=your_api_key_here</div>
              <div>IBM_PROJECT_ID=your_project_id_here</div>
              <div>IBM_GRANITE_MODEL=ibm/granite-13b-instruct-v2</div>
            </div>
            <div className="mt-3 flex gap-3">
              <a href="https://cloud.ibm.com/registration" target="_blank" rel="noopener noreferrer"
                className="font-mono text-xs text-apex-accent hover:underline">
                Register IBM Cloud
              </a>
              <span className="text-white/20">|</span>
              <a href="https://www.ibm.com/watsonx" target="_blank" rel="noopener noreferrer"
                className="font-mono text-xs text-apex-accent hover:underline">
                Watsonx.ai Documentation
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
