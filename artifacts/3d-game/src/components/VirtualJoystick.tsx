import { useEffect, useRef } from "react";

interface Props {
  onMove: (x: number, z: number) => void;
}

export default function VirtualJoystick({ onMove }: Props) {
  const baseRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef<HTMLDivElement>(null);
  const activeTouch = useRef<number | null>(null);
  const baseCenter = useRef({ x: 0, y: 0 });
  const RADIUS = 52;

  useEffect(() => {
    const base = baseRef.current;
    const stick = stickRef.current;
    if (!base || !stick) return;

    const getCenter = () => {
      const r = base.getBoundingClientRect();
      baseCenter.current = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    };

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      if (activeTouch.current !== null) return;
      const touch = e.changedTouches[0];
      activeTouch.current = touch.identifier;
      getCenter();
      moveTo(touch.clientX, touch.clientY);
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === activeTouch.current) {
          moveTo(e.changedTouches[i].clientX, e.changedTouches[i].clientY);
        }
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === activeTouch.current) {
          activeTouch.current = null;
          stick.style.transform = "translate(-50%, -50%)";
          onMove(0, 0);
        }
      }
    };

    const moveTo = (clientX: number, clientY: number) => {
      const dx = clientX - baseCenter.current.x;
      const dy = clientY - baseCenter.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const clamped = Math.min(dist, RADIUS);
      const angle = Math.atan2(dy, dx);
      const sx = Math.cos(angle) * clamped;
      const sy = Math.sin(angle) * clamped;
      stick.style.transform = `translate(calc(-50% + ${sx}px), calc(-50% + ${sy}px))`;
      const norm = clamped / RADIUS;
      onMove(Math.cos(angle) * norm, Math.sin(angle) * norm);
    };

    base.addEventListener("touchstart", onTouchStart, { passive: false });
    base.addEventListener("touchmove", onTouchMove, { passive: false });
    base.addEventListener("touchend", onTouchEnd, { passive: false });
    base.addEventListener("touchcancel", onTouchEnd, { passive: false });

    return () => {
      base.removeEventListener("touchstart", onTouchStart);
      base.removeEventListener("touchmove", onTouchMove);
      base.removeEventListener("touchend", onTouchEnd);
      base.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [onMove]);

  return (
    <div
      ref={baseRef}
      className="absolute bottom-10 left-10"
      style={{
        width: 128,
        height: 128,
        borderRadius: "50%",
        background: "rgba(0,0,0,0.35)",
        border: "2px solid rgba(0,245,255,0.25)",
        backdropFilter: "blur(4px)",
        touchAction: "none",
        userSelect: "none",
      }}
    >
      <div
        ref={stickRef}
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: 52,
          height: 52,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0,245,255,0.7) 0%, rgba(168,85,247,0.5) 100%)",
          border: "2px solid rgba(0,245,255,0.6)",
          transform: "translate(-50%, -50%)",
          boxShadow: "0 0 12px rgba(0,245,255,0.4)",
          transition: "box-shadow 0.1s",
          touchAction: "none",
        }}
      />
    </div>
  );
}
