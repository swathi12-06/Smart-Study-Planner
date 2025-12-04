// script.js - Complete Fixed Version
const TASKS_KEY = "study_tasks";
let tasks = [];

document.addEventListener("DOMContentLoaded", () => {
  // === Cache all DOM elements ===
  const form = document.getElementById("taskForm");
  const taskIdInput = document.getElementById("taskId");
  const titleInput = document.getElementById("title");
  const subjectInput = document.getElementById("subject");
  const dueInput = document.getElementById("due");
  const durationInput = document.getElementById("duration");
  const priorityInput = document.getElementById("priority");
  const notesInput = document.getElementById("notes");
  const progressInput = document.getElementById("progress");

  const searchBox = document.getElementById("searchBox");
  const filterSelect = document.getElementById("filter");
  const sortSelect = document.getElementById("sort");
  const tasksContainer = document.getElementById("tasks");
  const summaryEl = document.getElementById("summary");

  // === Load tasks from localStorage ===
  load();
  render();

  // === Save / Update Task ===
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const id = taskIdInput.value || Date.now().toString();

    const task = {
      id,
      title: titleInput.value.trim(),
      subject: subjectInput.value.trim(),
      due: dueInput.value || null,
      duration: durationInput.value ? Number(durationInput.value) : null,
      priority: priorityInput.value,
      notes: notesInput.value.trim(),
      progress: Number(progressInput.value),
      done: Number(progressInput.value) === 100
    };

    const existingIndex = tasks.findIndex(t => t.id === id);
    if (existingIndex !== -1) {
      tasks[existingIndex] = task; // Update existing
    } else {
      tasks.push(task); // Add new
    }

    save();
    render();
    resetForm(); // Clear form after save
  });

  // === RESET BUTTON - NOW FULLY FIXED ===
  document.getElementById("reset").addEventListener("click", (e) => {
    e.preventDefault();
    resetForm();
  });

  function resetForm() {
    taskIdInput.value = "";
    titleInput.value = "";
    subjectInput.value = "";
    dueInput.value = "";
    durationInput.value = "";
    priorityInput.value = "medium";
    notesInput.value = "";
    progressInput.value = 0;

    // Force range slider to visually update
    progressInput.dispatchEvent(new Event("input"));

    // Smooth scroll to form
    document.querySelector("aside").scrollIntoView({ behavior: "smooth" });
  }

  // === Search, Filter, Sort ===
  searchBox.addEventListener("input", render);
  filterSelect.addEventListener("change", render);
  sortSelect.addEventListener("change", render);

  // === Clear All Tasks ===
  document.getElementById("clearAll").addEventListener("click", () => {
    if (confirm("Delete ALL tasks permanently? This cannot be undone.")) {
      tasks = [];
      save();
      render();
    }
  });

  // === Theme Toggle ===
  document.getElementById("themeToggle").addEventListener("click", () => {
    document.body.classList.toggle("light");
    const isLight = document.body.classList.contains("light");
    document.getElementById("themeToggle").textContent = isLight ? "Sun" : "Moon";
  });

  // === Render All Tasks ===
  function render() {
    tasksContainer.innerHTML = "";
    let filtered = [...tasks];

    // Search
    const query = searchBox.value.toLowerCase();
    if (query) {
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(query) ||
        (task.subject && task.subject.toLowerCase().includes(query)) ||
        (task.notes && task.notes.toLowerCase().includes(query))
      );
    }

    // Filter
    const filterMode = filterSelect.value;
    const now = new Date();
    const today = now.toDateString();
    const weekLater = new Date(now);
    weekLater.setDate(now.getDate() + 7);

    filtered = filtered.filter(task => {
      const dueDate = task.due ? new Date(task.due) : null;

      switch (filterMode) {
        case "today":
          return dueDate && dueDate.toDateString() === today;
        case "week":
          return dueDate && dueDate >= now && dueDate <= weekLater;
        case "high":
          return task.priority === "high";
        case "completed":
          return task.done;
        case "incomplete":
          return !task.done;
        default:
          return true;
      }
    });

    // Sort
    const sortBy = sortSelect.value;
    filtered.sort((a, b) => {
      if (sortBy === "date") {
        const dateA = a.due ? new Date(a.due) : Infinity;
        const dateB = b.due ? new Date(b.due) : Infinity;
        return dateA - dateB;
      }
      if (sortBy === "priority") {
        const order = { high: 0, medium: 1, low: 2 };
        return order[a.priority] - order[b.priority];
      }
      if (sortBy === "alpha") {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });

    // Display tasks
    filtered.forEach(task => {
      const taskEl = document.createElement("div");
      taskEl.className = `task ${task.priority}`;
      
      const dueText = task.due 
        ? new Date(task.due).toLocaleString([], { 
            year: 'numeric', month: 'short', day: 'numeric', 
            hour: '2-digit', minute: '2-digit' 
          }) 
        : "No due date";

      taskEl.innerHTML = `
        <div style="flex: 1;">
          <strong>${escapeHtml(task.title)}</strong>
          ${task.subject ? `<em style="color: var(--muted);">(${escapeHtml(task.subject)})</em>` : ""}
          <br>
          <small style="color: var(--muted);">Due: ${dueText}</small>
          ${task.duration ? `<small style="color: var(--muted);"> • ${task.duration} min</small>` : ""}
        </div>

        <div class="progress">
          <div class="bar" style="width: ${task.progress}%"></div>
        </div>

        <div style="display: flex; gap: 6px; margin-top: 8px;">
          <button class="btn small" data-edit="${task.id}">Edit</button>
          <button class="btn ghost small" data-del="${task.id}">Delete</button>
        </div>
      `;

      tasksContainer.appendChild(taskEl);
    });

    // Update summary
    summaryEl.textContent = `${tasks.length} task${tasks.length !== 1 ? 's' : ''} total • ${filtered.length} shown`;

    // Use event delegation for Edit/Delete (works perfectly after re-render)
    tasksContainer.removeEventListener("click", handleTaskClick);
    tasksContainer.addEventListener("click", handleTaskClick);
  }

  // === Handle Edit & Delete Clicks ===
  function handleTaskClick(e) {
    const editBtn = e.target.closest("[data-edit]");
    const delBtn = e.target.closest("[data-del]");

    if (editBtn) {
      editTask(editBtn.dataset.edit);
    } else if (delBtn) {
      if (confirm("Delete this task?")) {
        tasks = tasks.filter(t => t.id !== delBtn.dataset.del);
        save();
        render();
      }
    }
  }

  // === Edit Task ===
  function editTask(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    taskIdInput.value = task.id;
    titleInput.value = task.title;
    subjectInput.value = task.subject || "";
    dueInput.value = task.due || "";
    durationInput.value = task.duration || "";
    priorityInput.value = task.priority;
    notesInput.value = task.notes || "";
    progressInput.value = task.progress || 0;

    // Force slider update
    progressInput.dispatchEvent(new Event("input"));

    // Scroll to form
    document.querySelector("aside").scrollIntoView({ behavior: "smooth", block: "center" });
  }

  // === Local Storage ===
  function save() {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  }

  function load() {
    const saved = localStorage.getItem(TASKS_KEY);
    if (saved) {
      try {
        tasks = JSON.parse(saved);
      } catch (e) {
        tasks = [];
      }
    }
  }

  // === Utility: Prevent XSS ===
  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text || "";
    return div.innerHTML;
  }
});
