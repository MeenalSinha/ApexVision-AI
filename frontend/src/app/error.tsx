"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ApexVision] Error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-apex-black text-white flex items-center justify-center grid-bg">
      <div className="max-w-md mx-auto px-8 text-center">
        {/* Error indicator */}
        <div className="w-16 h-16 mx-auto mb-6 border border-apex-red/40 flex items-center justify-center corner-cut-lg">
          <span className="font-display font-black text-2xl text-apex-red">!</span>
        </div>

        <div className="font-mono text-xs text-apex-red tracking-widest mb-3">
          SYSTEM FAULT DETECTED
        </div>
        <h1 className="font-display font-black text-4xl text-white mb-4 tracking-tight">
          APEX<span className="text-apex-red">ERROR</span>
        </h1>
        <p className="text-white/50 text-sm font-body leading-relaxed mb-2">
          An unexpected error occurred in the ApexVision AI platform.
        </p>
        {error.digest && (
          <p className="font-mono text-xs text-white/25 mb-6">
            Error ID: {error.digest}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
          <button
            onClick={reset}
            className="bg-apex-accent text-apex-black font-display font-bold text-sm px-8 py-3 corner-cut hover:bg-white transition-colors tracking-widest"
          >
            RESTART MODULE
          </button>
          <Link
            href="/dashboard"
            className="border border-apex-border text-white/60 hover:text-apex-accent hover:border-apex-accent/40 font-mono text-xs px-8 py-3 corner-cut transition-colors tracking-widest flex items-center justify-center"
          >
            RETURN TO DASHBOARD
          </Link>
        </div>

        <div className="mt-8 apex-panel p-4 corner-cut text-left">
          <div className="font-mono text-xs text-white/25 tracking-widest mb-2">
            DIAGNOSTIC INFO
          </div>
          <div className="font-mono text-xs text-white/40 break-all">
            {error.message || "Unknown error"}
          </div>
        </div>
      </div>
    </div>
  );
}
