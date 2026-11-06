const DB_NAME = 'SystemMetric';
const STORE_NAME = 'userHistory';

const dbProvider = {
  open() {
    return new Promise((resolve,
      reject) => {
      const request = indexedDB
        .open(DB_NAME, 1);
      request.onupgradeneeded = (
        e) => {
        const db = e.target
          .result;
        if (!db.objectStoreNames
          .contains(STORE_NAME)
        ) {
          db.createObjectStore(
            STORE_NAME, { keyPath: 'id' }
          );
        }
      };
      request.onsuccess = () =>
        resolve(request.result);
      request.onerror = () =>
        reject(request.error);
    });
  },
  
  async getAll() {
    const db = await this.open();
    return new Promise((
      resolve) => {
      const transaction = db
        .transaction(STORE_NAME,
          'readonly');
      const store = transaction
        .objectStore(
          STORE_NAME);
      const request = store
        .getAll();
      request.onsuccess = () =>
        resolve(request
          .result || []);
    });
  },
  
  async save(data) {
    const db = await this.open();
    return new Promise((
      resolve) => {
      const transaction = db
        .transaction(STORE_NAME,
          'readwrite');
      const store = transaction
        .objectStore(
          STORE_NAME);
      store.put(data);
      transaction.oncomplete =
        () => resolve();
    });
  }
};


Chart.register(ChartDataLabels);

const weekDays = ['Sunday',
  'Monday', 'Tuesday',
  'Wednesday', 'Thursday',
  'Friday', 'Saturday'
];
const today = new Date();
const todayStr = weekDays[today
  .getDay()];
const todayDateKey = today
  .toISOString().split('T')[
    0];

let chartsLoaded = false;

window.addEventListener('load',
  () => {
    const loader =
      document
      .getElementById(
        'systemLoader'
      );
    const body =
      document.body;
    
    setTimeout(() => {
      loader
        .classList
        .add(
          'loader-hidden'
        );
      body.classList
        .add(
          'content-ready'
        );
      setTimeout
        (() => {
            chartsLoaded
              =
              true;
            updateCharts
              ();
            loader
              .remove();
          },
          700
        );
    }, 1500);
  });

// Data Load
let habits = JSON.parse(
  localStorage.getItem(
    'metrics_v3_habits')
) || [];
let completionLog = JSON.parse(
  localStorage.getItem(
    'metrics_v3_log')
) || {};
let lastVisitDate = localStorage
  .getItem(
    'metrics_v3_last_date');
let lastReportDate =
  localStorage.getItem(
    'metrics_v3_last_report'
  );

// Daily Reset
if (lastVisitDate !==
  todayDateKey) {
  if (!completionLog[
      todayStr])
    completionLog[
      todayStr] = [];
  localStorage.setItem(
    'metrics_v3_last_date',
    todayDateKey);
  save(false);
}

document.getElementById(
    'currentDateDisplay')
  .innerText = today
  .toLocaleDateString(
    'en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric'
    });

let lineChart, barChart;

function addHabit() {
  const input = document.getElementById(
    'habitInput');
  const text = input.value.trim();
  
  if (!text) return;
  habits.push({
    id: 'h-' + Date.now(),
    text: text
  });
  input.value = "";
  save();
  render();
  updateMood()
}



let moodStages = [
  "1.png",
  "2.png",
  "3.png",
  "4.png",
  "5.png",
  "6.png"
];
const LOCK_IMAGE =
  "lock.png";
const MIN_HABITS_REQUIRED = 6;



function updateMood() {
  const moodImg = document
    .getElementById('mood');
  const container = document
    .getElementById('moodContainer');
  if (!moodImg || !container) return;
  
  let targetSrc;
  if (habits.length <
    MIN_HABITS_REQUIRED) {
    targetSrc = LOCK_IMAGE;
  } else {
    const completedCount =
      completionLog[todayStr]?.length ||
      0;
    const total = habits.length;
    const percentage = (completedCount /
      total) * 100;
    
    if (percentage <= 17) targetSrc =
      moodStages[0];
    else if (percentage <= 34)
      targetSrc = moodStages[1];
    else if (percentage <= 51)
      targetSrc = moodStages[2];
    else if (percentage <= 68)
      targetSrc = moodStages[3];
    else if (percentage <= 85)
      targetSrc = moodStages[4];
    else targetSrc = moodStages[5];
  }
  
  if (moodImg.getAttribute('src') !== targetSrc) {
        // If you have a transition function, use it:
        if (typeof transitionMoodImage === 'function') {
            transitionMoodImage(moodImg, targetSrc);
        } else {
            moodImg.src = targetSrc;
        }
    }
}


const moodObserver =
  new IntersectionObserver((
    entries) => {
    entries.forEach(entry => {
      const moodImg = document
        .getElementById('mood');
      if (entry.isIntersecting &&
        habits.length >=
        MIN_HABITS_REQUIRED) {
        moodImg.classList.remove(
          'animate-mood-entry');
        void moodImg
          .offsetWidth;
        moodImg.classList.add(
          'animate-mood-entry');
      }
    });
  }, { threshold: 0.1 });
document.addEventListener(
  'DOMContentLoaded', () => {
    const container = document
      .getElementById(
        'moodContainer');
    if (container) moodObserver
      .observe(container);
  });

function transitionMoodImage(imgElement,
  newSrc) {
  if (newSrc === LOCK_IMAGE) {
    imgElement.classList.remove(
      'animate-mood-entry',
      'animate-mood-exit');
    imgElement.src = newSrc;
    imgElement.classList.add(
      'opacity-40', 'grayscale');
    return;
  }
  
  if (imgElement.src.includes(
      LOCK_IMAGE)) {
    imgElement.classList.remove(
      'opacity-40', 'grayscale');
    imgElement.src = newSrc;
    void imgElement
      .offsetWidth;
    imgElement.classList.add(
      'animate-mood-entry');
    return;
  }
  
  imgElement.classList.remove(
    'animate-mood-entry');
  imgElement.classList.add(
    'animate-mood-exit');
  
  imgElement.onanimationend = (
    event) => {
    if (event.animationName ===
      'mood-exit') {
      imgElement.src = newSrc;
      
      imgElement.classList.remove(
        'animate-mood-exit');
      void imgElement.offsetWidth;
      imgElement.classList.add(
        'animate-mood-entry');
      
      imgElement.onanimationend =
        null;
    }
  };
}

function handleMoodClick() {
  if (habits.length <
    MIN_HABITS_REQUIRED) {
    showBubble("Unlock with 6+ tasks!");
    const moodImg = document
      .getElementById('mood');
    moodImg.classList.add(
      'animate-pulse');
    setTimeout(() => moodImg.classList
      .remove('animate-pulse'), 400);
  }
}

let bubbleQueue = [];
let isBubbleActive = false;

function showBubble(text) {
  if (!text) return;
  bubbleQueue.push(text);
  if (!isBubbleActive) {
    processQueue();
  }
}

function processQueue() {
  if (bubbleQueue.length === 0) {
    isBubbleActive = false;
    return;
  }
  
  isBubbleActive = true;
  const currentText = bubbleQueue
    .shift();
  renderBubble(currentText);
}

