"use client";

import { useEffect, useRef } from "react";

interface Car {
  car_id: number;
  x: number;
  y: number;
  angle: number;
  speed_kmh: number;
  tyre_compound: string;
  team: string;
  position: number;
  brake?: number;
  drs?: boolean;
}

interface RiskZone {
  x: number;
  y: number;
  radius: number;
  risk_level: number;
}

interface ARCanvasProps {
  cars: Car[];
  riskZones?: RiskZone[];
  width?: number;
  height?: number;
  className?: string;
  trackWidth?: number;
  trackHeight?: number;
}

const TEAM_COLORS: Record<string, string> = {
  RedStar: "#E8002D",
  SilverArrow: "#00D2BE",
  PrancingHorse: "#DC0000",
  Bull: "#3671C6",
  Azure: "#0090FF",
  Orange: "#FF8000",
};

const TYRE_COLORS: Record<string, string> = {
  Soft: "#FF2442",
  Medium: "#FFB800",
  Hard: "#FFFFFF",
  Inter: "#39B54A",
  Wet: "#0066FF",
};

function riskColor(risk: number): string {
  if (risk >= 0.65) return "#FF2442";
  if (risk >= 0.45) return "#FFB800";
  if (risk >= 0.25) return "#00E5FF";
  return "#00FF88";
}

export default function ARCanvas({
  cars,
  riskZones = [],
  width = 760,
  height = 440,
  className = "",
  trackWidth = 760,
  trackHeight = 440,
}: ARCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const carsRef = useRef(cars);
  const zonesRef = useRef(riskZones);

  // Keep refs in sync without re-creating the animation loop
  carsRef.current = cars;
  zonesRef.current = riskZones;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animId: number;

    const W = canvas.width;
    const H = canvas.height;

    const render = () => {
      ctx.clearRect(0, 0, W, H);

      // Track outline
      ctx.strokeStyle = "rgba(0,229,255,0.07)";
      ctx.lineWidth = 16;
      ctx.beginPath();
      ctx.ellipse(W / 2, H / 2, 240, 140, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "rgba(0,229,255,0.15)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(W / 2, H / 2, 240, 140, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "rgba(0,229,255,0.05)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(W / 2, H / 2, 215, 118, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(W / 2, H / 2, 265, 162, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Risk zones
      for (const zone of zonesRef.current) {
        const zx = (zone.x / trackWidth) * W;
        const zy = (zone.y / trackHeight) * H;
        const zr = (zone.radius / trackWidth) * W;
        const c = riskColor(zone.risk_level);
        const g = ctx.createRadialGradient(zx, zy, 0, zx, zy, zr);
        g.addColorStop(0, c + "30");
        g.addColorStop(0.7, c + "18");
        g.addColorStop(1, "transparent");
        ctx.beginPath();
        ctx.arc(zx, zy, zr, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(zx, zy, zr, 0, Math.PI * 2);
        ctx.strokeStyle = c + "55";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Cars
      for (const car of carsRef.current) {
        const color = TEAM_COLORS[car.team] || "#00E5FF";
        const cx = (car.x / trackWidth) * W;
        const cy = (car.y / trackHeight) * H;
        const ang = (car.angle * Math.PI) / 180;
        const vLen = (car.speed_kmh / 340) * 40;

        // Trajectory arc
        ctx.beginPath();
        for (let s = 0; s <= 10; s++) {
          const px = cx + Math.cos(ang) * (vLen * s) / 4;
          const py = cy + Math.sin(ang) * (vLen * s) / 4;
          if (s === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.strokeStyle = color + "35";
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 5]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Speed vector
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(ang) * vLen, cy + Math.sin(ang) * vLen);
        ctx.strokeStyle = color + "90";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Glow
        const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 15);
        glow.addColorStop(0, color + "50");
        glow.addColorStop(1, "transparent");
        ctx.beginPath();
        ctx.arc(cx, cy, 15, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();

        // Car dot
        ctx.beginPath();
        ctx.arc(cx, cy, 5.5, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        // Tyre ring
        const tc = TYRE_COLORS[car.tyre_compound] || "#fff";
        ctx.beginPath();
        ctx.arc(cx, cy, 8, 0, Math.PI * 2);
        ctx.strokeStyle = tc + "80";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Brake halo
        const brake = car.brake ?? 0;
        if (brake > 0.3) {
          ctx.beginPath();
          ctx.arc(cx, cy, 20 + brake * 10, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255,36,66,${brake * 0.45})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // DRS indicator
        if (car.drs) {
          ctx.fillStyle = "#00FF8888";
          ctx.font = "7px JetBrains Mono, monospace";
          ctx.fillText("DRS", cx - 9, cy + 19);
        }

        // Labels
        ctx.fillStyle = "#fff";
        ctx.font = "bold 8px JetBrains Mono, monospace";
        ctx.fillText(`P${car.position}`, cx + 8, cy - 5);
        ctx.fillStyle = color + "CC";
        ctx.font = "7px JetBrains Mono, monospace";
        ctx.fillText(`${Math.round(car.speed_kmh)}`, cx + 8, cy + 5);
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, []); // Only create loop once

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={`${className}`}
    />
  );
}
