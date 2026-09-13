// scream.js - Option 4: Microphone pitch volume control
class ScreamVolumeControl {
  constructor(buttonId, callbacks) {
    this.button = document.getElementById(buttonId);
    this.onVolumeChange = callbacks.onVolumeChange;
    this.status = document.getElementById('scream-status');
    this.meterFill = document.getElementById('scream-meter-fill');
    this.readout = document.getElementById('scream-volume-readout');
    this.audioContext = null;
    this.analyser = null;
    this.microphone = null;
    this.stream = null;
    this.data = null;
    this.volume = 0;
    this.isListening = false;
    this.isSpeaking = false;
    this.silenceFrames = 0;
    this.voiceThreshold = 0.02;
    this.silenceFrameLimit = 12;

    if (this.button) {
      this.button.addEventListener('click', () => {
        if (this.isListening) {
          this.stop();
        } else {
          this.start();
        }
      });
    }
  }

  setVolume(volume) {
    this.volume = Math.max(0, Math.min(100, volume));
  }

  stop() {
    if (!this.isListening) return;
    this.isListening = false;
    this.isSpeaking = false;
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
    }
    this.stream = null;
    if (this.audioContext) {
      this.audioContext.close();
    }
    this.button.textContent = '🎙 Turn Microphone On';
    this.setStatus(`Volume set at ${this.volume.toFixed(0)}%. Start again to adjust it.`, '#fca311');
  }

  async start() {
    if (this.isListening) return;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.setStatus('Microphone access is not supported in this browser.', '#ff007f');
      return;
    }

    this.button.textContent = 'Listening...';
    this.setStatus('Calibrating room noise for one second. Get ready to scream!', '#fca311');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.stream = stream;
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContext();
      await this.audioContext.resume();
      this.microphone = this.audioContext.createMediaStreamSource(stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 1024;
      this.analyser.smoothingTimeConstant = 0.65;
      this.data = new Uint8Array(this.analyser.fftSize);
      this.microphone.connect(this.analyser);
      this.isListening = true;
      this.button.textContent = '⏹ Turn Microphone Off';
      this.setStatus('Higher pitch raises volume. Lower pitch lowers it. Turn the microphone off to set it.', '#00f5d4');
      this.measure();
    } catch (error) {
      this.button.textContent = '🎙 Turn Microphone On';
      this.setStatus('Microphone permission was denied or unavailable. Check browser permissions and try again.', '#ff007f');
    }
  }

  measure() {
    if (!this.isListening) return;

    this.analyser.getByteTimeDomainData(this.data);
    let sum = 0;
    for (const sample of this.data) {
      const normalized = (sample - 128) / 128;
      sum += normalized * normalized;
    }

    const rms = Math.sqrt(sum / this.data.length);
    const pitch = this.detectPitch();
    if (pitch && rms >= this.voiceThreshold) {
      this.silenceFrames = 0;
      if (!this.isSpeaking) {
        this.isSpeaking = true;
        this.setStatus('Pitch detected. Turn the microphone off when the volume is where you want it.', '#00f5d4');
      }

      const minPitch = 100;
      const maxPitch = 700;
      const pitchPosition = Math.log(pitch / minPitch) / Math.log(maxPitch / minPitch);
      const targetVolume = Math.max(0, Math.min(100, pitchPosition * 100));
      this.volume += (targetVolume - this.volume) * 0.18;
      this.onVolumeChange(this.volume);
    } else if (this.isSpeaking) {
      this.silenceFrames++;
      if (this.silenceFrames >= this.silenceFrameLimit) {
        this.isSpeaking = false;
        this.setStatus(`Volume set at ${this.volume.toFixed(0)}%. Speak again to adjust it.`, '#fca311');
      }
    }

    this.meterFill.style.width = `${this.volume}%`;
    this.readout.textContent = `${this.volume.toFixed(0)}%`;
    requestAnimationFrame(() => this.measure());
  }

  detectPitch() {
    const sampleRate = this.audioContext.sampleRate;
    const minPeriod = Math.floor(sampleRate / 700);
    const maxPeriod = Math.floor(sampleRate / 80);
    let bestPeriod = -1;
    let bestCorrelation = 0;

    for (let period = minPeriod; period <= maxPeriod; period += 2) {
      let correlation = 0;
      let energy = 0;
      for (let i = 0; i < this.data.length - period; i++) {
        const current = (this.data[i] - 128) / 128;
        const delayed = (this.data[i + period] - 128) / 128;
        correlation += current * delayed;
        energy += current * current;
      }
      const normalizedCorrelation = energy ? correlation / energy : 0;
      if (normalizedCorrelation > bestCorrelation) {
        bestCorrelation = normalizedCorrelation;
        bestPeriod = period;
      }
    }

    if (bestPeriod < 0 || bestCorrelation < 0.55) return null;
    return sampleRate / bestPeriod;
  }

  setStatus(message, color) {
    this.status.textContent = message;
    this.status.style.color = color;
  }
}

window.ScreamVolumeControl = ScreamVolumeControl;
