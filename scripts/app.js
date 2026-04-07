const LOVE_NOTES = window.LOVE_NOTES || [];
const PROMISE_LIBRARY = window.PROMISE_LIBRARY || [];
const QUIZ_BANK = window.QUIZ_BANK || [];
const TEMPLATE_DEFAULTS = {
  senderName: "你的名字",
  recipientName: "TA的名字",
  relationLabel: "我们",
  anniversaryMonth: 12,
  anniversaryDay: 24,
  exportFileName: "confession-template-letter.txt",
};
const TEMPLATE = {
  ...TEMPLATE_DEFAULTS,
  ...(window.CONFESSION_TEMPLATE || {}),
};
const applyTemplate = (text) =>
  String(text ?? "")
    .replaceAll("{{SENDER}}", TEMPLATE.senderName)
    .replaceAll("{{RECIPIENT}}", TEMPLATE.recipientName)
    .replaceAll("{{RELATION}}", TEMPLATE.relationLabel);
const isMobileViewport = window.matchMedia("(max-width: 760px)").matches;

const state = {
  page: 1,
  pageSize: isMobileViewport ? 8 : 12,
  filteredNotes: [...LOVE_NOTES],
  pinnedPromises: [],
  activePromise: PROMISE_LIBRARY[0],
  quizStep: 0,
  quizScore: 0,
  ceremonyRunning: false,
  reduceMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
};

const dom = {
  preloader: document.getElementById("preloader"),
  preloaderProgress: document.getElementById("preloader-progress"),
  preloaderPercent: document.getElementById("preloader-percent"),
  scrollProgressBar: document.getElementById("scroll-progress-bar"),
  cursorDot: document.getElementById("cursor-dot"),
  cursorRing: document.getElementById("cursor-ring"),
  topNav: document.getElementById("top-nav"),
  navGlider: document.getElementById("nav-glider"),
  typedIntro: document.getElementById("typed-intro"),
  timelineList: document.getElementById("timeline-list"),
  noteSearch: document.getElementById("note-search"),
  noteMoodFilter: document.getElementById("note-mood-filter"),
  notePhaseFilter: document.getElementById("note-phase-filter"),
  shuffleNotes: document.getElementById("shuffle-notes"),
  notesGrid: document.getElementById("notes-grid"),
  notesPagination: document.getElementById("notes-pagination"),
  noteModal: document.getElementById("note-modal"),
  modalMeta: document.getElementById("modal-meta"),
  modalTitle: document.getElementById("modal-title"),
  modalDetail: document.getElementById("modal-detail"),
  modalPromise: document.getElementById("modal-promise"),
  paletteWall: document.getElementById("palette-wall"),
  promiseText: document.getElementById("promise-text"),
  nextPromise: document.getElementById("next-promise"),
  pinPromise: document.getElementById("pin-promise"),
  pinnedPromises: document.getElementById("pinned-promises"),
  quizProgress: document.getElementById("quiz-progress"),
  quizQuestion: document.getElementById("quiz-question"),
  quizAnswers: document.getElementById("quiz-answers"),
  quizFeedback: document.getElementById("quiz-feedback"),
  statDays: document.getElementById("stat-days"),
  statNotes: document.getElementById("stat-notes"),
  statPromises: document.getElementById("stat-promises"),
  cdDays: document.getElementById("cd-days"),
  cdHours: document.getElementById("cd-hours"),
  cdMinutes: document.getElementById("cd-minutes"),
  cdSeconds: document.getElementById("cd-seconds"),
  showRandomNote: document.getElementById("show-random-note"),
  launchConfetti: document.getElementById("launch-confetti"),
  exportLetter: document.getElementById("export-letter"),
  openRitual: document.getElementById("open-ritual"),
  musicToggle: document.getElementById("music-toggle"),
  mobileDock: document.getElementById("mobile-dock"),
  mobileDockGlow: document.getElementById("mobile-dock-glow"),
  toastStack: document.getElementById("toast-stack"),
  heroCard: document.getElementById("hero-card"),
  ambientCanvas: document.getElementById("ambient-canvas"),
  ceremonyCanvas: document.getElementById("ceremony-canvas"),
  finaleCard: document.getElementById("finale-card"),
  finaleTitle: document.getElementById("finale-title"),
  finaleBody: document.getElementById("finale-body"),
};
dom.topNavLinks = Array.from(document.querySelectorAll("#top-nav-list a"));
dom.mobileDockLinks = Array.from(document.querySelectorAll("#mobile-dock a"));

const supportsFinePointer = window.matchMedia("(pointer:fine)").matches;

const formatNumber = (value) => new Intl.NumberFormat("zh-CN").format(value);

