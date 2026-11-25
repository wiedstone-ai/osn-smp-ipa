const DATA = window.OSN_DATA;

const STORAGE_KEY = "osn_ipa_2026_latihan_v1";
let latihanProgress = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
let currentLatihanLevel = "penyisihan1";

// Challenge state
let chState = {
  level: null,
  questions: [],
  idx: 0,
  answers: {},
  seconds: 0,
  timerId: null,
};

// ==========================================
// NAVIGATION & TABS
// ==========================================
function switchTab(tabName) {
  document.querySelectorAll(".nav-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.tab === tabName);
  });
  document.querySelectorAll(".tab-panel").forEach((p) => {
    p.classList.toggle("active", p.id === `tab-${tabName}`);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll(".nav-btn").forEach((btn) => {
  btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});

// ==========================================
// BERANDA & KISI-KISI 2026
// ==========================================
function renderKisiKisi(filter = "all") {
  const grid = document.getElementById("kisi-grid");
  const items = DATA.kisiKisi.filter((item) => {
    if (filter === "umum") return !item.babak.includes("Final *)");
    if (filter === "final") return item.babak.includes("Final *)");
    return true;
  });

  grid.innerHTML = items
    .map((item) => {
      const isFinal = item.babak.includes("Final *)");
      return `
        <article class="kisi-card ${isFinal ? "is-final" : ""}">
          <div class="kisi-card-top">
            <span class="kisi-no">Topik #${item.no}</span>
            <span class="pill ${isFinal ? "pill-rose" : "pill-teal"}" style="margin:0">${item.babak}</span>
          </div>
          <h4>${item.topik}</h4>
          <p class="kisi-meta"><strong>Arsip 2021–2024:</strong> ${item.padanan}</p>
          <p class="kisi-meta"><strong>Analisis 2026:</strong> ${item.catatan}</p>
        </article>
      `;
    })
    .join("");
}

document.querySelectorAll("[data-kisi-filter]").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("[data-kisi-filter]").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    renderKisiKisi(btn.dataset.kisiFilter);
  });
});

function updateHomeStats() {
  const totalLatihan =
    DATA.latihan.penyisihan1.length + DATA.latihan.penyisihan2.length + DATA.latihan.nasional.length;
  const totalCh =
    DATA.challenge.penyisihan1.length + DATA.challenge.penyisihan2.length + DATA.challenge.nasional.length;
  document.getElementById("stat-total-soal").textContent = totalLatihan + totalCh;

  let done = 0;
  ["penyisihan1", "penyisihan2", "nasional"].forEach((lvl) => {
    done += Object.keys(latihanProgress[lvl] || {}).length;
  });
  document.getElementById("stat-latihan-done").textContent = done;
}

// ==========================================
// MODE LATIHAN (PEMBAHASAN TIAP BUTIR SOAL)
// ==========================================
function renderLatihan() {
  const questions = DATA.latihan[currentLatihanLevel];
  const saved = latihanProgress[currentLatihanLevel] || {};
  const listEl = document.getElementById("latihan-list");

  const answeredCount = Object.keys(saved).length;
  const pct = questions.length ? Math.round((answeredCount / questions.length) * 100) : 0;
  document.getElementById("latihan-progress-text").textContent = `Terjawab: ${answeredCount} / ${questions.length} soal (${pct}%)`;
  document.getElementById("latihan-progress-fill").style.width = `${pct}%`;

  listEl.innerHTML = questions
    .map((q) => {
      const userAns = saved[q.id];
      const hasAns = userAns !== undefined && userAns !== "";

      let imgsHtml = q.imgs
        .map((src) => `<div class="q-img-wrap"><img src="${src}" alt="Gambar Soal ${q.id}" loading="lazy" /></div>`)
        .join("");

      let inputHtml = "";
      let isCorrect = false;

      if (q.type === "mc") {
        isCorrect = hasAns && userAns === q.kunci;
        inputHtml = `<div class="options-list">` +
          q.opsi
            .map((opt) => {
              const letter = opt.trim().charAt(0);
              let cls = "opt-btn";
              if (hasAns) {
                if (letter === q.kunci) cls += " correct";
                else if (letter === userAns && userAns !== q.kunci) cls += " wrong";
              }
              return `<button class="${cls}" onclick="answerLatihanMC(${q.id}, '${letter}')">${opt}</button>`;
            })
            .join("") +
          `</div>`;
      } else {
        inputHtml = `
          <div class="text-answer-wrap">
            <input type="text" class="text-input" id="lat-input-${q.id}" placeholder="Ketik jawaban singkatmu di sini..." value="${hasAns ? escapeHtml(userAns) : ""}" />
            <button class="btn btn-primary btn-sm" onclick="answerLatihanText(${q.id})">Cek Pembahasan</button>
          </div>
        `;
        isCorrect = hasAns && q.kunci.toLowerCase().includes(userAns.trim().toLowerCase());
      }

      let explainHtml = "";
      if (hasAns) {
        const boxCls = q.type === "mc" ? (isCorrect ? "is-correct" : "is-wrong") : "";
        const statusTxt =
          q.type === "mc"
            ? isCorrect
              ? `✅ Tepat! Kunci Jawaban: ${q.kunci}`
              : `❌ Kurang Tepat (Jawabanmu: ${userAns}). Kunci Jawaban: ${q.kunci}`
            : `📘 Kunci / Acuan Jawaban: ${q.kunci}`;

        explainHtml = `
          <div class="explain-box ${boxCls}">
            <p class="explain-title">${statusTxt}</p>
            <p class="explain-body"><strong>Pembahasan:</strong> ${q.pembahasan}</p>
          </div>
        `;
      }

      return `
        <article class="q-card" id="lat-q-${q.id}">
          <div class="q-header">
            <span class="q-num">Soal ${q.id}</span>
            <div class="q-tags">
              <span class="q-tag">${q.sumber}</span>
              <span class="q-tag">${q.topik}</span>
            </div>
          </div>
          <p class="q-text">${escapeHtml(q.soal)}</p>
          ${imgsHtml}
          ${inputHtml}
          ${explainHtml}
        </article>
      `;
    })
    .join("");
}

