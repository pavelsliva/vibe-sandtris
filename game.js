const startButton = document.getElementById("startButton");
const questionPrompt = document.getElementById("questionPrompt");
const answersNode = document.getElementById("answers");
const progressLabel = document.getElementById("progressLabel");
const progressFill = document.getElementById("progressFill");
const backButton = document.getElementById("backButton");
const restartButton = document.getElementById("restartButton");
const replayButton = document.getElementById("replayButton");
const resultCard = document.getElementById("resultCard");
const resultTitle = document.getElementById("resultTitle");
const resultSummary = document.getElementById("resultSummary");
const resultMeaning = document.getElementById("resultMeaning");
const resultAdvice = document.getElementById("resultAdvice");
const automationScoreNode = document.getElementById("automationScore");
const augmentationScoreNode = document.getElementById("augmentationScore");
const humanEdgeScoreNode = document.getElementById("humanEdgeScore");

const QUESTIONS = [
  {
    prompt: "Сколько в твоей работе повторяющихся цифровых задач, которые можно описать как понятный workflow?",
    answers: [
      ["Почти вся работа так устроена", { automation: 3, augmentation: 2, human: 0 }],
      ["Таких задач много, но не все", { automation: 2, augmentation: 2, human: 1 }],
      ["Есть немного, но ядро работы не в этом", { automation: 1, augmentation: 1, human: 2 }],
      ["Почти каждый кейс уникален", { automation: 0, augmentation: 1, human: 3 }],
    ],
  },
  {
    prompt: "Твоя работа в основном происходит в тексте, табличках, документах, презентациях, коде или переписке?",
    answers: [
      ["Да, это почти целиком цифровая работа", { automation: 3, augmentation: 3, human: 0 }],
      ["Сильно завязана на цифру, но не только", { automation: 2, augmentation: 3, human: 1 }],
      ["Примерно пополам", { automation: 1, augmentation: 2, human: 2 }],
      ["Нет, главное происходит офлайн", { automation: 0, augmentation: 1, human: 3 }],
    ],
  },
  {
    prompt: "Насколько качество результата можно проверить по четким критериям, без большого пространства для вкуса и нюансов?",
    answers: [
      ["Почти полностью можно проверить формально", { automation: 3, augmentation: 2, human: 0 }],
      ["Во многом да, но нюансы тоже важны", { automation: 2, augmentation: 2, human: 1 }],
      ["Формальные критерии есть, но они не решают все", { automation: 1, augmentation: 2, human: 2 }],
      ["Нет, многое держится на вкусе, доверии и контексте", { automation: 0, augmentation: 1, human: 3 }],
    ],
  },
  {
    prompt: "Насколько в твоей работе важны живые переговоры, чтение комнаты, политическое чутье и управление людьми?",
    answers: [
      ["Почти не важны", { automation: 3, augmentation: 1, human: 0 }],
      ["Иногда нужны", { automation: 2, augmentation: 2, human: 1 }],
      ["Очень важны", { automation: 1, augmentation: 1, human: 3 }],
      ["Без этого работа просто не существует", { automation: 0, augmentation: 1, human: 4 }],
    ],
  },
  {
    prompt: "Если дать ИИ хороший промпт и примеры, насколько большую часть твоего чернового результата он уже мог бы сделать сейчас?",
    answers: [
      ["Большую часть", { automation: 3, augmentation: 3, human: 0 }],
      ["Где-то половину", { automation: 2, augmentation: 3, human: 1 }],
      ["Только вспомогательные куски", { automation: 1, augmentation: 2, human: 2 }],
      ["Почти ничего ценного", { automation: 0, augmentation: 1, human: 3 }],
    ],
  },
  {
    prompt: "Насколько твой доход зависит от твоего личного вкуса, имени, репутации или специфического человеческого почерка?",
    answers: [
      ["Почти не зависит", { automation: 3, augmentation: 1, human: 0 }],
      ["Зависит немного", { automation: 2, augmentation: 2, human: 1 }],
      ["Заметно зависит", { automation: 1, augmentation: 2, human: 3 }],
      ["Это вообще основа ценности", { automation: 0, augmentation: 1, human: 4 }],
    ],
  },
  {
    prompt: "Есть ли в твоей работе реальная физическая среда: люди, пространство, техника, объекты, съемка, монтаж руками, встречи на месте?",
    answers: [
      ["Почти нет", { automation: 3, augmentation: 2, human: 0 }],
      ["Немного есть", { automation: 2, augmentation: 2, human: 1 }],
      ["Да, это ощутимая часть", { automation: 1, augmentation: 1, human: 3 }],
      ["Да, без физического мира ничего не работает", { automation: 0, augmentation: 1, human: 4 }],
    ],
  },
  {
    prompt: "Насколько часто ты делаешь суммаризацию, ресерч, адаптацию, подготовку драфтов или вариаций одного и того же материала?",
    answers: [
      ["Это большой кусок работы", { automation: 3, augmentation: 3, human: 0 }],
      ["Это происходит регулярно", { automation: 2, augmentation: 3, human: 1 }],
      ["Иногда бывает", { automation: 1, augmentation: 2, human: 2 }],
      ["Почти никогда", { automation: 0, augmentation: 1, human: 3 }],
    ],
  },
  {
    prompt: "Насколько твоя работа состоит из принятия ответственности в неоднозначных, рискованных или политически чувствительных ситуациях?",
    answers: [
      ["Почти не состоит", { automation: 3, augmentation: 2, human: 0 }],
      ["Иногда это встречается", { automation: 2, augmentation: 2, human: 1 }],
      ["Это важная часть роли", { automation: 1, augmentation: 1, human: 3 }],
      ["Это буквально центр работы", { automation: 0, augmentation: 1, human: 4 }],
    ],
  },
  {
    prompt: "Если разбить твою работу на маленькие шаги, можно ли большую часть из них раздать как отдельные инструкции?",
    answers: [
      ["Да, почти все так и раскладывается", { automation: 3, augmentation: 2, human: 0 }],
      ["Во многом да", { automation: 2, augmentation: 2, human: 1 }],
      ["Только часть работы", { automation: 1, augmentation: 2, human: 2 }],
      ["Нет, все слишком связано и контекстно", { automation: 0, augmentation: 1, human: 3 }],
    ],
  },
  {
    prompt: "Какую долю в твоей работе занимает создание чего-то нового с высоким уровнем оригинальности, а не переработка уже знакомых паттернов?",
    answers: [
      ["Оригинальности мало, больше сборка из паттернов", { automation: 3, augmentation: 2, human: 0 }],
      ["Есть и то и другое", { automation: 2, augmentation: 3, human: 1 }],
      ["Оригинальность важна", { automation: 1, augmentation: 2, human: 3 }],
      ["Это почти целиком про новый угол зрения", { automation: 0, augmentation: 1, human: 4 }],
    ],
  },
  {
    prompt: "Насколько ценен в твоей работе именно контакт с человеком: эмпатия, доверие, ощущение присутствия и 'меня поняли'?",
    answers: [
      ["Почти не ценен", { automation: 3, augmentation: 1, human: 0 }],
      ["Скорее полезен, но не критичен", { automation: 2, augmentation: 2, human: 1 }],
      ["Очень ценен", { automation: 1, augmentation: 1, human: 3 }],
      ["Без него клиенты не платят", { automation: 0, augmentation: 1, human: 4 }],
    ],
  },
  {
    prompt: "Если бы завтра у тебя появился сильный ИИ-ассистент, насколько он увеличил бы твою личную продуктивность?",
    answers: [
      ["Резко увеличил бы", { automation: 2, augmentation: 4, human: 1 }],
      ["Сильно помог бы", { automation: 2, augmentation: 3, human: 1 }],
      ["Скорее местами помог бы", { automation: 1, augmentation: 2, human: 2 }],
      ["Почти не помог бы", { automation: 0, augmentation: 1, human: 3 }],
    ],
  },
  {
    prompt: "Насколько твоя работа завязана на внутренний контекст компании, неформальные знания, людей и скрытые договоренности?",
    answers: [
      ["Почти не завязана", { automation: 3, augmentation: 2, human: 0 }],
      ["Есть зависимость, но не решающая", { automation: 2, augmentation: 2, human: 1 }],
      ["Очень завязана", { automation: 1, augmentation: 1, human: 3 }],
      ["Без этого контекста нельзя сделать работу", { automation: 0, augmentation: 1, human: 4 }],
    ],
  },
  {
    prompt: "Если смотреть на твой рынок честно, больше давит риск 'ИИ заменит junior/middle-слой' или 'ИИ усилит лучших, а остальных отожмет'?",
    answers: [
      ["Скорее заменит нижний слой задач", { automation: 3, augmentation: 2, human: 0 }],
      ["И то и другое похоже на правду", { automation: 2, augmentation: 3, human: 1 }],
      ["Скорее усилит сильных, а не заменит всех", { automation: 1, augmentation: 3, human: 2 }],
      ["Пока рынок держится на людях сильнее, чем на автоматизации", { automation: 0, augmentation: 1, human: 4 }],
    ],
  },
];