const pad = (value) => String(value).padStart(2, "0");

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const sample = (arr) => arr[Math.floor(Math.random() * arr.length)];

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const easterState = {
  brandTapCount: 0,
  brandTapAt: 0,
  easyOneTriggered: false,
  easyTwoTriggered: false,
  hiddenTriggered: false,
  chapterIndex: 0,
  chapterSequenceAt: 0,
  keywordCooldownAt: 0,
};

class ToastCenter {
  constructor(root) {
    this.root = root;
  }

  push(message, duration = 2400) {
    const item = document.createElement("article");
    item.className = "toast";
    item.textContent = message;
    this.root.append(item);
    window.setTimeout(() => {
      item.style.opacity = "0";
      item.style.transform = "translateY(8px)";
      window.setTimeout(() => item.remove(), 280);
    }, duration);
  }
}

class CursorController {
  constructor(dot, ring) {
    this.dot = dot;
    this.ring = ring;
    this.ringX = window.innerWidth * 0.5;
    this.ringY = window.innerHeight * 0.5;
    this.targetX = this.ringX;
    this.targetY = this.ringY;
    this.active = supportsFinePointer;
    this.rafId = 0;
  }

  init() {
    if (!this.active) {
      this.dot.style.display = "none";
      this.ring.style.display = "none";
      return;
    }
    window.addEventListener("pointermove", this.onPointerMove, { passive: true });
    document.querySelectorAll("a, button, input, select, textarea, .note-card").forEach((node) => {
      node.addEventListener("mouseenter", () => document.body.classList.add("is-hovering"));
      node.addEventListener("mouseleave", () => document.body.classList.remove("is-hovering"));
    });
    this.loop();
  }

  onPointerMove = (event) => {
    this.targetX = event.clientX;
    this.targetY = event.clientY;
    this.dot.style.transform = `translate(${event.clientX}px, ${event.clientY}px)`;
  };

  loop = () => {
    this.ringX += (this.targetX - this.ringX) * 0.22;
    this.ringY += (this.targetY - this.ringY) * 0.22;
    this.ring.style.transform = `translate(${this.ringX}px, ${this.ringY}px)`;
    this.rafId = window.requestAnimationFrame(this.loop);
  };
}

class MagneticController {
  constructor(selector = ".magnetic") {
    this.selector = selector;
  }

  init() {
    if (!supportsFinePointer || isMobileViewport) return;
    const nodes = document.querySelectorAll(this.selector);
    nodes.forEach((node) => {
      node.addEventListener("pointermove", (event) => {
        const rect = node.getBoundingClientRect();
        const x = event.clientX - rect.left - rect.width / 2;
        const y = event.clientY - rect.top - rect.height / 2;
        node.style.transform = `translate(${x * 0.08}px, ${y * 0.08}px)`;
      });
      node.addEventListener("pointerleave", () => {
        node.style.transform = "translate(0, 0)";
      });
    });
  }
}

class Typewriter {
  constructor(el, texts) {
    this.el = el;
    this.texts = texts;
    this.textIndex = 0;
    this.charIndex = 0;
  }

  async init() {
    while (true) {
      const line = this.texts[this.textIndex];
      this.el.textContent = "";
      for (let i = 0; i < line.length; i += 1) {
        this.el.textContent += line[i];
        await wait(32);
      }
      await wait(1900);
      this.textIndex = (this.textIndex + 1) % this.texts.length;
    }
  }
}

class AmbientBackground {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.particles = [];
    this.rafId = 0;
    this.count = isMobileViewport ? 34 : 68;
  }

  init() {
    this.resize();
    window.addEventListener("resize", this.resize);
    this.seedParticles();
    if (!state.reduceMotion) {
      this.render();
    } else {
      this.renderFrame();
    }
  }

  resize = () => {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  };

  seedParticles() {
    this.particles = Array.from({ length: this.count }, () => ({
      x: Math.random() * this.canvas.width,
      y: Math.random() * this.canvas.height,
      vx: (Math.random() - 0.5) * 0.2,
      vy: -0.1 - Math.random() * 0.34,
      r: 2 + Math.random() * 4,
      alpha: 0.16 + Math.random() * 0.24,
      hue: [18, 36, 150][randomInt(0, 2)],
    }));
  }

  renderFrame() {
    const { ctx } = this;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    for (const p of this.particles) {
      ctx.beginPath();
      ctx.fillStyle = `hsla(${p.hue}, 80%, 72%, ${p.alpha})`;
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  render = () => {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.y < -20) {
        p.y = canvas.height + 30;
        p.x = Math.random() * canvas.width;
      }
      if (p.x < -20) p.x = canvas.width + 20;
      if (p.x > canvas.width + 20) p.x = -20;
      ctx.beginPath();
      ctx.fillStyle = `hsla(${p.hue}, 80%, 70%, ${p.alpha})`;
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    this.rafId = window.requestAnimationFrame(this.render);
  };
}

class FireworksEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.particles = [];
    this.running = false;
    this.rafId = 0;
  }

  init() {
    this.resize();
    window.addEventListener("resize", this.resize);
  }

  resize = () => {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  };

  burst(x, y) {
    const burstCount = isMobileViewport ? 44 : 70;
    for (let i = 0; i < burstCount; i += 1) {
      const angle = (Math.PI * 2 * i) / burstCount;
      const speed = 1.2 + Math.random() * 4.2;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        ttl: 55 + Math.random() * 50,
        hue: randomInt(12, 170),
      });
    }
  }

  start(duration = 6200) {
    this.running = true;
    this.particles.length = 0;
    document.body.classList.add("is-ceremony");
    const trigger = () => {
      const x = Math.random() * this.canvas.width * 0.86 + this.canvas.width * 0.07;
      const y = Math.random() * this.canvas.height * 0.45 + this.canvas.height * 0.1;
      this.burst(x, y);
    };
    trigger();
    const intervalId = window.setInterval(trigger, 460);
    this.loop();
    window.setTimeout(() => {
      window.clearInterval(intervalId);
      window.setTimeout(() => this.stop(), 900);
    }, duration);
  }

  stop() {
    this.running = false;
    window.cancelAnimationFrame(this.rafId);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    document.body.classList.remove("is-ceremony");
  }

  loop = () => {
    const { ctx, canvas } = this;
    ctx.fillStyle = "rgba(12, 9, 6, 0.16)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    this.particles.forEach((p) => {
      p.life += 1;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.045;
      const alpha = 1 - p.life / p.ttl;
      ctx.beginPath();
      ctx.fillStyle = `hsla(${p.hue}, 98%, 72%, ${Math.max(alpha, 0)})`;
      ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2);
      ctx.fill();
    });
    this.particles = this.particles.filter((p) => p.life < p.ttl);
    if (this.running || this.particles.length > 0) {
      this.rafId = window.requestAnimationFrame(this.loop);
    }
  };
}

class MusicEngine {
  constructor(button) {
    this.button = button;
    this.audioContext = null;
    this.masterGain = null;
    this.timer = null;
    this.isPlaying = false;
    this.sequence = [261.63, 329.63, 392.0, 523.25, 392.0, 329.63, 293.66, 349.23];
    this.step = 0;
  }

  init() {
    this.button.addEventListener("click", () => {
      if (this.isPlaying) {
        this.stop();
      } else {
        this.start();
      }
    });
  }

  ensureContext() {
    if (!this.audioContext) {
      this.audioContext = new window.AudioContext();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 0.08;
      this.masterGain.connect(this.audioContext.destination);
    }
  }

  playTone(freq, duration = 0.36) {
    const now = this.audioContext.currentTime;
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + duration + 0.05);
  }

  start() {
    this.ensureContext();
    this.isPlaying = true;
    this.button.setAttribute("aria-pressed", "true");
    this.button.textContent = "关闭背景乐";
    this.timer = window.setInterval(() => {
      this.playTone(this.sequence[this.step % this.sequence.length]);
      this.step += 1;
    }, 420);
  }

  stop() {
    this.isPlaying = false;
    this.button.setAttribute("aria-pressed", "false");
    this.button.textContent = "开启背景乐";
    if (this.timer) window.clearInterval(this.timer);
  }
}

class RevealObserver {
  constructor() {
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            this.observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 },
    );
  }

  watch(selector) {
    document.querySelectorAll(selector).forEach((node) => {
      node.classList.add("reveal");
      this.observer.observe(node);
    });
  }
}

class NotesExplorer {
  constructor(options) {
    this.searchInput = options.searchInput;
    this.moodFilter = options.moodFilter;
    this.phaseFilter = options.phaseFilter;
    this.grid = options.grid;
    this.pagination = options.pagination;
    this.onOpenNote = options.onOpenNote;
    this.revealObserver = options.revealObserver;
  }

  init() {
    this.bindEvents();
    this.render();
  }

  bindEvents() {
    const onFilterChange = () => {
      state.page = 1;
      this.applyFilters();
      this.render();
      checkSearchEasterEgg(this.searchInput.value);
    };
    this.searchInput.addEventListener("input", onFilterChange);
    this.moodFilter.addEventListener("change", onFilterChange);
    this.phaseFilter.addEventListener("change", onFilterChange);
  }

  applyFilters() {
    const keyword = this.searchInput.value.trim().toLowerCase();
    const mood = this.moodFilter.value;
    const phase = this.phaseFilter.value;
    state.filteredNotes = LOVE_NOTES.filter((note) => {
      const keywordHit =
        keyword.length === 0 ||
        [applyTemplate(note.title), applyTemplate(note.detail), applyTemplate(note.promise), note.scene, ...note.tags].join(" ").toLowerCase().includes(keyword);
      const moodHit = mood === "all" || note.mood === mood;
      const phaseHit = phase === "all" || note.phase === phase;
      return keywordHit && moodHit && phaseHit;
    });
  }

