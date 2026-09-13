// audio.js - Pure Web Audio API Sound & Music Synthesizer
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.isPlayingMusic = false;
    this.musicTimer = null;
    this.currentTrack = 'chiptune';
    this.currentVolume = 0.5; // 0.0 to 1.0
    this.isMuted = false;
    this.stepIndex = 0;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.currentVolume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setVolume(volNormalized) {
    this.currentVolume = Math.max(0, Math.min(1, volNormalized));
    if (this.masterGain && this.ctx) {
      const targetGain = this.isMuted ? 0 : this.currentVolume;
      this.masterGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.03);
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    this.setVolume(this.currentVolume);
    return this.isMuted;
  }

  // ---- PROCEDURAL BACKGROUND MUSIC ----
  startMusic() {
    this.init();
    if (this.isPlayingMusic) return;
    this.isPlayingMusic = true;
    this.stepIndex = 0;
    this.playMusicLoop();
  }

  stopMusic() {
    this.isPlayingMusic = false;
    if (this.musicTimer) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
  }

  toggleMusic() {
    if (this.isPlayingMusic) {
      this.stopMusic();
      return false;
    } else {
      this.startMusic();
      return true;
    }
  }

  setTrack(trackName) {
    this.currentTrack = trackName;
    this.stepIndex = 0;
  }

  playMusicLoop() {
    if (!this.isPlayingMusic) return;
    
    // Tempo and notes
    let interval = 150; // ms
    if (this.currentTrack === 'chiptune') {
      this.playChiptuneStep();
      interval = 135;
    } else if (this.currentTrack === 'elevator') {
      this.playElevatorStep();
      interval = 220;
    } else if (this.currentTrack === 'synthwave') {
      this.playSynthwaveStep();
      interval = 140;
    } else if (this.currentTrack === 'rage') {
      this.playRageStep();
      interval = 95;
    }

    this.musicTimer = setTimeout(() => {
      this.playMusicLoop();
    }, interval);
  }

  // --- Track 1: Upbeat 8-Bit Chiptune ---
  playChiptuneStep() {
    const bassScale = [110, 110, 130.81, 146.83, 110, 110, 164.81, 146.83];
    const melodyScale = [440, 523.25, 587.33, 659.25, 783.99, 880, 659.25, 587.33, 523.25, 440, 659.25, 783.99];
    
    // Bass note
    const bassFreq = bassScale[this.stepIndex % bassScale.length];
    this.synthTone(bassFreq, 'triangle', 0.12, 0.15, this.musicGain);

    // Melody note (every 2 steps or synced)
    if (this.stepIndex % 2 === 0) {
      const melIndex = Math.floor(this.stepIndex / 2) % melodyScale.length;
      const melFreq = melodyScale[melIndex];
      this.synthTone(melFreq, 'square', 0.08, 0.1, this.musicGain);
    }

    // Hi-hat noise burst
    if (this.stepIndex % 2 === 1) {
      this.noiseBurst(0.02, 0.04, 3000, this.musicGain);
    }

    this.stepIndex++;
  }

  // --- Track 2: Cheerful Goofy Elevator Muzak ---
  playElevatorStep() {
    const chords = [
      [261.63, 329.63, 392.00, 493.88], // Cmaj7
      [220.00, 261.63, 329.63, 392.00], // Am7
      [174.61, 220.00, 261.63, 329.63], // Fmaj7
      [196.00, 246.94, 293.66, 349.23]  // G7
    ];
    const chord = chords[Math.floor(this.stepIndex / 4) % chords.length];
    const note = chord[this.stepIndex % chord.length];

    this.synthTone(note, 'sine', 0.18, 0.16, this.musicGain);
    if (this.stepIndex % 4 === 0) {
      this.synthTone(note / 2, 'sine', 0.35, 0.22, this.musicGain);
    }
    this.stepIndex++;
  }

  // --- Track 3: Retro Synthwave ---
  playSynthwaveStep() {
    const bassNotes = [73.42, 73.42, 82.41, 87.31, 65.41, 65.41, 73.42, 98.00];
    const bass = bassNotes[this.stepIndex % bassNotes.length];
    this.synthTone(bass, 'sawtooth', 0.12, 0.2, this.musicGain);

    if (this.stepIndex % 4 === 2) {
      // Snare hit
      this.noiseBurst(0.08, 0.12, 1200, this.musicGain);
    }

    if (this.stepIndex % 2 === 0) {
      const leads = [293.66, 329.63, 349.23, 440.00, 523.25];
      const lead = leads[(this.stepIndex * 3) % leads.length];
      this.synthTone(lead, 'sawtooth', 0.1, 0.08, this.musicGain);
    }

    this.stepIndex++;
  }

  // --- Track 4: Pure Panic Rage BPM ---
  playRageStep() {
    const freqs = [220, 233.08, 246.94, 261.63, 277.18, 293.66, 311.13, 329.63];
    const f = freqs[Math.floor(Math.random() * freqs.length)];
    this.synthTone(f, 'sawtooth', 0.06, 0.18, this.musicGain);
    if (this.stepIndex % 2 === 0) {
      this.noiseBurst(0.04, 0.1, 800, this.musicGain);
    }
    this.stepIndex++;
  }

  // ---- PROCEDURAL SOUND EFFECTS ----

  // 1. Tilt Pouring / Liquid Stream Sound
  playPourSound(intensity = 0.5) {
    if (!this.ctx || this.isMuted) return;
    try {
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.08);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 600 + intensity * 800 + Math.random() * 200;
      filter.Q.value = 4.0;

      const gain = this.ctx.createGain();
      const gainVal = Math.min(0.25, 0.05 + intensity * 0.2);
      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      noise.start();
    } catch (e) {}
  }

  // 2. Cannon Fire Boom
  playCannonFire() {
    this.init();
    if (this.isMuted) return;
    const t = this.ctx.currentTime;

    // Deep sub-bass punch
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(25, t + 0.45);

    oscGain.gain.setValueAtTime(0.8, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.5);

    // Blast noise burst
    this.noiseBurst(0.35, 0.6, 600, this.sfxGain);
  }

  // 3. Cannon Impact Explosion
  playExplosion(intensity = 0.8) {
    this.init();
    if (this.isMuted) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.35);

    oscGain.gain.setValueAtTime(intensity * 0.7, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.4);

    this.noiseBurst(0.25, intensity * 0.5, 900, this.sfxGain);
  }

  // 4. Crank Ratchet Click / Squeak
  playCrankClick(pitchVariation = 1.0) {
    this.init();
    if (this.isMuted) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(600 * pitchVariation, t);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.025);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.025);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.03);
  }

  // 5. Crank Slip Glitch
  playCrankSlip() {
    this.init();
    if (this.isMuted) return;
    for (let i = 0; i < 4; i++) {
      setTimeout(() => {
        this.playCrankClick(1.8 - i * 0.2);
      }, i * 18);
    }
  }

  // 6. Rage Buzzer (Miss / Overshoot)
  playBuzzer() {
    this.init();
    if (this.isMuted) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(115, t);
    osc.frequency.setValueAtTime(95, t + 0.15);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.linearRampToValueAtTime(0.001, t + 0.35);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.35);
  }

  // 7. Victory Fanfare (Target Hit)
  playVictory() {
    this.init();
    if (this.isMuted) return;
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.3);
      }, idx * 100);
    });
  }

  // --- UTILITY SYNTH BLOCKS ---
  synthTone(freq, type, duration, volume, destGain) {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    osc.connect(gain);
    gain.connect(destGain);
    osc.start(t);
    osc.stop(t + duration);
  }

  noiseBurst(duration, volume, cutoffFreq, destGain) {
    if (!this.ctx || this.isMuted) return;
    try {
      const bufferSize = Math.max(1, Math.floor(this.ctx.sampleRate * duration));
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = cutoffFreq;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(volume, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(destGain);

      noise.start();
    } catch (e) {}
  }
}

window.soundEngine = new SoundEngine();
