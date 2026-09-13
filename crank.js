// crank.js - Method 3: Inverted Window Crank Method
class CrankVolumeControl {
  constructor(canvasId, onVolumeChange) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.onVolumeChange = onVolumeChange;

    this.width = this.canvas.width;
    this.height = this.canvas.height;

    // Volume Bar layout (Left / Center)
    this.barX = 50;
    this.barY = 125;
    this.barWidth = 380;
    this.barHeight = 32;
    this.volume = 50;

    // Window Crank layout (Right side)
    this.crankCenterX = 565;
    this.crankCenterY = 140;
    this.crankRadius = 55;
    this.crankAngle = 0; // Current rotation angle in radians
    this.gearAngle = 0;

    // Interaction state
    this.isDragging = false;
    this.lastMouseAngle = null;
    this.totalAngleTurned = 0;
    this.lastClickAngle = 0;

    // Rage features: Gear slip & inertia
    this.slipWarning = 0; // timer for slip flash
    this.ratchetTooth = 0;
    this.statusText = 'DRAG CRANK IN A CIRCLE • (NOTE: DIRECTIONS ARE INVERTED)';
    this.statusColor = '#fca311';

    // Snapback: when released, crank arm springs back and bleeds volume
    this.crankReturnVelocity = 0; // angular velocity for snapback
    this.volumeBleedRate = 0;     // volume lost per second during snapback

    // ARM mechanic: must double-click the crank BEFORE dragging to commit volume
    // Without arming, releasing resets volume to 0
    this.isArmed = false;

