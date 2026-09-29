"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hue: number;
  baseAlpha: number;
  twinkleSpeed: number;
  twinklePhase: number;
}

const LINK_DISTANCE = 150;
const CURSOR_DISTANCE = 220;
const DRIFT_SPEED = 0.18;
const ATTRACT_STRENGTH = 0.028;
const SWIRL_STRENGTH = 0.012;
const MAX_SPEED = 0.9;
const HUE_MIN = 190; // cyan
const HUE_MAX = 320; // pink/violet

/**
 * A dense, cursor-reactive constellation of glowing, multi-hued particles — modeled on
 * antigravity.google's hero animation (additive-glow dots, gravitational pull toward the
 * cursor, drifting connective lines) rather than the earlier flat cyan-only version. Mount
 * inside a `position: relative` container; this renders an absolutely-positioned canvas behind
 * the container's content (pair with `pointer-events-none` and a lower z-index on the canvas,
 * higher z-index on the real content).
 */
export default function CursorConstellation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let particles: Particle[] = [];
    let mouse = { x: -9999, y: -9999, active: false };
    let animationFrame = 0;
    let t = 0;

    const resize = () => {
      const rect = parent.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const particleCount = () => Math.min(220, Math.max(70, Math.floor((width * height) / 9000)));

    const initParticles = () => {
      particles = Array.from({ length: particleCount() }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * DRIFT_SPEED,
        vy: (Math.random() - 0.5) * DRIFT_SPEED,
        radius: 1 + Math.random() * 1.8,
        hue: HUE_MIN + Math.random() * (HUE_MAX - HUE_MIN),
        baseAlpha: 0.45 + Math.random() * 0.4,
        twinkleSpeed: 0.5 + Math.random() * 1.2,
        twinklePhase: Math.random() * Math.PI * 2,
      }));
    };

    resize();
    initParticles();

    const handleMouseMove = (e: MouseEvent) => {
      const rect = parent.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.active = true;
    };
    const handleMouseLeave = () => {
      mouse.active = false;
    };
    const handleResize = () => {
      resize();
      initParticles();
    };

    parent.addEventListener("mousemove", handleMouseMove);
    parent.addEventListener("mouseleave", handleMouseLeave);
    window.addEventListener("resize", handleResize);

    const draw = () => {
      t += 1;
      ctx.clearRect(0, 0, width, height);

      // Soft glowing halo centered on the cursor — the "gravity well" the particles react to.
      if (mouse.active) {
        const glow = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, CURSOR_DISTANCE);
        glow.addColorStop(0, "rgba(168, 139, 250, 0.10)");
        glow.addColorStop(1, "rgba(168, 139, 250, 0)");
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, width, height);
      }

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;

        if (mouse.active) {
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          if (dist < CURSOR_DISTANCE) {
            const pull = (1 - dist / CURSOR_DISTANCE) * ATTRACT_STRENGTH;
            p.vx += (dx / dist) * pull;
            p.vy += (dy / dist) * pull;
            // Slight tangential nudge so particles swirl around the cursor instead of piling
            // straight into it.
            const swirl = (1 - dist / CURSOR_DISTANCE) * SWIRL_STRENGTH;
            p.vx += (-dy / dist) * swirl;
            p.vy += (dx / dist) * swirl;
          }
        }

        // Gentle drag back toward drift speed so particles don't accelerate forever.
        p.vx *= 0.985;
        p.vy *= 0.985;
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (speed > MAX_SPEED) {
          p.vx = (p.vx / speed) * MAX_SPEED;
          p.vy = (p.vy / speed) * MAX_SPEED;
        }

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;
        p.x = Math.max(0, Math.min(width, p.x));
        p.y = Math.max(0, Math.min(height, p.y));
      }

      ctx.globalCompositeOperation = "lighter";

      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];

        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < LINK_DISTANCE) {
            const opacity = (1 - dist / LINK_DISTANCE) * 0.16;
            const gradient = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
            gradient.addColorStop(0, `hsla(${a.hue}, 90%, 70%, ${opacity})`);
            gradient.addColorStop(1, `hsla(${b.hue}, 90%, 70%, ${opacity})`);
            ctx.strokeStyle = gradient;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }

        if (mouse.active) {
          const dx = a.x - mouse.x;
          const dy = a.y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CURSOR_DISTANCE) {
            const opacity = (1 - dist / CURSOR_DISTANCE) * 0.4;
            ctx.strokeStyle = `hsla(${a.hue}, 90%, 75%, ${opacity})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.stroke();
          }
        }
      }

      for (const p of particles) {
        const twinkle = 0.65 + 0.35 * Math.sin(t * 0.02 * p.twinkleSpeed + p.twinklePhase);
        const alpha = p.baseAlpha * twinkle;

        // Soft outer glow, then a bright core — gives each dot the additive "star" look.
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 4);
        glow.addColorStop(0, `hsla(${p.hue}, 95%, 75%, ${alpha * 0.9})`);
        glow.addColorStop(1, `hsla(${p.hue}, 95%, 75%, 0)`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `hsla(${p.hue}, 95%, 85%, ${alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalCompositeOperation = "source-over";

      animationFrame = requestAnimationFrame(draw);
    };

    animationFrame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animationFrame);
      parent.removeEventListener("mousemove", handleMouseMove);
      parent.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none"
    />
  );
}
