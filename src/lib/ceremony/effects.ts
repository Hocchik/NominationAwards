import confetti from "canvas-confetti";

// Efectos de la ceremonia (CLAUDE.md §8). Los sonidos se sintetizan con Web
// Audio: no hay archivos que descargar ni licencias que revisar.

let context: AudioContext | null = null;
let noise: AudioBuffer | null = null;

function audio(): AudioContext {
  context ??= new AudioContext();
  if (context.state === "suspended") void context.resume();
  return context;
}

function noiseBuffer(ac: AudioContext): AudioBuffer {
  if (!noise) {
    noise = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.12), ac.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  return noise;
}

/** Golpe de redoblante: ruido filtrado con caída rápida. */
function hit(ac: AudioContext, at: number, volume: number, length = 0.08) {
  const source = ac.createBufferSource();
  source.buffer = noiseBuffer(ac);
  const band = ac.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = 1900;
  band.Q.value = 0.7;
  const gain = ac.createGain();
  gain.gain.setValueAtTime(volume, at);
  gain.gain.exponentialRampToValueAtTime(0.001, at + length);
  source.connect(band).connect(gain).connect(ac.destination);
  source.start(at);
  source.stop(at + length + 0.02);
}

/** Redoble de tambor que se acelera y sube de volumen durante `seconds`. */
export function playDrumroll(seconds: number): void {
  const ac = audio();
  const start = ac.currentTime + 0.02;
  let t = 0;
  let gap = 0.1;
  while (t < seconds) {
    hit(ac, start + t, 0.12 + 0.45 * (t / seconds));
    t += gap;
    gap = Math.max(0.035, gap * 0.95);
  }
}

/** Fanfarria corta: arpegio de do mayor con timbre de metales y un acorde final. */
export function playFanfare(): void {
  const ac = audio();
  const start = ac.currentTime + 0.02;
  const notes: Array<[frequency: number, at: number, length: number]> = [
    [523.25, 0, 0.16],
    [659.25, 0.14, 0.16],
    [783.99, 0.28, 0.16],
    [1046.5, 0.42, 1.2],
    [659.25, 0.42, 1.2],
    [783.99, 0.42, 1.2],
  ];
  for (const [frequency, at, length] of notes) {
    const osc = ac.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = frequency;
    const filter = ac.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 2600;
    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.0001, start + at);
    gain.gain.exponentialRampToValueAtTime(0.12, start + at + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + at + length);
    osc.connect(filter).connect(gain).connect(ac.destination);
    osc.start(start + at);
    osc.stop(start + at + length + 0.05);
  }
  hit(ac, start + 0.42, 0.5, 0.4); // platillo
}

const PRIZE_COLORS = ["#D4AF37", "#F3E2A9", "#FFFFFF"];
const HONOR_COLORS = ["#B8B5FF", "#E6E4FF", "#FFFFFF"];

/** Confeti desde los dos costados. Se desactiva solo si la persona pidió menos movimiento. */
export function celebrate(kind: "prize" | "honor"): void {
  const colors = kind === "prize" ? PRIZE_COLORS : HONOR_COLORS;
  const shared = { particleCount: 120, spread: 70, startVelocity: 55, colors, disableForReducedMotion: true };
  void confetti({ ...shared, angle: 60, origin: { x: 0, y: 0.75 } });
  void confetti({ ...shared, angle: 120, origin: { x: 1, y: 0.75 } });
}