  getPageSlice() {
    const start = (state.page - 1) * state.pageSize;
    const end = start + state.pageSize;
    return state.filteredNotes.slice(start, end);
  }

  render() {
    if (state.filteredNotes.length === 0) {
      this.grid.innerHTML = `<article class="note-card tone-006"><h3>未找到匹配文案</h3><p>请尝试其他关键词，或切换情绪与阶段筛选。</p></article>`;
      this.pagination.innerHTML = "";
      return;
    }

    const current = this.getPageSlice();
    this.grid.innerHTML = current
      .map(
        (note) => `
        <article class="note-card ${note.palette}" data-note-id="${note.id}" tabindex="0">
          <p class="note-card__meta">${note.phase} · ${note.mood} · ${note.date}</p>
          <h3>${applyTemplate(note.title)}</h3>
          <p>${applyTemplate(note.detail).slice(0, 86)}...</p>
          <footer>
            <span>${note.scene}</span>
            <strong>查看详情</strong>
          </footer>
        </article>
      `,
      )
      .join("");

    this.grid.querySelectorAll(".note-card").forEach((card) => {
      const id = card.dataset.noteId;
      card.addEventListener("click", () => {
        const note = LOVE_NOTES.find((entry) => entry.id === id);
        this.onOpenNote(note);
      });
      card.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          const note = LOVE_NOTES.find((entry) => entry.id === id);
          this.onOpenNote(note);
        }
      });
    });

    this.renderPagination();
    this.revealObserver.watch(".note-card");
  }

  renderPagination() {
    const pageCount = Math.ceil(state.filteredNotes.length / state.pageSize);
    this.pagination.innerHTML = "";
    const maxButtons = Math.min(pageCount, 8);
    let start = Math.max(1, state.page - 3);
    if (start + maxButtons - 1 > pageCount) {
      start = Math.max(1, pageCount - maxButtons + 1);
    }
    for (let pageNum = start; pageNum < start + maxButtons; pageNum += 1) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = String(pageNum);
      if (pageNum === state.page) btn.classList.add("is-active");
      btn.addEventListener("click", () => {
        state.page = pageNum;
        this.render();
        window.scrollTo({ top: dom.notesGrid.offsetTop - 120, behavior: "smooth" });
      });
      this.pagination.append(btn);
    }
  }
}

class PromiseTheater {
  constructor() {
    this.promiseText = dom.promiseText;
    this.nextButton = dom.nextPromise;
    this.pinButton = dom.pinPromise;
    this.pinnedContainer = dom.pinnedPromises;
    this.pointer = 0;
  }

  init() {
    this.renderCurrent();
    this.nextButton.addEventListener("click", () => {
      this.pointer = (this.pointer + 1) % PROMISE_LIBRARY.length;
      state.activePromise = PROMISE_LIBRARY[this.pointer];
      this.renderCurrent();
    });
    this.pinButton.addEventListener("click", () => {
      if (!state.pinnedPromises.includes(state.activePromise)) {
        state.pinnedPromises.unshift(state.activePromise);
        state.pinnedPromises = state.pinnedPromises.slice(0, 10);
        this.renderPinned();
        toast.push("已收藏当前文案");
      } else {
        toast.push("这条文案已在收藏中");
      }
    });
  }

  renderCurrent() {
    this.promiseText.textContent = applyTemplate(state.activePromise);
  }

  renderPinned() {
    if (state.pinnedPromises.length === 0) {
      this.pinnedContainer.innerHTML = "";
      return;
    }
    this.pinnedContainer.innerHTML = state.pinnedPromises.map((item) => `<li>${applyTemplate(item)}</li>`).join("");
  }
}

class QuizEngine {
  constructor() {
    this.progress = dom.quizProgress;
    this.question = dom.quizQuestion;
    this.answers = dom.quizAnswers;
    this.feedback = dom.quizFeedback;
  }

  init() {
    this.render();
  }