function renderBubble(text) {
  const container = document
    .getElementById('moodContainer');
  if (!container) {
    isBubbleActive = false;
    return;
  }
  const oldBubble = document
    .getElementById('mood-bubble');
  if (oldBubble) oldBubble.remove();
  
  const bubble = document.createElement(
    'div');
  bubble.id = 'mood-bubble';
  bubble.className =
    "absolute top-full left-1/8 -translate-x-1/2 mt-3 bg-indigo-600 text-white text-[10px] font-black py-1.5 px-3 rounded-lg shadow-2xl z-[100] whitespace-normal text-center break-words w-[150px] min-w-[150px] max-w-[200px] pointer-events-none transition-all duration-300 transform scale-50 opacity-0";
  
  bubble.innerHTML = `
        ${text}
        <div class="absolute -top-1 right-1/4 -translate-x-1/2 w-2 h-2 bg-indigo-600 rotate-45"></div>
    `;
  
  container.appendChild(bubble);
  
  requestAnimationFrame(() => {
    bubble.classList.remove(
      'scale-50', 'opacity-0');
    bubble.classList.add(
      'scale-100', 'opacity-100',
      '-translate-y-1');
  });
  
  const displayTime = Math.max(2500,
    text.length * 50);
  
  setTimeout(() => {
    bubble.classList.remove(
      'scale-100', 'opacity-100',
      '-translate-y-1');
    bubble.classList.add('scale-50',
      'opacity-0');
    
    setTimeout(() => {
      bubble.remove();
      setTimeout(processQueue,
        400);
    }, 1000);
  }, displayTime);
}

let greetingTimer = null;
const userGreetings = {
  locked: [
    "It's a bit lonely here... maybe add more habits?",
    "I'm shy! I'll come out once you have a full list.",
    "Give me some goals to track and I'll show you my best side."
  ],
  zeroProgress: [
    "The hardest part is just clicking the first one.",
    "Staring contest? Or are we doing this? 👀",
    "Your future self is waiting for you to start.",
    "Fresh day, clean slate. What's the move?"
  ],
  starting: [
    "Hey, look at you go!",
    "One down, the rest will follow.",
    "Momentum is a beautiful thing, isn't it?",
    "You're officially off the couch!"
  ],
  midWay: [
    "You're in the zone! Don't let me distract you.",
    "Halfway to a perfect day. Keep that energy!",
    "I'm liking this pace. Very professional.",
    "Steady does it. You've got this handled."
  ],
  lateNight: [
    "Working late? Don't forget to hydrate. 💧",
    "Burning the midnight oil, I see.",
    "Almost time to call it a day? Finish strong!"
  ],
  achiever: [
    "Stop! You're making it look too easy.",
    "Is there anything you can't do? 🏆",
    "Efficiency score: Off the charts.",
    "I think we've earned a victory lap."
  ]
};

function startUserInteraction() {
  const message = getNicerMessage();
  
  if (message) {
    showBubble(message);
  }
  const randomDelay = Math.floor(Math
    .random() * (30000 - 20000) +
    20000);
  clearTimeout(greetingTimer);
  greetingTimer = setTimeout(() => {
    startUserInteraction();
  }, randomDelay);
}

function getNicerMessage() {
  const currentDay = typeof todayStr !==
    'undefined' ? todayStr : new Date()
    .toLocaleDateString();
  const hour = new Date().getHours();
  const completedCount = (completionLog[
    currentDay] || []).length;
  const total = habits.length;
  const percentage = total > 0 ? (
    completedCount / total) * 100 : 0;
  
  let pool = [];
  if (total < 6) {
    pool = userGreetings.locked;
  }
  else if (hour > 22) {
    pool = userGreetings.lateNight;
  }
  else if (hour < 10 &&
    completedCount === 0) {
    return "Good morning! Coffee first, or tasks first? ☕️";
  }
  else if (completedCount === 0) {
    pool = userGreetings.zeroProgress;
  } else if (percentage === 100) {
    pool = userGreetings.achiever;
  } else if (percentage > 50) {
    pool = userGreetings.midWay;
  } else {
    pool = userGreetings.starting;
  }
  
  return pool[Math.floor(Math.random() *
    pool.length)];
}

function checkInteractionStatus() {
  const isEligible = habits.length >=
    MIN_HABITS_REQUIRED;
  
  if (isEligible) {
    if (!greetingTimer) {
      startUserInteraction();
    }
  } else {
    if (!greetingTimer) {
      const initialDelay = Math.floor(
        Math.random() * (7000 -
          5000) + 5000);
      
      console.log(
        `🚀 SystemMetric initialized.`
      );
      greetingTimer = setTimeout(() => {
        startUserInteraction();
      }, initialDelay);
    }
  }
  
}

checkInteractionStatus();

function toggleHabit(id) {
  const currentDay = typeof todayStr !==
    'undefined' ? todayStr : new Date()
    .toLocaleDateString(
      'en-US', { weekday: 'long' });
  
  if (!completionLog[currentDay])
    completionLog[currentDay] = [];
  
  const idx = completionLog[currentDay]
    .indexOf(id);
  idx > -1 ? completionLog[currentDay]
    .splice(idx, 1) : completionLog[
      currentDay].push(id);
  
  save();
  render();
  
  const completedCount = completionLog[
    currentDay].length;
  
  if (completedCount === 1) showBubble(
    "First one down! Nice!");
  else if (completedCount === habits
    .length && habits.length > 0)
    showBubble("You did it! 100%!");
  
  updateMood();
  
  const moodImg = document
    .getElementById('mood');
  if (moodImg) {
    moodImg.classList.add(
      'animate-pulse');
    setTimeout(() => moodImg.classList
      .remove('animate-pulse'), 400);
  }
}

function render(selectedDay =
  todayStr, isReadOnly = false
) {
  const list = document
    .getElementById(
      'habitList');
  const title = document
    .getElementById(
      'registryTitle');
  const progressText =
    document.getElementById(
      'progressPercent');
  
  title.innerText =
    isReadOnly ?
    `Archive: ${selectedDay}` :
    `Registry: Today`;
  const total = habits.length;
  const doneCount =
    completionLog[
      selectedDay]
    ?.length || 0;
  const percent = total > 0 ?
    Math.round((doneCount /
      total) * 100) : 0;
  progressText.innerText =
    `${percent}%`;
  
  if (habits.length === 0) {
    list.innerHTML =
      `<div class="p-10 border-[3px] border-dashed border-slate-500/10 rounded-3xl text-center opacity-100 text-xs italic">No metrics defined. Add one above to start.</div>`;
  } else {
    list.innerHTML = habits
      .map(h => {
        const
          isDone =
          completionLog[
            selectedDay
          ]
          ?.includes(
            h.id
          );
        return `
<div class="habit-wrapper" 
     ontouchstart="handleTouchStart(event)" 
     ontouchmove="handleTouchMove(event, '${h.id}')"
     ontouchend="handleTouchEnd(event, '${h.id}')">
    
    <div class="swipe-action action-edit">Edit</div>
    <div class="swipe-action action-delete">Delete</div>

    <div id="card-${h.id}" class="habit-content habit-item flex items-center justify-between p-4 glass-card rounded-2xl ${isDone ? 'completed' : ''}">
        <div class="flex items-center gap-4">
            <button ${isReadOnly ? 'disabled' : `onclick="toggleHabit('${h.id}')"`} 
                class="w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${isDone ? 'bg-indigo-500 border-indigo-500 scale-110' : 'border-slate-500/30'}">
                ${isDone ? '<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>' : ''}
            </button>
            <div>
                <p class="text-sm font-semibold tracking-tight ${isDone ? 'opacity-30 line-through' : ''}">${h.text}</p>
                <p class="text-[9px] font-bold uppercase tracking-tighter ${isDone ? 'text-indigo-500' : 'opacity-20'}">${isDone ? 'Metric Captured' : 'Pending'}</p>
            </div>
        </div>
    </div>
</div>`;
      }).join('') + (
        isReadOnly ?
        `<button onclick="render()" class="w-full py-3 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500 hover:bg-indigo-500/5 rounded-xl transition-all mt-2">← Return to Today</button>` :
        '');
  }
  updateCharts();
}

