/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        apex: {
          black:  "#040407",
          void:   "#08090F",
          panel:  "#0D0F1A",
          border: "#1A1E2E",
          muted:  "#252840",
          accent: "#00E5FF",
          cyan:   "#00C8E0",
          red:    "#FF2442",
          amber:  "#FFB800",
          green:  "#00FF88",
          purple: "#7B61FF",
          text: {
            primary:   "#FFFFFF",
            secondary: "#8892A4",
            muted:     "#4A5568",
          },
        },
      },
      fontFamily: {
        display: ["'Barlow Condensed'", "sans-serif"],
        mono:    ["'JetBrains Mono'",   "monospace"],
        body:    ["'DM Sans'",          "sans-serif"],
        racing:  ["'Rajdhani'",         "sans-serif"],
      },
      backgroundImage: {
        "grid-pattern":   "linear-gradient(rgba(0,229,255,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,229,255,.03) 1px,transparent 1px)",
        "apex-gradient":  "linear-gradient(135deg,#040407 0%,#08090F 50%,#0D0F1A 100%)",
        "panel-gradient": "linear-gradient(180deg,rgba(13,15,26,.95) 0%,rgba(8,9,15,.98) 100%)",
        "accent-glow":    "radial-gradient(ellipse at center,rgba(0,229,255,.15) 0%,transparent 70%)",
        "danger-glow":    "radial-gradient(ellipse at center,rgba(255,36,66,.2) 0%,transparent 60%)",
        "strategy-glow":  "radial-gradient(ellipse at center,rgba(255,184,0,.15) 0%,transparent 60%)",
        "green-glow":     "radial-gradient(ellipse at center,rgba(0,255,136,.12) 0%,transparent 60%)",
      },
      backgroundSize: { grid: "40px 40px" },
      animation: {
        "pulse-slow":  "pulse 3s ease-in-out infinite",
        "glow-pulse":  "glow-pulse 2.5s ease-in-out infinite",
        "risk-flash":  "risk-flash .7s ease-in-out infinite",
        "fade-in":     "fade-in .35s ease forwards",
        "slide-right": "slide-in-right .3s ease forwards",
        "shimmer":     "shimmer 2.5s ease-in-out infinite",
        "skeleton":    "skeleton-slide 1.5s infinite",
      },
      keyframes: {
        "glow-pulse":       { "0%,100%": { boxShadow:"0 0 5px rgba(0,229,255,.25)" }, "50%": { boxShadow:"0 0 18px rgba(0,229,255,.55),0 0 35px rgba(0,229,255,.18)" } },
        "risk-flash":       { "0%,100%": { opacity:"1" }, "50%": { opacity:".25" } },
        "fade-in":          { from:{ opacity:"0", transform:"translateY(8px)" }, to:{ opacity:"1", transform:"translateY(0)" } },
        "slide-in-right":   { from:{ opacity:"0", transform:"translateX(16px)" }, to:{ opacity:"1", transform:"translateX(0)" } },
        "shimmer":          { "100%":{ left:"200%" } },
        "skeleton-slide":   { "0%":{ backgroundPosition:"200% 0" }, "100%":{ backgroundPosition:"-200% 0" } },
      },
      boxShadow: {
        "apex-panel":  "0 0 0 1px rgba(0,229,255,.08),0 4px 24px rgba(0,0,0,.55)",
        "apex-glow":   "0 0 22px rgba(0,229,255,.28),0 0 44px rgba(0,229,255,.1)",
        "danger-glow": "0 0 22px rgba(255,36,66,.35),0 0 44px rgba(255,36,66,.12)",
        "strategy":    "0 0 22px rgba(255,184,0,.25)",
      },
    },
  },
  plugins: [],
};
