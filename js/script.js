(function () {
  if (window.__TIKTOK_CAKE_INITIALIZED__) return;
  window.__TIKTOK_CAKE_INITIALIZED__ = true;

  // DOM Elements
  const canvas = document.getElementById('ambientCanvas');
  const ctx = canvas.getContext('2d');

  const candle = document.getElementById('interactiveCandle');
  const blowBtn = document.getElementById('blowBtn');
  const blowBtnLabel = document.getElementById('blowBtnLabel');
  const openLetterBtn = document.getElementById('openLetterBtn');
  const burstHeartsBtn = document.getElementById('burstHeartsBtn');
  const actionHint = document.getElementById('actionHint');

  const musicToggleBtn = document.getElementById('musicToggleBtn');

  // Modals
  const letterModal = document.getElementById('letterModal');
  const closeLetterBtn = document.getElementById('closeLetterBtn');
  const continuePartyBtn = document.getElementById('continuePartyBtn');

  // Trang chờ: Chuyến tàu sinh nhật
  const introWaitScreen = document.getElementById('introWaitScreen');
  const introStartBtn = document.getElementById('introStartBtn');
  const skipIntroBtn = document.getElementById('skipIntroBtn');
  const introProgressBar = document.getElementById('introProgressBar');
  const heartSmokeEmitter = document.getElementById('heartSmokeEmitter');
  const reopenIntroBtn = document.getElementById('reopenIntroBtn');
  const backToIntroBtn = document.getElementById('backToIntroBtn');

  // Màn hình khóa mật khẩu
  const lockScreen = document.getElementById('lockScreen');
  const lockCard = document.getElementById('lockCard');
  const passwordInput = document.getElementById('passwordInput');
  const lockErrorMsg = document.getElementById('lockErrorMsg');
  const unlockSubmitBtn = document.getElementById('unlockSubmitBtn');
  const numKeys = document.querySelectorAll('.num-key[data-val]');
  const keyClear = document.getElementById('keyClear');
  const keyDel = document.getElementById('keyDel');

  // Input & Display Elements
  const displayRecipientName = document.getElementById('displayRecipientName');
  const letterSalutation = document.getElementById('letterSalutation');
  const letterBodyText = document.getElementById('letterBodyText');
  const displaySenderName = document.getElementById('displaySenderName');

  // State
  let isCandleLit = true;
  let isMusicPlaying = false;
  let audioCtx = null;
  let musicTimer = null;

  // Xóa cache lời chúc cũ để web hiển thị 100% đúng nội dung bạn viết trong HTML
  try {
    localStorage.removeItem('birthday_princess_data');
  } catch (e) { }

  // 2. Canvas Nền: Mưa trái tim bay & đốm sáng lung linh (Tối ưu độ nét Retina & 60fps Mobile)
  let width, height;
  let dpr = 1;
  const isMobile = () => window.innerWidth < 768;

  function resizeCanvas() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  const hearts = [];
  const sparkles = [];

  // Đường dẫn SVG chuẩn của hình trái tim (24x24)
  const HEART_PATH = new Path2D("M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z");
  const HEART_COLORS = ['#f06292', '#ec407a', '#f48fb1', '#ff80ab', '#ff4081', '#f8a5c2', '#ff7597'];

  class AmbientHeart {
    constructor() {
      this.reset(true);
    }
    reset(initial = false) {
      this.x = Math.random() * width;
      this.y = initial ? Math.random() * height : height + 30;
      this.scale = 0.6 + Math.random() * 1.4;
      this.speedY = 0.7 + Math.random() * 1.4;
      this.speedX = (Math.random() - 0.5) * 0.5;
      this.opacity = 0.35 + Math.random() * 0.45;
      this.angle = Math.random() * Math.PI * 2;
      this.swaySpeed = 0.015 + Math.random() * 0.02;
      this.rot = (Math.random() - 0.5) * 0.4;
      this.color = HEART_COLORS[Math.floor(Math.random() * HEART_COLORS.length)];
    }
    update() {
      this.y -= this.speedY;
      this.angle += this.swaySpeed;
      this.x += Math.sin(this.angle) * 0.7 + this.speedX;
      this.rot = Math.sin(this.angle) * 0.25;
      if (this.y < -40) {
        this.reset();
      }
    }
    draw() {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rot);
      ctx.scale(this.scale, this.scale);
      ctx.translate(-12, -12);
      ctx.globalAlpha = this.opacity;
      ctx.fillStyle = this.color;
      if (!isMobile()) {
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 6;
      }
      ctx.fill(HEART_PATH);
      ctx.restore();
    }
  }

  class Sparkle {
    constructor() {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      this.size = 1.5 + Math.random() * 2.2;
      this.alpha = Math.random();
      this.fadeSpeed = 0.01 + Math.random() * 0.02;
    }
    update() {
      this.alpha += this.fadeSpeed;
      if (this.alpha > 1 || this.alpha < 0) {
        this.fadeSpeed = -this.fadeSpeed;
      }
    }
    draw() {
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, this.alpha)) * 0.6;
      ctx.fillStyle = '#ffffff';
      if (!isMobile()) {
        ctx.shadowBlur = 5;
        ctx.shadowColor = '#fff59d';
      }
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // Số lượng hạt thích ứng theo thiết bị (giữ 60fps mượt mà trên mobile)
  const countHearts = isMobile() ? 28 : 55;
  const countSparkles = isMobile() ? 18 : 35;
  for (let i = 0; i < countHearts; i++) hearts.push(new AmbientHeart());
  for (let i = 0; i < countSparkles; i++) sparkles.push(new Sparkle());

  function animateAmbient() {
    ctx.clearRect(0, 0, width, height);
    for (let s of sparkles) {
      s.update();
      s.draw();
    }
    for (let h of hearts) {
      h.update();
      h.draw();
    }
    requestAnimationFrame(animateAmbient);
  }
  animateAmbient();

  // 3. Web Audio API: Âm thanh thổi nến & Hộp nhạc lãng mạn
  function getAudioCtx() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) audioCtx = new AudioContextClass();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  // Tự động mở khóa âm thanh trên điện thoại ngay từ lần chạm đầu tiên
  function unlockMobileAudio() {
    getAudioCtx();
    window.removeEventListener('touchstart', unlockMobileAudio);
    window.removeEventListener('pointerdown', unlockMobileAudio);
    window.removeEventListener('click', unlockMobileAudio);
  }
  window.addEventListener('touchstart', unlockMobileAudio, { passive: true });
  window.addEventListener('pointerdown', unlockMobileAudio, { passive: true });
  window.addEventListener('click', unlockMobileAudio, { passive: true });

  function playBlowSound() {
    try {
      const actx = getAudioCtx();
      if (!actx) return;
      const now = actx.currentTime;

      // Tiếng phù nhẹ
      const buffer = actx.createBuffer(1, actx.sampleRate * 0.4, actx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (actx.sampleRate * 0.12));
      }
      const noise = actx.createBufferSource();
      noise.buffer = buffer;
      const filter = actx.createBiquadFilter();
      filter.frequency.setValueAtTime(400, now);
      filter.frequency.exponentialRampToValueAtTime(100, now + 0.35);
      const gain = actx.createGain();
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(actx.destination);
      noise.start(now);

      // Chuông ngân thần tiên
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const osc = actx.createOscillator();
        const g = actx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + 0.1 + i * 0.08);
        g.gain.setValueAtTime(0.12, now + 0.1 + i * 0.08);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.8 + i * 0.08);
        osc.connect(g);
        g.connect(actx.destination);
        osc.start(now + 0.1 + i * 0.08);
        osc.stop(now + 0.9 + i * 0.08);
      });
    } catch (e) { }
  }

  // Giai điệu sinh nhật lãng mạn (Happy Birthday Music Box)
  const melody = [
    { note: 'G4', dur: 0.35, pause: 0.08 },
    { note: 'G4', dur: 0.35, pause: 0.08 },
    { note: 'A4', dur: 0.7, pause: 0.1 },
    { note: 'G4', dur: 0.7, pause: 0.1 },
    { note: 'C5', dur: 0.7, pause: 0.1 },
    { note: 'B4', dur: 1.2, pause: 0.3 },

    { note: 'G4', dur: 0.35, pause: 0.08 },
    { note: 'G4', dur: 0.35, pause: 0.08 },
    { note: 'A4', dur: 0.7, pause: 0.1 },
    { note: 'G4', dur: 0.7, pause: 0.1 },
    { note: 'D5', dur: 0.7, pause: 0.1 },
    { note: 'C5', dur: 1.2, pause: 0.3 },

    { note: 'G4', dur: 0.35, pause: 0.08 },
    { note: 'G4', dur: 0.35, pause: 0.08 },
    { note: 'G5', dur: 0.7, pause: 0.1 },
    { note: 'E5', dur: 0.7, pause: 0.1 },
    { note: 'C5', dur: 0.7, pause: 0.1 },
    { note: 'B4', dur: 0.7, pause: 0.1 },
    { note: 'A4', dur: 1.0, pause: 0.25 },

    { note: 'F5', dur: 0.35, pause: 0.08 },
    { note: 'F5', dur: 0.35, pause: 0.08 },
    { note: 'E5', dur: 0.7, pause: 0.1 },
    { note: 'C5', dur: 0.7, pause: 0.1 },
    { note: 'D5', dur: 0.7, pause: 0.1 },
    { note: 'C5', dur: 1.4, pause: 0.5 },
  ];

  const freqs = {
    'G4': 392.0, 'A4': 440.0, 'B4': 493.88, 'C5': 523.25,
    'D5': 587.33, 'E5': 659.25, 'F5': 698.46, 'G5': 783.99
  };

  function playNote(freq, dur) {
    if (!isMusicPlaying) return;
    const actx = getAudioCtx();
    if (!actx) return;
    const now = actx.currentTime;

    const osc1 = actx.createOscillator();
    const osc2 = actx.createOscillator();
    const g = actx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, now);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 2, now);

    g.gain.setValueAtTime(0.2, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur + 0.35);

    osc1.connect(g);
    osc2.connect(g);
    g.connect(actx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + dur + 0.4);
    osc2.stop(now + dur + 0.4);
  }

  function playTune(idx = 0) {
    if (!isMusicPlaying) return;
    if (idx >= melody.length) {
      musicTimer = setTimeout(() => {
        if (isMusicPlaying) playTune(0);
      }, 1500);
      return;
    }

    const item = melody[idx];
    if (freqs[item.note]) {
      playNote(freqs[item.note], item.dur);
    }

    const nextDelay = (item.dur + item.pause) * 1000;
    musicTimer = setTimeout(() => {
      playTune(idx + 1);
    }, nextDelay);
  }

  function toggleMusic(forceState) {
    getAudioCtx();
    if (forceState !== undefined) {
      isMusicPlaying = forceState;
    } else {
      isMusicPlaying = !isMusicPlaying;
    }

    if (isMusicPlaying) {
      musicToggleBtn.classList.add('playing');
      clearTimeout(musicTimer);
      playTune(0);
    } else {
      musicToggleBtn.classList.remove('playing');
      clearTimeout(musicTimer);
    }
  }

  musicToggleBtn.addEventListener('click', () => toggleMusic());

  // 4. Pháo hoa trái tim bùng nổ khi thổi nến
  function launchHeartFireworks() {
    const originX = window.innerWidth / 2;
    const originY = window.innerHeight / 2 - 50;
    const emojis = ['💖', '💕', '✨', '🌸', '👑', '🎂', '🍓', '💗'];

    for (let i = 0; i < 45; i++) {
      const el = document.createElement('div');
      el.className = 'firework-heart';
      el.textContent = emojis[Math.floor(Math.random() * emojis.length)];

      const angle = Math.random() * Math.PI * 2;
      const dist = 70 + Math.random() * 220;
      const vx = Math.cos(angle) * dist;
      const vy = Math.sin(angle) * dist;
      const vr = (Math.random() - 0.5) * 360;

      el.style.left = `${originX}px`;
      el.style.top = `${originY}px`;
      el.style.setProperty('--vx', `${vx}px`);
      el.style.setProperty('--vy', `${vy}px`);
      el.style.setProperty('--vr', `${vr}deg`);

      document.body.appendChild(el);
      setTimeout(() => el.remove(), 2100);
    }
  }

  // 5. Thổi nến và mở thư
  function toggleCandleState() {
    if (isCandleLit) {
      // Thổi tắt nến
      candle.classList.add('blown-out');
      isCandleLit = false;
      blowBtnLabel.textContent = 'Thắp lại nến';
      actionHint.textContent = '🎉 Mong điều ước của cậu sẽ chạm tới các vì sao ✨';

      playBlowSound();
      launchHeartFireworks();

      if (navigator.vibrate) {
        navigator.vibrate([40, 60, 100]);
      }
      stopMicListening();

      // Bật nhạc nếu chưa bật
      if (!isMusicPlaying) {
        toggleMusic(true);
      }

      // Tự động mở bức thư tình sau 1.3s
      setTimeout(() => {
        openModal(letterModal);
      }, 1300);

    } else {
      // Thắp lại nến
      candle.classList.remove('blown-out');
      isCandleLit = true;
      blowBtnLabel.textContent = 'Thổi nến ước nguyện';
      actionHint.textContent = '✨ Chạm vào ngọn nến hoặc thổi vào mic để mở thư bí mật nhé ✨';
    }
  }

  candle.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleCandleState();
  });

  blowBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleCandleState();
  });

  // TÍNH NĂNG ĐẶC BIỆT TRÊN ĐIỆN THOẠI: Thổi nến bằng Micro
  const micBlowBtn = document.getElementById('micBlowBtn');
  const micBlowLabel = document.getElementById('micBlowLabel');
  let micStream = null;
  let micAudioCtx = null;
  let micAnalyser = null;
  let isListeningMic = false;
  let micAnimId = null;

  async function toggleMicBlowing() {
    if (isListeningMic) {
      stopMicListening();
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('Trình duyệt chưa hỗ trợ micro thổi nến. Bạn chỉ cần chạm vào cây nến để thổi nhé! 💕');
      return;
    }

    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micAudioCtx = getAudioCtx() || new (window.AudioContext || window.webkitAudioContext)();
      if (micAudioCtx.state === 'suspended') await micAudioCtx.resume();

      const source = micAudioCtx.createMediaStreamSource(micStream);
      micAnalyser = micAudioCtx.createAnalyser();
      micAnalyser.fftSize = 512;
      micAnalyser.smoothingTimeConstant = 0.3;
      source.connect(micAnalyser);

      isListeningMic = true;
      if (micBlowBtn) micBlowBtn.classList.add('mic-active');
      if (micBlowLabel) micBlowLabel.textContent = 'Đang nghe... Thổi nào! 💨';
      actionHint.textContent = '💨 Ghé sát miệng vào mic điện thoại và thổi mạnh một hơi nào!';

      const bufferLength = micAnalyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      let blowCount = 0;

      function checkBlow() {
        if (!isListeningMic || !isCandleLit) return;
        micAnalyser.getByteFrequencyData(dataArray);

        // Tính âm lượng gió thổi dải tần thấp (80Hz - 600Hz)
        let lowSum = 0;
        const lowCount = 20;
        for (let i = 2; i <= lowCount; i++) lowSum += dataArray[i];
        const lowAvg = lowSum / lowCount;

        if (lowAvg > 46) {
          const flameWrapper = document.querySelector('.heart-flame-wrapper');
          if (flameWrapper) {
            flameWrapper.style.transform = `scale(${0.7 + Math.random() * 0.5}) rotate(${(Math.random() - 0.5) * 35}deg)`;
          }
          blowCount++;
          if (blowCount >= 5) {
            stopMicListening();
            toggleCandleState();
            return;
          }
        } else {
          blowCount = Math.max(0, blowCount - 1);
        }

        micAnimId = requestAnimationFrame(checkBlow);
      }
      checkBlow();

    } catch (err) {
      console.warn('Mic access:', err);
      alert('Chưa cấp quyền micro. Bạn hãy chạm vào cây nến hoặc bấm nút "Thổi nến" nhé! 💕');
      stopMicListening();
    }
  }

  function stopMicListening() {
    isListeningMic = false;
    if (micAnimId) cancelAnimationFrame(micAnimId);
    if (micStream) {
      micStream.getTracks().forEach(track => track.stop());
      micStream = null;
    }
    if (micBlowBtn) micBlowBtn.classList.remove('mic-active');
    if (micBlowLabel) micBlowLabel.textContent = 'Thổi bằng mic';
  }

  if (micBlowBtn) {
    micBlowBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMicBlowing();
    });
  }

  // Modal controls
  function openModal(modal) {
    modal.classList.add('active');
  }
  function closeModal(modal) {
    modal.classList.remove('active');
  }

  openLetterBtn.addEventListener('click', () => openModal(letterModal));
  closeLetterBtn.addEventListener('click', () => closeModal(letterModal));
  continuePartyBtn.addEventListener('click', () => {
    closeModal(letterModal);
    launchHeartFireworks();
  });

  // Chạm/Click bất cứ đâu để tạo tim (Hỗ trợ cảm ứng đa điểm & Rung xúc giác trên mobile)
  function spawnClickHeart(x, y) {
    const list = ['💖', '💕', '💗', '✨', '🌸', '👑', '🎉', '🍰'];
    const heart = document.createElement('div');
    heart.className = 'click-heart';
    heart.textContent = list[Math.floor(Math.random() * list.length)];
    const dx = (Math.random() - 0.5) * 80;
    const rot = (Math.random() - 0.5) * 45;
    heart.style.left = `${x}px`;
    heart.style.top = `${y}px`;
    heart.style.setProperty('--dx', `${dx}px`);
    heart.style.setProperty('--rot', `${rot}deg`);
    document.body.appendChild(heart);
    setTimeout(() => heart.remove(), 1400);
  }

  function handleTouchTap(e) {
    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('textarea') || e.target.closest('.letter-card') || e.target.closest('.edit-form-card') || e.target.closest('.lock-card') || e.target.closest('.decor-game-card')) {
      return;
    }
    if (e.touches && e.touches.length > 0) {
      for (let i = 0; i < Math.min(e.touches.length, 3); i++) {
        spawnClickHeart(e.touches[i].clientX, e.touches[i].clientY);
      }
    } else if (e.clientX !== undefined) {
      spawnClickHeart(e.clientX, e.clientY);
    }
    if (navigator.vibrate) {
      navigator.vibrate(12);
    }
  }

  window.addEventListener('touchstart', (e) => {
    handleTouchTap(e);
  }, { passive: true });

  window.addEventListener('click', (e) => {
    if (!('ontouchstart' in window)) {
      handleTouchTap(e);
    }
  });

  burstHeartsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    launchHeartFireworks();
  });

  // ===================================================
  // LOGIC TRANG CHỜ: CHUYẾN TÀU SINH NHẬT VƯỢT BẦU TRỜI TIM
  // ===================================================
  let smokeInterval = null;
  let progressAnimFrame = null;
  let introStartTime = null;
  const INTRO_DURATION_MS = 12000; // Tàu chạy 12s hoặc bấm nút để vào ngay

  const PUFF_EMOJIS = ['💖', '💕', '💗', '💓', '💨', '✨', '🌸', '🎁'];

  // Âm thanh còi tàu hơi nước ngọt ngào (Hòa âm D5 & A5)
  function playTrainWhistleSound() {
    try {
      const actx = getAudioCtx();
      if (!actx) return;
      const now = actx.currentTime;

      // Tiếng còi dài đầu tiên
      [587.33, 880.00].forEach(freq => {
        const osc = actx.createOscillator();
        const g = actx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.linearRampToValueAtTime(freq + 6, now + 0.15);
        osc.frequency.linearRampToValueAtTime(freq, now + 0.35);

        g.gain.setValueAtTime(0.001, now);
        g.gain.linearRampToValueAtTime(0.18, now + 0.08);
        g.gain.setValueAtTime(0.18, now + 0.32);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.85);

        osc.connect(g);
        g.connect(actx.destination);
        osc.start(now);
        osc.stop(now + 0.88);
      });

      // Tiếng còi thứ hai ngân vui nhộn
      setTimeout(() => {
        try {
          const now2 = actx.currentTime;
          [587.33, 880.00].forEach(freq => {
            const osc = actx.createOscillator();
            const g = actx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now2);
            g.gain.setValueAtTime(0.001, now2);
            g.gain.linearRampToValueAtTime(0.15, now2 + 0.06);
            g.gain.exponentialRampToValueAtTime(0.001, now2 + 0.55);

            osc.connect(g);
            g.connect(actx.destination);
            osc.start(now2);
            osc.stop(now2 + 0.58);
          });
        } catch (e) { }
      }, 350);
    } catch (e) { }
  }

  // Khởi động các luồng khói hình trái tim bay từ ống khói tàu
  function startHeartSmoke() {
    if (smokeInterval || !heartSmokeEmitter) return;
    smokeInterval = setInterval(() => {
      if (!introWaitScreen || introWaitScreen.classList.contains('departed')) return;

      const puff = document.createElement('span');
      puff.className = 'smoke-heart-puff';
      puff.textContent = PUFF_EMOJIS[Math.floor(Math.random() * PUFF_EMOJIS.length)];

      const randomY = (Math.random() * 10 - 5);
      const randomX = (Math.random() * 8 - 4);
      puff.style.top = `${randomY}px`;
      puff.style.left = `${randomX}px`;
      puff.style.fontSize = `${16 + Math.random() * 12}px`;

      heartSmokeEmitter.appendChild(puff);

      setTimeout(() => {
        puff.remove();
      }, 2300);
    }, 220);
  }

  function stopHeartSmoke() {
    if (smokeInterval) {
      clearInterval(smokeInterval);
      smokeInterval = null;
    }
  }

  // Chạy thanh tiến trình hành trình
  function startIntroProgress() {
    introStartTime = Date.now();
    function updateProgress() {
      if (!introProgressBar || !introWaitScreen || introWaitScreen.classList.contains('departed')) return;
      const elapsed = Date.now() - introStartTime;
      const pct = Math.min(100, (elapsed / INTRO_DURATION_MS) * 100);
      introProgressBar.style.width = `${pct}%`;

      if (elapsed < INTRO_DURATION_MS) {
        progressAnimFrame = requestAnimationFrame(updateProgress);
      } else {
        departIntroScreen();
      }
    }
    cancelAnimationFrame(progressAnimFrame);
    progressAnimFrame = requestAnimationFrame(updateProgress);
  }

  // Kết thúc trang chờ, đưa người dùng vào màn hình mật khẩu
  function departIntroScreen() {
    if (!introWaitScreen || introWaitScreen.classList.contains('departed')) return;
    cancelAnimationFrame(progressAnimFrame);
    playTrainWhistleSound();
    launchHeartFireworks();
    introWaitScreen.classList.add('departed');
    stopHeartSmoke();

    setTimeout(() => {
      if (passwordInput) {
        passwordInput.focus();
      }
    }, 450);
  }

  // Cho phép người dùng xem lại chuyến tàu bất cứ lúc nào
  function reopenIntroScreen() {
    if (!introWaitScreen) return;
    introWaitScreen.classList.remove('departed');
    if (introProgressBar) introProgressBar.style.width = '0%';
    startHeartSmoke();
    startIntroProgress();
  }

  // Gắn sự kiện cho các nút điều khiển chuyến tàu
  if (introStartBtn) {
    introStartBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      departIntroScreen();
    });
  }

  if (skipIntroBtn) {
    skipIntroBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      departIntroScreen();
    });
  }

  if (reopenIntroBtn) {
    reopenIntroBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      reopenIntroScreen();
    });
  }

  if (backToIntroBtn) {
    backToIntroBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      reopenIntroScreen();
    });
  }

  // Bắt đầu hiệu ứng khói và tiến trình tàu ngay khi tải trang
  startHeartSmoke();
  startIntroProgress();

  // ===================================================
  // LOGIC MỞ KHÓA MẬT KHẨU (PASSWORD: 3010)
  // ===================================================
  const CORRECT_PASSWORD = '3010';

  function playUnlockSound() {
    try {
      const actx = getAudioCtx();
      if (!actx) return;
      const now = actx.currentTime;
      [523.25, 659.25, 783.99, 1046.50, 1318.51].forEach((freq, i) => {
        const osc = actx.createOscillator();
        const g = actx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);
        g.gain.setValueAtTime(0.2, now + i * 0.08);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.6 + i * 0.08);
        osc.connect(g);
        g.connect(actx.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + 0.7 + i * 0.08);
      });
    } catch (e) { }
  }

  function playPopSound() {
    try {
      const actx = getAudioCtx();
      if (!actx) return;
      const now = actx.currentTime;
      const osc = actx.createOscillator();
      const g = actx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
      g.gain.setValueAtTime(0.12, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.connect(g);
      g.connect(actx.destination);
      osc.start(now);
      osc.stop(now + 0.1);
    } catch (e) { }
  }

  function checkPassword() {
    if (!passwordInput || !lockScreen) return;
    const entered = passwordInput.value.trim();

    if (entered === CORRECT_PASSWORD) {
      lockErrorMsg.textContent = '';
      playUnlockSound();
      launchHeartFireworks();
      if (navigator.vibrate) navigator.vibrate([40, 60, 100]);

      // Hiệu ứng mở khóa thành công
      lockScreen.classList.add('unlocked');

      // Mở mini game trang trí bánh kem trước khi vào màn hình chính (bắt đầu từ cốt bánh)
      setTimeout(() => {
        if (decorGameScreen) {
          updatePreviewCake();
          if (typeof switchDecorTab === 'function') switchDecorTab('sponge');
          decorGameScreen.classList.add('active');
          if (typeof triggerSpongeDrop === 'function') triggerSpongeDrop(previewCakeSvg);
        }
      }, 450);

    } else {
      // Báo sai và rung lắc
      if (navigator.vibrate) navigator.vibrate([70, 50, 70]);
      if (lockCard) {
        lockCard.classList.remove('shake');
        void lockCard.offsetWidth; // Trigger reflow
        lockCard.classList.add('shake');
      }
      lockErrorMsg.textContent = 'Chưa đúng rồi nè, thử lại nha! 🥺';
      setTimeout(() => {
        passwordInput.value = '';
      }, 450);
    }
  }

  // Nhập từ bàn phím số cảm ứng (Kèm rung xúc giác trên điện thoại)
  numKeys.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (navigator.vibrate) navigator.vibrate(14);
      playPopSound();
      const val = btn.getAttribute('data-val');
      if (val && passwordInput.value.length < 4) {
        passwordInput.value += val;
        lockErrorMsg.textContent = '';
        if (passwordInput.value.length === 4) {
          checkPassword();
        }
      }
    });
  });

  if (keyClear) {
    keyClear.addEventListener('click', (e) => {
      e.preventDefault();
      if (navigator.vibrate) navigator.vibrate(12);
      passwordInput.value = '';
      lockErrorMsg.textContent = '';
      passwordInput.focus();
    });
  }

  if (keyDel) {
    keyDel.addEventListener('click', (e) => {
      e.preventDefault();
      if (navigator.vibrate) navigator.vibrate(12);
      passwordInput.value = passwordInput.value.slice(0, -1);
      lockErrorMsg.textContent = '';
      passwordInput.focus();
    });
  }

  // Nhập từ bàn phím gõ trực tiếp
  if (passwordInput) {
    passwordInput.addEventListener('input', () => {
      lockErrorMsg.textContent = '';
      if (passwordInput.value.length === 4) {
        checkPassword();
      }
    });
  }

  if (unlockSubmitBtn) {
    unlockSubmitBtn.addEventListener('click', (e) => {
      e.preventDefault();
      checkPassword();
    });
  }

  // ===================================================
  // LOGIC MINI GAME TRANG TRÍ BÁNH KEM & HOẠT CẢNH RƠI BÁNH
  // ===================================================
  const decorGameScreen = document.getElementById('decorGameScreen');
  const openDecorGameBtn = document.getElementById('openDecorGameBtn');
  const finishDecorBtn = document.getElementById('finishDecorBtn');
  const skipDecorBtn = document.getElementById('skipDecorBtn');
  const nextStepBtn = document.getElementById('nextStepBtn');
  const replayAssembleBtn = document.getElementById('replayAssembleBtn');
  const dTabBtns = document.querySelectorAll('.d-tab-btn');
  const dTabContents = document.querySelectorAll('.d-tab-content');
  const optBtns = document.querySelectorAll('.opt-btn');

  let currentDecorStep = 'sponge'; // 'sponge' | 'frosting' | 'toppings' | 'candle'
  const TAB_STEPS = ['sponge', 'frosting', 'toppings', 'candle'];

  // Preview SVG Elements
  const previewCakeSvg = document.getElementById('previewCakeSvg');
  const gameTierBottomGroup = document.getElementById('gameTierBottomGroup');
  const gameTierTopGroup = document.getElementById('gameTierTopGroup');
  const gameFrostingGroup = document.getElementById('gameFrostingGroup');
  const gameCandleGroup = document.getElementById('gameCandleGroup');
  const gameTierBottom = document.getElementById('gameTierBottom');
  const gameStripeBottom = document.getElementById('gameStripeBottom');
  const gameTierTop = document.getElementById('gameTierTop');
  const gameStripeTop = document.getElementById('gameStripeTop');
  const gameFrostingPath = document.getElementById('gameFrostingPath');
  const gameFrostingTierBottom = document.getElementById('gameFrostingTierBottom');
  const gameCandleRect = document.getElementById('gameCandleRect');
  const gameCandleStripe = document.getElementById('gameCandleStripe');
  const gameToppingsGroup = document.getElementById('gameToppingsGroup');

  // Main Cake SVG Elements
  const cakeSvg = document.getElementById('cakeSvg');
  const mainTierBottomGroup = document.getElementById('mainTierBottomGroup');
  const mainTierTopGroup = document.getElementById('mainTierTopGroup');
  const mainFrostingGroup = document.getElementById('mainFrostingGroup');
  const mainTierBottom = document.getElementById('mainTierBottom');
  const mainStripeBottom = document.getElementById('mainStripeBottom');
  const mainTierTop = document.getElementById('mainTierTop');
  const mainStripeTop = document.getElementById('mainStripeTop');
  const mainFrostingPath = document.getElementById('mainFrostingPath');
  const mainFrostingTierBottom = document.getElementById('mainFrostingTierBottom');
  const mainCandleRect = document.getElementById('mainCandleRect');
  const mainCandleStripe = document.getElementById('mainCandleStripe');
  const mainToppingsGroup = document.getElementById('mainToppingsGroup');

  const decorState = {
    sponge: 'strawberry',
    frosting: 'white',
    toppings: new Set(),
    candle: 'pink'
  };

  const SPONGE_CONFIGS = {
    strawberry: { tier: '#f8b0c0', stripe: '#eb4d7f' },
    chocolate: { tier: '#8d6e63', stripe: '#5d4037' },
    vanilla: { tier: '#ffe0b2', stripe: '#ffb74d' },
    matcha: { tier: '#c8e6c9', stripe: '#81c784' }
  };

  const FROSTING_CONFIGS = {
    white: '#fdf8ea',
    pink: '#ffb6c1',
    choco: '#6d4c41',
    taro: '#e1bee7'
  };

  const CANDLE_CONFIGS = {
    pink: { stripe: '#f48fb1', stroke: '#f48fb1' },
    gold: { stripe: '#ffd54f', stroke: '#ffca28' },
    red: { stripe: '#ef5350', stroke: '#e53935' }
  };

  // Âm thanh khi từng lớp bánh tiếp đất
  function playLayerSound(type) {
    try {
      const actx = getAudioCtx();
      if (!actx) return;
      const now = actx.currentTime;

      if (type === 'bottom') {
        const osc = actx.createOscillator();
        const g = actx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(65, now + 0.18);
        g.gain.setValueAtTime(0.24, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.connect(g);
        g.connect(actx.destination);
        osc.start(now);
        osc.stop(now + 0.19);
      } else if (type === 'top') {
        const osc = actx.createOscillator();
        const g = actx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.exponentialRampToValueAtTime(160, now + 0.16);
        g.gain.setValueAtTime(0.22, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
        osc.connect(g);
        g.connect(actx.destination);
        osc.start(now);
        osc.stop(now + 0.17);
      } else if (type === 'frosting') {
        const osc = actx.createOscillator();
        const g = actx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(520, now + 0.07);
        osc.frequency.exponentialRampToValueAtTime(260, now + 0.18);
        g.gain.setValueAtTime(0.2, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.connect(g);
        g.connect(actx.destination);
        osc.start(now);
        osc.stop(now + 0.19);
      } else if (type === 'candle') {
        const osc = actx.createOscillator();
        const g = actx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(1318.51, now + 0.08);
        g.gain.setValueAtTime(0.18, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        osc.connect(g);
        g.connect(actx.destination);
        osc.start(now);
        osc.stop(now + 0.29);
      } else if (type === 'toppings') {
        [659.25, 783.99, 1046.5].forEach((freq, i) => {
          const osc = actx.createOscillator();
          const g = actx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + i * 0.05);
          g.gain.setValueAtTime(0.12, now + i * 0.05);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.2 + i * 0.05);
          osc.connect(g);
          g.connect(actx.destination);
          osc.start(now + i * 0.05);
          osc.stop(now + 0.22 + i * 0.05);
        });
      }
    } catch (e) { }
  }

  // Kích hoạt toàn bộ hoạt cảnh rơi bánh theo chuỗi
  let assembleTimer = null;
  let soundTimers = [];

  function triggerCakeAssembly(svgElement) {
    if (!svgElement) return;

    soundTimers.forEach(t => clearTimeout(t));
    soundTimers = [];

    svgElement.classList.remove('is-assembling', 'is-dropping-frosting');
    void svgElement.offsetWidth; // Force reflow
    svgElement.classList.add('is-assembling');

    // Đồng bộ phát âm thanh khi từng lớp rơi tiếp đất
    soundTimers.push(setTimeout(() => playLayerSound('bottom'), 120));
    soundTimers.push(setTimeout(() => playLayerSound('top'), 280));
    soundTimers.push(setTimeout(() => playLayerSound('frosting'), 440));
    soundTimers.push(setTimeout(() => playLayerSound('candle'), 600));
    soundTimers.push(setTimeout(() => playLayerSound('toppings'), 740));

    clearTimeout(assembleTimer);
    assembleTimer = setTimeout(() => {
      svgElement.classList.remove('is-assembling');
    }, 1150);
  }

  // Kích hoạt rơi chỉ riêng lớp kem phủ khi đổi màu kem (cốt bánh giữ nguyên vị trí)
  let frostingTimer = null;
  function triggerFrostingDrop(svgElement) {
    if (!svgElement) return;

    soundTimers.forEach(t => clearTimeout(t));
    soundTimers = [];

    svgElement.classList.remove('is-assembling', 'is-dropping-frosting');
    void svgElement.offsetWidth; // Force reflow
    svgElement.classList.add('is-dropping-frosting');

    playLayerSound('frosting');
    soundTimers.push(setTimeout(() => playLayerSound('candle'), 160));

    clearTimeout(frostingTimer);
    frostingTimer = setTimeout(() => {
      svgElement.classList.remove('is-dropping-frosting');
    }, 750);
  }

  // Kích hoạt rơi chỉ riêng 2 tầng cốt bánh (khi ở bước 1: Vị cốt bánh)
  let spongeTimer = null;
  function triggerSpongeDrop(svgElement) {
    if (!svgElement) return;

    soundTimers.forEach(t => clearTimeout(t));
    soundTimers = [];

    svgElement.classList.remove('is-assembling', 'is-dropping-frosting', 'is-dropping-sponge');
    void svgElement.offsetWidth; // Force reflow
    svgElement.classList.add('is-dropping-sponge');

    soundTimers.push(setTimeout(() => playLayerSound('bottom'), 120));
    soundTimers.push(setTimeout(() => playLayerSound('top'), 280));

    clearTimeout(spongeTimer);
    spongeTimer = setTimeout(() => {
      svgElement.classList.remove('is-dropping-sponge');
    }, 700);
  }

  // Kích hoạt nhún nhảy rơi cho từng lớp đơn lẻ khi người dùng click chọn
  function triggerLayerBounce(element) {
    if (!element) return;
    element.classList.remove('bounce-drop');
    void element.offsetWidth; // Force reflow
    element.classList.add('bounce-drop');
    setTimeout(() => {
      element.classList.remove('bounce-drop');
    }, 480);
  }

  function renderToppings(containerGroup, toppingsSet) {
    if (!containerGroup) return;
    containerGroup.innerHTML = '';

    toppingsSet.forEach(topping => {
      if (topping === 'crown') {
        // Vương miện hoàng gia đặt ngay trung tâm đỉnh tầng trên
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', '300');
        text.setAttribute('y', '204');
        text.setAttribute('font-size', '34');
        text.setAttribute('text-anchor', 'middle');
        text.textContent = '👑';
        containerGroup.appendChild(text);

      } else if (topping === 'strawberry') {
        // Dâu tươi đặt trên bề mặt phẳng của cả 2 tầng bánh (tầng 2 và bậc tầng 1)
        const coords = [
          { x: 232, y: 206, r: -8, size: 28 },
          { x: 368, y: 206, r: 8, size: 28 },
          { x: 132, y: 304, r: -8, size: 28 },
          { x: 468, y: 304, r: 8, size: 28 }
        ];
        coords.forEach(pt => {
          const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          text.setAttribute('x', pt.x);
          text.setAttribute('y', pt.y);
          text.setAttribute('font-size', pt.size);
          text.setAttribute('text-anchor', 'middle');
          text.setAttribute('transform', `rotate(${pt.r} ${pt.x} ${pt.y})`);
          text.textContent = '🍓';
          containerGroup.appendChild(text);
        });

      } else if (topping === 'cherry') {
        // Cherry đỏ đặt trên mặt phẳng tầng 2 và tầng 1, xen kẽ hài hòa với dâu
        const coords = [
          { x: 268, y: 208, r: -4, size: 25 },
          { x: 332, y: 208, r: 4, size: 25 },
          { x: 156, y: 304, r: -4, size: 25 },
          { x: 444, y: 304, r: 4, size: 25 }
        ];
        coords.forEach(pt => {
          const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          text.setAttribute('x', pt.x);
          text.setAttribute('y', pt.y);
          text.setAttribute('font-size', pt.size);
          text.setAttribute('text-anchor', 'middle');
          text.setAttribute('transform', `rotate(${pt.r} ${pt.x} ${pt.y})`);
          text.textContent = '🍒';
          containerGroup.appendChild(text);
        });

      } else if (topping === 'hearts') {
        // Trái tim trang trí cắm trên các gờ viền của cả 2 tầng bánh
        const coords = [
          { x: 198, y: 196, emoji: '💖', size: 22, r: -10 },
          { x: 402, y: 196, emoji: '💖', size: 22, r: 10 },
          { x: 112, y: 298, emoji: '💕', size: 20, r: -12 },
          { x: 488, y: 298, emoji: '💕', size: 20, r: 12 }
        ];
        coords.forEach(pt => {
          const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          text.setAttribute('x', pt.x);
          text.setAttribute('y', pt.y);
          text.setAttribute('font-size', pt.size);
          text.setAttribute('text-anchor', 'middle');
          text.setAttribute('transform', `rotate(${pt.r} ${pt.x} ${pt.y})`);
          text.textContent = pt.emoji;
          containerGroup.appendChild(text);
        });

      } else if (topping === 'sprinkles') {
        // Kẹo bi rải sinh động trên cả 2 lớp kem tầng trên và tầng dưới
        const sprinkles = [
          // Tầng 2
          { x: 215, y: 242, color: '#ff4081', rot: 25 },
          { x: 250, y: 252, color: '#00e676', rot: -28 },
          { x: 285, y: 238, color: '#ffeb3b', rot: 15 },
          { x: 315, y: 240, color: '#00e5ff', rot: -35 },
          { x: 350, y: 252, color: '#e040fb', rot: 20 },
          { x: 385, y: 242, color: '#ff9100', rot: -20 },
          // Tầng 1
          { x: 126, y: 320, color: '#ff4081', rot: 20 },
          { x: 148, y: 324, color: '#ffeb3b', rot: -15 },
          { x: 225, y: 325, color: '#00e676', rot: 30 },
          { x: 265, y: 328, color: '#00e5ff', rot: -25 },
          { x: 335, y: 328, color: '#e040fb', rot: 25 },
          { x: 375, y: 325, color: '#ff9100', rot: -20 },
          { x: 452, y: 324, color: '#ff4081', rot: 15 },
          { x: 474, y: 320, color: '#00e676', rot: -30 }
        ];
        sprinkles.forEach(s => {
          const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          rect.setAttribute('x', s.x);
          rect.setAttribute('y', s.y);
          rect.setAttribute('width', '11');
          rect.setAttribute('height', '4.8');
          rect.setAttribute('rx', '2.4');
          rect.setAttribute('fill', s.color);
          rect.setAttribute('transform', `rotate(${s.rot} ${s.x + 5.5} ${s.y + 2.4})`);
          containerGroup.appendChild(rect);
        });
      }
    });
  }

  function updatePreviewCake() {
    const sponge = SPONGE_CONFIGS[decorState.sponge] || SPONGE_CONFIGS.strawberry;
    if (gameTierBottom) gameTierBottom.setAttribute('fill', sponge.tier);
    if (gameStripeBottom) gameStripeBottom.setAttribute('fill', sponge.stripe);
    if (gameTierTop) gameTierTop.setAttribute('fill', sponge.tier);
    if (gameStripeTop) gameStripeTop.setAttribute('fill', sponge.stripe);

    const frosting = FROSTING_CONFIGS[decorState.frosting] || FROSTING_CONFIGS.white;
    if (gameFrostingPath) gameFrostingPath.setAttribute('fill', frosting);
    if (gameFrostingTierBottom) gameFrostingTierBottom.setAttribute('fill', frosting);

    const candle = CANDLE_CONFIGS[decorState.candle] || CANDLE_CONFIGS.pink;
    if (gameCandleStripe) gameCandleStripe.setAttribute('fill', candle.stripe);
    if (gameCandleRect) gameCandleRect.setAttribute('stroke', candle.stroke);

    renderToppings(gameToppingsGroup, decorState.toppings);
  }

  function applyDecorToMainCake() {
    const sponge = SPONGE_CONFIGS[decorState.sponge] || SPONGE_CONFIGS.strawberry;
    if (mainTierBottom) mainTierBottom.setAttribute('fill', sponge.tier);
    if (mainStripeBottom) mainStripeBottom.setAttribute('fill', sponge.stripe);
    if (mainTierTop) mainTierTop.setAttribute('fill', sponge.tier);
    if (mainStripeTop) mainStripeTop.setAttribute('fill', sponge.stripe);

    const frosting = FROSTING_CONFIGS[decorState.frosting] || FROSTING_CONFIGS.white;
    if (mainFrostingPath) mainFrostingPath.setAttribute('fill', frosting);
    if (mainFrostingTierBottom) mainFrostingTierBottom.setAttribute('fill', frosting);

    const candle = CANDLE_CONFIGS[decorState.candle] || CANDLE_CONFIGS.pink;
    if (mainCandleStripe) mainCandleStripe.setAttribute('fill', candle.stripe);
    if (mainCandleRect) mainCandleRect.setAttribute('stroke', candle.stroke);

    renderToppings(mainToppingsGroup, decorState.toppings);
  }

  // Chuyển Tab
  // Quản lý hiển thị các lớp trên bánh theo từng bước trang trí từ từ
  function updateCakeStageVisibility() {
    if (currentDecorStep === 'sponge') {
      if (gameFrostingGroup) gameFrostingGroup.style.display = 'none';
      if (gameToppingsGroup) gameToppingsGroup.style.display = 'none';
      if (gameCandleGroup) gameCandleGroup.style.display = 'none';
      if (nextStepBtn) {
        nextStepBtn.style.display = 'inline-flex';
        nextStepBtn.innerHTML = '<span>Tiếp: Phủ kem</span> ➜';
      }
    } else if (currentDecorStep === 'frosting') {
      if (gameFrostingGroup) gameFrostingGroup.style.display = '';
      if (gameToppingsGroup) gameToppingsGroup.style.display = 'none';
      if (gameCandleGroup) gameCandleGroup.style.display = 'none';
      if (nextStepBtn) {
        nextStepBtn.style.display = 'inline-flex';
        nextStepBtn.innerHTML = '<span>Tiếp: Topping</span> ➜';
      }
    } else if (currentDecorStep === 'toppings') {
      if (gameFrostingGroup) gameFrostingGroup.style.display = '';
      if (gameToppingsGroup) gameToppingsGroup.style.display = '';
      if (gameCandleGroup) gameCandleGroup.style.display = 'none';
      if (nextStepBtn) {
        nextStepBtn.style.display = 'inline-flex';
        nextStepBtn.innerHTML = '<span>Tiếp: Cắm nến</span> ➜';
      }
    } else if (currentDecorStep === 'candle') {
      if (gameFrostingGroup) gameFrostingGroup.style.display = '';
      if (gameToppingsGroup) gameToppingsGroup.style.display = '';
      if (gameCandleGroup) gameCandleGroup.style.display = '';
      if (nextStepBtn) {
        nextStepBtn.style.display = 'none';
      }
    }
  }

  // Chuyển bước trang trí / tab
  function switchDecorTab(targetTab) {
    const prevTab = currentDecorStep;
    currentDecorStep = targetTab;

    dTabBtns.forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-tab') === targetTab);
    });
    dTabContents.forEach(c => {
      c.classList.toggle('active', c.id === `tabContent-${targetTab}`);
    });

    updateCakeStageVisibility();

    // Hiệu ứng rơi tuần tự khi bước sang công đoạn mới
    if (targetTab === 'sponge') {
      if (prevTab !== 'sponge') triggerSpongeDrop(previewCakeSvg);
    } else if (targetTab === 'frosting') {
      triggerFrostingDrop(previewCakeSvg);
    } else if (targetTab === 'toppings') {
      triggerLayerBounce(gameToppingsGroup);
      playLayerSound('toppings');
    } else if (targetTab === 'candle') {
      triggerLayerBounce(gameCandleGroup);
      playLayerSound('candle');
    }
  }

  // Chuyển Tab bằng nút tab phía trên
  dTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      switchDecorTab(targetTab);
      playPopSound();
    });
  });

  // Nút bước tiếp theo ở chân trang mini-game
  if (nextStepBtn) {
    nextStepBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const idx = TAB_STEPS.indexOf(currentDecorStep);
      if (idx !== -1 && idx < TAB_STEPS.length - 1) {
        switchDecorTab(TAB_STEPS[idx + 1]);
        playPopSound();
      }
    });
  }

  // Chọn tùy chọn trang trí và kích hoạt rơi tương ứng
  optBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.getAttribute('data-type');
      const val = btn.getAttribute('data-val');

      if (type === 'sponge') {
        decorState.sponge = val;
        updatePreviewCake();
        triggerSpongeDrop(previewCakeSvg);
      } else if (type === 'frosting') {
        decorState.frosting = val;
        updatePreviewCake();
        triggerFrostingDrop(previewCakeSvg);
      } else if (type === 'candle') {
        decorState.candle = val;
        updatePreviewCake();
        triggerLayerBounce(gameCandleGroup);
        playLayerSound('candle');
      } else if (type === 'topping') {
        if (decorState.toppings.has(val)) {
          decorState.toppings.delete(val);
          btn.classList.remove('active');
        } else {
          decorState.toppings.add(val);
          btn.classList.add('active');
        }
        updatePreviewCake();
        triggerLayerBounce(gameToppingsGroup);
        playLayerSound('toppings');
      }

      if (type !== 'topping') {
        document.querySelectorAll(`.opt-btn[data-type="${type}"]`).forEach(b => {
          b.classList.toggle('active', b.getAttribute('data-val') === val);
        });
      }
    });
  });

  // Nút xóa bỏ toàn bộ topping
  const clearToppingsBtn = document.getElementById('clearToppingsBtn');
  if (clearToppingsBtn) {
    clearToppingsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      decorState.toppings.clear();
      document.querySelectorAll('.opt-btn[data-type="topping"]').forEach(b => {
        b.classList.remove('active');
      });
      updatePreviewCake();
      playPopSound();
    });
  }

  // Nút xem lại hoạt cảnh ráp rơi bánh theo từng bước
  if (replayAssembleBtn) {
    replayAssembleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (currentDecorStep === 'sponge') {
        triggerSpongeDrop(previewCakeSvg);
      } else if (currentDecorStep === 'frosting') {
        triggerFrostingDrop(previewCakeSvg);
      } else if (currentDecorStep === 'toppings') {
        triggerLayerBounce(gameToppingsGroup);
        playLayerSound('toppings');
      } else {
        triggerCakeAssembly(previewCakeSvg);
      }
    });
  }

  function completeDecorGame() {
    applyDecorToMainCake();
    if (decorGameScreen) {
      decorGameScreen.classList.remove('active');
    }
    playUnlockSound();
    launchHeartFireworks();

    // Rơi bánh trên màn hình chính
    triggerCakeAssembly(cakeSvg);

    if (!isMusicPlaying) {
      setTimeout(() => {
        toggleMusic(true);
      }, 400);
    }
  }

  if (finishDecorBtn) {
    finishDecorBtn.addEventListener('click', (e) => {
      e.preventDefault();
      completeDecorGame();
    });
  }

  if (skipDecorBtn) {
    skipDecorBtn.addEventListener('click', (e) => {
      e.preventDefault();
      completeDecorGame();
    });
  }

  if (openDecorGameBtn) {
    openDecorGameBtn.addEventListener('click', () => {
      if (decorGameScreen) {
        updatePreviewCake();
        switchDecorTab('sponge');
        decorGameScreen.classList.add('active');
        triggerSpongeDrop(previewCakeSvg);
      }
    });
  }

  // Khởi tạo giao diện bánh lần đầu
  updatePreviewCake();
  applyDecorToMainCake();
  switchDecorTab('sponge');

})();