let startX = 0;
let startY = 0;
let isDragging = false;
let isScrolling = false;
let directionCaptured =
  false;

function handleTouchStart(e) {
  startX = e.touches[0]
    .clientX;
  startY = e.touches[0]
    .clientY;
  isDragging = true;
  isScrolling = false;
  directionCaptured =
    false;
  
  const card = e.currentTarget
    .querySelector(
      '.habit-content');
  card.style.transition =
    'none';
}

function handleTouchMove(e,
  id) {
  if (!isDragging ||
    isScrolling) return;
  
  const currentX = e.touches[
    0].clientX;
  const currentY = e.touches[
    0].clientY;
  
  const diffX = currentX -
    startX;
  const diffY = currentY -
    startY;
  if (!directionCaptured) {
    if (Math.abs(diffX) >
      10) {
      directionCaptured =
        true;
      isScrolling = false;
      isDragging = true;
    } else if (Math.abs(
        diffY) > 10) {
      directionCaptured =
        true;
      isScrolling = true;
      isDragging = false;
      return;
    } else {
      return;
    }
  }
  
  const card = document
    .getElementById(
      `card-${id}`);
  const wrapper = card
    .parentElement;
  const translateX = Math.max(
    Math.min(diffX,
      120), -120);
  
  const editLabel = wrapper
    .querySelector(
      '.action-edit');
  const deleteLabel = wrapper
    .querySelector(
      '.action-delete');
  
  if (translateX > 20) {
    editLabel.style
      .opacity = '1';
    deleteLabel.style
      .opacity = '0';
  } else if (translateX < -
    20) {
    deleteLabel.style
      .opacity = '1';
    editLabel.style
      .opacity = '0';
  }
  
  card.style.transform =
    `translateX(${translateX}px)`;
  
  if (isDragging) {
    e.preventDefault();
  }
}

function handleTouchEnd(e, id) {
  isDragging = false;
  const card = document
    .getElementById(
      `card-${id}`);
  const wrapper = card
    .parentElement;
  
  if (isScrolling) {
    resetCard(card,
      wrapper);
    return;
  }
  
  card.style.transition =
    'all 0.2s ease';
  
  const style = window
    .getComputedStyle(card);
  const matrix =
    new WebKitCSSMatrix(
      style.transform);
  const diff = matrix.m41;
  
  if (diff > 80) {
    card.style.transform =
      'translateX(100px)';
    setTimeout(() =>
      openEditModal(
        id), 200);
  } else if (diff < -80) {
    card.style.transform =
      'translateX(-100px)';
    setTimeout(() =>
      openDeleteModal(
        id), 200);
  } else {
    resetCard(card,
      wrapper);
  }
  resetCard(card, wrapper)
  directionCaptured = false;
  
}


function resetCard(card,
  wrapper) {
  card.style.transform =
    'translateX(0)';
  if (wrapper.querySelector(
      '.action-edit')) {
    wrapper.querySelector(
        '.action-edit')
      .style.opacity =
      '0';
    wrapper.querySelector(
        '.action-delete'
      ).style
      .opacity = '0';
  }
}

// Edit Feature
function openEditModal(id) {
  const habit = habits.find(
    h => h.id === id);
  const modal = document
    .getElementById(
      'confirmModal');
  const modalContent =
    document.getElementById(
      'modalContent');
  modalContent.className =
    "glass-card max-w-[340px] w-full p-6 rounded-2xl text-left border-white/10 shadow-2xl";
  
  modalContent.innerHTML = `
        <h4 class="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500 mb-1">Protocol Modification</h4>
        <p class="text-[10px] opacity-40 uppercase tracking-widest">Adjusting Metric ID: ${id.split('-')[1].substring(0,4)}</p>
        
        <input id="editInput" type="text" value="${habit.text}" 
            class="edit-input-field font-medium tracking-tight">
        
        <div class="flex gap-3">
            <button onclick="closeModal()" class="flex-1 py-2 rounded-xl bg-slate-500/10 text-[9px] font-black uppercase tracking-widest">Cancel</button>
            <button onclick="saveEdit('${id}')" class="flex-1 py-4 rounded-xl bg-indigo-600 text-white text-[9px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20">Sync Change</button>
        </div>
    `;
  modal.classList.remove(
    'hidden');
  document.getElementById(
    'editInput').focus();
}

function saveEdit(id) {
  const val = document
    .getElementById(
      'editInput').value
    .trim();
  if (val) {
    const idx = habits
      .findIndex(h => h
        .id === id);
    habits[idx].text = val;
    save();
    closeModal();
  }
}


function checkWeeklyReset() {
  const now = new Date();
  const currentSunday =
    new Date(now);
  currentSunday.setDate(now
    .getDate() - now
    .getDay());
  currentSunday.setHours(0, 0,
    0, 0);
  
  const currentWeekId =
    currentSunday
    .toLocaleDateString(
      'en-CA'
    );
  if (lastReportDate ===
    currentWeekId) {
    return;
    
  }
  
  
  const totalCompleted =
    weekDays.reduce((sum,
      day) => {
      return sum + (
        completionLog[
          day]
        ?.length ||
        0);
    }, 0);
  
  if (totalCompleted > 0) {
    
    showWeeklyReport(
      currentWeekId);
  } else {
    
    localStorage.setItem(
      'metrics_v3_last_report',
      currentWeekId);
    lastReportDate =
      currentWeekId;
  }
}

