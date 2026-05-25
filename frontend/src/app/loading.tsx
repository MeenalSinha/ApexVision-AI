export default function Loading() {
  return (
    <div className="min-h-screen bg-apex-black flex items-center justify-center grid-bg">
      <div className="text-center">
        {/* Animated logo */}
        <div className="w-16 h-16 mx-auto mb-6 relative">
          <div className="absolute inset-0 border border-apex-accent/30 corner-cut-lg animate-glow-pulse" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-display font-black text-xl text-apex-accent">AV</span>
          </div>
        </div>

        {/* Scanning line animation */}
        <div className="w-48 mx-auto mb-4 h-px bg-apex-panel overflow-hidden relative">
          <div
            className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-apex-accent to-transparent"
            style={{ animation: "shimmer 1.5s ease-in-out infinite" }}
          />
        </div>

        <div className="font-mono text-xs text-apex-accent/60 tracking-widest animate-pulse">
          LOADING AI SYSTEMS...
        </div>
      </div>
    </div>
  );
}
