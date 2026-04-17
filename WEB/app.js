const CONFIG = {
  manifestPath: "./tentit/manifest.json",
  basePath: "./tentit/",
};

const elements = {
  examSelect: document.querySelector("#exam-select"),
  questionCountInput: document.querySelector("#question-count"),
  startButton: document.querySelector("#start-btn"),
  status: document.querySelector("#status"),
  quizSection: document.querySelector("#quiz"),
  quizTitle: document.querySelector("#quiz-title"),
  progressLabel: document.querySelector("#progress-label"),
  scoreLabel: document.querySelector("#score-label"),
  questionText: document.querySelector("#question-text"),
  optionsList: document.querySelector("#options-list"),
  nextButton: document.querySelector("#next-btn"),
  resultsSection: document.querySelector("#results"),
  resultsSummary: document.querySelector("#results-summary"),
  wrongAnswers: document.querySelector("#wrong-answers"),
  restartButton: document.querySelector("#restart-btn"),
  themeToggle: document.querySelector("#theme-toggle"),
};

const state = {
  manifest: [],
  manifestLoaded: false,
  quiz: null,
  currentQuestionIndex: 0,
  score: 0,
  hasAnswered: false,
  wrongAnswers: [],
};

const resolveAssetUrl = async (relativePath) => relativePath;

const CATEGORY_FALLBACK_KEY = "muut";
const CATEGORY_DISPLAY_NAMES = {
  fysiikka: "Fysiikka",
  ohjelmointi: "Ohjelmointi",
  tietotekniikka: "Tietotekniikka",
  [CATEGORY_FALLBACK_KEY]: "Muut",
};
const CATEGORY_KEY_ORDER = ["fysiikka", "ohjelmointi", "tietotekniikka", CATEGORY_FALLBACK_KEY];

// --- Teemavaihto ---
const THEME_KEY = "theme";
const DEFAULT_THEME = "dark";

elements.themeToggle.addEventListener("click", () => {
  const current = document.documentElement.dataset.theme || DEFAULT_THEME;
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  elements.themeToggle.textContent =
    next === "dark" ? "🌙 Tumma tila" : "☀️ Vaalea tila";
  localStorage.setItem(THEME_KEY, next);
});

const savedTheme = localStorage.getItem(THEME_KEY);
const initialTheme = savedTheme || DEFAULT_THEME;
document.documentElement.dataset.theme = initialTheme;
elements.themeToggle.textContent =
  initialTheme === "dark" ? "🌙 Tumma tila" : "☀️ Vaalea tila";

// --- Manifestin haku ---
async function fetchManifest() {
  if (state.manifestLoaded) return state.manifest;
  const response = await fetch(CONFIG.manifestPath, { cache: "no-store" });
  const manifestData = await response.json();
  state.manifest = manifestData.map((entry) => ({
    ...entry,
    id: entry.id ?? entry.file.replace(/\.json$/i, ""),
    title: entry.title ?? entry.label ?? entry.id ?? entry.file,
    file: entry.file,
  }));
  state.manifestLoaded = true;
  return state.manifest;
}

// --- Tenttilistan rakentaminen ---
function populateExamSelect() {
  const select = elements.examSelect;
  const manifest = state.manifest;
  select.innerHTML = "";

  const grouped = new Map();
  manifest.forEach((exam) => {
    const rawCategory = typeof exam.category === "string" ? exam.category.trim() : "";
    const categoryKey = rawCategory ? rawCategory.toLowerCase() : CATEGORY_FALLBACK_KEY;
    const displayName =
      CATEGORY_DISPLAY_NAMES[categoryKey] ??
      (rawCategory || CATEGORY_DISPLAY_NAMES[CATEGORY_FALLBACK_KEY]);

    if (!grouped.has(categoryKey))
      grouped.set(categoryKey, { displayName, exams: [] });
    grouped.get(categoryKey).exams.push(exam);
  });

  const orderedKeys = CATEGORY_KEY_ORDER.filter((key) => grouped.has(key)).concat(
    [...grouped.keys()].filter((key) => !CATEGORY_KEY_ORDER.includes(key))
  );

  orderedKeys.forEach((key) => {
    const group = grouped.get(key);
    const headerOption = document.createElement("option");
    headerOption.textContent = `— ${group.displayName} —`;
    headerOption.disabled = true;
    select.append(headerOption);
    group.exams.forEach((exam) => {
      const option = document.createElement("option");
      option.value = exam.id;
      option.textContent = `${exam.title}`;
      select.append(option);
    });
  });
}