const RESULTS = [
  {
    id: "assistant",
    when: (scores) => scores.automation <= 35 && scores.human >= 68,
    title: "ИИ скорее будет твоим стажером",
    summary:
      "У тебя много того, что плохо живет без человека: контекст, доверие, живая среда, вкус или ответственность. ИИ здесь скорее помощник, чем захватчик офиса.",
    meaning:
      "На твоем поле ИИ полезен для подготовки, ускорения и рутины, но основная ценность пока держится на человеческом факторе. То есть не расслабляться, но и паниковать рано.",
    advice: [
      "Систематизируй то, что можно делегировать ИИ, чтобы самому работать на более дорогом уровне.",
      "Усиливай репутацию, вкус, переговорные навыки и личную субъектность.",
      "Думай не 'как защититься от ИИ', а 'как стать человеком, который управляет ИИ-слоем'.",
    ],
  },
  {
    id: "copilot",
    when: (scores) => scores.augmentation >= 70 && scores.automation < 60,
    title: "ИИ станет твоим соавтором",
    summary:
      "Твою работу пока не так легко обнулить целиком, но ее уже очень удобно ускорять. Лучший сценарий для тебя не война с ИИ, а быстрый союз.",
    meaning:
      "Главный риск не в том, что профессия исчезнет совсем, а в том, что люди с хорошим AI-процессом начнут делать ту же работу быстрее, дешевле и в большем объеме. Конкуренция сместится в сторону скорости, отбора и финальной упаковки.",
    advice: [
      "Учись строить пайплайн: ресерч, драфт, вариации, проверка, финализация.",
      "Поднимай планку финального вкуса и решения задач, а не только ручного производства.",
      "Собирай кейсы, где ИИ дает ускорение, но не убивает качество.",
    ],
  },
  {
    id: "squeeze",
    when: (scores) => scores.automation >= 60 && scores.human < 55,
    title: "Твою роль могут начать сжимать",
    summary:
      "Не обязательно завтра, но давление будет ощущаться: рутинные цифровые задачи, шаблонная интеллектуальная работа и драфтовый слой уже выглядят уязвимо.",
    meaning:
      "Главная опасность не в магической полной замене, а в том, что часть задач станет слишком дешевой. В этот момент рынок начинает меньше платить за просто аккуратное исполнение по шаблону.",
    advice: [
      "Смещайся от механического производства к постановке задач, отбору и ответственности за результат.",
      "Добавляй офлайн-компоненту, доверие, вкус, персональный угол зрения или доменную экспертизу.",
      "Не строй карьеру только на том, что легко разложить на повторяемые цифровые шаги.",
    ],
  },
  {
    id: "rebuild",
    when: (scores) => scores.automation >= 72,
    title: "Пора пересобирать позиционирование",
    summary:
      "Если смотреть без самоуспокоения, у тебя высокий риск попадания под автоматизацию или хотя бы сильное обесценивание части задач в ближайшие годы.",
    meaning:
      "Это не приговор и не 'тебя увольняют роботы завтра утром'. Но это сигнал, что прежняя упаковка профессии может быстро подешеветь. Нужен следующий слой ценности.",
    advice: [
      "Уходи выше по цепочке: стратегия, ответственность, клиентская работа, принятие решений.",
      "Освой ИИ так, чтобы он не заменял тебя, а входил в твою новую профессиональную сборку.",
      "Думай не про должность, а про набор задач, которые рынок все еще готов доверять человеку.",
    ],
  },
  {
    id: "hybrid",
    when: () => true,
    title: "У тебя гибридная зона риска",
    summary:
      "Картина смешанная: часть твоей работы уже прекрасно дружит с ИИ, часть держится на человеческом контексте. Это не красная кнопка, а момент для тонкой перенастройки.",
    meaning:
      "Скорее всего, твоя роль не исчезнет целиком, но изменится ее состав. Рутинный, черновой, цифровой слой будет все сильнее ужиматься, а человеческая часть дорожать.",
    advice: [
      "Раздели свою работу на автоматизируемый слой и на слой, где нужен ты как человек.",
      "Определи, за что тебе реально платят: за производство или за суждение.",
      "Четко сформулируй, в чем твоя незаменимая сила, и начни опираться на нее как на главный актив.",
    ],
  },
];