function answerLatihanMC(qId, letter) {
  if (!latihanProgress[currentLatihanLevel]) latihanProgress[currentLatihanLevel] = {};
  latihanProgress[currentLatihanLevel][qId] = letter;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(latihanProgress));
  renderLatihan();
  updateHomeStats();
}

function answerLatihanText(qId) {
  const val = document.getElementById(`lat-input-${qId}`).value.trim();
  if (!val) {
    alert("Tuliskan jawabanmu terlebih dahulu sebelum melihat pembahasan.");
    return;
  }
  if (!latihanProgress[currentLatihanLevel]) latihanProgress[currentLatihanLevel] = {};
  latihanProgress[currentLatihanLevel][qId] = val;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(latihanProgress));
  renderLatihan();
  updateHomeStats();
}

document.querySelectorAll("[data-latihan-level]").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("[data-latihan-level]").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentLatihanLevel = btn.dataset.latihanLevel;
    renderLatihan();
  });
});

document.getElementById("reset-latihan-btn").addEventListener("click", () => {
  delete latihanProgress[currentLatihanLevel];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(latihanProgress));
  renderLatihan();
  updateHomeStats();
});

// ==========================================
// MODE CHALLENGE (PEMBAHASAN DI AKHIR SESI)
// ==========================================
const LEVEL_LABELS = {
  penyisihan1: "Challenge 1: Penyisihan 1 (OSN-K)",
  penyisihan2: "Challenge 2: Penyisihan 2 (OSN-P)",
  nasional: "Challenge 3: Final Nasional",
};

function startChallenge(level) {
  chState = {
    level,
    questions: DATA.challenge[level],
    idx: 0,
    answers: {},
    seconds: 0,
    timerId: null,
  };

  document.getElementById("challenge-lobby").classList.add("hidden");
  document.getElementById("challenge-result").classList.add("hidden");
  document.getElementById("challenge-runner").classList.remove("hidden");
  document.getElementById("ch-level-badge").textContent = LEVEL_LABELS[level];

  chState.timerId = setInterval(() => {
    chState.seconds++;
    document.getElementById("ch-timer").textContent = `⏱️ ${formatTime(chState.seconds)}`;
  }, 1000);
  document.getElementById("ch-timer").textContent = "⏱️ 00:00";

  renderChallengeQuestion();
}

function renderChallengeQuestion() {
  const q = chState.questions[chState.idx];
  const total = chState.questions.length;
  document.getElementById("ch-question-counter").textContent = `Soal ${chState.idx + 1} dari ${total}`;

  // Nav pills
  const pillsEl = document.getElementById("ch-nav-pills");
  pillsEl.innerHTML = chState.questions
    .map((item, i) => {
      const answered = chState.answers[item.id] !== undefined && chState.answers[item.id] !== "";
      const cls = `nav-pill ${i === chState.idx ? "current" : answered ? "answered" : ""}`;
      return `<button class="${cls}" onclick="jumpChallengeQ(${i})">${i + 1}</button>`;
    })
    .join("");

  const imgsHtml = q.imgs
    .map((src) => `<div class="q-img-wrap"><img src="${src}" alt="Gambar Soal ${q.id}" /></div>`)
    .join("");

  const userAns = chState.answers[q.id] || "";
  let inputHtml = "";
  if (q.type === "mc") {
    inputHtml = `<div class="options-list">` +
      q.opsi
        .map((opt) => {
          const letter = opt.trim().charAt(0);
          const cls = `opt-btn ${userAns === letter ? "selected" : ""}`;
          return `<button class="${cls}" onclick="selectChallengeMC(${q.id}, '${letter}')">${opt}</button>`;
        })
        .join("") +
      `</div>`;
  } else {
    inputHtml = `
      <div class="text-answer-wrap">
        <input type="text" class="text-input" id="ch-text-input" placeholder="Ketik jawabanmu di sini..." value="${escapeHtml(userAns)}" oninput="saveChallengeText(${q.id}, this.value)" />
      </div>
    `;
  }

  document.getElementById("ch-question-stage").innerHTML = `
    <article class="q-card">
      <div class="q-header">
        <span class="q-num">Soal ${chState.idx + 1}</span>
        <div class="q-tags">
          <span class="q-tag">${q.sumber}</span>
          <span class="q-tag">${q.topik}</span>
        </div>
      </div>
      <p class="q-text">${escapeHtml(q.soal)}</p>
      ${imgsHtml}
      ${inputHtml}
    </article>
  `;

  document.getElementById("ch-prev-btn").disabled = chState.idx === 0;
  document.getElementById("ch-next-btn").disabled = chState.idx === total - 1;
}