// --- Tenttien lataus ---
async function loadQuiz(examId) {
  const manifest = await fetchManifest();
  const entry = manifest.find((e) => e.id === examId);
  const response = await fetch(CONFIG.basePath + entry.file, { cache: "no-store" });
  return { manifestEntry: entry, quizData: await response.json() };
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function determineQuestionSet(quizData) {
  const requested =
    Number(elements.questionCountInput.value) || quizData.questions.length;
  return shuffle([...quizData.questions])
    .slice(0, requested)
    .map((q) => ({ ...q, options: shuffle([...q.options]) }));
}

function startQuiz(manifestEntry, quizData, questions) {
  state.quiz = {
    manifestEntry,
    questions,
    content: quizData.content,
    title: quizData.TITLE ?? manifestEntry.title,
  };
  state.currentQuestionIndex = 0;
  state.score = 0;
  state.wrongAnswers = [];
  elements.quizTitle.textContent = state.quiz.title;
  elements.quizSection.classList.remove("hidden");
  elements.resultsSection.classList.add("hidden");
  
  // Tarkistetaan onko questions vai content
  if (!state.quiz.questions && state.quiz.content) {
    renderReadingMaterial();
  } else {
    renderQuestion();
  }
}

function renderReadingMaterial() {
  const item = state.quiz.content[state.currentQuestionIndex];
  elements.progressLabel.textContent = `${state.currentQuestionIndex + 1}/${state.quiz.content.length}`;
  
  // Piiloita pääotsikko lukumateriaalissa
  document.querySelector('.hero')?.classList.add('hidden');
  
  // Otsikko
  elements.questionText.innerHTML = `<h3>${item.title}</h3>`;
  elements.questionText.style.display = 'block';
  
  // Kuva
  let existingImage = document.getElementById('question-image');
  if (existingImage) {
    existingImage.remove();
  }
  
  if (item.image) {
    const img = document.createElement('img');
    img.id = 'question-image';
    img.className = 'question-image reading-material-image';
    img.src = item.image.startsWith('./') ? `tentit/${item.image.substring(2)}` : item.image;
    img.alt = item.title || 'Kuva';
    img.onerror = () => {
      img.style.display = 'none';
      console.error('Kuvan lataus epäonnistui:', item.image);
    };
    elements.questionText.parentElement.insertBefore(img, elements.optionsList);
  }
  
  // Teksti
  elements.optionsList.innerHTML = `<div class="reading-text">${item.text}</div>`;
  
  // Seuraava/Edellinen painikkeet
  const navDiv = document.createElement('div');
  navDiv.className = 'reading-nav';
  navDiv.innerHTML = '';
  
  if (state.currentQuestionIndex > 0) {
    const prevBtn = document.createElement('button');
    prevBtn.textContent = '← Edellinen';
    prevBtn.onclick = () => {
      state.currentQuestionIndex--;
      renderReadingMaterial();
    };
    navDiv.appendChild(prevBtn);
  }
  
  if (state.currentQuestionIndex < state.quiz.content.length - 1) {
    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Seuraava →';
    nextBtn.onclick = () => {
      state.currentQuestionIndex++;
      renderReadingMaterial();
    };
    navDiv.appendChild(nextBtn);
  }
  
  elements.optionsList.appendChild(navDiv);
}

function renderQuestion() {
  const q = state.quiz.questions[state.currentQuestionIndex];

  // Näytä pääotsikko tentissa
  document.querySelector('.hero')?.classList.remove('hidden');

  elements.progressLabel.textContent = `Kysymys ${state.currentQuestionIndex + 1}/${state.quiz.questions.length}`;

  // Näytetään kysymys jos se on olemassa
  if (q.question) {
    elements.questionText.textContent = q.question;
    elements.questionText.style.display = 'block';
  } else {
    elements.questionText.style.display = 'none';
  }

  // Tarkistetaan onko kuvaa
  let existingImage = document.getElementById('question-image');
  if (existingImage) {
    existingImage.remove();
  }

  if (q.image) {
    const img = document.createElement('img');
    img.id = 'question-image';
    img.className = 'question-image';
    img.src = q.image.startsWith('./') ? `tentit/${q.image.substring(2)}` : q.image;
    img.alt = q.question || 'Kysymyskuva';
    img.onerror = () => {
      img.style.display = 'none';
      console.error('Kuvan lataus epäonnistui:', q.image);
    };
    elements.questionText.parentElement.insertBefore(img, elements.optionsList);
  }

  elements.optionsList.innerHTML = "";

  // Piilotetaan seuraava-painike kunnes tarvittava tila saavutettu
  elements.nextButton.classList.add("hidden");
  elements.nextButton.disabled = false;

  q.options.forEach((option) => {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.className = "option";
    btn.textContent = option;

    if (q.multiCorrect) {
      // Monivalinta (useita oikeita): valinta toggle-muodossa
      btn.onclick = () => {
        btn.classList.toggle('selected');
        const anySelected = elements.optionsList.querySelectorAll('.option.selected').length > 0;
        elements.nextButton.disabled = !anySelected;
        elements.nextButton.classList.remove('hidden');
        elements.nextButton.textContent = 'Vahvista';
      };
    } else {
      // Yksi oikea vastaus: arvioidaan heti
      btn.onclick = () => handleAnswer(btn, q);
    }

    li.append(btn);
    elements.optionsList.append(li);
  });
}

function handleAnswer(button, question) {
  if (state.hasAnswered) return;
  state.hasAnswered = true;

  const correct = button.textContent === question.correct;
  if (correct) {
    button.classList.add("correct");
    state.score++;
  } else {
    button.classList.add("incorrect");
    state.wrongAnswers.push({
      question: question.question,
      userAnswer: button.textContent,
      correctAnswer: question.correct,
    });
    [...elements.optionsList.querySelectorAll(".option")].forEach((btn) => {
      if (btn.textContent === question.correct) btn.classList.add("correct");
      btn.disabled = true;
    });
  }
  elements.scoreLabel.textContent = `Pisteet: ${state.score}`;
  elements.nextButton.classList.remove("hidden");
}

function evaluateMulti(question) {
  if (state.hasAnswered) return;
  const selectedBtns = [...elements.optionsList.querySelectorAll('.option.selected')];
  const selected = selectedBtns.map((b) => b.textContent);
  const correctArr = Array.isArray(question.correct) ? question.correct : [question.correct];

  // Normalize comparison by trimming strings
  const selSet = new Set(selected.map(s => s.trim()));
  const corrSet = new Set(correctArr.map(s => s.trim()));

  // Mark all correct options and incorrect selections
  [...elements.optionsList.querySelectorAll('.option')].forEach((btn) => {
    const txt = btn.textContent.trim();
    if (corrSet.has(txt)) btn.classList.add('correct');
    if (selSet.has(txt) && !corrSet.has(txt)) btn.classList.add('incorrect');
    btn.disabled = true;
  });

  // Determine if selection exactly matches correct set
  const isExact = selSet.size === corrSet.size && [...selSet].every(v => corrSet.has(v));
  if (isExact) state.score++;
  else {
    state.wrongAnswers.push({
      question: question.question,
      userAnswer: selected.join(', '),
      correctAnswer: correctArr.join(', '),
    });
  }

  elements.scoreLabel.textContent = `Pisteet: ${state.score}`;
  state.hasAnswered = true;
  elements.nextButton.textContent = 'Seuraava';
  elements.nextButton.disabled = false;
}

elements.nextButton.addEventListener("click", () => {
  const q = state.quiz.questions[state.currentQuestionIndex];
  // Jos monivalinta ilman vielä vahvistusta, arvioidaan
  if (q.multiCorrect && !state.hasAnswered) {
    evaluateMulti(q);
    return;
  }

  state.hasAnswered = false;
  state.currentQuestionIndex++;
  if (state.currentQuestionIndex < state.quiz.questions.length) renderQuestion();
  else showResults();
  elements.nextButton.classList.add("hidden");
});

function showResults() {
  elements.quizSection.classList.add("hidden");
  elements.resultsSection.classList.remove("hidden");
  elements.resultsSummary.textContent = `Sait ${state.score}/${state.quiz.questions.length} pistettä.`;

  const wrongList = state.wrongAnswers
    .map(
      (w) => `
      <div class="wrong-answer">
        <strong>Kysymys: ${w.question}</strong><br/>
        <span class="wrong-your"><b class="label-wrong">VASTASIT:</b> ${w.userAnswer}</span><br/>
        <span class="wrong-correct"><b class="label-correct">OIKEA:</b> ${w.correctAnswer}</span>
      </div>`
    )
    .join("");

  if (state.wrongAnswers.length > 0) {
    elements.wrongAnswers.innerHTML = `
      <h3 class="wrong-heading">Tässä tentin väärät vastaukset:</h3>
      ${wrongList}
    `;
  } else {
    elements.wrongAnswers.innerHTML = "<p>Kaikki oikein!</p>";
  }
}


elements.startButton.addEventListener("click", async () => {
  if (!elements.examSelect.value) return;
  const { manifestEntry, quizData } = await loadQuiz(elements.examSelect.value);
  
  // Tarkistetaan onko questions vai content
  if (quizData.content) {
    // Lukumateriaali - ei tarvita determineQuestionSet
    startQuiz(manifestEntry, quizData, null);
  } else {
    // Tentti - käytä determineQuestionSet
    const questions = determineQuestionSet(quizData);
    startQuiz(manifestEntry, quizData, questions);
  }
});

elements.restartButton.addEventListener("click", () => {
  startQuiz(
    state.quiz.manifestEntry,
    { TITLE: state.quiz.title, questions: state.quiz.questions },
    state.quiz.questions
  );
});

// --- Ladataan tenttilista sivun latauksen jälkeen ---
document.addEventListener("DOMContentLoaded", async () => {
  try {
    await fetchManifest();
    populateExamSelect();
  } catch (err) {
    console.error("Virhe tenttilistan latauksessa:", err);
    elements.examSelect.innerHTML = "<option disabled>Virhe tenttilistan latauksessa</option>";
  }
});
