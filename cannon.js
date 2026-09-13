// cannon.js - Method 2: Ballistic Cannon Method
class CannonVolumeControl {
  constructor(canvasId, onVolumeChange) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.onVolumeChange = onVolumeChange;

    this.width = this.canvas.width;
    this.height = this.canvas.height;

    // Cannon properties
    this.cannonX = 55;
    this.cannonY = 195;
    this.cannonAngle = -Math.PI / 4;
    this.cannonLength = 46;
    this.recoil = 0;
    this.isCharging = false;
    this.chargePower = 0.05; // 0.05 to 1.0
    this.chargeDirection = 1;

    // Volume Bar Runway (0% to 100%)
    this.barX = 115;
    this.barY = 205;
    this.barWidth = 600;
    this.barHeight = 26;
    this.volume = 50;

    // Ballistic Physics & Projectiles
    this.gravity = 680; // px/s^2
    this.projectiles = [];
    this.particles = [];
    this.craters = [];
    this.shake = 0;

    // Crosshair / mouse position
    this.mouseX = 350;
    this.mouseY = 100;
    this.lastHitText = '';
    this.lastHitColor = '#00f5d4';

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

    const updateAim = (pos) => {
      this.mouseX = pos.x;
      this.mouseY = pos.y;
      const dx = pos.x - this.cannonX;
      const dy = pos.y - this.cannonY;
      let angle = Math.atan2(dy, dx);
      // Allow angle from -85 deg up to -10 deg
      angle = Math.max(-Math.PI * 0.47, Math.min(-Math.PI * 0.05, angle));
      this.cannonAngle = angle;
    };

    this.canvas.addEventListener('mousemove', (e) => {
      updateAim(getPos(e));
    });

    this.canvas.addEventListener('mousedown', (e) => {
      const pos = getPos(e);
      updateAim(pos);
      this.isCharging = true;
      this.chargeStartTime = performance.now();
      this.chargePower = 0.2;
      this.chargeDirection = 1;
      e.preventDefault();
    });

    window.addEventListener('mouseup', () => {
      if (this.isCharging) {
        const holdDuration = performance.now() - (this.chargeStartTime || 0);
        // If it was a quick click, calibrate power toward the crosshair target!
        if (holdDuration < 200 && this.mouseX > this.cannonX) {
          const dx = Math.max(40, this.mouseX - this.cannonX);
          // Calculate needed power for parabolic trajectory
          const neededSpeed = Math.sqrt(dx * 690);
          this.chargePower = Math.max(0.1, Math.min(1.0, (neededSpeed - 90) / 720));
        }
        this.fireCannon();
        this.isCharging = false;
      }
    });

    // Touch support
    this.canvas.addEventListener('touchstart', (e) => {
      const pos = getPos(e);
      updateAim(pos);
      this.isCharging = true;
      this.chargeStartTime = performance.now();
      this.chargePower = 0.2;
      this.chargeDirection = 1;
      e.preventDefault();
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      updateAim(getPos(e));
      e.preventDefault();
    }, { passive: false });