function showWeeklyReport(
  sundayDateStr) {
  localStorage.setItem(
    'metrics_v3_last_report',
    sundayDateStr);
  lastReportDate =
    sundayDateStr;
  
  const dailyStats = weekDays
    .map(day => (
      completionLog[
        day]
      ?.length || 0));
  const totalCompleted =
    dailyStats.reduce((a,
      b) => a + b, 0);
  if (totalCompleted === 0 &&
    habits.length === 0)
    return;
  
  const totalPossible = habits
    .length * 7;
  const score =
    totalPossible > 0 ? Math
    .round((totalCompleted /
        totalPossible) *
      100) : 0;
  const avgPerDay = (
      totalCompleted / 7)
    .toFixed(1);
  
  // Status Logic
  let [status, statusColor] =
  score >= 85 ? ["OPTIMAL",
      "text-emerald-400"
    ] :
    score >= 50 ? ["STABLE",
      "text-indigo-400"
    ] : ["CRITICAL",
      "text-red-400"
    ];
  
  const modal = document
    .getElementById(
      'confirmModal');
  const modalContent =
    document.getElementById(
      'modalContent');
  modalContent.className =
    "glass-card w-[92vw] md:w-[420px] rounded-2xl border-white/10 shadow-2xl relative text-left overflow-hidden";
  
  modalContent.innerHTML = `
        <div class="p-4 border-b border-white/5 flex justify-between items-center bg-white/5">
            <div>
                <h4 class="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500">Weekly Audit</h4>
                <p class="text-[7px] font-mono opacity-30">REF_ID: ${Math.random().toString(36).substr(2, 6).toUpperCase()}</p>
            </div>
            <div class="px-2 py-1 rounded bg-black/40 border border-white/5">
                <span class="text-[9px] font-black tracking-widest ${statusColor}">${status}</span>
            </div>
        </div>

        <div class="p-5 space-y-6">
            <div class="grid grid-cols-3 gap-3">
                ${renderStatCard(score + '%', 'Efficiency')}
                ${renderStatCard(totalCompleted, 'Units')}
                ${renderStatCard(avgPerDay, 'Avg/Day')}
            </div>

            <div class="space-y-4">
                <div class="bg-black/20 rounded-xl p-3 border border-white/5">
                    <p class="text-[7px] font-black uppercase opacity-20 mb-3 tracking-widest">Consistency Vector</p>
                    <div class="h-32 w-full"><canvas id="modalLineChart"></canvas></div>
                </div>
                <div class="bg-black/20 rounded-xl p-3 border border-white/5">
                    <p class="text-[7px] font-black uppercase opacity-20 mb-3 tracking-widest">Volume Distribution</p>
                    <div class="h-24 w-full"><canvas id="modalBarChart"></canvas></div>
                </div>
            </div>

            <button onclick="confirmWeeklyReset('${sundayDateStr}', ${score})" 
                class="w-full py-4 rounded-xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-[0.2em] hover:bg-indigo-500 transition-all active:scale-[0.98] shadow-lg shadow-indigo-500/20">
                Reset
            </button>
        </div>
    `;
  
  modal.classList.remove(
    'hidden');
  setTimeout(() =>
    generateDetailedModalCharts(
      dailyStats), 150
  );
}

function renderStatCard(val,
  label) {
  return `
        <div class="bg-white/5 py-3 rounded-xl border border-white/5 text-center">
            <div class="text-xl font-light tracking-tighter text-white">${val}</div>
            <p class="text-[7px] font-bold uppercase opacity-30 tracking-tighter">${label}</p>
        </div>
    `;
}


function generateDetailedModalCharts(
  data, habitsAtTime = 1) {
  const accent = '#6366f1';
  const totalPossible = habitsAtTime ||
    1;
  
  const maxValue = Math.max(...data);
  const dynamicMax = Math.max(5,
    maxValue + 1);
  
  const chartConfig = (type, ctxId,
    color, fill = false) => {
    const ctx = document
      .getElementById(ctxId)
      .getContext('2d');
    const datasetConfig = {
      data: data,
      borderWidth: 2,
      borderRadius: 5,
      barThickness: 20,
      fill: fill
    };
    if (type === 'bar') {
      datasetConfig.backgroundColor =
        (context) => {
          const val = context.raw;
          const totalPossible =
            habitsAtTime || 1;
          const ratio = Math.min(val /
            totalPossible, 1
          );
          const hue = ratio * 120;
          return `hsl(${hue}, 70%, 60%)`;
        };
      datasetConfig.borderColor =
        'transparent';
    }
    else {
      datasetConfig.borderColor =
        color;
      datasetConfig
        .pointBackgroundColor = color;
      datasetConfig.backgroundColor =
        fill ? createGradient(ctx) :
        color;
    }
    
    return new Chart(ctx, {
      type: type,
      data: {
        labels: weekDays.map(d =>
          d.substring(0, 3)),
        datasets: [datasetConfig]
      },
      options: {
        plugins: {
          legend: { display: false },
          datalabels: { display: false },
          tooltip: { enabled: true }
          
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: 'rgba(255,255,255,0.5)',
              font: {
                size: 10,
                weight: 'bold'
              }
            }
          },
          y: {
            display: false,
            beginAtZero: true,
            max: dynamicMax
          }
        },
        maintainAspectRatio: false,
        responsive: true
      }
    });
  };
  
  function createGradient(ctx) {
    const grad = ctx
      .createLinearGradient(0, 0, 0,
        150);
    grad.addColorStop(0,
      'rgba(99, 102, 241, 0.3)');
    grad.addColorStop(1,
      'rgba(99, 102, 241, 0)');
    return grad;
  }
  
  chartConfig('line', 'modalLineChart',
    accent, true);
  chartConfig('bar', 'modalBarChart',
    '#10b981');
}

function save(shouldRender = true) {
  try {
    localStorage.setItem(
      'metrics_v3_habits', JSON
      .stringify(habits));
    localStorage.setItem(
      'metrics_v3_log', JSON
      .stringify(completionLog));
    localStorage.setItem(
      'metrics_v3_last_date',
      new Date().toISOString().split(
        'T')[0]);
    if (shouldRender) render();
  } catch (e) {
    console.error(
      "Storage quota exceeded", e);
  }
}

async function confirmWeeklyReset(
  sundayDateStr, currentScore = 0) {
  const currentStats = weekDays.map(
    day => completionLog[day]
    ?.length || 0);
  const dateObj = new Date(
    sundayDateStr);
  dateObj.setDate(dateObj.getDate() -
    7);
  const historicalDate = dateObj
    .toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  
  const weeklySnapshot = {
    date: historicalDate,
    score: currentScore,
    stats: currentStats,
    habitsAtTime: habits.length,
    id: 'REF-' + Date.now()
  };
  completionLog = {};
  weekDays.forEach(day =>
    completionLog[day] = []);
  await dbProvider.save(
    weeklySnapshot);
  save(false);
  await renderEfficiencyCubes();
  render();
  closeModal();
}



function openDeleteModal(id) {
  const modal = document
    .getElementById(
      'confirmModal');
  document.getElementById(
      'modalContent')
    .innerHTML = `
                <h3 class="font-bold mb-4">Remove this metric?</h3>
                <div class="flex gap-3">
                    <button onclick="closeModal()" class="flex-1 py-2 rounded-lg bg-slate-500/10 text-xs font-bold uppercase">Cancel</button>
                    <button id="confirmDeleteBtn" class="flex-1 py-2 rounded-lg bg-red-600 text-white text-xs font-bold uppercase">Delete</button>
                </div>
            `;
  document.getElementById(
      'confirmDeleteBtn').onclick =
    () => {
      habits = habits.filter(h => h
        .id !== id);
      weekDays.forEach(d => {
        if (completionLog[d]) {
          completionLog[d] =
            completionLog[d].filter(
              cid => cid !== id);
        }
      });
      save();
      render();
      updateMood();
      closeModal();
    };
  
  modal.classList.remove(
    'hidden');
}

function closeModal() {
  document
    .getElementById(
      'confirmModal')
    .classList.add(
      'hidden');
  
  
}

