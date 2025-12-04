const TASKS_KEY = "focusflow_tasks";
const QUOTES_KEY = "focusflow_quote_date";
let tasks = [];
let timer = null;
let seconds = 25 * 60;
let soundEnabled = true;

const quotes = [
  "The secret of getting ahead is getting started. — Mark Twain",
  "Success is the sum of small efforts, repeated day in and day out.",
  "Don’t watch the clock; do what it does. Keep going.",
  "The harder you work, the greater you’ll feel when you achieve it.",
  "Study like there’s no tomorrow.",
  "Your future is created by what you do today.",
  "Discipline is choosing between what you want now and what you want most.",
  "Push yourself, because no one else is going to do it for you.",
  "Small progress is still progress.",
  "Master the day. Then keep doing that every day."
];

document.addEventListener("DOMContentLoaded", () => {
  const els = {
    form: document.getElementById("taskForm"),
    taskId: document.getElementById("taskId"),
    title: document.getElementById("title"),
    subject: document.getElementById("subject"),
    due: document.getElementById("due"),
    duration: document.getElementById("duration"),
    priority: document.getElementById("priority"),
    notes: document.getElementById("notes"),
    progress: document.getElementById("progress"),
    progressValue: document.getElementById("progressValue"),
    tasksList: document.getElementById("tasks"),
    search: document.getElementById("searchBox"),
    filter: document.getElementById("filter"),
    sort: document.getElementById("sort"),
    summary: document.getElementById("summary"),
    streak: document.getElementById("streakCount"),
    weekly: document.getElementById("weeklyMins"),
    todayDone: document.getElementById("completedToday"),
    focusMode: document.getElementById("focusMode"),
    focusTitle: document.getElementById("focusTitle"),
    focusSubject: document.getElementById("focusSubject"),
    timerDisplay: document.getElementById("timerDisplay"),
    timerStart: document.getElementById("timerStart"),
    timerStop: document.getElementById("timerStop"),
    closeFocus: document.getElementById("closeFocus"),
    themeToggle: document.getElementById("themeToggle"),
    quoteText: document.getElementById("quoteText"),
    quoteAuthor: document.getElementById("quoteAuthor")
  };

  els.title.focus();

  if (localStorage.getItem("theme") === "light") {
    document.body.classList.add("light-theme");
    els.themeToggle.textContent = "Sun";
  }

  els.themeToggle.onclick = () => {
    document.body.classList.toggle("light-theme");
    const isLight = document.body.classList.contains("light-theme");
    els.themeToggle.textContent = isLight ? "Sun" : "Moon";
    localStorage.setItem("theme", isLight ? "light" : "dark");
  };

  function showDailyQuote() {
    const today = new Date().toDateString();
    if (localStorage.getItem(QUOTES_KEY) !== today) {
      const quote = quotes[Math.floor(Math.random() * quotes.length)];
      const [text, author = "— Unknown"] = quote.split(" — ");
      els.quoteText.textContent = `"${text}"`;
      els.quoteAuthor.textContent = author;
      localStorage.setItem(QUOTES_KEY, today);
    }
  }
  showDailyQuote();

  function loadTasks() {
    const data = localStorage.getItem(TASKS_KEY);
    if (data) tasks = JSON.parse(data);
  }

  function saveTasks() {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  }

  function render() {
    els.tasksList.innerHTML = "";
    let list = [...tasks];

    if (els.search.value) {
      const q = els.search.value.toLowerCase();
      list = list.filter(t => t.title.toLowerCase().includes(q) || (t.subject||"").toLowerCase().includes(q));
    }

    const today = new Date(); today.setHours(0,0,0,0);
    list = list.filter(t => {
      if (!t.due) return true;
      const due = new Date(t.due);
      switch(els.filter.value) {
        case "today": return due.toDateString() === today.toDateString();
        case "week": { const week = new Date(today); week.setDate(week.getDate() + 7); return due >= today && due <= week; }
        case "overdue": return due < today && !t.done;
        case "high": return t.priority === "high";
        case "completed": return t.done;
        default: return true;
      }
    });

    list.sort((a,b) => {
      if (els.sort.value === "Due Date") {
        const da = a.due ? new Date(a.due) : Infinity;
        const db = b.due ? new Date(b.due) : Infinity;
        return da - db;
      }
      if (els.sort.value === "Priority") {
        const order = {high:0, medium:1, low:2};
        return order[a.priority] - order[b.priority];
      }
      return a.title.localeCompare(b.title);
    });

    if (list.length === 0) {
      els.tasksList.innerHTML = `<p style="text-align:center;padding:60px;opacity:0.6;font-size:1.1rem;">No tasks yet! Add one and crush it</p>`;
      els.summary.textContent = `${tasks.length} tasks`;
      return;
    }

    list.forEach(task => {
      const div = document.createElement("div");
      div.className = `task ${task.priority} ${task.done ? "done" : ""} ${isOverdue(task) ? "overdue" : ""}`;
      const badge = task.due && !task.done ? getBadge(task.due) : "";
      div.innerHTML = `
        ${badge ? `<span class="task-badge ${badge.class}">${badge.text}</span>` : ""}
        <strong>${task.title}</strong>${task.subject ? ` <em>(${task.subject})</em>` : ""}
        <small>Due: ${task.due ? new Date(task.due).toLocaleString() : "No date"} • ${task.duration||25} min</small>
        <div style="margin:10px 0">
          <div style="background:#333;border-radius:4px;height:8px;overflow:hidden">
            <div style="width:${task.progress}%;background:#a78bfa;height:100%;transition:width 0.4s"></div>
          </div>
          <small>${task.progress}%</small>
        </div>
        <div style="display:flex;gap:8px;margin-top:12px;">
          <button class="btn small primary" data-id="${task.id}">Focus</button>
          <button class="btn small" data-edit="${task.id}">Edit</button>
          <button class="btn small danger" data-del="${task.id}">Delete</button>
        </div>
      `;
      els.tasksList.appendChild(div);
    });
    els.summary.textContent = `${tasks.length} total • ${list.length} shown`;
  }

  els.form.addEventListener("submit", e => {
    e.preventDefault();
    const id = els.taskId.value || Date.now().toString();
    const progress = Number(els.progress.value);
    const wasDone = tasks.find(t => t.id === id)?.done;
    const nowDone = progress === 100;

    const newTask = {
      id, title: els.title.value.trim(), subject: els.subject.value.trim(),
      due: els.due.value || null, duration: els.duration.value ? Number(els.duration.value) : 25,
      priority: els.priority.value, notes: els.notes.value.trim(),
      progress, done: nowDone, completedAt: nowDone ? new Date().toISOString() : null
    };

    const existing = tasks.findIndex(t => t.id === id);
    if (existing >= 0) tasks[existing] = newTask;
    else tasks.push(newTask);

    if (nowDone && !wasDone) {
      confetti({particleCount: 180, spread: 90, origin: {y: 0.6}});
      updateStreak();
    }

    saveTasks(); render(); updateStats();
    els.form.reset(); els.taskId.value = ""; els.progress.value = 0; els.progressValue.textContent = "0%";
    els.title.focus();
  });

  els.form.addEventListener("keydown", e => {
    if (e.ctrlKey && e.key === "Enter") els.form.dispatchEvent(new Event("submit"));
  });

  els.tasksList.addEventListener("click", e => {
    const btn = e.target;
    const id = btn.dataset.id || btn.dataset.edit || btn.dataset.del;
    if (!id) return;

    if (btn.dataset.id) {
      const task = tasks.find(t => t.id === id);
      els.focusTitle.textContent = task.title;
      els.focusSubject.textContent = task.subject || "Focus time!";
      seconds = (task.duration || 25) * 60;
      els.timerDisplay.textContent = formatTime(seconds);
      els.focusMode.classList.remove("hidden");
    }

    if (btn.dataset.edit) {
      const task = tasks.find(t => t.id === id);
      els.taskId.value = task.id; els.title.value = task.title; els.subject.value = task.subject || "";
      els.due.value = task.due || ""; els.duration.value = task.duration || ""; els.priority.value = task.priority;
      els.notes.value = task.notes || ""; els.progress.value = task.progress;
      els.progressValue.textContent = task.progress + "%";
      document.querySelector("aside").scrollIntoView({behavior:"smooth"});
    }

    if (btn.dataset.del) {
      if (confirm("Delete this task permanently?")) {
        tasks = tasks.filter(t => t.id !== id);
        saveTasks(); render(); updateStats();
      }
    }
  });

  els.timerStart.onclick = () => {
    if (timer) { clearInterval(timer); timer = null; els.timerStart.textContent = "Start Pomodoro"; return; }
    els.timerStart.textContent = "Pause";
    timer = setInterval(() => {
      if (seconds <= 0) {
        clearInterval(timer); timer = null; els.timerStart.textContent = "Start Pomodoro";
        confetti({particleCount: 200, spread: 100});
        if (soundEnabled) new Audio("https://assets.mixkit.co/sfx/preview/mixkit-alarm-clock-beep-988.mp3").play();
        return;
      }
      seconds--; els.timerDisplay.textContent = formatTime(seconds);
    }, 1000);
  };

  els.timerStop.onclick = () => { clearInterval(timer); timer = null; els.timerStart.textContent = "Start Pomodoro"; };
  els.closeFocus.onclick = closeFocusMode;
  els.focusMode.onclick = (e) => { if (e.target === els.focusMode) closeFocusMode(); };

  function closeFocusMode() {
    els.focusMode.classList.add("hidden");
    clearInterval(timer); timer = null; seconds = 25*60;
    els.timerDisplay.textContent = "25:00"; els.timerStart.textContent = "Start Pomodoro";
  }

  function formatTime(sec) {
    const m = String(Math.floor(sec/60)).padStart(2,"0");
    const s = String(sec%60).padStart(2,"0");
    return `${m}:${s}`;
  }

  function getBadge(due) {
    const d = new Date(due);
    const today = new Date(); today.setHours(0,0,0,0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1);
    if (d.toDateString() === today.toDateString()) return {text:"Today", class:"badge-today"};
    if (d.toDateString() === tomorrow.toDateString()) return {text:"Tomorrow", class:"badge-tomorrow"};
    if (d < today) return {text:"Overdue", class:"badge-overdue"};
    return null;
  }

  function isOverdue(t) { return t.due && !t.done && new Date(t.due) < new Date(); }

  function updateStats() {
    const today = new Date().toDateString();
    const doneToday = tasks.filter(t => t.done && new Date(t.completedAt)?.toDateString() === today).length;
    els.todayDone.textContent = doneToday;

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekMins = tasks.filter(t => t.done && new Date(t.completedAt) >= weekStart).reduce((sum,t) => sum + t.duration, 0);
    els.weekly.textContent = weekMins;

    let streak = parseInt(localStorage.getItem("streak") || "0");
    const lastDay = localStorage.getItem("lastDay");
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    if (doneToday > 0) {
      streak = (lastDay === yesterday) ? streak + 1 : 1;
      localStorage.setItem("lastDay", new Date().toDateString());
      localStorage.setItem("streak", streak);
    }
    els.streak.textContent = streak;
  }

  els.search.addEventListener("input", render);
  els.filter.addEventListener("change", render);
  els.sort.addEventListener("change", render);

  document.getElementById("clearAll").onclick = () => {
    if (confirm("Delete ALL tasks? This cannot be undone!")) {
      tasks = []; saveTasks(); render(); updateStats();
    }
  };

  loadTasks(); render(); updateStats();
});
