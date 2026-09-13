// app.js - Master Controller & Application Logic
document.addEventListener('DOMContentLoaded', () => {
  // Application State
  const state = {
    masterVolume: 50,
    activeTab: 'tilt',
    targetVolume: 42,
    targetTolerance: 1.5,
    targetHoldTime: 0,
    targetCompleted: false,
    isTargetActive: true,
    attempts: 0,
    frustrationIndex: 69,
    unstablePhysics: false,
    controls: {}
  };

  // DOM Elements
  const masterVolumeDisplay = document.getElementById('master-volume-value');
  const masterVolumeDesc = document.getElementById('master-volume-desc');
  const masterDbDisplay = document.getElementById('master-db-value');
  const masterBarFill = document.getElementById('master-bar-fill');
  const tabButtons = document.querySelectorAll('.tab-btn');
  const methodPanels = document.querySelectorAll('.method-panel');
  const targetValDisplay = document.getElementById('target-value-text');
  const targetCurrentDisplay = document.getElementById('target-current-text');
  const targetStatusDisplay = document.getElementById('target-status-text');
  const targetProgressBar = document.getElementById('target-progress-fill');
  const newTargetBtn = document.getElementById('new-target-btn');
  const frustrationCounter = document.getElementById('frustration-counter');
  const rageQuoteText = document.getElementById('rage-quote-text');
  const unstableToggle = document.getElementById('unstable-physics-toggle');

  const rageQuotes = [
    '"Why would you ever need a simple slider when Option 2 can launch your volume?"',
    '"Pro tip: Option 3 definitely will not break if you turn it faster. (It will)."',
    '"Studies show 98% of users give up and listen to their music at 0% or 100%."',
    '"Physics engine calibrated specifically to infuriate your precise motor skills."',
    '"Have you considered accepting 78% volume instead of 50%?"',
    '"A normal slider is for cowards. True audiophiles master Option 1."'
  ];

  // Helper to update master volume from any source
  function updateMasterVolume(newVal, source) {
    if (source !== 'tab-switch' && source !== state.activeTab) {
      return;
    }

    state.masterVolume = Math.max(0, Math.min(100, newVal));

    // Update Sound Engine Gain
    if (window.soundEngine) {
      window.soundEngine.setVolume(state.masterVolume / 100);
    }

    // Sync other controllers
    if (source !== 'tilt' && state.controls.tilt) {
      state.controls.tilt.setVolume(state.masterVolume);
    }
    if (source !== 'cannon' && state.controls.cannon) {
      state.controls.cannon.setVolume(state.masterVolume);
    }
    if (source !== 'crank' && state.controls.crank) {
      state.controls.crank.setVolume(state.masterVolume);
    }
    if (source !== 'scream' && state.controls.scream) {
      state.controls.scream.setVolume(state.masterVolume);
    }

    // Update HUD
    renderHUD();

    // Check Challenge Mode
    checkTargetChallenge();
  }

  function renderHUD() {
    const vol = state.masterVolume;
    masterVolumeDisplay.textContent = vol.toFixed(1) + '%';
    masterBarFill.style.width = `${vol}%`;

    // Estimate dB
    let dbText = '-inf dB';
    if (vol > 0) {
      const db = 20 * Math.log10(vol / 100);
      dbText = `${db.toFixed(1)} dB`;
    }
    masterDbDisplay.textContent = dbText;

    // Descriptive labels
    let desc = '';
    let descColor = '#00f5d4';
    if (vol === 0) {
      desc = '🔇 DEAD SILENCE (Void of Nothingness)';
      descColor = '#718096';
    } else if (vol <= 15) {
      desc = '🤫 MURMUR OF AGONY (Barely Audible Straining)';
      descColor = '#38b2ac';
    } else if (vol <= 35) {
      desc = '👂 AWKWARDLY QUIET (Muffled Whispers)';
      descColor = '#48bb78';
    } else if (vol <= 60) {
      desc = '⚖️ PAINFULLY MODERATE (Normal, But Why?)';
      descColor = '#ecc94b';
    } else if (vol <= 80) {
      desc = '🔊 NEIGHBOR DISTURBER (Walls Are Vibrating)';
      descColor = '#ed8936';
    } else if (vol < 100) {
      desc = '💥 EARDRUM ANNIHILATOR (Hearing Damage Imminent)';
      descColor = '#f56565';
    } else {
      desc = '🚨 SONIC APOCALYPSE (MAXIMUM CHAOS BLAST)';
      descColor = '#ff007f';
    }
    masterVolumeDesc.textContent = desc;
    masterVolumeDesc.style.color = descColor;

    const acquiredTag = document.getElementById('acquired-volume-tag');
    if (acquiredTag) {
      acquiredTag.textContent = vol.toFixed(1) + '%';
    }
    if (targetCurrentDisplay) {
      targetCurrentDisplay.textContent = vol.toFixed(1) + '%';
    }
  }

  // Initialize Canvas Controllers
  function initControllers() {
    // 1. Tilt
    if (document.getElementById('tilt-canvas')) {
      state.controls.tilt = new window.TiltVolumeControl('tilt-canvas', (vol) => {
        updateMasterVolume(vol, 'tilt');
      });
      state.controls.tilt.setVolume(state.masterVolume);
    }

    // 2. Cannon
    if (document.getElementById('cannon-canvas')) {
      state.controls.cannon = new window.CannonVolumeControl('cannon-canvas', (vol) => {
        if (state.activeTab !== 'cannon') return;
        state.attempts++;
        state.frustrationIndex += Math.floor(Math.random() * 15) + 8;
        frustrationCounter.textContent = state.frustrationIndex;
        updateMasterVolume(vol, 'cannon');
      });
      state.controls.cannon.setVolume(state.masterVolume);
    }

    // 3. Crank
    if (document.getElementById('crank-canvas')) {
      state.controls.crank = new window.CrankVolumeControl('crank-canvas', (vol) => {
        updateMasterVolume(vol, 'crank');
      });
      state.controls.crank.setVolume(state.masterVolume);
    }

    if (document.getElementById('scream-start-btn')) {
      state.controls.scream = new window.ScreamVolumeControl('scream-start-btn', {
        onVolumeChange: (vol) => updateMasterVolume(vol, 'scream')
      });
    }
  }

  // Unified Tab Switching with scroll-into-view
  function switchTab(targetTab) {
    if (state.controls.scream && targetTab !== 'scream') {
      state.controls.scream.stop();
    }

    state.activeTab = targetTab;

    tabButtons.forEach(b => b.classList.toggle('active', b.dataset.tab === targetTab));
    methodPanels.forEach(p => {
      p.classList.toggle('active', p.id === `panel-${targetTab}`);
    });

    // Synchronize active volumes
    updateMasterVolume(state.masterVolume, 'tab-switch');

    // Smoothly scroll the panel into view so the user definitely sees it!
    const activePanel = document.getElementById(`panel-${targetTab}`);
    if (activePanel) {
      activePanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      switchTab(btn.dataset.tab);
    });
  });

  // Direct quick switch buttons inside each panel header
  document.querySelectorAll('.quick-switch-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      switchTab(btn.dataset.switch);
    });
  });

  // Target Challenge System
  function generateNewTarget() {
    state.targetVolume = Math.floor(Math.random() * 85) + 10; // 10% to 95%
    state.targetHoldTime = 0;
    state.targetCompleted = false;
    targetValDisplay.textContent = `${state.targetVolume}% (±${state.targetTolerance}%)`;
    targetStatusDisplay.textContent = 'Use Option 1, Option 2, Option 3, or Option 4 to reach the target and hold it for 1.0s!';
    targetStatusDisplay.style.color = '#a0aec0';
    targetProgressBar.style.width = '0%';
  }

  function checkTargetChallenge() {
    const diff = Math.abs(state.masterVolume - state.targetVolume);
    if (diff <= state.targetTolerance) {
      targetStatusDisplay.textContent = `🎯 ON TARGET! HOLD IT! (${diff.toFixed(1)}% off)`;
      targetStatusDisplay.style.color = '#00f5d4';
    } else {
      if (state.targetHoldTime > 0) {
        state.targetHoldTime = 0;
        targetProgressBar.style.width = '0%';
        targetStatusDisplay.textContent = `Slipped away! (Current: ${state.masterVolume.toFixed(1)}%)`;
        targetStatusDisplay.style.color = '#ff007f';
      }
    }
  }

  // Target Timer Loop for Hold Verification
  setInterval(() => {
    const diff = Math.abs(state.masterVolume - state.targetVolume);
    if (diff <= state.targetTolerance) {
      state.targetHoldTime += 0.1;
      const progress = Math.min(100, (state.targetHoldTime / 1.0) * 100);
      targetProgressBar.style.width = `${progress}%`;

      if (state.targetHoldTime >= 1.0 && !state.targetCompleted) {
        state.targetCompleted = true;
        // VICTORY!
        if (window.soundEngine) {
          window.soundEngine.playVictory();
        }
        triggerConfetti();
        targetStatusDisplay.textContent = `🎉 INCREDIBLE! YOU TAMED THE BEAST AT ${state.targetVolume}%!`;
        targetStatusDisplay.style.color = '#fca311';

        setTimeout(() => {
          generateNewTarget();
        }, 3000);
      }
    } else {
      state.targetHoldTime = Math.max(0, state.targetHoldTime - 0.2);
      targetProgressBar.style.width = '0%';
    }
  }, 100);

  if (newTargetBtn) {
    newTargetBtn.addEventListener('click', () => {
      generateNewTarget();
      state.frustrationIndex += 10;
      frustrationCounter.textContent = state.frustrationIndex;
    });
  }

  // Rage Quote Rotation
  setInterval(() => {
    const quote = rageQuotes[Math.floor(Math.random() * rageQuotes.length)];
    if (rageQuoteText) {
      rageQuoteText.style.opacity = '0';
      setTimeout(() => {
        rageQuoteText.textContent = quote;
        rageQuoteText.style.opacity = '1';
      }, 300);
    }
  }, 9000);

  // Unstable Physics Mode Toggle (Earthquake Jitter)
  if (unstableToggle) {
    unstableToggle.addEventListener('change', (e) => {
      state.unstablePhysics = e.target.checked;
      if (state.unstablePhysics) {
        startEarthquakeJitter();
      }
    });
  }

  function startEarthquakeJitter() {
    if (!state.unstablePhysics) return;
    const jitter = (Math.random() - 0.5) * 1.5;
    if (state.controls.tilt) {
      state.controls.tilt.angle += jitter * 0.01;
    }
    setTimeout(startEarthquakeJitter, 300 + Math.random() * 500);
  }

  // Confetti Particle Burst for Victory
  function triggerConfetti() {
    const container = document.body;
    for (let i = 0; i < 60; i++) {
      const conf = document.createElement('div');
      conf.className = 'confetti-piece';
      conf.style.left = `${Math.random() * 100}vw`;
      conf.style.backgroundColor = ['#00f5d4', '#ff007f', '#fca311', '#7928ca', '#ffffff'][Math.floor(Math.random() * 5)];
      conf.style.animationDuration = `${1.5 + Math.random() * 2}s`;
      container.appendChild(conf);
      setTimeout(() => conf.remove(), 3500);
    }
  }

  // Initialize
  initControllers();
  generateNewTarget();
  renderHUD();
});