    window.addEventListener('touchend', () => {
      if (this.isCharging) {
        const holdDuration = performance.now() - (this.chargeStartTime || 0);
        if (holdDuration < 200 && this.mouseX > this.cannonX) {
          const dx = Math.max(40, this.mouseX - this.cannonX);
          const neededSpeed = Math.sqrt(dx * 690);
          this.chargePower = Math.max(0.1, Math.min(1.0, (neededSpeed - 90) / 720));
        }
        this.fireCannon();
        this.isCharging = false;
      }
    });
  }

  fireCannon() {
    // Sound FX
    if (window.soundEngine) {
      window.soundEngine.playCannonFire();
    }

    this.recoil = 15;
    this.shake = 6;

    // Launch coordinates at the end of the barrel
    const barrelTipX = this.cannonX + Math.cos(this.cannonAngle) * this.cannonLength;
    const barrelTipY = this.cannonY + Math.sin(this.cannonAngle) * this.cannonLength;

    // Velocity based on charge power (calibrated from 90 to 810 px/s so 0% to 100% can be hit)
    const speed = 90 + this.chargePower * 720;
    const vx = Math.cos(this.cannonAngle) * speed;
    const vy = Math.sin(this.cannonAngle) * speed;

    this.projectiles.push({
      x: barrelTipX,
      y: barrelTipY,
      vx: vx,
      vy: vy,
      radius: 7,
      trail: [],
      alive: true
    });

    // Muzzle flash & smoke particles
    for (let i = 0; i < 22; i++) {
      const pAngle = this.cannonAngle + (Math.random() - 0.5) * 0.8;
      const pSpeed = 60 + Math.random() * 180;
      this.particles.push({
        x: barrelTipX,
        y: barrelTipY,
        vx: Math.cos(pAngle) * pSpeed,
        vy: Math.sin(pAngle) * pSpeed,
        radius: 3 + Math.random() * 5,
        color: Math.random() < 0.5 ? '#ff007f' : '#fca311',
        alpha: 1.0,
        decay: 1.8 + Math.random() * 2.0
      });
    }
  }

  update(dt) {
    // Screen shake decay
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 25);
    }
    // Cannon recoil recovery
    if (this.recoil > 0) {
      this.recoil = Math.max(0, this.recoil - dt * 40);
    }

    // Power oscillation while holding
    if (this.isCharging) {
      this.chargePower += this.chargeDirection * dt * 1.2;
      if (this.chargePower >= 1.0) {
        this.chargePower = 1.0;
        this.chargeDirection = -1;
      } else if (this.chargePower <= 0.15) {
        this.chargePower = 0.15;
        this.chargeDirection = 1;
      }
    }

    // Update projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      if (!p.alive) continue;

      p.trail.push({ x: p.x, y: p.y });
      if (p.trail.length > 14) p.trail.shift();

      p.x += p.vx * dt;
      p.vy += this.gravity * dt;
      p.y += p.vy * dt;

      // Check collision with the volume bar runway or ground
      if (p.y >= this.barY && p.vy > 0) {
        // Impact on bar or miss
        if (p.x >= this.barX && p.x <= this.barX + this.barWidth) {
          // DIRECT HIT ON RUNWAY!
          const hitPercent = ((p.x - this.barX) / this.barWidth) * 100;
          this.volume = Math.round(hitPercent);

          if (this.onVolumeChange) {
            this.onVolumeChange(this.volume);
          }

          if (window.soundEngine) {
            window.soundEngine.playExplosion(1.0);
          }

          this.shake = 12;
          this.lastHitText = `🎯 ${this.volume}%`;
          this.lastHitColor = '#00f5d4';

          // Spawn explosion burst
          this.spawnExplosion(p.x, this.barY);
          this.craters.push({ x: p.x, alpha: 1.0 });
        } else {
          // MISSED RUNWAY! — no volume change, just sting
          if (window.soundEngine) {
            window.soundEngine.playBuzzer();
          }
          this.shake = 8;
          this.lastHitText = '💨 MISS!';
          this.lastHitColor = '#ff007f';
          this.spawnExplosion(p.x, this.barY);
        }

        p.alive = false;
        this.projectiles.splice(i, 1);
      } else if (p.x > this.width + 100 || p.y > this.height + 100) {
        p.alive = false;
        this.projectiles.splice(i, 1);
      }
    }

    // Update explosion & smoke particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const part = this.particles[i];
      part.x += part.vx * dt;
      part.y += part.vy * dt;
      part.alpha -= part.decay * dt;
      if (part.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Fade craters
    for (let i = this.craters.length - 1; i >= 0; i--) {
      this.craters[i].alpha -= dt * 0.15;
      if (this.craters[i].alpha <= 0) {
        this.craters.splice(i, 1);
      }
    }
  }

  spawnExplosion(x, y) {
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 220;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 50,
        radius: 2 + Math.random() * 6,
        color: ['#00f5d4', '#ff007f', '#fca311', '#ffffff'][Math.floor(Math.random() * 4)],
        alpha: 1.0,
        decay: 1.5 + Math.random() * 2.5
      });
    }
  }

  render() {
    const ctx = this.ctx;
    ctx.save();

    // Screen shake
    if (this.shake > 0) {
      const sx = (Math.random() - 0.5) * this.shake;
      const sy = (Math.random() - 0.5) * this.shake;
      ctx.translate(sx, sy);
    }

    ctx.clearRect(0, 0, this.width, this.height);

    // 1. Draw Ground line & Bunker
    this.drawGround(ctx);

    // 2. Draw Volume Runway Target (0% to 100%)
    this.drawVolumeRunway(ctx);

    // 3. Draw Craters & Particles
    this.drawParticlesAndCraters(ctx);

    // 4. Draw Cannon Mount & Barrel
    this.drawCannon(ctx);

    // 5. Draw Aiming Crosshair & Trajectory arc
    this.drawAimGuide(ctx);

    // 6. Draw Projectiles
    this.drawProjectiles(ctx);

    // 7. Draw HUD (Power bar & status messages)
    this.drawHUD(ctx);

    ctx.restore();
  }

  drawGround(ctx) {
    // Tech ground grid line
    ctx.strokeStyle = '#232942';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, this.barY + this.barHeight + 6);
    ctx.lineTo(this.width, this.barY + this.barHeight + 6);
    ctx.stroke();

    // Undershoot danger zone
    ctx.fillStyle = 'rgba(255, 0, 127, 0.04)';
    ctx.fillRect(this.cannonX + 30, this.barY, this.barX - (this.cannonX + 30), this.barHeight);

    // Overshoot danger zone
    ctx.fillStyle = 'rgba(255, 0, 127, 0.04)';
    ctx.fillRect(this.barX + this.barWidth, this.barY, this.width - (this.barX + this.barWidth), this.barHeight);
  }

  drawVolumeRunway(ctx) {
    const x = this.barX;
    const y = this.barY;
    const w = this.barWidth;
    const h = this.barHeight;

    // Background track
    ctx.fillStyle = '#0f1423';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 6);
    ctx.fill();
    ctx.strokeStyle = '#2d3748';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Active volume fill (indicates current volume)
    const fillW = (w * this.volume) / 100;
    const grad = ctx.createLinearGradient(x, y, x + w, y);
    grad.addColorStop(0, '#7928ca');
    grad.addColorStop(0.5, '#00f5d4');
    grad.addColorStop(1, '#ff007f');

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x + 2, y + 2, fillW, h - 4, 4);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();

    // Target runway grid ticks & labels
    for (let i = 0; i <= 10; i++) {
      const tickX = x + (w * i) / 10;
      const isMajor = i % 5 === 0;

      ctx.strokeStyle = isMajor ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = isMajor ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(tickX, y);
      ctx.lineTo(tickX, y + (isMajor ? h : h * 0.5));
      ctx.stroke();

      // Labels below
      ctx.fillStyle = isMajor ? '#00f5d4' : '#718096';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${i * 10}%`, tickX, y + h + 16);
    }

    // Impact marker flag at current volume landing spot
    const markerX = x + fillW;
    ctx.strokeStyle = '#fca311';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(markerX, y - 16);
    ctx.lineTo(markerX, y + h);
    ctx.stroke();

    ctx.fillStyle = '#fca311';
    ctx.beginPath();
    ctx.arc(markerX, y - 16, 4, 0, Math.PI * 2);
    ctx.fill();

    // Current volume badge
    const badgeW = 96;
    ctx.fillStyle = 'rgba(15, 20, 35, 0.9)';
    ctx.beginPath();
    ctx.roundRect(markerX - badgeW / 2, y - 38, badgeW, 20, 5);
    ctx.fill();
    ctx.strokeStyle = '#fca311';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#fca311';
    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`ACQUIRED: ${this.volume}%`, markerX, y - 24);
  }

  drawCannon(ctx) {
    ctx.save();
    const cx = this.cannonX;
    const cy = this.cannonY;

    // Cannon Barrel
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.cannonAngle);

    // Apply recoil displacement along barrel
    const recoilOffset = -this.recoil;

    // Stylized Iron barrel
    const barrelGrad = ctx.createLinearGradient(0, -10, 0, 10);
    barrelGrad.addColorStop(0, '#5a6275');
    barrelGrad.addColorStop(0.5, '#1e2230');
    barrelGrad.addColorStop(1, '#5a6275');

    ctx.fillStyle = barrelGrad;
    ctx.strokeStyle = '#00f5d4';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(recoilOffset, -9, this.cannonLength, 18, [3, 6, 6, 3]);
    ctx.fill();
    ctx.stroke();

    // Muzzle Ring
    ctx.fillStyle = '#fca311';
    ctx.fillRect(recoilOffset + this.cannonLength - 5, -11, 6, 22);

    ctx.restore();

    // Cannon Mount Wheel
    ctx.beginPath();
    ctx.arc(cx, cy + 8, 16, 0, Math.PI * 2);
    ctx.fillStyle = '#22283a';
    ctx.fill();
    ctx.strokeStyle = '#718096';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Wheel spokes
    ctx.strokeStyle = '#4e597d';
    ctx.lineWidth = 2;
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 2) {
      ctx.beginPath();
      ctx.moveTo(cx, cy + 8);
      ctx.lineTo(cx + Math.cos(a) * 14, cy + 8 + Math.sin(a) * 14);
      ctx.stroke();
    }

    // Wheel Hub Bolt
    ctx.beginPath();
    ctx.arc(cx, cy + 8, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#ff007f';
    ctx.fill();

    ctx.restore();
  }

  drawAimGuide(ctx) {
    // Crosshair at mouse
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 245, 212, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(this.mouseX, this.mouseY, 12, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(this.mouseX - 16, this.mouseY);
    ctx.lineTo(this.mouseX + 16, this.mouseY);
    ctx.moveTo(this.mouseX, this.mouseY - 16);
    ctx.lineTo(this.mouseX, this.mouseY + 16);
    ctx.stroke();

    ctx.restore();
  }

  drawProjectiles(ctx) {
    ctx.save();
    this.projectiles.forEach(p => {
      // Trail
      for (let i = 0; i < p.trail.length; i++) {
        const tr = p.trail[i];
        const alpha = (i / p.trail.length) * 0.6;
        ctx.beginPath();
        ctx.arc(tr.x, tr.y, p.radius * (0.3 + (i / p.trail.length) * 0.7), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 0, 127, ${alpha})`;
        ctx.fill();
      }

      // Ball
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = '#ff007f';
      ctx.shadowColor = '#ff007f';
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
    ctx.restore();
  }

  drawParticlesAndCraters(ctx) {
    ctx.save();
    // Craters
    this.craters.forEach(c => {
      ctx.fillStyle = `rgba(255, 0, 127, ${c.alpha * 0.7})`;
      ctx.beginPath();
      ctx.arc(c.x, this.barY + 12, 10, 0, Math.PI * 2);
      ctx.fill();
    });

    // Particles
    this.particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.fill();
    });
    ctx.restore();
  }

  drawHUD(ctx) {
    ctx.save();

    // Power Meter Bar (Left side below cannon)
    const pwX = 20;
    const pwY = this.height - 35;
    const pwW = 120;
    const pwH = 14;

    ctx.fillStyle = '#111625';
    ctx.strokeStyle = '#2d3748';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(pwX, pwY, pwW, pwH, 4);
    ctx.fill();
    ctx.stroke();

    const fillPw = pwW * this.chargePower;
    const pwGrad = ctx.createLinearGradient(pwX, 0, pwX + pwW, 0);
    pwGrad.addColorStop(0, '#00f5d4');
    pwGrad.addColorStop(0.7, '#fca311');
    pwGrad.addColorStop(1, '#ff007f');

    ctx.fillStyle = pwGrad;
    ctx.beginPath();
    ctx.roundRect(pwX + 1, pwY + 1, fillPw, pwH - 2, 3);
    ctx.fill();

    ctx.fillStyle = '#a0aec0';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`PWR: ${(this.chargePower * 100).toFixed(0)}%`, pwX, pwY - 5);

    // Angle HUD
    const deg = (-this.cannonAngle * (180 / Math.PI)).toFixed(0);
    ctx.fillText(`ANG: ${deg}°`, pwX + 70, pwY - 5);

    // Last hit text
    if (this.lastHitText) {
      ctx.font = 'bold 14px "JetBrains Mono", monospace';
      ctx.fillStyle = this.lastHitColor;
      ctx.textAlign = 'center';
      ctx.fillText(this.lastHitText, this.width / 2, 30);
    }

    // ACQUIRED volume top badge
    ctx.font = 'bold 12px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    const statusColor = this.volume > 80 ? '#ff007f' : this.volume < 20 ? '#fca311' : '#00f5d4';
    ctx.fillStyle = 'rgba(12, 16, 28, 0.85)';
    ctx.strokeStyle = statusColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(this.width / 2 - 110, 8, 220, 28, 14);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = statusColor;
    ctx.fillText(`ACQUIRED: ${this.volume}%`, this.width / 2, 26);

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

window.CannonVolumeControl = CannonVolumeControl;