  render() {
    if (state.quizStep >= QUIZ_BANK.length) {
      const score = state.quizScore;
      const total = QUIZ_BANK.length;
      this.progress.textContent = "测试完成";
      this.question.textContent = `匹配度得分 ${score} / ${total}`;
      if (score >= 4) {
        this.feedback.textContent = "你们的关系共识很高，可以直接进入发布版本。";
      } else if (score >= 2) {
        this.feedback.textContent = "匹配度不错，继续补充真实细节会更动人。";
      } else {
        this.feedback.textContent = "这只是模板互动，真实表达永远比得分更重要。";
      }
      this.answers.innerHTML = `<button type="button" class="solid-btn magnetic" id="quiz-restart">重新测试</button>`;
      const restartButton = document.getElementById("quiz-restart");
      restartButton.addEventListener("click", () => {
        state.quizStep = 0;
        state.quizScore = 0;
        this.feedback.textContent = "";
        this.render();
      });
      return;
    }

    const current = QUIZ_BANK[state.quizStep];
    this.progress.textContent = `Q ${state.quizStep + 1} / ${QUIZ_BANK.length}`;
    this.question.textContent = applyTemplate(current.question);
    this.answers.innerHTML = "";
    this.feedback.textContent = "";

    current.options.forEach((option, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = applyTemplate(option);
      button.addEventListener("click", () => {
        const isCorrect = index === current.answer;
        if (isCorrect) {
          state.quizScore += 1;
          this.feedback.textContent = "回答命中模板预设，关系方向很清晰。";
        } else {
          this.feedback.textContent = "选项不同也没关系，关键是把真实想法说出来。";
        }
        window.setTimeout(() => {
          state.quizStep += 1;
          this.render();
        }, 650);
      });
      this.answers.append(button);
    });
  }
}

class Countdown {
  constructor() {
    this.nodes = {
      days: dom.cdDays,
      hours: dom.cdHours,
      minutes: dom.cdMinutes,
      seconds: dom.cdSeconds,
    };
  }

  init() {
    this.tick();
    window.setInterval(() => this.tick(), 1000);
  }

  getTargetDate() {
    const now = new Date();
    const year = now.getFullYear();
    const monthIndex = clamp(Number(TEMPLATE.anniversaryMonth) - 1, 0, 11);
    const maxDay = new Date(year, monthIndex + 1, 0).getDate();
    const targetDay = clamp(Number(TEMPLATE.anniversaryDay), 1, maxDay);
    const target = new Date(year, monthIndex, targetDay, 0, 0, 0);
    if (target <= now) {
      const nextYear = year + 1;
      const nextMaxDay = new Date(nextYear, monthIndex + 1, 0).getDate();
      target.setFullYear(nextYear);
      target.setDate(clamp(Number(TEMPLATE.anniversaryDay), 1, nextMaxDay));
    }
    return target;
  }

  tick() {
    const now = new Date();
    const target = this.getTargetDate();
    const diff = target.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);
    this.nodes.days.textContent = pad(days);
    this.nodes.hours.textContent = pad(hours);
    this.nodes.minutes.textContent = pad(minutes);
    this.nodes.seconds.textContent = pad(seconds);
  }
}

const toast = new ToastCenter(dom.toastStack);

const revealObserver = new RevealObserver();

const notesExplorer = new NotesExplorer({
  searchInput: dom.noteSearch,
  moodFilter: dom.noteMoodFilter,
  phaseFilter: dom.notePhaseFilter,
  grid: dom.notesGrid,
  pagination: dom.notesPagination,
  onOpenNote: openNoteModal,
  revealObserver,
});

const promiseTheater = new PromiseTheater();

const quizEngine = new QuizEngine();

const countdown = new Countdown();

const ambientBg = new AmbientBackground(dom.ambientCanvas);

const fireworks = new FireworksEngine(dom.ceremonyCanvas);

const music = new MusicEngine(dom.musicToggle);

function openNoteModal(note) {
  if (!note) return;
  dom.modalMeta.textContent = `${note.phase} · ${note.mood} · ${note.date}`;
  dom.modalTitle.textContent = applyTemplate(note.title);
  dom.modalDetail.textContent = applyTemplate(note.detail);
  dom.modalPromise.textContent = applyTemplate(note.promise);
  dom.noteModal.classList.add("is-visible");
  dom.noteModal.setAttribute("aria-hidden", "false");
}

function closeNoteModal() {
  dom.noteModal.classList.remove("is-visible");
  dom.noteModal.setAttribute("aria-hidden", "true");
}

function seedPaletteWall() {
  const topPalette = LOVE_NOTES.slice(0, 84);
  dom.paletteWall.innerHTML = topPalette
    .map(
      (note) =>
        `<article class="palette-chip ${note.palette}" aria-label="${note.phase} ${note.mood}"><span>${note.phase}</span></article>`,
    )
    .join("");
}

function seedTimeline() {
  const phaseOrder = ["初遇", "相知", "热恋", "并肩", "未来"];
  const selected = [];
  phaseOrder.forEach((phase) => {
    const pool = LOVE_NOTES.filter((note) => note.phase === phase).slice(0, 4);
    selected.push(...pool);
  });
  dom.timelineList.innerHTML = selected
    .map(
      (note) => `
      <article class="story-item" data-note-id="${note.id}">
        <h3>${applyTemplate(note.title)}</h3>
        <p>${applyTemplate(note.detail).slice(0, 120)}...</p>
        <footer>
          <span>${note.phase}</span>
          <span>${note.date}</span>
          <span>${note.scene}</span>
        </footer>
      </article>
    `,
    )
    .join("");

  dom.timelineList.querySelectorAll(".story-item").forEach((item) => {
    const note = LOVE_NOTES.find((entry) => entry.id === item.dataset.noteId);
    item.addEventListener("click", () => openNoteModal(note));
  });
  revealObserver.watch(".story-item");
}