let currentIndex = 0;
let answers = [];

function clampPercent(value, maxRaw) {
  return Math.round((value / maxRaw) * 100);
}

function renderQuestion() {
  const question = QUESTIONS[currentIndex];
  questionPrompt.textContent = question.prompt;
  progressLabel.textContent = `Вопрос ${currentIndex + 1} из ${QUESTIONS.length}`;
  progressFill.style.width = `${((currentIndex + 1) / QUESTIONS.length) * 100}%`;
  answersNode.innerHTML = "";

  question.answers.forEach(([label, score], answerIndex) => {
    const button = document.createElement("button");
    button.type = "button";
    button.innerHTML = `
      <span class="answer-title">${String.fromCharCode(65 + answerIndex)}. ${label}</span>
      <span class="answer-text">${describeAnswer(score)}</span>
    `;
    button.addEventListener("click", () => handleAnswer(score));
    answersNode.appendChild(button);
  });

  backButton.disabled = currentIndex === 0;
}

function describeAnswer(score) {
  if (score.automation >= 3) {
    return "Такой вариант повышает шанс, что эту часть работы начнут сильнее автоматизировать.";
  }
  if (score.human >= 3) {
    return "Здесь пока заметно важнее живой человек, контекст и личное участие.";
  }
  if (score.augmentation >= 3) {
    return "Это больше похоже на зону, где ИИ будет помогать и ускорять, а не просто заменять.";
  }
  return "Здесь нет явного перекоса: все зависит от того, как именно устроена твоя работа.";
}