function updateCharts() {
  const isDark = document.body
    .classList.contains(
      'dark-theme');
  const labelColor = isDark ?
    '#475569' : '#94A3B8';
  const gridColor = isDark ?
    'rgba(255,255,255,0.02)' :
    'rgba(0,0,0,0.02)';
  
  const lineData = weekDays
    .map((d, i) => (i >
      today.getDay() ?
      null : (
        completionLog[
          d]
        ?.length ||
        0)));
  const barData = weekDays
    .map(d => (
      completionLog[d]
      ?.length || 0));
  const maxValue = Math.max(
    ...barData, 0);
  const dynamicMax = Math.max(
    5, maxValue + 1);
  const chartOptions = {
    animation: {
      duration: chartsLoaded ?
        1000 : 0
    },
    onClick: (e,
      el) => {
      if (el
        .length >
        0)
        render(
          weekDays[
            el[
              0
            ]
            .index
          ],
          weekDays[
            el[
              0
            ]
            .index
          ] !==
          todayStr
        );
    },
    plugins: {
      legend: { display: false },
      datalabels: {
        color: isDark ?
          '#FFF' : '#000',
        anchor: 'end',
        align: 'top',
        font: {
          weight: 'bold',
          size: 10
        },
        offset: 4
      }
    },
    scales: {
      y: {
        grid: { color: gridColor },
        ticks: {
          color: labelColor,
          font: { size: 9 },
          stepSize: 1
        },
        beginAtZero: true,
        max: dynamicMax,
        suggestedMax: 5,
        border: { display: false }
      },
      x: {
        offset: true,
        grid: { display: false },
        ticks: {
          color: labelColor,
          font: { size: 9 }
        },
        border: { display: false }
      }
    },
    maintainAspectRatio: false,
    responsive: true
  };
  
  const ctxL = document
    .getElementById(
      'lineChart')
    .getContext('2d');
  if (lineChart) lineChart
    .destroy();
  lineChart = new Chart(
    ctxL, {
      type: 'line',
      data: {
        labels: weekDays
          .map(
            d =>
            d
            .substring(
              0,
              3
            )
          ),
        datasets: [{
          data: lineData,
          pointBackgroundColor: '#6366f1',
          borderColor: '#6366f1',
          borderWidth: 3,
          tension: 0,
          fill: true,
          backgroundColor: 'rgba(99, 102, 241, 0.1)'
        }]
      },
      options: chartOptions
    });
  
  
  const ctxB = document
    .getElementById(
      'barChart')
    .getContext('2d');
  if (barChart) barChart
    .destroy();
  barChart = new Chart(ctxB, {
    type: 'bar',
    data: {
      labels: weekDays
        .map(
          d =>
          d
          .substring(
            0,
            3
          )
        ),
      datasets: [{
        data: barData,
        backgroundColor: '#10b981',
        borderRadius: 6,
        barThickness: 20
      }]
    },
    options: chartOptions
  });
}

async function renderEfficiencyCubes() {
  const weeklyHistory =
    await dbProvider.getAll();
  const grid = document
    .getElementById('efficiencyGrid');
  if (!grid) return;
  
  let totalCubes = 10 + Math.floor(
    weeklyHistory.length / 4) * 4;
  let html = '';
  
  for (let i = 0; i <
    totalCubes; i++) {
    if (i < weeklyHistory.length) {
      const entry = weeklyHistory[i];
      const scoreValue = entry
        .score || 0;
      const hue = Math.min(Math.max((
          scoreValue / 100) * 120,
        0), 120);
      const color =
        `hsl(${hue}, 75%, 45%)`;
      const shadow =
        `0 4px 12px hsla(${hue}, 75%, 45%, 0.25)`;
      
      html += `
        <div class="w-7 h-7 md:w-8 md:h-8 rounded-lg cursor-pointer shadow-sm transition-all duration-300 hover:scale-110 active:scale-95 hover:z-10 flex items-center justify-center border border-white/10" 
             style="background-color: ${color}; box-shadow: ${shadow};" 
             onclick="viewHistoricalReport('${entry.id}')"
             title="Week ${i + 1}: ${scoreValue}%">
             <span class="text-[10px] md:text-[8px] font-black text-white drop-shadow-md pointer-events-none">
                ${scoreValue}% 
             </span>
        </div>`;
    } else {
      html +=
        `<div class="w-7 h-7 md:w-8 md:h-8 rounded-md 
                bg-slate-500/[0.3] dark:bg-white/[0.2] 
                border border-slate-500/10 dark:border-white/[0.05]"></div>`;
    }
  }
  grid.innerHTML = html;
}



async function viewHistoricalReport(
  id) {
  const history = await dbProvider
    .getAll();
  const data = history.find(h => h
    .id === id);
  if (!data) {
    console.error(
      "Archive record not found");
    return;
  }
  if (typeof data === 'number') {
    alert(
      "Detailed data not available for legacy records."
    );
    return;
  }
  
  const totalCompleted = data.stats
    .reduce((a, b) => a + b, 0);
  const avgPerDay = (totalCompleted /
    7).toFixed(1);
  
  let [status, statusColor] = data
    .score >= 80 ? ["OPTIMAL",
      "text-emerald-400"
    ] :
    data.score >= 35 ? ["STABLE",
      "text-indigo-400"
    ] : ["CRITICAL", "text-red-400"];
  
  // 4. UI Rendering
  const modal = document
    .getElementById('confirmModal');
  const modalContent = document
    .getElementById('modalContent');
  const dateObj = new Date(data.date);
  const formattedDate = dateObj
    .toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  
  modalContent.className =
    "glass-card w-[92vw] md:w-[420px] rounded-2xl border-white/10 shadow-2xl relative text-left overflow-hidden";
  
  modalContent.innerHTML = `
        <div class="p-4 border-b border-white/5 flex justify-between items-center bg-white/5">
            <div>
                <h4 class="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500">Archive: ${formattedDate}</h4>
                <p class="text-[7px] font-mono opacity-30">ARCHIVE_ID: ${data.id}</p>
            </div>
            <div class="px-2 py-1 rounded bg-black/40 border border-white/5">
                <span class="text-[10px] align-middle font-black tracking-widest ${statusColor}">${status}</span>
            </div>
        </div>

        <div class="p-5 space-y-6">
            <div class="grid grid-cols-3 gap-3">
                ${renderStatCard(data.score + '%', 'Efficiency')}
                ${renderStatCard(totalCompleted, 'Units')}
                ${renderStatCard(avgPerDay, 'Avg/Day')}
            </div>

            <div class="space-y-4">
                <div class="bg-black/20 rounded-xl p-3 border border-white/5">
                    <p class="text-[7px] font-black uppercase opacity-20 mb-3 tracking-widest">Consistency Vector</p>
                    <div class="h-32 w-full"><canvas id="modalLineChart"></canvas></div>
                </div>
                <div class="bg-black/20 rounded-xl p-3 border border-white/5">
                    <p class="text-[7px] font-black uppercase opacity-20 mb-3 tracking-widest">Volume Distribution</p>
                    <div class="h-32 w-full"><canvas id="modalBarChart"></canvas></div>
                </div>
            </div>

            <button onclick="closeModal()" 
                class="w-full py-4 rounded-xl bg-slate-500/10 text-white text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-500/20 transition-all active:scale-[0.98]">
                Close Archive
            </button>
        </div>
    `;
  
  modal.classList.remove('hidden');
  setTimeout(() =>
    generateDetailedModalCharts(data
      .stats, data.habitsAtTime),
    150);
  
}

// --- VINYL MUSIC SYSTEM ENGINE ---

