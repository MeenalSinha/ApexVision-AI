"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { queryRegulation, getRegulationDocs, type RegulationResult } from "@/lib/api";

interface Msg { role:"user"|"assistant"; text: string; data?: RegulationResult; }

const QUICK = [
  "Can the driver legally pit under current safety car conditions?",
  "Is DRS allowed in wet conditions?",
  "What are the penalties for track limits violations?",
  "When must a driver use both tyre compounds?",
  "What constitutes an unsafe pit release?",
  "Are team orders permitted in Formula 1?",
  "What is the minimum weight of the car and driver?",
  "Can a car be repaired under parc ferme?",
];

const PC = (risk: string) => risk === "none" || risk === "low" ? "text-apex-green" : risk === "medium" ? "text-apex-amber" : "text-apex-red";

export default function RegulationPage() {
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "assistant", text: "PitWall-IQ online. FIA regulation knowledge base active — 4 documents indexed via Docling, 391 articles available. Ask any race legality question.", data: { answer:"", confidence:1, regulatory_article:"System", source:"ApexVision PitWall-IQ", penalty_risk:"none", compliance_status:"compliant", precedents:[] } },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [docs, setDocs] = useState<any[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getRegulationDocs().then((d: any) => setDocs(d.documents ?? [])).catch(() => {});
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const ask = async (q: string) => {
    if (!q.trim() || loading) return;
    setInput("");
    setLoading(true);
    setMsgs(p => [...p, { role: "user", text: q }]);
    try {
      const result = await queryRegulation(q);
      setMsgs(p => [...p, { role: "assistant", text: result.answer, data: result }]);
    } catch {
      setMsgs(p => [...p, { role: "assistant", text: "Unable to reach PitWall-IQ. Please check the backend connection." }]);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-apex-black text-white flex flex-col">
      <div className="border-b border-apex-border/60 px-6 py-3 flex items-center gap-4 bg-apex-void/80 sticky top-0 z-50">
        <Link href="/dashboard" className="font-mono text-xs text-white/40 hover:text-apex-accent transition-colors tracking-widest">DASHBOARD</Link>
        <span className="text-white/20">/</span>
        <span className="font-mono text-xs text-apex-accent tracking-widest">PITWALL-IQ</span>
        <div className="ml-auto flex items-center gap-3">
          <span className="status-dot status-active" />
          <span className="font-mono text-xs text-apex-green">DOCLING RAG ACTIVE</span>
          <span className="font-mono text-xs text-white/25">391 ARTICLES</span>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden max-h-[calc(100vh-44px)]">
        {/* Sidebar */}
        <div className="w-72 border-r border-apex-border/40 flex flex-col flex-shrink-0">
          <div className="p-4 border-b border-apex-border/40">
            <div className="font-mono text-xs text-apex-accent tracking-widest mb-1">MODULE 06</div>
            <div className="font-display font-black text-xl">PITWALL-IQ</div>
            <div className="text-white/40 text-xs font-body mt-1">Docling + IBM Granite RAG</div>
          </div>
          <div className="p-4 border-b border-apex-border/40">
            <div className="font-mono text-xs text-white/30 tracking-widest mb-3">INDEXED DOCUMENTS</div>
            <div className="space-y-2">
              {docs.length > 0 ? docs.map((d: any) => (
                <div key={d.name} className="bg-apex-panel/60 p-2.5 rounded">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="status-dot status-active w-1.5 h-1.5" />
                    <span className="font-mono text-xs text-white/65">{d.name}</span>
                  </div>
                  <div className="font-mono text-xs text-white/30">{d.articles} articles</div>
                </div>
              )) : [
                "FIA Sporting Regulations 2024",
                "FIA Technical Regulations 2024",
                "FIA Financial Regulations 2024",
                "International Sporting Code 2024",
              ].map(name => (
                <div key={name} className="bg-apex-panel/60 p-2.5 rounded">
                  <div className="flex items-center gap-1.5">
                    <span className="status-dot status-active w-1.5 h-1.5" />
                    <span className="font-mono text-xs text-white/65">{name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <div className="font-mono text-xs text-white/30 tracking-widest mb-3">QUICK QUERIES</div>
            <div className="space-y-1.5">
              {QUICK.map(q => (
                <button key={q} onClick={() => ask(q)}
                  className="w-full text-left text-xs text-white/50 hover:text-apex-accent bg-apex-panel/40 hover:bg-apex-accent/10 border border-apex-border/30 hover:border-apex-accent/30 p-2.5 rounded transition-all font-body leading-relaxed">
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Chat */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role==="user"?"justify-end":"justify-start"}`}>
                {m.role === "assistant" && (
                  <div className="w-7 h-7 bg-apex-accent/20 border border-apex-accent/30 corner-cut flex items-center justify-center mr-3 flex-shrink-0 mt-1">
                    <span className="font-display font-black text-xs text-apex-accent">P</span>
                  </div>
                )}
                <div className="max-w-2xl">
                  {m.role === "user" ? (
                    <div className="bg-apex-panel border border-apex-border/60 rounded-lg px-4 py-3 font-body text-sm text-white/90">{m.text}</div>
                  ) : (
                    <div className="apex-panel rounded-lg p-4">
                      {m.text && <p className="text-white/85 text-sm font-body leading-relaxed mb-3">{m.text}</p>}
                      {m.data && (m.data.regulatory_article || m.data.confidence) && (
                        <div className="border-t border-apex-border/40 pt-3 flex flex-wrap gap-4">
                          {m.data.regulatory_article && m.data.regulatory_article !== "System" && (
                            <div><span className="font-mono text-xs text-white/30">ARTICLE </span><span className="font-mono text-xs text-apex-accent">{m.data.regulatory_article}</span></div>
                          )}
                          {m.data.source && (
                            <div><span className="font-mono text-xs text-white/30">SOURCE </span><span className="font-mono text-xs text-white/55">{m.data.source}</span></div>
                          )}
                          {m.data.confidence > 0 && m.data.confidence < 1 && (
                            <div><span className="font-mono text-xs text-white/30">CONFIDENCE </span><span className="font-mono text-xs text-apex-green data-value">{Math.round(m.data.confidence*100)}%</span></div>
                          )}
                          {m.data.penalty_risk && m.data.penalty_risk !== "none" && (
                            <div><span className="font-mono text-xs text-white/30">PENALTY RISK </span><span className={`font-mono text-xs data-value ${PC(m.data.penalty_risk)}`}>{m.data.penalty_risk.toUpperCase()}</span></div>
                          )}
                          {m.data.compliance_status && m.data.source !== "System" && (
                            <div><span className="font-mono text-xs text-white/30">STATUS </span><span className={`font-mono text-xs data-value ${m.data.compliance_status==="compliant"?"text-apex-green":"text-apex-amber"}`}>{m.data.compliance_status.toUpperCase()}</span></div>
                          )}
                          {m.data.precedents && m.data.precedents.length > 0 && (
                            <div className="w-full mt-1">
                              <span className="font-mono text-xs text-white/25">PRECEDENTS: </span>
                              <span className="font-mono text-xs text-white/45">{m.data.precedents.join(" | ")}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="w-7 h-7 bg-apex-accent/20 border border-apex-accent/30 corner-cut flex items-center justify-center mr-3 flex-shrink-0">
                  <span className="font-display font-black text-xs text-apex-accent">P</span>
                </div>
                <div className="apex-panel rounded-lg p-4 flex items-center gap-3">
                  <div className="flex gap-1">{[0,1,2].map(i=><div key={i} className="w-1.5 h-1.5 bg-apex-accent rounded-full animate-pulse" style={{animationDelay:`${i*.2}s`}} />)}</div>
                  <span className="font-mono text-xs text-white/40">Querying FIA regulation knowledge base via IBM Granite...</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-apex-border/40 p-4 bg-apex-void/80">
            <div className="flex gap-3">
              <input type="text" value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && ask(input)}
                placeholder="Ask about FIA regulations, penalties, race legality..."
                className="flex-1 bg-apex-panel border border-apex-border/60 focus:border-apex-accent/40 text-white placeholder-white/25 font-body text-sm px-4 py-3 rounded outline-none transition-colors" />
              <button onClick={() => ask(input)} disabled={loading||!input.trim()}
                className="bg-apex-accent text-apex-black font-display font-bold text-sm px-6 py-3 corner-cut hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed tracking-widest">
                QUERY
              </button>
            </div>
            <div className="mt-2 font-mono text-xs text-white/20">
              Powered by Docling document parsing + IBM Granite RAG + ChromaDB vector store
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
