class Soundscape {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  ambient: GainNode | null = null;
  volume = 0.35;
  init() {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    try {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.ctx.destination);
      const buffer = this.ctx.createBuffer(
        1,
        this.ctx.sampleRate * 4,
        this.ctx.sampleRate,
      );
      const data = buffer.getChannelData(0);
      let last = 0;
      for (let i = 0; i < data.length; i++) {
        last = (last + Math.random() * 0.04 - 0.02) * 0.985;
        data[i] = last;
      }
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 380;
      this.ambient = this.ctx.createGain();
      this.ambient.gain.value = 0.15;
      source.connect(filter);
      filter.connect(this.ambient);
      this.ambient.connect(this.master);
      source.start();
    } catch {
      /* Audio is optional on unsupported browsers. */
    }
  }
  weather(raining: boolean) {
    if (this.ctx && this.ambient)
      this.ambient.gain.setTargetAtTime(
        raining ? 0.65 : 0.15,
        this.ctx.currentTime,
        0.7,
      );
  }
  setVolume(n: number) {
    this.volume = n;
    if (this.master)
      this.master.gain.setTargetAtTime(n, this.ctx!.currentTime, 0.1);
  }
  play(
    type:
      | "click"
      | "success"
      | "step"
      | "error"
      | "door"
      | "notification"
      | "siren" = "click",
  ) {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const notes =
      type === "success"
        ? [440, 554, 660]
        : type === "error"
          ? [180, 140]
          : type === "notification"
            ? [660, 880]
            : type === "step"
              ? [80]
              : type === "door"
                ? [110, 72]
                : type === "siren"
                  ? [640, 880]
                  : [520];
    notes.forEach((f, i) => {
      const osc = this.ctx!.createOscillator(),
        g = this.ctx!.createGain();
      osc.type = type === "step" ? "triangle" : "sine";
      osc.frequency.setValueAtTime(f, t + i * 0.11);
      g.gain.setValueAtTime(0, t + i * 0.11);
      g.gain.linearRampToValueAtTime(
        type === "step" ? 0.06 : 0.08,
        t + i * 0.11 + 0.01,
      );
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.11 + 0.18);
      osc.connect(g);
      g.connect(this.master!);
      osc.start(t + i * 0.11);
      osc.stop(t + i * 0.11 + 0.2);
    });
  }
}
export const audio = new Soundscape();