function selectChallengeMC(qId, letter) {
  chState.answers[qId] = letter;
  renderChallengeQuestion();
}

function saveChallengeText(qId, val) {
  chState.answers[qId] = val;
  // Update nav pill indicator without re-rendering input focus
  const pills = document.querySelectorAll("#ch-nav-pills .nav-pill");
  if (pills[chState.idx]) {
    pills[chState.idx].classList.toggle("answered", val.trim() !== "");
  }
}

function jumpChallengeQ(i) {
  chState.idx = i;
  renderChallengeQuestion();
}

function prevChallengeQ() {
  if (chState.idx > 0) {
    chState.idx--;
    renderChallengeQuestion();
  }
}

function nextChallengeQ() {
  if (chState.idx < chState.questions.length - 1) {
    chState.idx++;
    renderChallengeQuestion();
  }
}

function exitChallenge() {
  if (chState.timerId) clearInterval(chState.timerId);
  document.getElementById("challenge-runner").classList.add("hidden");
  document.getElementById("challenge-result").classList.add("hidden");
  document.getElementById("challenge-lobby").classList.remove("hidden");
}

function finishChallenge() {
  if (chState.timerId) clearInterval(chState.timerId);

  const total = chState.questions.length;
  let mcTotal = 0;
  let mcCorrect = 0;

  chState.questions.forEach((q) => {
    if (q.type === "mc") {
      mcTotal++;
      if (chState.answers[q.id] === q.kunci) mcCorrect++;
    }
  });

  const scorePct = mcTotal > 0 ? Math.round((mcCorrect / mcTotal) * 100) : 100;
  const summaryNote =
    mcTotal > 0
      ? `Skor Pilihan Ganda: <strong>${mcCorrect} / ${mcTotal} benar (${scorePct}%)</strong>`
      : `Sesi Uraian / Isian Singkat selesai! Cocokkan jawabanmu dengan kunci &amp; pembahasan di bawah.`;

  const reviewHtml = chState.questions
    .map((q, i) => {
      const uAns = chState.answers[q.id] || "(Tidak dijawab)";
      const isOk = q.type === "mc" && uAns === q.kunci;
      const boxCls = q.type === "mc" ? (isOk ? "is-correct" : "is-wrong") : "";
      const badge = q.type === "mc" ? (isOk ? "✅ Benar" : "❌ Salah") : "📝 Cek Mandiri";

      const imgsHtml = q.imgs
        .map((src) => `<div class="q-img-wrap"><img src="${src}" alt="Gambar Soal ${i + 1}" /></div>`)
        .join("");

      return `
        <article class="q-card">
          <div class="q-header">
            <span class="q-num">Soal ${i + 1} • ${badge}</span>
            <div class="q-tags">
              <span class="q-tag">${q.sumber}</span>
              <span class="q-tag">${q.topik}</span>
            </div>
          </div>
          <p class="q-text">${escapeHtml(q.soal)}</p>
          ${imgsHtml}
          <div class="explain-box ${boxCls}">
            <p class="explain-title">Jawaban Kamu: ${escapeHtml(uAns)} &nbsp;|&nbsp; Kunci: ${escapeHtml(q.kunci)}</p>
            <p class="explain-body"><strong>Pembahasan:</strong> ${q.pembahasan}</p>
          </div>
        </article>
      `;
    })
    .join("");

  document.getElementById("challenge-runner").classList.add("hidden");
  const resEl = document.getElementById("challenge-result");
  resEl.classList.remove("hidden");
  resEl.innerHTML = `
    <div class="result-summary">
      <span class="pill pill-teal">${LEVEL_LABELS[chState.level]}</span>
      <h2>Sesi Challenge Selesai!</h2>
      ${mcTotal > 0 ? `<div class="result-score">${scorePct}%</div>` : ""}
      <p>${summaryNote} • Waktu pengerjaan: <strong>${formatTime(chState.seconds)}</strong></p>
      <div class="hero-actions" style="justify-content:center">
        <button class="btn btn-primary" onclick="startChallenge('${chState.level}')">Ulangi Challenge Ini</button>
        <button class="btn btn-outline" onclick="exitChallenge()">Pilih Challenge Lain</button>
      </div>
    </div>
    <h3 style="margin-bottom:14px">Kunci Jawaban &amp; Pembahasan Lengkap</h3>
    <div class="question-list">${reviewHtml}</div>
  `;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Helpers
function formatTime(sec) {
  const m = String(Math.floor(sec / 60)).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Init
renderKisiKisi();
renderLatihan();
updateHomeStats();