function updateHeroStats() {
  const dates = LOVE_NOTES.map((note) => new Date(note.date).getTime()).sort((a, b) => a - b);
  const firstDate = dates[0] || Date.now();
  const days = Math.max(1, Math.floor((Date.now() - firstDate) / (1000 * 60 * 60 * 24)));
  dom.statDays.textContent = formatNumber(days);
  dom.statNotes.textContent = formatNumber(LOVE_NOTES.length);
  dom.statPromises.textContent = formatNumber(PROMISE_LIBRARY.length);
}

function attachModalEvents() {
  dom.noteModal.addEventListener("click", (event) => {
    const target = event.target;
    if (target instanceof HTMLElement && target.dataset.closeModal !== undefined) {
      closeNoteModal();
    }
  });
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeNoteModal();
    }
  });
}

function attachShuffleAction() {
  dom.shuffleNotes.addEventListener("click", () => {
    state.filteredNotes = [...state.filteredNotes].sort(() => Math.random() - 0.5);
    state.page = 1;
    notesExplorer.render();
    toast.push("已随机重排文案");
  });
}

function attachRandomNoteAction() {
  dom.showRandomNote.addEventListener("click", () => {
    openNoteModal(sample(LOVE_NOTES));
  });
}

function attachPromiseShortcuts() {
  dom.openRitual.addEventListener("click", () => {
    document.getElementById("finale").scrollIntoView({ behavior: "smooth", block: "center" });
    toast.push("已跳转至最终章节", 1800);
  });
}

function attachConfettiAction() {
  dom.launchConfetti.addEventListener("click", () => {
    if (state.ceremonyRunning) return;
    state.ceremonyRunning = true;
    fireworks.start();
    dom.finaleCard.style.transform = "translateY(-4px) scale(1.01)";
    toast.push("烟花效果已点亮");
    window.setTimeout(() => {
      dom.finaleCard.style.transform = "";
      state.ceremonyRunning = false;
    }, 6800);
  });
}

function attachLetterExport() {
  dom.exportLetter.addEventListener("click", () => {
    const header = applyTemplate("致 {{RECIPIENT}} 的一封信（模板版）\n\n");
    const body = [
      applyTemplate("你好，{{RECIPIENT}}。"),
      applyTemplate("这是一份可复用的高端告白模板，你可以替换成真实故事后直接发布。"),
      "",
      "建议保留的承诺句：",
      ...state.pinnedPromises.slice(0, 5).map((item, idx) => `${idx + 1}. ${applyTemplate(item)}`),
      "",
      "今日随机记忆卡：",
      `- ${applyTemplate(sample(LOVE_NOTES).title)}`,
      "",
      applyTemplate("署名：{{SENDER}}"),
    ].join("\n");
    const blob = new Blob([header + body], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = TEMPLATE.exportFileName || "confession-template-letter.txt";
    document.body.append(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.push("模板信已导出", 2200);
  });
}

function attachTiltCard() {
  if (!supportsFinePointer || isMobileViewport) return;
  const card = dom.heroCard;
  card.addEventListener("pointermove", (event) => {
    const rect = card.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const rotateY = ((x / rect.width) * 2 - 1) * 7;
    const rotateX = (1 - (y / rect.height) * 2) * 7;
    card.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  });
  card.addEventListener("pointerleave", () => {
    card.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg)";
  });
}

function attachHeaderBehavior() {
  const header = document.getElementById("site-header");
  window.addEventListener(
    "scroll",
    () => {
      const y = window.scrollY;
      const opacity = clamp(0.62 + y / 1200, 0.62, 0.94);
      header.style.background = `rgba(255, 248, 236, ${opacity.toFixed(2)})`;
      header.style.boxShadow = y > 30 ? "0 14px 28px rgba(44, 29, 12, 0.14)" : "0 8px 18px rgba(44, 29, 12, 0.1)";
    },
    { passive: true },
  );
}

function attachSectionReveal() {
  revealObserver.watch(".section");
}

function moveIndicator(indicator, target, container, mode = "line") {
  if (!indicator || !target || !container) return;
  const containerRect = container.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const x = targetRect.left - containerRect.left;
  const y = targetRect.top - containerRect.top;
  if (mode === "line") {
    indicator.style.width = `${Math.max(16, targetRect.width - 6)}px`;
    indicator.style.transform = `translateX(${x + 3}px)`;
  } else {
    indicator.style.width = `${targetRect.width}px`;
    indicator.style.height = `${targetRect.height}px`;
    indicator.style.transform = `translate(${x}px, ${y}px)`;
  }
  indicator.classList.add("is-visible");
}

function attachMenuSystem() {
  const sectionOrder = ["hero", "story", "moments", "gallery", "quiz", "finale"];
  const sections = sectionOrder.map((id) => document.getElementById(id)).filter(Boolean);
  const update = () => {
    const marker = window.scrollY + window.innerHeight * 0.36;
    let activeId = "hero";
    sections.forEach((section) => {
      if (section.offsetTop <= marker) activeId = section.id;
    });
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
      activeId = "finale";
    }

    if (dom.scrollProgressBar) {
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const progress = clamp((window.scrollY / maxScroll) * 100, 0, 100);
      dom.scrollProgressBar.style.width = `${progress.toFixed(2)}%`;
    }

    dom.topNavLinks.forEach((link) => {
      const hit = link.getAttribute("href") === `#${activeId}`;
      link.parentElement?.classList.toggle("is-active", hit);
      if (hit && dom.navGlider && dom.topNav) {
        moveIndicator(dom.navGlider, link, dom.topNav, "line");
      }
    });

    dom.mobileDockLinks.forEach((link) => {
      const hit = link.getAttribute("href") === `#${activeId}`;
      link.classList.toggle("is-active", hit);
      if (hit && dom.mobileDockGlow && dom.mobileDock) {
        moveIndicator(dom.mobileDockGlow, link, dom.mobileDock, "block");
      }
    });

    document.querySelectorAll(".section").forEach((section) => {
      section.classList.toggle("is-spotlit", section.id === activeId);
    });
  };

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(() => {
      update();
      ticking = false;
    });
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  dom.topNavLinks.forEach((link) => link.addEventListener("click", () => window.setTimeout(onScroll, 320)));
  dom.mobileDockLinks.forEach((link) => link.addEventListener("click", () => window.setTimeout(onScroll, 320)));
  onScroll();
}

