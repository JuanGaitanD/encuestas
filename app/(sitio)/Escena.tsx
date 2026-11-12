"use client";

import { useEffect, useRef } from "react";

/**
 * La escena de la portada sigue al cursor: el marco grande se inclina unos grados y el celular,
 * que está «más cerca», se desplaza en sentido contrario. Solo con puntero fino, en pantallas anchas
 * y sin «reducir movimiento»; sin JS la escena queda en su pose de reposo.
 */
export function Escena({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    const zone = el?.parentElement;
    const fine = matchMedia("(hover: hover) and (pointer: fine) and (min-width: 1024px)");
    const calm = matchMedia("(prefers-reduced-motion: reduce)");
    if (!el || !zone) return;
    let tx = 0, ty = 0, x = 0, y = 0, frame = 0;
    const paint = () => {
      const moving = Math.abs(tx - x) + Math.abs(ty - y) > 0.002;
      // Al llegar se ajusta al destino exacto y se detiene: no hay bucle con el cursor quieto.
      x = moving ? x + (tx - x) * 0.08 : tx;
      y = moving ? y + (ty - y) * 0.08 : ty;
      el.style.setProperty("--gy", `${(x * 4).toFixed(2)}deg`);
      el.style.setProperty("--gx", `${(-y * 2.5).toFixed(2)}deg`);
      el.style.setProperty("--px", `${(-x * 12).toFixed(1)}px`);
      el.style.setProperty("--py", `${(-y * 8).toFixed(1)}px`);
      frame = moving ? requestAnimationFrame(paint) : 0;
    };
    const aim = (nx: number, ny: number) => {
      if (!fine.matches || calm.matches) nx = ny = 0;
      tx = nx;
      ty = ny;
      frame ||= requestAnimationFrame(paint);
    };
    const move = (e: PointerEvent) => {
      const r = zone.getBoundingClientRect();
      aim(((e.clientX - r.left) / r.width) * 2 - 1, ((e.clientY - r.top) / r.height) * 2 - 1);
    };
    const rest = () => aim(0, 0);
    zone.addEventListener("pointermove", move);
    zone.addEventListener("pointerleave", rest);
    calm.addEventListener("change", rest);
    return () => {
      zone.removeEventListener("pointermove", move);
      zone.removeEventListener("pointerleave", rest);
      calm.removeEventListener("change", rest);
      cancelAnimationFrame(frame);
    };
  }, []);
  return (
    <div className="escena" ref={ref}>
      {children}
    </div>
  );
}
