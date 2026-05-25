import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-apex-black text-white flex items-center justify-center grid-bg">
      <div className="max-w-md mx-auto px-8 text-center">
        <div className="font-display font-black text-8xl text-apex-accent/20 mb-4 tracking-tighter">
          404
        </div>
        <div className="font-mono text-xs text-apex-accent tracking-widest mb-3">
          ROUTE NOT FOUND
        </div>
        <h1 className="font-display font-black text-4xl text-white mb-4 tracking-tight">
          APEX<span className="text-apex-accent">VOID</span>
        </h1>
        <p className="text-white/50 text-sm font-body leading-relaxed mb-8">
          This track section doesn&apos;t exist. The AI can&apos;t navigate here.
          Return to the command center.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="bg-apex-accent text-apex-black font-display font-bold text-sm px-8 py-3 corner-cut hover:bg-white transition-colors tracking-widest"
          >
            RETURN TO BASE
          </Link>
          <Link
            href="/dashboard"
            className="border border-apex-border text-white/60 hover:text-apex-accent hover:border-apex-accent/40 font-mono text-xs px-8 py-3 corner-cut transition-colors tracking-widest"
          >
            DASHBOARD
          </Link>
        </div>

        <div className="mt-12 grid grid-cols-3 gap-3">
          {[
            ["DASHBOARD", "/dashboard"],
            ["STRATEGY", "/strategy"],
            ["COACHING", "/coaching"],
            ["INCIDENTS", "/incidents"],
            ["ANALYTICS", "/analytics"],
            ["PITWALL-IQ", "/regulation"],
          ].map(([label, href]) => (
            <Link
              key={label}
              href={href}
              className="apex-panel p-3 corner-cut hover:border-apex-accent/25 transition-colors"
            >
              <div className="font-mono text-xs text-white/50 hover:text-apex-accent transition-colors tracking-wider">
                {label}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
