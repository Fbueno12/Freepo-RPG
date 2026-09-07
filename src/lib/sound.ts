let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function blip(
  freq: number,
  start: number,
  duration: number,
  gain = 0.1,
  type: OscillatorType = "triangle",
) {
  const audio = getCtx();
  if (!audio) return;
  const osc = audio.createOscillator();
  const amp = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audio.currentTime + start);
  amp.gain.setValueAtTime(0.0001, audio.currentTime + start);
  amp.gain.linearRampToValueAtTime(gain, audio.currentTime + start + 0.01);
  amp.gain.exponentialRampToValueAtTime(
    0.0001,
    audio.currentTime + start + duration,
  );
  osc.connect(amp).connect(audio.destination);
  osc.start(audio.currentTime + start);
  osc.stop(audio.currentTime + start + duration + 0.02);
}

/** Som de dados rolando + clique da "sorte". */
export function playDiceSound() {
  const audio = getCtx();
  if (!audio) return;
  const rattle = () => {
    for (let i = 0; i < 6; i++) {
      const t = i * 0.035;
      const f = 1800 + Math.random() * 2200;
      blip(f, t, 0.05, 0.03, "square");
    }
  };
  rattle();
  // clique do resultado
  blip(660, 0.28, 0.16, 0.12, "sine");
  blip(880, 0.3, 0.2, 0.08, "sine");
}

/** Som de notificação de mensagem nova no chat. */
export function playMessageSound() {
  blip(520, 0, 0.09, 0.06, "sine");
  blip(780, 0.09, 0.12, 0.06, "sine");
}

/** Som de troca de turno / ação do mestre. */
export function playSignalSound() {
  blip(440, 0, 0.12, 0.08, "sine");
  blip(330, 0.14, 0.16, 0.08, "sine");
}