const DB_NAME_MUSIC = "musicDB";
const STORE_NAME_SONGS = "songs";
let db;

const initDB = () => {
  return new Promise((resolve) => {
    const request = indexedDB
      .open(DB_NAME_MUSIC, 1);
    request.onupgradeneeded = (
      e) => {
      db = e.target.result;
      db.createObjectStore(
        STORE_NAME_SONGS, {
          keyPath: "id",
          autoIncrement: true
        }
      );
    };
    request.onsuccess = (
      e) => {
      db = e.target
        .result;
      resolve();
    };
  });
};

const getAllSongs = () => {
  return new Promise((resolve) => {
    const transaction = db
      .transaction([
        STORE_NAME_SONGS
      ], "readonly");
    const request = transaction
      .objectStore(
        STORE_NAME_SONGS)
      .getAll();
    request.onsuccess = () =>
      resolve(request.result);
  });
};

const saveSong = async (name, blob) => {
  const transaction = db
    .transaction([STORE_NAME_SONGS],
      "readwrite");
  transaction.objectStore(
    STORE_NAME_SONGS).add({
    name,
    blob
  });
  return new Promise(r =>
    transaction.oncomplete = () =>
    r(true));
};

const deleteSong = (id) => {
  const transaction = db.transaction([
    STORE_NAME_SONGS
  ], "readwrite");
  transaction.objectStore(
    STORE_NAME_SONGS).delete(id);
  return new Promise(r => transaction
    .oncomplete = r);
};

(async function() {
  await initDB();
  
  const audio = document
    .getElementById(
      'vinyl-audio-player');
  const playBtn = document
    .getElementById(
      'vinyl-master-play');
  const svgPath = document
    .getElementById(
      'vinyl-svg-path');
  const disc = document
    .getElementById('vinyl-disc');
  const progress = document
    .getElementById(
      'vinyl-progress');
  const progContainer = document
    .getElementById(
      'progress-container');
  const songTitle = document
    .getElementById(
      'vinyl-song-title');
  const songTitleMirror = document
    .getElementById(
      'vinyl-song-title-mirror');
  const indexDisplay = document
    .getElementById(
      'vinyl-index-display');
  const drawer = document
    .getElementById('music-drawer');
  const fileInput = document
    .getElementById(
      'vinyl-file-input');
  const modal = document
    .getElementById(
      'confirm-modal');
  const scroller = document
    .getElementById(
      'title-scroller');
  
  let playlist = [];
  let currentIndex = -1;
  let repeatOne = false;
  let isSeeking = false;
  
  const shapes = {
    play: "M8 5v14l11-7z",
    pause: "M6 19h4V5H6v14zm8-14v14h4V5h-4z"
  };
  
  const updateUI = async () => {
    playlist =
      await getAllSongs();
    songTitle.classList.toggle(
      'cursor-locked',
      playlist.length >= 10);
    
    if (playlist.length > 0) {
      if (currentIndex === -1)
        currentIndex = 0;
      const name = playlist[
        currentIndex].name;
      songTitle.innerText =
        name;
      songTitleMirror
        .innerText = name;
      indexDisplay.innerText =
        `${currentIndex + 1} / ${playlist.length} Tracks`;
      scroller.style
        .animationPlayState =
        "running";
    } else {
      currentIndex = -1;
      songTitle.innerText =
        "Tap to Add Music";
      songTitleMirror
        .innerText =
        "Tap to Add Music";
      indexDisplay.innerText =
        "Library Empty";
      scroller.style.translate =
        '5.5%'
      audio.src = "";
      scroller.style
        .animationPlayState =
        "paused";
    }
  };
  
  const loadTrack = (index) => {
    if (!playlist[index]) return;
    currentIndex = index;
    if (audio.src) URL
      .revokeObjectURL(audio.src);
    audio.src = URL
      .createObjectURL(playlist[
        index].blob);
    updateUI();
    audio.play().catch(() => {});
  };
  
  const getPos = (e) => {
    const rect = progContainer
      .getBoundingClientRect();
    const clientX = e.touches ? e
      .touches[0].clientX : e
      .clientX;
    return Math.max(0, Math.min(1,
      (clientX - rect.left) /
      rect.width));
  };
  
  const startSeek = (e) => {
    isSeeking = true;
    progress.style.width = (
      getPos(e) * 100) + "%";
    const onMove = (
      me) => {
      progress.style
        .width = (getPos(me) *
          100) + "%";
    };
    const onEnd = (ue) => {
      isSeeking = false;
      const finalPct = ue
        .type === 'touchend' ?
        parseFloat(progress
          .style.width) / 100 :
        getPos(ue);
      if (audio.duration) audio
        .currentTime =
        finalPct * audio
        .duration;
      window
        .removeEventListener(
          'mousemove', onMove);
      window
        .removeEventListener(
          'mouseup', onEnd);
      window
        .removeEventListener(
          'touchmove', onMove);
      window
        .removeEventListener(
          'touchend', onEnd);
    };
    window.addEventListener(
      'mousemove', onMove);
    window.addEventListener(
      'mouseup', onEnd);
    window.addEventListener(
      'touchmove',
      onMove, { passive: false }
    );
    window.addEventListener(
      'touchend', onEnd);
  };
  
  progContainer.onmousedown =
    startSeek;
  progContainer.ontouchstart =
    startSeek;
  
  songTitle.onclick = () => {
    if (
      playlist.length < 10)
      fileInput.click();
  };
  
  playBtn.onclick = () => {
    if (!audio.src && playlist
      .length > 0)
      return loadTrack(0);
    if (!audio.src)
      return songTitle.click();
    audio.paused ? audio.play() :
      audio.pause();
  };
  
  document.getElementById(
      'btn-next').onclick =
    () => {
      if (playlist.length > 0)
        loadTrack((currentIndex +
          1) % playlist.length);
    };
  document.getElementById(
      'btn-prev').onclick =
    () => {
      if (playlist.length > 0)
        loadTrack((currentIndex -
            1 + playlist.length) %
          playlist.length);
    };
  document.getElementById(
      'btn-delete').onclick =
    () => {
      if (playlist[
          currentIndex]) modal.style
        .display = 'flex';
    };
  document.getElementById(
      'cancel-delete').onclick =
    () => modal.style.display =
    'none';
  document.getElementById(
      'confirm-delete').onclick =
    async () => {
      await deleteSong(playlist[
        currentIndex].id);
      modal.style.display =
        'none';
      currentIndex = -1;
      await updateUI();
      if (playlist.length > 0)
        loadTrack(0);
    };
  
  document.getElementById(
      'btn-repeat').onclick =
    function() {
      repeatOne = !repeatOne;
      this.classList.toggle(
        'active', repeatOne);
    };
  
  fileInput.onchange = async (
    e) => {
    const file = e.target.files[
      0];
    if (!file) return;
    const isMP3 = file.type ===
      "audio/mpeg" || file.name
      .toLowerCase().endsWith(
        '.mp3');
    if (!isMP3) {
      fileInput.value = "";
      return;
    }
    
    const name = file.name
      .split('.').slice(0, -1)
      .join('.');
    const currentSongs =
      await getAllSongs();
    const existingIndex =
      currentSongs.findIndex(
        s => s.name === name &&
        s.blob.size === file
        .size);
    
    if (existingIndex !== -1) {
      loadTrack(existingIndex);
      drawer.classList.add(
        'active');
    } else if (currentSongs
      .length < 10) {
      if (await saveSong(name,
          file)) {
        await updateUI();
        const freshList =
          await getAllSongs();
        loadTrack(freshList
          .length - 1);
        drawer.classList.add(
          'active');
      }
    }
    fileInput.value = "";
  };
  
  audio.onplay = () => {
    svgPath
      .setAttribute('d', shapes
        .pause);
    disc.style
      .animationPlayState =
      "running";
  };
  audio.onpause = () => {
    svgPath
      .setAttribute('d', shapes
        .play);
    disc.style
      .animationPlayState =
      "paused";
  };
  audio.ontimeupdate = () => {
    if (!
      isSeeking && audio.duration)
      progress.style.width = (
        audio.currentTime / audio
        .duration) * 100 + "%";
  };
  audio.onended = () => {
    if (
      repeatOne) audio.play();
    else document.getElementById(
      'btn-next').click();
  };
  
  updateUI();
  
  const handle = document
    .getElementById(
      'vinyl-drag-handle');
  let sY = 0,
    isDrag = false;
  handle.onpointerdown = (e) => {
    handle.setPointerCapture(e
      .pointerId);
    drawer.style.transition =
      'none';
    document.body.style.overflow =
      'hidden';
    document.body.style
      .touchAction = 'none';
    const startY = e.clientY;
    const onMove = (
      moveEvent) => {
      const deltaY = moveEvent
        .clientY - startY;
      if (deltaY > 0) {
        drawer.style.transform =
          `translateY(${deltaY}px)`;
      }
    };
    
    const onUp = (upEvent) => {
      const finalDeltaY =
        upEvent.clientY -
        startY;
      drawer.style.transition =
        'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
      document.body.style
        .overflow = '';
      document.body.style
        .touchAction = '';
      if (finalDeltaY > 80) {
        drawer.classList.remove(
          'active');
      }
      drawer.style.transform =
        '';
      window
        .removeEventListener(
          'pointermove', onMove
        );
      window
        .removeEventListener(
          'pointerup', onUp);
    };
    
    window.addEventListener(
      'pointermove', onMove);
    window.addEventListener(
      'pointerup', onUp);
  };
  
  window.addEventListener(
    'pointerup', (e) => {
      if (drawer.classList
        .contains('active') && !
        drawer.contains(e.target)
      ) {
        drawer.classList.remove(
          'active');
        drawer.style.transform =
          '';
      }
    });
  
  
  let pullStart = 0,
    flicks = 0,
    lastFlick = 0;
  window.addEventListener(
    'touchstart', (e) => {
      if ((
          window.innerHeight +
          window.scrollY) >=
        document.documentElement
        .scrollHeight - 50)
        pullStart = Date.now();
    });
  window.addEventListener(
    'touchend', () => {
      if (pullStart > 0) {
        const now = Date.now();
        if (flicks > 0 && (now -
            lastFlick) > 500)
          flicks = 0;
        if ((now - pullStart) <
          250) {
          flicks++;
          lastFlick = now;
          if (
            flicks === 3) {
            drawer
              .classList.add(
                'active');
            flicks = 0;
          }
        }
        pullStart = 0;
      }
    });
})();


