/**
 * All game audio is synthesised with the Web Audio API rather than loaded from
 * files. That keeps the download tiny for schools on slow connections and means
 * there are no missing-asset failures. Everything respects the student's volume
 * settings and turns off completely at volume zero.
 */

type Ambience = 'forest' | 'wind' | 'machine' | 'space' | 'alien';

const SCALES: Record<Ambience, number[]> = {
  forest: [392.0, 440.0, 523.25, 587.33, 659.25],
  wind: [349.23, 392.0, 466.16, 523.25, 587.33],
  machine: [329.63, 392.0, 440.0, 493.88, 587.33],
  space: [261.63, 311.13, 392.0, 466.16, 523.25],
  alien: [293.66, 349.23, 415.3, 466.16, 554.37],
};

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private ambienceGain: GainNode | null = null;
  private musicTimer: number | null = null;
  private ambienceSource: AudioBufferSourceNode | null = null;
  private musicVolume = 0.35;
  private sfxVolume = 0.7;
  private step = 0;
  private currentTheme: Ambience | null = null;

  /** Browsers require a user gesture before audio can start. */
  private ensure(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const Ctor = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctor) return null;
      try {
        this.ctx = new Ctor();
      } catch {
        return null;
      }
      this.master = this.ctx.createGain();
      this.master.gain.value = 1;
      this.master.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.musicVolume;
      this.musicGain.connect(this.master);

      this.ambienceGain = this.ctx.createGain();
      this.ambienceGain.gain.value = this.musicVolume * 0.5;
      this.ambienceGain.connect(this.master);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.sfxVolume;
      this.sfxGain.connect(this.master);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  configure(musicVolume: number, sfxVolume: number) {
    this.musicVolume = Math.max(0, Math.min(1, musicVolume));
    this.sfxVolume = Math.max(0, Math.min(1, sfxVolume));
    if (this.musicGain) this.musicGain.gain.value = this.musicVolume;
    if (this.ambienceGain) this.ambienceGain.gain.value = this.musicVolume * 0.5;
    if (this.sfxGain) this.sfxGain.gain.value = this.sfxVolume;
    if (this.musicVolume === 0) this.stopMusic();
  }

  /** One short synthesised tone. */
  private tone(freq: number, duration: number, type: OscillatorType, gain: number, when = 0, target?: GainNode) {
    const ctx = this.ensure();
    if (!ctx) return;
    const dest = target || this.sfxGain;
    if (!dest) return;
    const t = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + 0.015);
    env.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(env);
    env.connect(dest);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  private sequence(notes: [number, number][], type: OscillatorType = 'triangle', gain = 0.18) {
    let when = 0;
    for (const [freq, dur] of notes) {
      this.tone(freq, dur, type, gain, when);
      when += dur * 0.85;
    }
  }

  click() {
    if (this.sfxVolume === 0) return;
    this.tone(660, 0.06, 'square', 0.07);
  }

  hover() {
    if (this.sfxVolume === 0) return;
    this.tone(880, 0.035, 'sine', 0.03);
  }

  correct() {
    if (this.sfxVolume === 0) return;
    this.sequence([[523.25, 0.12], [659.25, 0.12], [783.99, 0.22]], 'triangle', 0.2);
  }

  /** Deliberately warm rather than harsh: a wrong answer is not a failure. */
  encourage() {
    if (this.sfxVolume === 0) return;
    this.sequence([[392.0, 0.14], [349.23, 0.18]], 'sine', 0.16);
  }

  puzzleDone() {
    if (this.sfxVolume === 0) return;
    this.sequence([[440, 0.1], [554.37, 0.1], [659.25, 0.1], [880, 0.2]], 'triangle', 0.17);
  }

  reward() {
    if (this.sfxVolume === 0) return;
    this.sequence([[783.99, 0.08], [1046.5, 0.16]], 'square', 0.12);
  }

  levelComplete() {
    if (this.sfxVolume === 0) return;
    this.sequence(
      [[523.25, 0.14], [659.25, 0.14], [783.99, 0.14], [1046.5, 0.2], [880, 0.12], [1046.5, 0.36]],
      'triangle', 0.2
    );
  }

  unlock() {
    if (this.sfxVolume === 0) return;
    this.sequence([[329.63, 0.12], [493.88, 0.12], [659.25, 0.28]], 'sawtooth', 0.12);
  }

  footstep() {
    if (this.sfxVolume === 0) return;
    this.tone(120 + Math.random() * 40, 0.05, 'sine', 0.035);
  }

  /** Gentle generative background music keyed to the world. */
  startMusic(theme: Ambience) {
    const ctx = this.ensure();
    if (!ctx || this.musicVolume === 0) return;
    if (this.currentTheme === theme && this.musicTimer !== null) return;
    this.stopMusic();
    this.currentTheme = theme;
    const scale = SCALES[theme] || SCALES.forest;
    this.step = 0;

    const tick = () => {
      if (!this.musicGain || this.musicVolume === 0) return;
      const i = this.step++;
      const root = scale[i % scale.length];
      this.tone(root, 1.1, 'sine', 0.07, 0, this.musicGain);
      if (i % 4 === 0) this.tone(root / 2, 2.2, 'triangle', 0.05, 0, this.musicGain);
      if (i % 8 === 3) this.tone(scale[(i + 2) % scale.length] * 2, 0.5, 'sine', 0.03, 0.25, this.musicGain);
    };
    tick();
    this.musicTimer = window.setInterval(tick, 1400);
    this.startAmbience(theme);
  }

  /** Looping filtered noise: wind, machine hum, or a space drone. */
  private startAmbience(theme: Ambience) {
    const ctx = this.ensure();
    if (!ctx || !this.ambienceGain) return;
    const seconds = 3;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = theme === 'machine' ? 'bandpass' : 'lowpass';
    filter.frequency.value = theme === 'space' ? 260 : theme === 'machine' ? 420 : 700;
    filter.Q.value = theme === 'machine' ? 3 : 1;
    src.connect(filter);
    filter.connect(this.ambienceGain);
    src.start();
    this.ambienceSource = src;
  }

  stopMusic() {
    if (this.musicTimer !== null) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    if (this.ambienceSource) {
      try { this.ambienceSource.stop(); } catch { /* already stopped */ }
      this.ambienceSource = null;
    }
    this.currentTheme = null;
  }

  /** Read a question aloud for younger students. */
  speak(text: string) {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(
        text.replace(/\n+/g, '. ').replace(/\s+/g, ' ').slice(0, 500)
      );
      utter.rate = 0.92;
      utter.pitch = 1.05;
      window.speechSynthesis.speak(utter);
    } catch { /* speech not available */ }
  }

  stopSpeaking() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try { window.speechSynthesis.cancel(); } catch { /* ignore */ }
    }
  }
}

export const audio = new AudioEngine();
export type { Ambience };