function attachButtonRipples() {
  const nodes = document.querySelectorAll(".solid-btn, .ghost-btn, #top-nav-list a, .mobile-dock a");
  nodes.forEach((node) => {
    if (node.dataset.rippleBound === "1") return;
    node.dataset.rippleBound = "1";
    node.addEventListener("pointerdown", (event) => {
      const rect = node.getBoundingClientRect();
      const ripple = document.createElement("span");
      ripple.className = "menu-ripple";
      ripple.style.left = `${event.clientX - rect.left}px`;
      ripple.style.top = `${event.clientY - rect.top}px`;
      node.append(ripple);
      window.setTimeout(() => ripple.remove(), 700);
    });
  });
}

function spawnHeartLayer({ count = 22, duration = 4200, symbols = ["❤", "♡", "✦"], secret = false } = {}) {
  const layer = document.createElement("div");
  layer.className = "easter-layer";
  document.body.append(layer);
  for (let i = 0; i < count; i += 1) {
    const item = document.createElement("span");
    item.className = "easter-heart";
    item.textContent = symbols[randomInt(0, symbols.length - 1)];
    item.style.left = `${Math.random() * 100}%`;
    item.style.fontSize = `${(0.86 + Math.random() * 1.18).toFixed(2)}rem`;
    item.style.animationDuration = `${(2.8 + Math.random() * 2.4).toFixed(2)}s`;
    item.style.animationDelay = `${(Math.random() * 0.6).toFixed(2)}s`;
    item.style.setProperty("--drift", `${randomInt(-90, 90)}px`);
    if (secret) {
      item.style.color = `hsla(${randomInt(130, 190)}, 92%, 70%, 0.92)`;
      item.style.textShadow = "0 0 14px rgba(72, 179, 164, 0.5)";
    }
    layer.append(item);
  }
  window.setTimeout(() => layer.remove(), duration);
}

function triggerEasyEggOne() {
  spawnHeartLayer({ count: isMobileViewport ? 18 : 26, symbols: ["❤", "♡", "❥", "✦"] });
  fireworks.start(2600);
  if (!easterState.easyOneTriggered) {
    easterState.easyOneTriggered = true;
    toast.push("彩蛋①触发：三连点品牌进入甜蜜雨模式", 3200);
  } else {
    toast.push("甜蜜雨再次触发", 1800);
  }
}

function triggerEasyEggTwo() {
  spawnHeartLayer({ count: isMobileViewport ? 16 : 24, symbols: ["❤", "♡", "✧"] });
  fireworks.start(2200);
  openNoteModal(sample(LOVE_NOTES));
  if (!easterState.easyTwoTriggered) {
    easterState.easyTwoTriggered = true;
    toast.push("彩蛋②触发：关键词已解锁浪漫模式", 3200);
  } else {
    toast.push("浪漫模式再次触发", 1800);
  }
}

