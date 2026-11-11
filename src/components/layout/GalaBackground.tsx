"use client";

import { useEffect, useRef } from "react";

/**
 * Fondo de gala: degradado (CSS) + destellos dorados tipo bokeh (canvas).
 * - Se pausa cuando la pestaña está oculta.
 * - Con prefers-reduced-motion dibuja un solo cuadro estático.
 * - Es decorativo: aria-hidden y sin eventos de puntero.
 */

export interface Particle {
  x: number;
  y: number;
  /** Radio del núcleo en px CSS (el halo se dibuja más grande). */
  radius: number;
  /** Opacidad base 0–1. */
  alpha: number;
  /** Velocidad en px por segundo (vy negativa = sube). */
  vx: number;
  vy: number;
  /** Parpadeo: fase inicial y velocidad en radianes por segundo. */
  phase: number;
  twinkleSpeed: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// TODO (tu turno, opcional): esta función define la "personalidad" del fondo.
// Hoy: casi todos los destellos son diminutos y unos pocos son grandes y tenues
// (como el bokeh de una cámara: lo desenfocado se ve más grande y más suave).
// Prueba a cambiar la distribución de tamaños, cuánto brillan o qué tan rápido
// suben, y mira el resultado con `npm run dev`.
// ─────────────────────────────────────────────────────────────────────────────
function createParticle(width: number, height: number): Particle {
  const sizeRoll = Math.random() ** 3; // sesgado hacia 0 → mayoría pequeños
  const radius = 0.6 + sizeRoll * 3.4;
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    radius,
    alpha: 0.55 - sizeRoll * 0.35 + Math.random() * 0.15, // grandes = más tenues
    vx: (Math.random() - 0.5) * 4,
    vy: -(3 + Math.random() * 9),
    phase: Math.random() * Math.PI * 2,
    twinkleSpeed: 0.4 + Math.random() * 0.9,
  };
}

/** Cuántos destellos según el área: pocos en celular, más en el proyector. */
function targetCount(width: number, height: number) {
  return Math.round(Math.min(64, Math.max(18, (width * height) / 26000)));
}

/** Pre-renderiza el halo dorado una sola vez; luego cada destello es un drawImage. */
function createGlowSprite(): HTMLCanvasElement {
  const size = 64;
  const sprite = document.createElement("canvas");
  sprite.width = sprite.height = size;
  const g = sprite.getContext("2d");
  if (!g) return sprite;
  const gradient = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(243, 226, 169, 1)"); // --gold-soft
  gradient.addColorStop(0.18, "rgba(243, 226, 169, 0.9)");
  gradient.addColorStop(0.4, "rgba(212, 175, 55, 0.35)"); // --gold
  gradient.addColorStop(1, "rgba(212, 175, 55, 0)");
  g.fillStyle = gradient;
  g.fillRect(0, 0, size, size);
  return sprite;
}

export function GalaBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const sprite = createGlowSprite();
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const particles: Particle[] = [];
    let width = 0;
    let height = 0;
    let frameId = 0;
    let lastTime = 0;

    function resize() {
      // Limitar el devicePixelRatio a 2: en pantallas 3x no se nota y cuesta el doble.
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas!.width = Math.round(width * dpr);
      canvas!.height = Math.round(height * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Ajustar la cantidad sin regenerar todo (en el celular la barra de
      // direcciones cambia el alto al hacer scroll y no queremos saltos).
      const count = targetCount(width, height);
      while (particles.length < count) particles.push(createParticle(width, height));
      particles.length = count;
      for (const p of particles) {
        p.x = ((p.x % width) + width) % width;
        p.y = ((p.y % height) + height) % height;
      }
    }

    function draw(time: number) {
      ctx!.clearRect(0, 0, width, height);
      ctx!.globalCompositeOperation = "lighter"; // los halos se suman como luz
      const t = time / 1000;
      for (const p of particles) {
        const twinkle = 0.65 + 0.35 * Math.sin(p.phase + t * p.twinkleSpeed);
        const size = p.radius * 9;
        ctx!.globalAlpha = p.alpha * twinkle;
        ctx!.drawImage(sprite, p.x - size / 2, p.y - size / 2, size, size);
      }
      ctx!.globalAlpha = 1;
      ctx!.globalCompositeOperation = "source-over";
    }

    function step(dt: number) {
      for (const p of particles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        const margin = p.radius * 9;
        if (p.y < -margin) {
          p.y = height + margin;
          p.x = Math.random() * width;
        }
        if (p.x < -margin) p.x = width + margin;
        else if (p.x > width + margin) p.x = -margin;
      }
    }

    function loop(time: number) {
      // dt acotado: al volver de otra pestaña no queremos un salto brusco.
      const dt = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 0;
      lastTime = time;
      step(dt);
      draw(time);
      frameId = requestAnimationFrame(loop);
    }

    function start() {
      stop();
      if (motionQuery.matches || document.hidden) {
        draw(0); // un cuadro estático, sin animación
        return;
      }
      lastTime = 0;
      frameId = requestAnimationFrame(loop);
    }

    function stop() {
      cancelAnimationFrame(frameId);
      frameId = 0;
    }

    function handleResize() {
      resize();
      if (!frameId) draw(0);
    }

    resize();
    start();

    window.addEventListener("resize", handleResize);
    document.addEventListener("visibilitychange", start);
    motionQuery.addEventListener("change", start);

    return () => {
      stop();
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("visibilitychange", start);
      motionQuery.removeEventListener("change", start);
    };
  }, []);

  return (
    <div aria-hidden="true" className="gala-backdrop pointer-events-none fixed inset-0 z-0">
      <canvas ref={canvasRef} className="absolute inset-0 size-full opacity-80" />
    </div>
  );
}