function handleAnswer(score) {
  answers[currentIndex] = score;

  if (currentIndex < QUESTIONS.length - 1) {
    currentIndex += 1;
    renderQuestion();
    return;
  }

  showResults();
}

function computeScores() {
  const raw = answers.reduce(
    (accumulator, answer) => ({
      automation: accumulator.automation + answer.automation,
      augmentation: accumulator.augmentation + answer.augmentation,
      human: accumulator.human + answer.human,
    }),
    { automation: 0, augmentation: 0, human: 0 },
  );

  return {
    automation: clampPercent(raw.automation, QUESTIONS.length * 3),
    augmentation: clampPercent(raw.augmentation, QUESTIONS.length * 4),
    human: clampPercent(raw.human, QUESTIONS.length * 4),
  };
}

function showResults() {
  const scores = computeScores();
  const result = RESULTS.find((entry) => entry.when(scores));

  resultTitle.textContent = result.title;
  resultSummary.textContent = result.summary;
  resultMeaning.textContent = result.meaning;
  automationScoreNode.textContent = `${scores.automation}%`;
  augmentationScoreNode.textContent = `${scores.augmentation}%`;
  humanEdgeScoreNode.textContent = `${scores.human}%`;

  resultAdvice.innerHTML = "";
  result.advice.forEach((line) => {
    const item = document.createElement("li");
    item.textContent = line;
    resultAdvice.appendChild(item);
  });

  resultCard.classList.remove("hidden");
  resultCard.scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetQuiz() {
  currentIndex = 0;
  answers = [];
  resultCard.classList.add("hidden");
  renderQuestion();
}

startButton.addEventListener("click", () => {
  document.querySelector(".quiz").scrollIntoView({ behavior: "smooth", block: "start" });
});

backButton.addEventListener("click", () => {
  if (currentIndex === 0) {
    return;
  }

  currentIndex -= 1;
  renderQuestion();
});

restartButton.addEventListener("click", resetQuiz);
replayButton.addEventListener("click", resetQuiz);

resetQuiz();
