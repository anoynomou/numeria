import React, { useRef, useState } from 'react';
import { setJoystick, clearJoystick } from './controls';

/**
 * On-screen thumbstick for tablets and phones. Reports a normalised -1..1
 * vector straight into the shared input state that the render loop reads.
 */
export function Joystick() {
  const base = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const pointer = useRef<number | null>(null);

  function update(clientX: number, clientY: number) {
    const el = base.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const max = rect.width / 2 - 14;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > max) {
      dx = (dx / dist) * max;
      dy = (dy / dist) * max;
    }
    setKnob({ x: dx, y: dy });
    setJoystick(dx / max, dy / max);
  }

  function release() {
    pointer.current = null;
    setKnob({ x: 0, y: 0 });
    clearJoystick();
  }

  return (
    <div
      ref={base}
      className="joystick"
      role="application"
      aria-label="Movement control. Drag to move your character."
      onPointerDown={(e) => {
        pointer.current = e.pointerId;
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        update(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (pointer.current !== e.pointerId) return;
        update(e.clientX, e.clientY);
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
    >
      <div className="knob" style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }} />
    </div>
  );
}

/** True when the device is primarily touch driven. */
export function useIsTouch() {
  const [touch] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  });
  return touch;
}
