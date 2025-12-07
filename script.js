/* Keys */
const TASKS_KEY = "focusflow_tasks";
const QUOTES_KEY = "focusflow_quote_date";
const REMINDERS_KEY = "focusflow_reminders";
const BACKUP_PREFIX = "focusflow_backup_";

let tasks = [];
let timer = null;
let seconds = 25 * 60;
let soundEnabled = true;
let reminderTimeouts = {};
let weeklyGoal = 300; // default

const quotes = [
  "The secret of getting ahead is getting started. — Mark Twain",
  "Success is the sum of small efforts, repeated day in and day in and day out.",
  "Don’t watch the clock; do what it does. Keep going. — Sam Levenson",
  "The harder you work, the greater you’ll feel when you achieve it.",
  "Study like there's no tomorrow.",
  "Your future is created by what you do today.",
  "Discipline is choosing between what you want now and what you want most.",
  "Push yourself, because no one else is going to do it for you.",
  "Small progress is still progress.",
  "Master the day. Then keep doing that every day."
];

document.addEventListener("DOMContentLoaded", () => {
  // cache DOM
  const els = {
    form: document.getElementById("taskForm"),
    taskId: document.getElementById("taskId"),
    title: document.getElementById("title"),
    subject: document.getElementById("subject"),
    due: document.getElementById("due"),
    duration: document.getElementById("duration"),
    priority: document.getElementById("priority"),
    notes: document.getElementById("notes"),
    subtasks: document.getElementById("subtasks"),
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
    quoteAuthor: document.getElementById("quoteAuthor"),

    calendar: document.getElementById("calendar"),
    calendarTitle: document.getElementById("calendarTitle"),
    prevMonth: document.getElementById("prevMonth"),
    nextMonth: document.getElementById("nextMonth"),

    weeklyChart: document.getElementById("weeklyChart"),
    subjectChart: document.getElementById("subjectChart"),
    regenCharts: document.getElementById("regenCharts"),
    clearCompleted: document.getElementById("clearCompleted"),

    exportBtn: document.getElementById("exportBtn"),
    importFile: document.getElementById("importFile"),
    importBtn: document.getElementById("importBtn"),

    soundToggle: document.getElementById("soundToggle"),
    quickAdd: document.getElementById("quickAdd"),
    cancelEdit: document.getElementById("cancelEdit"),
    weeklyGoalInput: document.getElementById("weeklyGoalInput"),

    goalProgress: document.getElementById("goalProgress"),
    goalLabel: document.getElementById("goalLabel")
  };

  // focus title
  els.title.focus();

  /* Theme toggle */
  if (localStorage.getItem("theme") === "light") {
    document.body.classList.add("light-theme");
    els.themeToggle.textContent = "☀️";
  } else {
    els.themeToggle.textContent = "🌙";
  }
  els.themeToggle.onclick = () => {
    document.body.classList.toggle("light-theme");
    const isLight = document.body.classList.contains("light-theme");
    els.themeToggle.textContent = isLight ? "☀️" : "🌙";
    localStorage.setItem("theme", isLight ? "light" : "dark");
  };

  /* Daily quote */
  function showDailyQuote() {
    const today = new Date().toDateString();
    if (localStorage.getItem(QUOTES_KEY) !== today) {
      const quote = quotes[Math.floor(Math.random() * quotes.length)];
      const parts = quote.split(" — ");
      const text = parts[0] || quote;
      const author = parts[1] ? `— ${parts[1]}` : "— Unknown";
      els.quoteText.textContent = `"${text}"`;
      els.quoteAuthor.textContent = author;
      localStorage.setItem(QUOTES_KEY, today);
    }
  }
  showDailyQuote();

  /* Storage handlers */
  function loadTasks() {
    const data = localStorage.getItem(TASKS_KEY);
    tasks = data ? JSON.parse(data) : [];
  }
  function saveTasks() {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  }

  function loadReminders() {
    const r = localStorage.getItem(REMINDERS_KEY);
    return r ? JSON.parse(r) : {};
  }
  function saveReminders(rem) {
    localStorage.setItem(REMINDERS_KEY, JSON.stringify(rem));
  }

  /* Calendar state */
  let calDate = new Date();
  calDate.setDate(1);

  /* Render calendar */
  function renderCalendar() {
    els.calendar.innerHTML = "";
    const year = calDate.getFullYear();
    const month = calDate.getMonth();
    const monthName = calDate.toLocaleString(undefined, { month: "long", year: "numeric" });
    els.calendarTitle.textContent = monthName;

    const firstDay = new Date(year, month, 1);
    const startDay = firstDay.getDay(); // 0-6
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const prevDays = startDay;
    const prevMonthLastDate = new Date(year, month, 0).getDate();

    const totalCells = 42;
    for (let i = 0; i < totalCells; i++) {
      const cell = document.createElement("div");
      cell.className = "day";
      const dayNum = i - prevDays + 1;
      const cellDate = new Date(year, month, dayNum);
      if (i < prevDays) {
        cell.classList.add("other");
        cell.textContent = prevMonthLastDate - prevDays + 1 + i;
      } else if (dayNum > daysInMonth) {
        cell.classList.add("other");
        cell.textContent = dayNum - daysInMonth;
      } else {
        cell.textContent = dayNum;
        const dateStr = new Date(year, month, dayNum).toDateString();
        const has = tasks.some(t => t.due && new Date(t.due).toDateString() === dateStr);
        if (has) {
          const dot = document.createElement("div");
          dot.style.height = "8px";
          dot.style.width = "8px";
          dot.style.background = "#a78bfa";
          dot.style.borderRadius = "50%";
          dot.style.margin = "6px auto 0";
          cell.appendChild(dot);
        }
        const today = new Date();
        if (cellDate.toDateString() === today.toDateString()) {
          cell.classList.add("today");
        }
        cell.addEventListener("click", () => renderForDate(cellDate));
      }
      els.calendar.appendChild(cell);
    }
  }
  function renderForDate(dt) {
    const dateStr = dt.toDateString();
    const list = tasks.filter(t => t.due && new Date(t.due).toDateString() === dateStr);
    renderList(list);
    els.summary.textContent = `${tasks.length} total • ${list.length} on ${dateStr}`;
  }

  els.prevMonth.onclick = () => { calDate.setMonth(calDate.getMonth() - 1); renderCalendar(); };
  els.nextMonth.onclick = () => { calDate.setMonth(calDate.getMonth() + 1); renderCalendar(); };

  /* Helpers */
  function formatTime(sec) {
    const m = String(Math.floor(sec/60)).padStart(2,"0");
    const s = String(sec%60).padStart(2,"0");
    return `${m}:${s}`;
  }
  function getBadge(due) {
    if (!due) return null;
    const d = new Date(due);
    const today = new Date(); today.setHours(0,0,0,0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1);
    if (d.toDateString() === today.toDateString()) return {text:"Today", class:"badge-today"};
    if (d.toDateString() === tomorrow.toDateString()) return {text:"Tomorrow", class:"badge-tomorrow"};
    if (d < today) return {text:"Overdue", class:"badge-overdue"};
    return null;
  }
  function isOverdue(t) { return t.due && !t.done && new Date(t.due) < new Date(); }

  /* Render tasks list (full list or provided) */
  function renderList(listOverride) {
    const listBase = listOverride ?? [...tasks];
    const q = els.search.value.toLowerCase().trim();
    let list = listBase.filter(t => t.title.toLowerCase().includes(q) || (t.subject||"").toLowerCase().includes(q));

    // apply main filter
    const filterVal = els.filter.value;
    const today = new Date(); today.setHours(0,0,0,0);
    list = list.filter(t => {
      if (!t.due) {
        if (filterVal === "overdue" || filterVal === "today") return false;
      }
      if (!t.due) return filterVal === "all" || filterVal === "high" || filterVal === "completed" ? true : true;
      const due = new Date(t.due);
      switch(filterVal) {
        case "today": return due.toDateString() === today.toDateString();
        case "week": { const week = new Date(today); week.setDate(week.getDate() + 7); return due >= today && due <= week; }
        case "overdue": return due < today && !t.done;
        case "high": return t.priority === "high";
        case "completed": return t.done;
        default: return true;
      }
    });

    // pinned tasks to top
    list.sort((a,b) => {
      if ((a.pinned ? 1 : 0) !== (b.pinned ? 1 : 0)) return (b.pinned?1:0) - (a.pinned?1:0);
      const sortVal = els.sort.value;
      if (sortVal === "Due Date") {
        const da = a.due ? new Date(a.due) : Infinity;
        const db = b.due ? new Date(b.due) : Infinity;
        return da - db;
      }
      if (sortVal === "Priority") {
        const order = {high:0, medium:1, low:2};
        return order[a.priority] - order[b.priority];
      }
      return a.title.localeCompare(b.title);
    });

    const container = els.tasksList;
    container.innerHTML = "";
    if (list.length === 0) {
      container.innerHTML = `<p style="text-align:center;padding:60px;opacity:0.6;font-size:1.05rem;">No tasks yet! Add one and crush it 🚀</p>`;
      els.summary.textContent = `${tasks.length} tasks`;
      return;
    }

    list.forEach(task => {
      const div = document.createElement("div");
      div.className = `task ${task.priority} ${task.done ? "done" : ""} ${isOverdue(task) ? "overdue" : ""}`;
      const badge = task.due && !task.done ? getBadge(task.due) : "";
      // subtasks HTML
      let subtasksHTML = "";
      if (task.subtasks && task.subtasks.length) {
        const doneCount = task.subtasks.filter(s => s.done).length;
        subtasksHTML = `<div class="task-substatus">${doneCount}/${task.subtasks.length} subtasks done</div>`;
      }
      const pinnedIcon = task.pinned ? "bi-pin-fill" : "bi-pin";
      const dueText = task.due ? new Date(task.due).toLocaleString() : "No date";
      div.innerHTML = `
        ${badge ? `<span class="task-badge ${badge.class}">${badge.text}</span>` : ""}
        <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
          <div style="flex:1">
            <strong>${escapeHtml(task.title)}</strong> ${task.subject ? `<em style="opacity:.85">(${escapeHtml(task.subject)})</em>` : ""}
            <div class="task-meta">Due: ${escapeHtml(dueText)} • ${task.duration||25} min</div>
            ${subtasksHTML}
            <div style="margin-top:8px;">
              <div style="background:#333;border-radius:6px;height:8px;overflow:hidden">
                <div style="width:${task.progress}%;background:#a78bfa;height:100%;transition:width 0.4s"></div>
              </div>
              <small style="opacity:.9">${task.progress}%</small>
            </div>
          </div>
          <div style="display:flex; flex-direction:column; gap:6px;">
            <button class="btn small primary" data-id="${task.id}" title="Focus">Focus</button>
            <button class="btn small" data-edit="${task.id}" title="Edit">Edit</button>
            <button class="btn small ghost" data-rem="${task.id}" title="Set Reminder">Rem</button>
            <button class="btn small" data-share="${task.id}" title="Share">Share</button>
            <button class="btn small" data-pin="${task.id}" title="Pin/Unpin"><i class="bi ${pinnedIcon}"></i></button>
            <button class="btn small danger" data-del="${task.id}" title="Delete">Delete</button>
          </div>
        </div>
      `;
      container.appendChild(div);
    });
    els.summary.textContent = `${tasks.length} total • ${list.length} shown`;
  }

  /* Escape helper */
  function escapeHtml(s) {
    if (!s) return "";
    return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[m]));
  }

  /* Progress slider UI */
  els.progress.addEventListener("input", e => {
    els.progressValue.textContent = `${e.target.value}%`;
  });

  /* Form submit */
  els.form.addEventListener("submit", e => {
    e.preventDefault();
    const id = els.taskId.value || Date.now().toString();
    const progress = Number(els.progress.value);
    const wasDone = tasks.find(t => t.id === id)?.done;
    const nowDone = progress === 100;

    // subtasks parse
    const subsRaw = els.subtasks.value.split("\n").map(s => s.trim()).filter(Boolean);
    const existingTask = tasks.find(t => t.id === id);
    let subs = subsRaw.map((t,i) => {
      // preserve done if editing existing
      const prev = existingTask?.subtasks?.[i];
      return { text: t, done: prev ? !!prev.done : false };
    });

    const newTask = {
      id,
      title: els.title.value.trim(),
      subject: els.subject.value.trim(),
      due: els.due.value || null,
      duration: els.duration.value ? Number(els.duration.value) : 25,
      priority: els.priority.value,
      notes: els.notes.value.trim(),
      subtasks: subs,
      progress,
      done: nowDone,
      completedAt: nowDone ? new Date().toISOString() : (existingTask ? existingTask.completedAt : null),
      pinned: existingTask ? !!existingTask.pinned : false
    };

    const existing = tasks.findIndex(t => t.id === id);
    if (existing >= 0) tasks[existing] = newTask;
    else tasks.push(newTask);

    if (nowDone && !wasDone) {
      confetti({particleCount: 140, spread: 80});
      updateStreak();
    }

    saveTasks();
    scheduleReminderForTask(newTask);
    renderList();
    updateStats();
    els.form.reset();
    els.taskId.value = "";
    els.progress.value = 0;
    els.progressValue.textContent = "0%";
    els.title.focus();
  });

  /* Cancel edit */
  els.cancelEdit.addEventListener("click", () => {
    els.form.reset();
    els.taskId.value = "";
    els.progress.value = 0;
    els.progressValue.textContent = "0%";
  });

  /* CTRL+Enter to submit */
  els.form.addEventListener("keydown", e => {
    if (e.ctrlKey && e.key === "Enter") els.form.dispatchEvent(new Event("submit"));
  });

  /* Task actions (delegate) */
  els.tasksList.addEventListener("click", e => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const id = btn.dataset.id || btn.dataset.edit || btn.dataset.del || btn.dataset.rem || btn.dataset.pin || btn.dataset.share;
    if (!id) return;

    if (btn.dataset.id) {
      // Focus mode
      const task = tasks.find(t => t.id === id);
      els.focusTitle.textContent = task.title;
      els.focusSubject.textContent = task.subject || "Focus time!";
      seconds = (task.duration || 25) * 60;
      els.timerDisplay.textContent = formatTime(seconds);
      els.focusMode.classList.remove("hidden");
    }

    if (btn.dataset.edit) {
      const task = tasks.find(t => t.id === id);
      if (!task) return;
      els.taskId.value = task.id;
      els.title.value = task.title;
      els.subject.value = task.subject || "";
      els.due.value = task.due || "";
      els.duration.value = task.duration || "";
      els.priority.value = task.priority;
      els.notes.value = task.notes || "";
      els.progress.value = task.progress || 0;
      els.progressValue.textContent = `${task.progress || 0}%`;
      els.subtasks.value = (task.subtasks || []).map(s => s.text).join("\n");
      document.querySelector("aside").scrollIntoView({behavior:"smooth"});
    }

    if (btn.dataset.del) {
      if (confirm("Delete this task permanently?")) {
        tasks = tasks.filter(t => t.id !== id);
        unscheduleReminder(id);
        saveTasks(); renderList(); updateStats(); renderCalendar();
      }
    }

    if (btn.dataset.rem) {
      const task = tasks.find(t => t.id === id);
      if (!task) return alert("Please add a due date/time to schedule a reminder.");
      requestNotificationPermission().then(granted => {
        if (!granted) return;
        const when = new Date(task.due).getTime();
        const rem = loadReminders();
        const remindAt = when - (10 * 60 * 1000);
        rem[task.id] = { at: remindAt, taskTitle: task.title };
        saveReminders(rem);
        scheduleReminderForTask(task);
        alert("Reminder set (10 minutes before due). Reminders are most reliable when the PWA is installed or the tab is open.");
      });
    }

    if (btn.dataset.pin) {
      const task = tasks.find(t => t.id === id);
      if (!task) return;
      task.pinned = !task.pinned;
      saveTasks(); renderList();
    }

    if (btn.dataset.share) {
      const task = tasks.find(t => t.id === id);
      if (!task) return;
      if (navigator.share) {
        navigator.share({
          title: task.title,
          text: `${task.title}\n${task.subject ? task.subject + "\n" : ""}${task.notes || ""}`
        }).catch(()=>{});
      } else {
        // fallback: copy to clipboard
        const txt = `${task.title}\n${task.subject ? task.subject + "\n" : ""}${task.notes || ""}`;
        navigator.clipboard?.writeText(txt).then(()=> alert("Task copied to clipboard."), ()=> alert("Share not supported."));
      }
    }
  });

  // handle subtasks checkbox toggle (delegated)
  els.tasksList.addEventListener("change", e => {
    const cb = e.target;
    if (cb.dataset.subid) {
      const tid = cb.dataset.subid;
      const idx = Number(cb.dataset.subidx);
      const t = tasks.find(x => x.id === tid);
      if (!t || !t.subtasks || !t.subtasks[idx]) return;
      t.subtasks[idx].done = cb.checked;
      const doneCount = t.subtasks.filter(s => s.done).length;
      t.progress = Math.round((doneCount / t.subtasks.length) * 100);
      if (t.progress === 100 && !t.done) {
        t.done = true;
        t.completedAt = new Date().toISOString();
        confetti({particleCount: 120, spread: 70});
      }
      saveTasks(); renderList(); updateStats();
    }
  });

  /* Timer controls */
  els.timerStart.onclick = () => {
    if (timer) { clearInterval(timer); timer = null; els.timerStart.textContent = "Start Pomodoro"; return; }
    els.timerStart.textContent = "Pause";
    timer = setInterval(() => {
      if (seconds <= 0) {
        clearInterval(timer); timer = null; els.timerStart.textContent = "Start Pomodoro";
        confetti({particleCount: 180, spread: 100});
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

  /* Stats & streak */
  function updateStats() {
    const today = new Date().toDateString();
    const doneToday = tasks.filter(t => t.done && t.completedAt && new Date(t.completedAt).toDateString() === today).length;
    els.todayDone.textContent = doneToday;

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekMins = tasks.filter(t => t.done && t.completedAt && new Date(t.completedAt) >= weekStart).reduce((sum,t) => sum + (t.duration||0), 0);
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

    // weekly goal progress
    weeklyGoal = Number(localStorage.getItem("weeklyGoal") || els.weeklyGoalInput.value || weeklyGoal);
    els.weeklyGoalInput.value = weeklyGoal;
    const percent = Math.min(100, Math.round((weekMins / weeklyGoal) * 100 || 0));
    els.goalProgress.style.width = `${percent}%`;
    els.goalLabel.textContent = `${weekMins} / ${weeklyGoal} min`;
  }

  /* Filters and sorts */
  els.search.addEventListener("input", () => renderList());
  els.filter.addEventListener("change", () => renderList());
  els.sort.addEventListener("change", () => renderList());

  /* Clear all */
  document.getElementById("clearAll").onclick = () => {
    if (confirm("Delete ALL tasks? This cannot be undone!")) {
      tasks = []; saveTasks(); clearAllReminders(); renderList(); updateStats(); renderCalendar();
    }
  };

  /* Clear completed */
  els.clearCompleted.onclick = () => {
    if (confirm("Delete all completed tasks?")) {
      tasks = tasks.filter(t => !t.done);
      saveTasks(); renderList(); updateStats(); renderCalendar();
    }
  };

  /* Export */
  els.exportBtn.onclick = () => {
    const data = JSON.stringify(tasks, null, 2);
    const blob = new Blob([data], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `focusflow_tasks_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  /* Import */
  els.importFile.addEventListener("change", e => {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const imported = JSON.parse(evt.target.result);
        if (!Array.isArray(imported)) throw new Error("Invalid format");
        tasks = imported.map(t => ({ ...t, pinned: !!t.pinned }));
        saveTasks();
        tasks.forEach(t => scheduleReminderForTask(t));
        renderList(); updateStats(); renderCalendar();
        alert("Import successful.");
      } catch (err) {
        alert("Failed to import: " + err.message);
      }
    };
    reader.readAsText(f);
    e.target.value = "";
  });

  /* Reminders: scheduling + storage */
  async function requestNotificationPermission() {
    if (!("Notification" in window)) {
      alert("Notifications not supported in this browser.");
      return false;
    }
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;
    const result = await Notification.requestPermission();
    return result === "granted";
  }

  function scheduleReminderForTask(task) {
    unscheduleReminder(task.id);
    const rem = loadReminders();
    const r = rem[task.id];
    if (!r || !r.at) return;
    const now = Date.now();
    const at = Number(r.at);
    const delay = at - now;
    if (delay <= 0) {
      showNotification(`Reminder: ${task.title}`, `Due ${new Date(task.due).toLocaleString()}`);
      delete rem[task.id];
      saveReminders(rem);
      return;
    }
    const tid = setTimeout(() => {
      showNotification(`Reminder: ${task.title}`, `Due ${new Date(task.due).toLocaleString()}`);
      delete rem[task.id];
      saveReminders(rem);
      delete reminderTimeouts[task.id];
    }, delay);
    reminderTimeouts[task.id] = tid;
  }

  function unscheduleReminder(taskId) {
    const rem = loadReminders();
    if (rem[taskId]) {
      delete rem[taskId];
      saveReminders(rem);
    }
    if (reminderTimeouts[taskId]) {
      clearTimeout(reminderTimeouts[taskId]);
      delete reminderTimeouts[taskId];
    }
  }

  function clearAllReminders() {
    const rem = loadReminders();
    Object.keys(rem).forEach(k => {
      if (reminderTimeouts[k]) clearTimeout(reminderTimeouts[k]);
    });
    localStorage.removeItem(REMINDERS_KEY);
    reminderTimeouts = {};
  }

  async function showNotification(title, body) {
    if (Notification.permission !== "granted") return;
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) { reg.showNotification(title, { body, icon: "/favicon.ico" }); return; }
      } catch (err) {}
    }
    new Notification(title, { body });
  }

  /* On load: schedule stored reminders */
  function scheduleAllStoredReminders() {
    const rem = loadReminders();
    Object.keys(rem).forEach(id => {
      const task = tasks.find(t => t.id === id);
      if (task) scheduleReminderForTask(task);
    });
  }

  /* Analytics: draw charts (canvas) */
  function drawWeeklyChart() {
    const canvas = els.weeklyChart;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0,0,canvas.width, canvas.height);
    const days = [];
    const now = new Date();
    for (let i=6;i>=0;i--) {
      const d = new Date(now); d.setDate(now.getDate() - i);
      days.push(d);
    }
    const mins = days.map(d => {
      const ds = d.toDateString();
      return tasks.filter(t => t.done && t.completedAt && new Date(t.completedAt).toDateString() === ds)
        .reduce((s, t) => s + (t.duration || 0), 0);
    });
    const padding = 24;
    const w = canvas.width - padding*2;
    const h = canvas.height - padding*2;
    const max = Math.max(...mins, 10);
    ctx.fillStyle = "rgba(255,255,255,0.03)";
    ctx.fillRect(0,0,canvas.width, canvas.height);
    const barW = w / mins.length - 8;
    mins.forEach((m, idx) => {
      const x = padding + idx * (barW + 8);
      const barH = (m / max) * (h - 20);
      ctx.fillStyle = "rgba(167,139,250,0.95)";
      ctx.fillRect(x, padding + (h - barH), barW, barH);
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.font = "10px Inter, sans-serif";
      const label = days[idx].toLocaleString(undefined, { weekday: "short" });
      ctx.fillText(label, x, padding + h + 14);
      ctx.fillText(String(m), x, padding + (h - barH) - 6);
    });
  }

  function drawSubjectChart() {
    const canvas = els.subjectChart;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0,0,canvas.width, canvas.height);
    const map = {};
    tasks.filter(t => t.done).forEach(t => {
      const key = t.subject || "Uncategorized";
      map[key] = (map[key] || 0) + (t.duration || 0);
    });
    const entries = Object.entries(map);
    if (entries.length === 0) {
      ctx.fillStyle = "rgba(255,255,255,0.03)";
      ctx.fillRect(0,0,canvas.width, canvas.height);
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.font = "12px Inter, sans-serif";
      ctx.fillText("No completed tasks yet", 20, 40);
      return;
    }
    const total = entries.reduce((s, e) => s + e[1], 0);
    let start = -Math.PI/2;
    entries.forEach((e,i) => {
      const slice = e[1] / total * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(150,100);
      ctx.arc(150,100,80, start, start + slice);
      ctx.closePath();
      const hue = (i * 73) % 360;
      ctx.fillStyle = `hsl(${hue}deg 70% 60%)`;
      ctx.fill();
      start += slice;
    });
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "10px Inter, sans-serif";
    let y = 12;
    entries.forEach((e,i) => {
      const hue = (i * 73) % 360;
      ctx.fillStyle = `hsl(${hue}deg 70% 60%)`;
      ctx.fillRect(260, y, 10, 10);
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.fillText(`${e[0]} — ${e[1]} min`, 276, y + 8);
      y += 18;
    });
  }

  els.regenCharts.onclick = () => { drawWeeklyChart(); drawSubjectChart(); };

  /* schedule reminders for tasks that already had them stored */
  scheduleAllStoredReminders();

  /* Register service worker (basic) */
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js").catch(console.warn);
  }

  /* On pageload check for missed reminders and show */
  (function handleMissedReminders() {
    const rems = loadReminders();
    const now = Date.now();
    Object.entries(rems).forEach(([id, r]) => {
      if (r.at && now >= r.at) {
        const t = tasks.find(x => x.id === id);
        if (t) {
          requestNotificationPermission().then(granted => {
            if (granted) showNotification(`Missed Reminder: ${t.title}`, `Was due ${new Date(t.due).toLocaleString()}`);
          });
        }
        delete rems[id];
      }
    });
    saveReminders(rems);
  })();

  /* load and render initial */
  loadTasks();
  renderList();
  renderCalendar();
  updateStats();
  drawWeeklyChart(); drawSubjectChart();
  scheduleAllStoredReminders();

  /* Quick add button */
  els.quickAdd.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    els.title.focus();
  });

  /* Auto-backup once per day (also on load) */
  function autoBackupNow() {
    try {
      const data = JSON.stringify(tasks);
      const key = BACKUP_PREFIX + new Date().toISOString().slice(0,10);
      localStorage.setItem(key, data);
      // optionally prune old backups (keep last 7)
      const keys = Object.keys(localStorage).filter(k => k.startsWith(BACKUP_PREFIX)).sort().reverse();
      for (let i = 7; i < keys.length; i++) localStorage.removeItem(keys[i]);
    } catch (err) {}
  }
  autoBackupNow();
  setInterval(autoBackupNow, 1000 * 60 * 60 * 6); // every 6 hours (safe)

  /* sound toggle */
  els.soundToggle.addEventListener("change", (e) => {
    soundEnabled = !!e.target.checked;
  });

  /* weekly goal input save */
  els.weeklyGoalInput.addEventListener("change", (e) => {
    const v = Number(e.target.value) || 0;
    localStorage.setItem("weeklyGoal", String(v));
    updateStats();
  });

  /* helper to schedule reminders for all tasks (call after import) */
  function scheduleAll() {
    tasks.forEach(t => scheduleReminderForTask(t));
  }

  /* utility in window to call externally */
  window.FocusFlow = { saveTasks, renderList, renderCalendar, drawWeeklyChart, drawSubjectChart, scheduleAll };

});
