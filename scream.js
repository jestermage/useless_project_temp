// scream.js - Option 4: Microphone loudness volume control
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
    this.data = null;
    this.volume = 0;
    this.isListening = false;

    if (this.button) {
      this.button.addEventListener('click', () => this.start());
    }
  }

  setVolume(volume) {
    this.volume = Math.max(0, Math.min(100, volume));
  }

  async start() {
    if (this.isListening) return;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.setStatus('Microphone access is not supported in this browser.', '#ff007f');
      return;
    }

    this.button.disabled = true;
    this.button.textContent = 'Listening...';
    this.setStatus('Calibrating room noise for one second. Get ready to scream!', '#fca311');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
      this.button.textContent = 'Microphone Active';
      this.setStatus('Scream louder to increase volume. Lower your voice to decrease it.', '#00f5d4');
      this.measure();
    } catch (error) {
      this.button.disabled = false;
      this.button.textContent = '🎙 Start Microphone';
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
    const loudness = Math.max(0, Math.min(1, (rms - 0.015) / 0.22));
    const targetVolume = loudness * 100;
    this.volume += (targetVolume - this.volume) * 0.18;
    this.meterFill.style.width = `${this.volume}%`;
    this.readout.textContent = `${this.volume.toFixed(0)}%`;
    this.onVolumeChange(this.volume);
    requestAnimationFrame(() => this.measure());
  }

  setStatus(message, color) {
    this.status.textContent = message;
    this.status.style.color = color;
  }
}

window.ScreamVolumeControl = ScreamVolumeControl;