    this.setupEvents();
    this.startLoop();
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(100, vol));
  }

  setupEvents() {
    const getPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
      };
    };

    const onStart = (e) => {
      const pos = getPos(e);
      const dist = Math.hypot(pos.x - this.crankCenterX, pos.y - this.crankCenterY);
      if (dist < this.crankRadius + 150 || pos.x > 400) {
        this.isDragging = true;
        this.lastMouseAngle = Math.atan2(pos.y - this.crankCenterY, pos.x - this.crankCenterX);
        this.canvas.style.cursor = 'grabbing';
        e.preventDefault();
      }
    };

    const onMove = (e) => {
      if (!this.isDragging) return;
      const pos = getPos(e);
      const currentMouseAngle = Math.atan2(pos.y - this.crankCenterY, pos.x - this.crankCenterX);

      let deltaAngle = currentMouseAngle - this.lastMouseAngle;

      // Handle wraparound across -PI / +PI
      if (deltaAngle > Math.PI) deltaAngle -= Math.PI * 2;
      if (deltaAngle < -Math.PI) deltaAngle += Math.PI * 2;

      // Ignore extreme mouse teleport
      if (Math.abs(deltaAngle) > 2.4) {
        this.lastMouseAngle = currentMouseAngle;
        return;
      }

      this.crankAngle += deltaAngle;
      this.gearAngle -= deltaAngle * 1.5;

      // INVERTED MECHANIC:
      // Roll left / counter-clockwise (deltaAngle < 0) -> Volume INCREASES!
      // Roll right / clockwise (deltaAngle > 0) -> Volume DECREASES!
      // Rate is very slow — deliberate frustration
      const volumeDelta = (-deltaAngle / (Math.PI * 2)) * 7;
      this.volume = Math.max(0, Math.min(100, this.volume + volumeDelta));

      // Reset snapback while actively dragging
      this.crankReturnVelocity = 0;
      this.volumeBleedRate = 0;

      if (this.onVolumeChange) {
        this.onVolumeChange(this.volume);
      }

      // Ratchet sound every ~15 degrees
      this.totalAngleTurned += Math.abs(deltaAngle);
      if (this.totalAngleTurned - this.lastClickAngle > (15 * Math.PI) / 180) {
        this.lastClickAngle = this.totalAngleTurned;
        const pitch = 0.9 + (this.volume / 100) * 0.4;
        if (window.soundEngine) {
          window.soundEngine.playCrankClick(pitch);
        }
      }

      this.lastMouseAngle = currentMouseAngle;
      e.preventDefault();
    };

    const onEnd = () => {
      if (this.isDragging) {
        if (this.isArmed) {
          // Armed: volume commits, arm resets, no snapback
          this.crankReturnVelocity = 0;
          this.volumeBleedRate = 0;
          this.isArmed = false; // consume the arm — must double-click again next time
        } else {
          // NOT armed: hard reset volume to 0 and snap arm back
          this.volume = 0;
          if (this.onVolumeChange) this.onVolumeChange(0);
          this.crankReturnVelocity = -this.crankAngle * 5;
          this.volumeBleedRate = 0;
        }
      }
      this.isDragging = false;
      this.lastMouseAngle = null;
      this.canvas.style.cursor = 'grab';
    };

    this.canvas.style.cursor = 'grab';
    this.canvas.addEventListener('mousedown', onStart);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);

    // Double-click on crank to ARM it (must do this BEFORE dragging)
    this.canvas.addEventListener('dblclick', (e) => {
      const pos = getPos(e);
      const dist = Math.hypot(pos.x - this.crankCenterX, pos.y - this.crankCenterY);
      if (dist < this.crankRadius + 60) {
        this.isArmed = !this.isArmed; // toggle: double-click again to disarm
      }
      e.preventDefault();
    });

    this.canvas.addEventListener('touchstart', onStart, { passive: false });
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);

    // Keyboard support for micro cranks
    window.addEventListener('keydown', (e) => {
      if (document.activeElement.tagName === 'INPUT') return;
      if (e.key === 'ArrowLeft' || e.key === 'q') {
        // Roll left -> increase
        this.crankAngle -= 0.15;
        this.gearAngle += 0.25;
        this.volume = Math.min(100, this.volume + 1.2);
        if (window.soundEngine) window.soundEngine.playCrankClick(1.0);
        if (this.onVolumeChange) this.onVolumeChange(this.volume);
        this.statusText = '↺ ROLLING LEFT (CCW) → VOLUME INCREASING';
        this.statusColor = '#00f5d4';
      } else if (e.key === 'ArrowRight' || e.key === 'e') {
        // Roll right -> decrease
        this.crankAngle += 0.15;
        this.gearAngle -= 0.25;
        this.volume = Math.max(0, this.volume - 1.2);
        if (window.soundEngine) window.soundEngine.playCrankClick(0.9);
        if (this.onVolumeChange) this.onVolumeChange(this.volume);
        this.statusText = '↻ ROLLING RIGHT (CW) → VOLUME DECREASING';
        this.statusColor = '#ff007f';
      }
    });
  }

  update(dt) {
    if (this.slipWarning > 0) {
      this.slipWarning -= dt;
    }

    // Snapback: when not dragging, arm springs back toward rest and bleeds volume
    if (!this.isDragging) {
      if (Math.abs(this.crankAngle) > 0.01) {
        // Spring force pulling arm back to 0
        const spring = -this.crankAngle * 4.5;
        const damping = -this.crankReturnVelocity * 2.8;
        this.crankReturnVelocity += (spring + damping) * dt;
        this.crankAngle += this.crankReturnVelocity * dt;
        this.gearAngle -= this.crankReturnVelocity * dt * 1.5;
      } else {
        this.crankAngle = 0;
        this.crankReturnVelocity = 0;
      }

      // Bleed volume back toward last stable point while snapping back
      if (this.volumeBleedRate > 0) {
        this.volume = Math.max(0, this.volume - this.volumeBleedRate * dt);
        this.volumeBleedRate = Math.max(0, this.volumeBleedRate - dt * 6);
        if (this.onVolumeChange) this.onVolumeChange(this.volume);
      }
    }
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    // 1. Draw Mechanical drive shaft & intermediate gears connecting Bar to Crank
    this.drawMechanicalDrives(ctx);

    // 2. Draw Volume Bar (Left side)
    this.drawVolumeBar(ctx);

    // 3. Draw 2D Window Crank Assembly (Right side)
    this.drawWindowCrank(ctx);

    // 4. Draw HUD Overlay & Status
    this.drawHUD(ctx);
  }

  drawMechanicalDrives(ctx) {
    const shaftStartX = this.barX + this.barWidth;
    const shaftStartY = this.barY + this.barHeight / 2;
    const crankX = this.crankCenterX;
    const crankY = this.crankCenterY;

    ctx.save();

    // Drive shaft rod
    ctx.strokeStyle = '#2d3748';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(shaftStartX, shaftStartY);
    ctx.lineTo(crankX - 55, shaftStartY);
    ctx.lineTo(crankX - 55, crankY);
    ctx.stroke();

    // Shaft metallic highlight
    ctx.strokeStyle = '#4a5568';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(shaftStartX, shaftStartY - 2);
    ctx.lineTo(crankX - 55, shaftStartY - 2);
    ctx.stroke();

    // Intermediate Gear
    this.drawGear(ctx, crankX - 55, crankY, 26, this.gearAngle, '#7928ca');

    ctx.restore();
  }

  drawGear(ctx, x, y, radius, angle, color) {
    const teeth = 12;
    const toothHeight = 6;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    ctx.fillStyle = color;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;

    ctx.beginPath();
    for (let i = 0; i < teeth; i++) {
      const a = (i / teeth) * Math.PI * 2;
      const aNext = ((i + 0.5) / teeth) * Math.PI * 2;
      const aEnd = ((i + 1) / teeth) * Math.PI * 2;

      ctx.lineTo(Math.cos(a) * (radius + toothHeight), Math.sin(a) * (radius + toothHeight));
      ctx.lineTo(Math.cos(aNext) * (radius + toothHeight), Math.sin(aNext) * (radius + toothHeight));
      ctx.lineTo(Math.cos(aEnd) * radius, Math.sin(aEnd) * radius);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Inner hole
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = '#111625';
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  drawVolumeBar(ctx) {
    const x = this.barX;
    const y = this.barY;
    const w = this.barWidth;
    const h = this.barHeight;

    ctx.save();

    // Bar casing
    ctx.fillStyle = '#0f1423';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.fill();
    ctx.strokeStyle = '#2d3748';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Active volume fill
    const fillW = (w * this.volume) / 100;
    const grad = ctx.createLinearGradient(x, y, x + w, y);
    grad.addColorStop(0, '#7928ca');
    grad.addColorStop(0.5, '#00f5d4');
    grad.addColorStop(1, '#ff007f');

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x + 2, y + 2, fillW, h - 4, 6);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();

    // Percentage tick marks
    for (let i = 10; i < 100; i += 10) {
      const tx = x + (w * i) / 100;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(tx, y + 4);
      ctx.lineTo(tx, y + h - 4);
      ctx.stroke();
    }

    // Needle slider marker with gear teeth indicator
    const markerX = x + fillW;
    ctx.fillStyle = '#fca311';
    ctx.shadowColor = '#fca311';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.roundRect(markerX - 4, y - 6, 8, h + 12, 3);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Digital readout badge above marker
    const badgeW = 100;
    ctx.fillStyle = 'rgba(15, 20, 35, 0.9)';
    ctx.strokeStyle = '#fca311';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(markerX - badgeW / 2, y - 36, badgeW, 22, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fca311';
    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`ACQUIRED: ${this.volume.toFixed(1)}%`, markerX, y - 21);

    // Mechanical gear rack teeth along bottom of the bar
    ctx.fillStyle = '#4a5568';
    for (let rx = x + 6; rx < x + w - 6; rx += 8) {
      ctx.fillRect(rx, y + h + 2, 4, 5);
    }

    ctx.restore();
  }

  drawWindowCrank(ctx) {
    const cx = this.crankCenterX;
    const cy = this.crankCenterY;

    ctx.save();

    // Base mounting escutcheon (Chrome circular plate)
    ctx.beginPath();
    ctx.arc(cx, cy, 48, 0, Math.PI * 2);
    const escGrad = ctx.createRadialGradient(cx, cy, 5, cx, cy, 48);
    escGrad.addColorStop(0, '#3b4363');
    escGrad.addColorStop(0.8, '#181b2a');
    escGrad.addColorStop(1, '#0e111d');
    ctx.fillStyle = escGrad;
    ctx.fill();
    ctx.strokeStyle = this.isDragging ? '#00f5d4' : '#4a5568';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Mounting screws
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 2) {
      const sx = cx + Math.cos(a) * 36;
      const sy = cy + Math.sin(a) * 36;
      ctx.beginPath();
      ctx.arc(sx, sy, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#718096';
      ctx.fill();
    }

    // Base mounting escutcheon (Chrome circular plate)

    // Crank Main Arm (Rotates around center)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.crankAngle);

    // Shadow of arm
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.roundRect(0, -6, this.crankRadius + 6, 16, 8);
    ctx.fill();

    // Sleek chrome handle arm
    const armGrad = ctx.createLinearGradient(0, -9, 0, 9);
    armGrad.addColorStop(0, '#e2e8f0');
    armGrad.addColorStop(0.3, '#ffffff');
    armGrad.addColorStop(0.7, '#a0aec0');
    armGrad.addColorStop(1, '#4a5568');

    ctx.fillStyle = armGrad;
    ctx.strokeStyle = '#2d3748';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-8, -9, this.crankRadius + 14, 18, 9);
    ctx.fill();
    ctx.stroke();

    // Center Spindle Hub
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fillStyle = '#2d3748';
    ctx.fill();
    ctx.strokeStyle = '#cbd5e0';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#fca311';
    ctx.fill();

    // Crank Rotating Knob at the end of the arm
    const knobX = this.crankRadius;
    const knobY = 0;

    // Knob color: green when armed, pink when not
    ctx.beginPath();
    ctx.arc(knobX, knobY, 16, 0, Math.PI * 2);
    const knobColor = this.isArmed ? '#00f5d4' : (this.isDragging ? '#ff007f' : '#718096');
    ctx.fillStyle = knobColor;
    ctx.shadowColor = knobColor;
    ctx.shadowBlur = this.isArmed ? 22 : (this.isDragging ? 18 : 6);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Grip ridge pattern on knob
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(knobX, knobY, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore(); // end crank arm rotate

    ctx.restore();
  }

  drawHUD(ctx) {
    ctx.save();
    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';

    // ACQUIRED volume badge (top center)
    const statusColor = this.volume > 80 ? '#ff007f' : this.volume < 20 ? '#fca311' : '#00f5d4';
    ctx.fillStyle = 'rgba(12, 16, 28, 0.85)';
    ctx.strokeStyle = statusColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(this.width / 2 - 110, 10, 220, 28, 14);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = statusColor;
    ctx.fillText(`ACQUIRED: ${this.volume.toFixed(1)}%`, this.width / 2, 28);

    ctx.restore();
  }

  startLoop() {
    let lastTime = performance.now();
    const frame = (time) => {
      const dt = Math.min(0.06, (time - lastTime) / 1000);
      lastTime = time;

      this.update(dt);
      this.render();

      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }
}

window.CrankVolumeControl = CrankVolumeControl;