//Timer.
(function() {
  const timerValInput = document
    .getElementById(
      'timer-val-input');
  const startBtn = document
    .getElementById(
      'timer-start-btn');
  const pauseBtn = document
    .getElementById(
      'timer-pause-btn');
  const resetBtn = document
    .getElementById(
      'timer-reset-btn');
  const timeDisplay = document
    .getElementById(
      'timer-time-display');
  const progressBar = document
    .getElementById(
      'timer-progress-bar');
  const statusLabel = document
    .getElementById(
      'timer-status-label');
  const setupUI = document
    .getElementById('timer-setup-ui');
  const runningUI = document
    .getElementById(
      'timer-running-ui');
  const doneOverlay = document
    .getElementById('done-overlay');
  
  let timer, timeLeft = 0,
    totalTime = 0,
    isPaused = false;
  const circ = 2 * Math.PI *
    46;
  window.addEventListener(
    'DOMContentLoaded', () => {
      if (typeof lucide !==
        'undefined') {
        lucide.createIcons();
      }
    });
  
  function updateTimerUI(time) {
    const h = Math.floor(time / 3600);
    const m = Math.floor((time %
      3600) / 60);
    const s = time % 60;
    
    if (h > 0) {
      timeDisplay.innerText =
        `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
      
      timeDisplay.style.fontSize = (
        h > 9) ? "1.75rem" : "2rem";
    } else {
      timeDisplay.innerText =
        `${m}:${s.toString().padStart(2, '0')}`;
      timeDisplay.style.fontSize =
        "2.5rem";
    }
    
    const offset = circ - (time /
      totalTime) * circ;
    progressBar.style
      .strokeDashoffset = offset;
    const percent = (time /
      totalTime) * 100;
    if (percent <= 10) {
      progressBar.style.stroke =
        "#f43f5e";
      statusLabel.innerText =
        "Almost there!";
      statusLabel.style.color =
        "#f43f5e";
    } else if (percent <= 40) {
      progressBar.style.stroke =
        "#f59e0b";
      statusLabel.innerText =
        "Keep going...";
      statusLabel.style.color =
        "#f59e0b";
    } else {
      progressBar.style.stroke =
        "#6366f1";
      statusLabel.innerText =
        "Stay Focused";
      statusLabel.style.color =
        "#818cf8";
    }
  }
  
  startBtn.onclick = () => {
    const hInput = document
      .getElementById('input-hrs');
    const mInput = document
      .getElementById('input-mins');
    const sInput = document
      .getElementById('input-secs');
    
    const h = parseInt(hInput
      .value) || 0;
    const m = parseInt(mInput
      .value) || 0;
    const s = parseInt(sInput
      .value) || 0;
    
    let hasError = false;
    
    const markInvalid = (el) => {
      el.classList.add(
        'border-red-500/50',
        'bg-red-500/5');
      hasError = true;
      setTimeout(() => {
        el.classList.remove(
          'border-red-500/50',
          'bg-red-500/5');
      }, 800);
    };
    const totalSeconds = (h *
      3600) + (m * 60) + s;
    if (h < 0 || h > 72)
      markInvalid(hInput);
    if (m < 0 || m > 59)
      markInvalid(mInput);
    if (totalSeconds < 5 || s > 59)
      markInvalid(sInput);
    
    if (hasError) return;
    totalTime = timeLeft =
      totalSeconds;
    isPaused = false;
    
    updateTimerUI(timeLeft);
    setupUI.classList.add('hidden');
    runningUI.classList.remove(
      'hidden');
    
    clearInterval(timer);
    timer = setInterval(() => {
      if (!isPaused) {
        timeLeft--;
        updateTimerUI(timeLeft);
        if (timeLeft <= 0) {
          clearInterval(timer);
          showCompletion();
        }
      }
    }, 1000);
  };
  
  pauseBtn.onclick = function() {
    isPaused = !isPaused;
    this.innerText = isPaused ?
      "Resume" : "Pause";
    statusLabel.innerText =
      isPaused ? "Paused" :
      "Focusing...";
  };
  
  
  function resetTimer() {
    clearInterval(timer);
    const inputs = [
      document.getElementById(
        'input-hrs'),
      document.getElementById(
        'input-mins'),
      document.getElementById(
        'input-secs')
    ];
    
    inputs.forEach(input => {
      if (input) {
        input.value = "";
        input.classList.remove(
          'border-red-500/50',
          'bg-red-500/5');
      }
    });
    // Reset
    timeDisplay.innerText = "00:00";
    timeDisplay.style.fontSize =
      "2rem";
    statusLabel.innerText = "Standby";
    statusLabel.style.color =
      "#818cf8";
    progressBar.style
      .strokeDashoffset = circ;
    
    setupUI.classList.remove(
      'hidden');
    runningUI.classList.add('hidden');
    doneOverlay.classList.remove(
      'active');
  }
  
  resetBtn.onclick = resetTimer;
  document.getElementById(
      'dismiss-timer-success')
    .addEventListener('click', () => {
      resetTimer();
      closeTimerModel();
    })
  
  function showCompletion() {
    doneOverlay.classList.add(
      'active');
    doneOverlay.querySelector(
        '.success-content').classList
      .add('success-animate');
    setTimeout(playBell(), 500)
  }
  
  const handle = document
    .getElementById(
      'timer-handle-container');
  const drawer = document
    .getElementById('timer-drawer');
  const modal = document
    .getElementById(
      'timer-app-modal');
  const overlay = document
    .getElementById('timer-overlay');
  const mainApp = document
    .getElementById('mainApp');
  
  document.getElementById(
      'open-timer-btn').onclick =
    () => {
      modal.classList.remove(
        'hidden');
      overlay.classList.remove(
        'hidden');
      mainApp.classList.add(
        'modal-active-blur');
      drawer.style.width = "0px";
      setTimeout(() => {
        document.getElementById(
            'timer-modal-card')
          .classList.remove(
            'scale-90',
            'opacity-0');
        overlay.style.opacity =
          "1";
      }, 10);
    };
  
  document.getElementById(
      'close-timer-modal')
    .addEventListener('click',
      closeTimerModel);
  
  function closeTimerModel() {
    document.getElementById(
        'timer-modal-card').classList
      .add('scale-90', 'opacity-0');
    mainApp.classList.remove(
      'modal-active-blur');
    overlay.style.opacity = "0";
    setTimeout(() => {
      modal.classList.add(
        'hidden');
      overlay.classList.add(
        'hidden');
    }, 300);
  }
  
  handle.onpointerdown = (e) => {
    handle.setPointerCapture(e
      .pointerId);
    drawer.classList.add(
      'no-transition');
    const startX = e.clientX;
    const startWidth = drawer
      .offsetWidth;
    
    const onMove = (moveEvent) => {
      let nw = Math.min(Math.max(
        startWidth + (
          moveEvent.clientX -
          startX), 0), 190);
      drawer.style.width = nw +
        "px";
    };
    
    const onUp = () => {
      drawer.classList.remove(
        'no-transition');
      drawer.style.width = drawer
        .offsetWidth > 60 ?
        "175px" : "0px";
      window.removeEventListener(
        'pointermove', onMove);
      window.removeEventListener(
        'pointerup', onUp);
    };
    
    window.addEventListener(
      'pointermove', onMove);
    window.addEventListener(
      'pointerup', onUp);
    
  };
  
  
  const audioCtx = new(window
    .AudioContext || window
    .webkitAudioContext)();
  
  function playBell() {
    if (audioCtx.state ===
      'suspended') audioCtx.resume();
    
    const now = audioCtx.currentTime;
    const fundamental = 1500;
    const duration = 2.0;
    const masterGain = audioCtx
      .createGain();
    masterGain.gain.setValueAtTime(
      1.0, now);
    masterGain.connect(audioCtx
      .destination);
    
    const addLayer = (freq, vol,
      decayMult) => {
      const osc = audioCtx
        .createOscillator();
      const gain = audioCtx
        .createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(
        freq, now);
      
      gain.gain.setValueAtTime(0,
        now);
      gain.gain
        .linearRampToValueAtTime(
          vol, now + 0.01);
      gain.gain
        .exponentialRampToValueAtTime(
          0.0001, now + (duration *
            decayMult));
      
      osc.connect(gain);
      gain.connect(masterGain);
      
      osc.start(now);
      osc.stop(now + (duration *
        decayMult));
    };
    addLayer(fundamental, 0.7, 1.0);
    addLayer(fundamental * 1.5, 0.4,
      0.7);
    addLayer(fundamental * 2.4, 0.3,
      0.5);
  }
  
  
})();





//--- QUOTE ---

const quotes = [
  "The system only works if you do.",
  "Excellence is not an act, but a habit.",
  "Small wins are the coordinates to breakthroughs.",
  "Discipline is the bridge to accomplishment.",
  "Do not break the chain of consistency.",
  "Data reveals truth; effort creates result.",
  "Your mindset is everything."
];

function updateDailyQuote() {
  document.getElementById(
      'quoteText')
    .innerText =
    `"${quotes[today.getDate() % quotes.length]}"`;
}


// --- UPDATE SYSTEM ---
let new_version;

(function() {
  const CURRENT_VERSION = "1.14";
  const GITHUB_URL =
    "https://raw.githubusercontent.com/Shreejalbro/Habit-tracker/refs/heads/main/Details.json";
  
  async function checkRemoteVersion() {
    try {
      const response = await fetch(
        `${GITHUB_URL}?t=${Date.now()}`
      );
      if (!response.ok) return;
      
      const data = await response
        .json();
      new_version = data.version;
      console.log(data.version)
      if (data.version !==
        CURRENT_VERSION) {
        const list = document
          .getElementById(
            'update-list');
        const vDisplay = document
          .getElementById('v-num');
        const popup = document
          .getElementById(
            'update-popup');
        
        if (vDisplay) vDisplay
          .innerText =
          `v${data.version}`;
        
        if (list) {
          list.innerHTML = "";
          if (Array.isArray(data
              .update_notes)) {
            data.update_notes
              .forEach(note => {
                const li =
                  document
                  .createElement(
                    'li');
                li.innerText =
                  note;
                list.appendChild(
                  li);
              });
          } else {
            const li = document
              .createElement('li');
            li.innerText = data
              .update_notes;
            list.appendChild(li);
          }
        }
        
        setTimeout(() => {
          if (popup) popup
            .classList.add(
              'show');
        }, 3500);
      }
    } catch (err) {
      console.log(
        "Update server unreachable."
      );
    }
  }
  
  window.closeUpdatePopup =
    function() {
      const popup = document
        .getElementById(
          'update-popup');
      if (popup) popup.classList
        .remove('show');
    };
  
  checkRemoteVersion();
})();

const REDIRECT_URL =
  'https://shreejalbro.github.io/Habit-tracker/update.html';
async function downloadUpdate() {
  const newWindow = window.open(
    REDIRECT_URL, '_blank');
  if (!newWindow || newWindow
    .closed || typeof newWindow
    .closed == 'undefined') {
    window.location.href =
      REDIRECT_URL;
  }
}

(async () => {
  try {
    checkInteractionStatus();
    updateDailyQuote();
    await renderEfficiencyCubes();
    checkWeeklyReset();
    render();
    updateMood()
  } catch (err) {
    console.error(
      "Initialization Failed:",
      err);
    render();
  }
})();