function triggerHiddenEgg() {
  if (easterState.hiddenTriggered) return;
  easterState.hiddenTriggered = true;
  document.body.classList.add("is-aurora");
  spawnHeartLayer({ count: isMobileViewport ? 24 : 34, symbols: ["✦", "✧", "❤"], secret: true, duration: 5200 });
  fireworks.start(5200);
  toast.push("隐藏彩蛋已解锁：Aurora Signature Mode", 4200);
}

function checkSearchEasterEgg(rawKeyword) {
  const keyword = String(rawKeyword || "").trim().toLowerCase();
  if (!keyword) return;
  if (Date.now() - easterState.keywordCooldownAt < 3200) return;
  if (/(^|\\s)(520|1314)(\\s|$)|iloveyou|forever|love/.test(keyword)) {
    easterState.keywordCooldownAt = Date.now();
    triggerEasyEggTwo();
  }
}

function attachEasterEggs() {
  const brand = document.querySelector(".brand");
  if (brand) {
    brand.addEventListener("click", () => {
      const now = Date.now();
      if (now - easterState.brandTapAt < 900) {
        easterState.brandTapCount += 1;
      } else {
        easterState.brandTapCount = 1;
      }
      easterState.brandTapAt = now;
      if (easterState.brandTapCount >= 3) {
        easterState.brandTapCount = 0;
        triggerEasyEggOne();
      }
    });
  }

  const secretSequence = ["Chapter I", "Chapter II", "Chapter III", "Chapter IV", "Chapter V"];
  document.querySelectorAll(".section__heading p").forEach((node) => {
    node.addEventListener("click", () => {
      if (!music.isPlaying) {
        easterState.chapterIndex = 0;
        return;
      }
      const current = node.textContent.trim();
      const now = Date.now();
      if (now - easterState.chapterSequenceAt > 12000) {
        easterState.chapterIndex = 0;
      }
      easterState.chapterSequenceAt = now;
      if (current === secretSequence[easterState.chapterIndex]) {
        easterState.chapterIndex += 1;
        if (easterState.chapterIndex === secretSequence.length) {
          easterState.chapterIndex = 0;
          triggerHiddenEgg();
        }
      } else {
        easterState.chapterIndex = current === secretSequence[0] ? 1 : 0;
      }
    });
  });
}

async function runPreloader() {
  for (let i = 0; i <= 100; i += 1) {
    dom.preloaderProgress.style.width = `${i}%`;
    dom.preloaderPercent.textContent = `${i}%`;
    await wait(11);
  }
  dom.preloader.classList.add("is-hidden");
}

async function bootstrap() {
  const typewriterLines = [
    "这是一个可复用的高端告白模板，已预置完整视觉和互动节奏。",
    "将 {{SENDER}}、{{RECIPIENT}}、纪念日等配置替换后即可直接发布。",
    "建议补充你们的真实瞬间，让模板升级为专属版本。",
  ].map((line) => applyTemplate(line));
  const typewriter = new Typewriter(dom.typedIntro, typewriterLines);

  const cursor = new CursorController(dom.cursorDot, dom.cursorRing);
  const magnetic = new MagneticController();

  await runPreloader();

  document.title = `${TEMPLATE.senderName} × ${TEMPLATE.recipientName} | 高端告白模板`;
  const brandAccent = document.querySelector(".brand span");
  if (brandAccent) brandAccent.textContent = TEMPLATE.relationLabel;
  if (dom.finaleTitle) dom.finaleTitle.textContent = applyTemplate("{{RECIPIENT}}，愿我们一起把接下来的日子写成更好的 {{RELATION}}。");
  if (dom.finaleBody) dom.finaleBody.textContent = applyTemplate("这段话可编辑：{{SENDER}} 想对 {{RECIPIENT}} 说，感谢你愿意一起经营、沟通与成长。愿 {{RELATION}} 保持热烈，也保持稳定。");

  updateHeroStats();
  seedTimeline();
  seedPaletteWall();
  notesExplorer.applyFilters();
  notesExplorer.init();
  promiseTheater.init();
  quizEngine.init();
  countdown.init();
  ambientBg.init();
  fireworks.init();
  music.init();
  attachModalEvents();
  attachShuffleAction();
  attachRandomNoteAction();
  attachPromiseShortcuts();
  attachConfettiAction();
  attachLetterExport();
  attachTiltCard();
  attachHeaderBehavior();
  attachSectionReveal();
  attachMenuSystem();
  attachButtonRipples();
  attachEasterEggs();
  cursor.init();
  magnetic.init();
  typewriter.init();

  toast.push("高端告白模板已就绪", 2200);
}

bootstrap();







