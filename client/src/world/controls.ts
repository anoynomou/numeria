/**
 * Input state shared between the DOM controls and the render loop.
 *
 * Movement is read every frame inside useFrame, so keeping it in a plain
 * mutable object (rather than React state) avoids re-rendering the whole scene
 * on every keypress.
 */

export interface InputState {
  forward: number;   // -1 .. 1
  strafe: number;    // -1 .. 1
  yawDelta: number;  // consumed each frame
  pitchDelta: number;
  interactPressed: boolean;
  running: boolean;
}

export const input: InputState = {
  forward: 0,
  strafe: 0,
  yawDelta: 0,
  pitchDelta: 0,
  interactPressed: false,
  running: false,
};

const held = new Set<string>();

function recompute() {
  const up = held.has('KeyW') || held.has('ArrowUp');
  const down = held.has('KeyS') || held.has('ArrowDown');
  const left = held.has('KeyA') || held.has('ArrowLeft');
  const right = held.has('KeyD') || held.has('ArrowRight');
  input.forward = (up ? 1 : 0) - (down ? 1 : 0);
  input.strafe = (right ? 1 : 0) - (left ? 1 : 0);
  input.running = held.has('ShiftLeft') || held.has('ShiftRight');
}

/** Codes the game consumes, so other keys still reach the page normally. */
const GAME_KEYS = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD',
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'KeyE', 'Space', 'ShiftLeft', 'ShiftRight',
  'KeyQ', 'KeyZ',
]);

let attached = false;
let onInteract: (() => void) | null = null;

export function attachKeyboard(interactHandler: () => void) {
  onInteract = interactHandler;
  if (attached) return () => detachKeyboard();

  const keyDown = (e: KeyboardEvent) => {
    // Never swallow keys while the student is typing an answer.
    const el = document.activeElement;
    if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT')) return;
    if (!GAME_KEYS.has(e.code)) return;
    if (e.code === 'KeyE' || e.code === 'Space') {
      if (!e.repeat) {
        e.preventDefault();
        onInteract?.();
      }
      return;
    }
    // Arrow keys and space scroll the page otherwise.
    if (e.code.startsWith('Arrow')) e.preventDefault();
    held.add(e.code);
    recompute();
  };

  const keyUp = (e: KeyboardEvent) => {
    held.delete(e.code);
    recompute();
  };

  const blur = () => {
    held.clear();
    recompute();
  };

  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);
  window.addEventListener('blur', blur);
  attached = true;

  return () => {
    window.removeEventListener('keydown', keyDown);
    window.removeEventListener('keyup', keyUp);
    window.removeEventListener('blur', blur);
    held.clear();
    recompute();
    attached = false;
    onInteract = null;
  };
}

function detachKeyboard() {
  held.clear();
  recompute();
  attached = false;
}

/** Called by the on-screen joystick. Values are already normalised -1..1. */
export function setJoystick(x: number, y: number) {
  input.strafe = x;
  input.forward = -y;
}

export function clearJoystick() {
  input.strafe = 0;
  input.forward = 0;
}

export function addLook(dx: number, dy: number) {
  input.yawDelta += dx;
  input.pitchDelta += dy;
}

export function resetInput() {
  held.clear();
  input.forward = 0;
  input.strafe = 0;
  input.yawDelta = 0;
  input.pitchDelta = 0;
  input.running = false;
}
