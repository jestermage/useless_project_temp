// tilt.js - Method 1: Tilt (Cup-Pour Method)
class TiltVolumeControl {
  constructor(canvasId, onVolumeChange) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.onVolumeChange = onVolumeChange;

    this.angle = 0; // Current angle in radians (-maxAngle to +maxAngle)
    this.angularVelocity = 0;
    this.maxAngle = Math.PI / 6; // 30 degrees max tilt
    this.targetAngle = 0;

    this.isDragging = false;
    this.dragEnd = null; // 'left' or 'right'
    this.lastMouseY = 0;
    this.lastMouseX = 0;

    // Tube and liquid physics
    this.volume = 50; // 0 to 100
    this.sloshOffset = 0;
    this.sloshVelocity = 0;
    this.bubbles = [];
    this.pourParticles = [];

    // Dimensions
    this.width = this.canvas.width;
    this.height = this.canvas.height;
    this.centerX = this.width / 2;
    this.centerY = this.height / 2 + 10;
    this.tubeLength = 460;
    this.tubeHeight = 44;

    this.setupEvents();
    this.initBubbles();
    this.startLoop();
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(100, vol));
  }

  initBubbles() {
    for (let i = 0; i < 18; i++) {
      this.bubbles.push({
        x: (Math.random() - 0.5) * (this.tubeLength - 20),
        y: (Math.random() - 0.5) * (this.tubeHeight - 16),
        radius: 2 + Math.random() * 3.5,
        speed: 0.3 + Math.random() * 0.8,
        wobble: Math.random() * Math.PI * 2
      });
    }
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
      // Determine if clicked near left handle, right handle, or tube
      const halfL = this.tubeLength / 2;
      const leftTipX = this.centerX - Math.cos(this.angle) * halfL;
      const leftTipY = this.centerY - Math.sin(this.angle) * halfL;
      const rightTipX = this.centerX + Math.cos(this.angle) * halfL;
      const rightTipY = this.centerY + Math.sin(this.angle) * halfL;

      const distLeft = Math.hypot(pos.x - leftTipX, pos.y - leftTipY);
      const distRight = Math.hypot(pos.x - rightTipX, pos.y - rightTipY);

      if (distLeft < 55) {
        this.isDragging = true;
        this.dragEnd = 'left';
      } else if (distRight < 55) {
        this.isDragging = true;
        this.dragEnd = 'right';
      } else if (Math.hypot(pos.x - this.centerX, pos.y - this.centerY) < halfL) {
        this.isDragging = true;
        this.dragEnd = pos.x < this.centerX ? 'left' : 'right';
      }

      if (this.isDragging) {
        this.lastMouseX = pos.x;
        this.lastMouseY = pos.y;
        e.preventDefault();
      }
    };

    const onMove = (e) => {
      if (!this.isDragging) return;
      const pos = getPos(e);
      const dy = pos.y - this.lastMouseY;
      const halfL = this.tubeLength / 2;

      // When dragging right handle:
      // Pull down (dy > 0) -> angle increases (clockwise, tilted right)
      // Push up (dy < 0) -> angle decreases (counter-clockwise, tilted left)
      // When dragging left handle:
      // Pull down (dy > 0) -> angle decreases (tilted left)
      // Push up (dy < 0) -> angle increases (tilted right)
      const angleDelta = (this.dragEnd === 'right' ? dy : -dy) / halfL;
      this.angle = Math.max(-this.maxAngle, Math.min(this.maxAngle, this.angle + angleDelta));
      this.sloshVelocity += (this.dragEnd === 'right' ? -dy : dy) * 0.1;

      this.lastMouseX = pos.x;
      this.lastMouseY = pos.y;
      e.preventDefault();
    };

    const onEnd = () => {
      this.isDragging = false;
      this.dragEnd = null;
    };

    this.canvas.addEventListener('mousedown', onStart);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);

    this.canvas.addEventListener('touchstart', onStart, { passive: false });
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);

    // Keyboard support for micro tilts
    window.addEventListener('keydown', (e) => {
      if (document.activeElement.tagName === 'INPUT') return;
      if (e.key === 'ArrowRight' || e.key === 'd') {
        this.angle = Math.min(this.maxAngle, this.angle + 0.04);
        this.sloshVelocity -= 0.5;
      } else if (e.key === 'ArrowLeft' || e.key === 'a') {
        this.angle = Math.max(-this.maxAngle, this.angle - 0.04);
        this.sloshVelocity += 0.5;
      } else if (e.key === ' ' || e.key === 'Escape') {
        // Balance panic button
        this.angle = 0;
      }
    });
  }

  updatePhysics(dt) {
    // NO AUTO-BALANCER:
    // Once tilted, the tube stays tilted! It does not balance back automatically.
    if (!this.isDragging) {
      this.angularVelocity *= 0.94;
      this.angle += this.angularVelocity * dt;
      this.angle = Math.max(-this.maxAngle, Math.min(this.maxAngle, this.angle));
    }

    // Slosh physics for liquid surface
    const sloshSpring = -this.sloshOffset * 18 - Math.sin(this.angle) * 35;
    const sloshDamping = -this.sloshVelocity * 3.5;
    this.sloshVelocity += (sloshSpring + sloshDamping) * dt;
    this.sloshOffset += this.sloshVelocity * dt;

    // VOLUME MECHANISM:
    // User tilts right (angle > 0) -> Volume INCREASES (liquid pours in)
    // User tilts left (angle < 0) -> Volume DECREASES (liquid pours out)
    // Deadzone near 0 to allow resting, but small enough to be challenging
    const deadzone = 0.015;
    let flowRate = 0;
    if (this.angle > deadzone) {
      // SLOW flow rate = rage bait
      const normalizedTilt = (this.angle - deadzone) / (this.maxAngle - deadzone);
      flowRate = Math.pow(normalizedTilt, 1.4) * 6; // % per second (deliberately slow)
      this.volume = Math.min(100, this.volume + flowRate * dt);
      if (window.soundEngine && Math.random() < 0.3) {
        window.soundEngine.playPourSound(normalizedTilt);
      }
      this.spawnPourParticles('in', flowRate);
    } else if (this.angle < -deadzone) {
      const normalizedTilt = (-this.angle - deadzone) / (this.maxAngle - deadzone);
      flowRate = -Math.pow(normalizedTilt, 1.4) * 6; // % per second (deliberately slow)
      this.volume = Math.max(0, this.volume + flowRate * dt);
      if (window.soundEngine && Math.random() < 0.3) {
        window.soundEngine.playPourSound(normalizedTilt);
      }
      this.spawnPourParticles('out', -flowRate);
    }

    // ONLY notify master volume when actively flowing
    if (flowRate !== 0 && this.onVolumeChange) {
      this.onVolumeChange(this.volume);
    }

    // (Reservoirs removed)

    // Update bubbles
    this.bubbles.forEach(b => {
      b.wobble += 0.05;
      // Bubbles float towards whichever side is higher!
      // If angle > 0 (right tilted down), left is higher -> bubbles drift left
      const tiltDrift = -Math.sin(this.angle) * 120 * dt;
      b.x += tiltDrift + Math.sin(b.wobble) * 0.4;
      const halfL = this.tubeLength / 2 - 12;
      if (b.x < -halfL) b.x = halfL;
      if (b.x > halfL) b.x = -halfL;
    });

    // Update pour particles
    for (let i = this.pourParticles.length - 1; i >= 0; i--) {
      const p = this.pourParticles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 450 * dt; // gravity
      p.life -= dt;
      if (p.life <= 0) {
        this.pourParticles.splice(i, 1);
      }
    }
  }

  spawnPourParticles(direction, intensity) {
    const halfL = this.tubeLength / 2;
    if (direction === 'in') {
      // Pouring into right side from top reservoir
      const tipX = this.centerX + Math.cos(this.angle) * (halfL - 25);
      const tipY = this.centerY + Math.sin(this.angle) * (halfL - 25);
      for (let i = 0; i < 2; i++) {
        this.pourParticles.push({
          x: tipX + (Math.random() - 0.5) * 12,
          y: tipY - 50 + (Math.random() - 0.5) * 10,
          vx: (Math.random() - 0.5) * 20,
          vy: 80 + Math.random() * 60,
          radius: 2 + Math.random() * 2.5,
          color: '#00f5d4',
          life: 0.3
        });
      }
    } else {
      // Pouring out of left tip into the void/drain
      const tipX = this.centerX - Math.cos(this.angle) * halfL;
      const tipY = this.centerY - Math.sin(this.angle) * halfL;
      for (let i = 0; i < 3; i++) {
        this.pourParticles.push({
          x: tipX,
          y: tipY + (Math.random() - 0.5) * 8,
          vx: -50 - Math.random() * 40,
          vy: 30 + Math.random() * 50,
          radius: 2.5 + Math.random() * 2.5,
          color: '#ff007f',
          life: 0.5
        });
      }
    }
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    // Draw pour particles
    this.drawParticles(ctx);

    // Draw tilted tube (with rotation)
    ctx.save();
    ctx.translate(this.centerX, this.centerY);
    ctx.rotate(this.angle);
    this.drawTiltTube(ctx);
    ctx.restore();

    // Draw HUD overlay
    this.drawTiltHUD(ctx);
  }

  drawReservoirs(ctx) {
    const halfL = this.tubeLength / 2;

    // LEFT: Drain Waste Basin — fills up with poured-out liquid
    const drainX = this.centerX - halfL - 35;
    const drainY = this.centerY + 45;
    const dW = 50, dH = 45;
    ctx.save();
    // Basin shell
    ctx.fillStyle = 'rgba(255, 0, 127, 0.08)';
    ctx.strokeStyle = '#ff007f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(drainX - dW / 2, drainY, dW, dH, [0, 0, 8, 8]);
    ctx.fill();
    ctx.stroke();
    // Animated liquid fill from bottom
    const dFillH = dH * this.drainLevel;
    if (dFillH > 1) {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(drainX - dW / 2 + 3, drainY + dH - dFillH, dW - 6, dFillH - 3, [0, 0, 6, 6]);
      ctx.clip();
      const dGrad = ctx.createLinearGradient(drainX, drainY + dH, drainX, drainY);
      dGrad.addColorStop(0, 'rgba(255, 0, 127, 0.9)');
      dGrad.addColorStop(1, 'rgba(255, 0, 127, 0.3)');
      ctx.fillStyle = dGrad;
      ctx.fillRect(drainX - dW / 2 + 3, drainY, dW - 6, dH);
      ctx.restore();
    }
    // Label
    ctx.fillStyle = '#ff007f';
    ctx.font = 'bold 8px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('DRAIN', drainX, drainY - 5);
    ctx.restore();

    // RIGHT: Supply Tank — depletes as liquid pours in to the tube
    const supplyX = this.centerX + halfL + 35;
    const supplyY = this.centerY - 50;
    const sW = 50, sH = 45;
    ctx.save();
    // Tank shell
    ctx.fillStyle = 'rgba(0, 245, 212, 0.08)';
    ctx.strokeStyle = '#00f5d4';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(supplyX - sW / 2, supplyY, sW, sH, [8, 8, 0, 0]);
    ctx.fill();
    ctx.stroke();
    // Animated liquid fill from bottom
    const sFillH = sH * this.supplyLevel;
    if (sFillH > 1) {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(supplyX - sW / 2 + 3, supplyY + sH - sFillH, sW - 6, sFillH - 3, [6, 6, 0, 0]);
      ctx.clip();
      const sGrad = ctx.createLinearGradient(supplyX, supplyY + sH, supplyX, supplyY);
      sGrad.addColorStop(0, 'rgba(0, 245, 212, 0.9)');
      sGrad.addColorStop(1, 'rgba(0, 245, 212, 0.3)');
      ctx.fillStyle = sGrad;
      ctx.fillRect(supplyX - sW / 2 + 3, supplyY, sW - 6, sH);
      ctx.restore();
    }
    // Level % text
    ctx.fillStyle = '#00f5d4';
    ctx.font = 'bold 8px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SUPPLY', supplyX, supplyY - 5);
    ctx.restore();
  }

  drawParticles(ctx) {
    ctx.save();
    this.pourParticles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.fill();
    });
    ctx.restore();
  }

  drawTiltTube(ctx) {
    const halfL = this.tubeLength / 2;
    const halfH = this.tubeHeight / 2;

    // Tube Outer Glass Glow
    ctx.save();

    // Fill fluid inside tube
    // Normalized volume: 0 to 1
    const fillPercent = this.volume / 100;
    const fillWidth = (this.tubeLength - 10) * fillPercent;

    // Glass background
    ctx.fillStyle = 'rgba(12, 16, 28, 0.85)';
    ctx.beginPath();
    ctx.roundRect(-halfL, -halfH, this.tubeLength, this.tubeHeight, 10);
    ctx.fill();

    // Fluid gradient
    const fluidGrad = ctx.createLinearGradient(-halfL, 0, halfL, 0);
    fluidGrad.addColorStop(0, '#7928ca');
    fluidGrad.addColorStop(0.5, '#00f5d4');
    fluidGrad.addColorStop(1, '#ff007f');

    // Fluid clip path
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(-halfL + 5, -halfH + 5, this.tubeLength - 10, this.tubeHeight - 10, 6);
    ctx.clip();

    // Sloshing fluid wave
    if (this.volume > 0) {
      ctx.fillStyle = fluidGrad;
      ctx.beginPath();
      // Fluid starts from left (-halfL + 5) to (-halfL + 5 + fillWidth)
      const fluidStartX = -halfL + 5;
      const fluidEndX = fluidStartX + fillWidth;

      // Draw fluid rectangle with surface dynamic
      ctx.moveTo(fluidStartX, halfH);
      ctx.lineTo(fluidStartX, -halfH + 5);
      // Fluid meniscus line with slosh influence
      const sloshTiltEffect = Math.sin(-this.angle) * 12;
      ctx.quadraticCurveTo(
        (fluidStartX + fluidEndX) / 2,
        -halfH + 5 + sloshTiltEffect + this.sloshOffset * 0.4,
        fluidEndX,
        -halfH + 5
      );
      ctx.lineTo(fluidEndX, halfH);
      ctx.closePath();
      ctx.fill();

      // Fluid glow on surface
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw bubbles inside fluid
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      this.bubbles.forEach(b => {
        if (b.x >= fluidStartX && b.x <= fluidEndX) {
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }

    ctx.restore(); // end clip

    // Measurement ticks on glass
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    for (let i = 10; i <= 90; i += 10) {
      const tx = -halfL + (this.tubeLength * i) / 100;
      ctx.beginPath();
      ctx.moveTo(tx, -halfH + 5);
      ctx.lineTo(tx, -halfH + (i % 50 === 0 ? 14 : 9));
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(tx, halfH - 5);
      ctx.lineTo(tx, halfH - (i % 50 === 0 ? 14 : 9));
      ctx.stroke();
    }

    // Glass Tube Border with neon highlight
    ctx.strokeStyle = 'rgba(0, 245, 212, 0.6)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(-halfL, -halfH, this.tubeLength, this.tubeHeight, 10);
    ctx.stroke();

    // Spout nozzle on left tip
    ctx.fillStyle = '#ff007f';
    ctx.beginPath();
    ctx.moveTo(-halfL, -halfH + 10);
    ctx.lineTo(-halfL - 14, -halfH + 16);
    ctx.lineTo(-halfL - 14, halfH - 16);
    ctx.lineTo(-halfL, halfH - 10);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Funnel collar on right tip
    ctx.fillStyle = '#00f5d4';
    ctx.beginPath();
    ctx.moveTo(halfL, -halfH + 8);
    ctx.lineTo(halfL + 14, -halfH);
    ctx.lineTo(halfL + 14, halfH);
    ctx.lineTo(halfL, halfH - 8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // LEFT HANDLE (PULL/PUSH)
    this.drawHandle(ctx, -halfL - 25, 0, 'left');

    // RIGHT HANDLE (PULL/PUSH)
    this.drawHandle(ctx, halfL + 25, 0, 'right');

    ctx.restore();
  }

  drawHandle(ctx, x, y, side) {
    const isHover = this.isDragging && this.dragEnd === side;
    ctx.save();
    ctx.translate(x, y);

    // Connector rod
    ctx.fillStyle = '#39415c';
    ctx.fillRect(side === 'left' ? 0 : -14, -5, 14, 10);

    // Handle Grip Knob
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.fillStyle = isHover ? '#ff007f' : (side === 'left' ? '#ff3366' : '#00f5d4');
    ctx.shadowColor = isHover ? '#ff007f' : (side === 'left' ? '#ff3366' : '#00f5d4');
    ctx.shadowBlur = isHover ? 18 : 8;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Direction arrows icon inside handle
    ctx.fillStyle = '#111';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⇅', 0, 0);

    ctx.restore();
  }

  drawTiltHUD(ctx) {
    ctx.save();
    ctx.font = 'bold 12px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';

    let statusColor = '#00f5d4';
    if (this.volume > 80) statusColor = '#ff007f';
    else if (this.volume < 20) statusColor = '#fca311';

    // Top status pill showing ACQUIRED VOLUME
    ctx.fillStyle = 'rgba(12, 16, 28, 0.85)';
    ctx.strokeStyle = statusColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(this.centerX - 110, 12, 220, 28, 14);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = statusColor;
    ctx.fillText(`ACQUIRED: ${this.volume.toFixed(1)}%`, this.centerX, 30);

    ctx.restore();
  }

  startLoop() {
    let lastTime = performance.now();
    const frame = (time) => {
      const dt = Math.min(0.06, (time - lastTime) / 1000);
      lastTime = time;

      this.updatePhysics(dt);
      this.render();

      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }
}

window.TiltVolumeControl = TiltVolumeControl;
