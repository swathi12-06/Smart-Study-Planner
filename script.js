const TASKS_KEY = 'study_tasks';
let tasks = [];

document.addEventListener('DOMContentLoaded', () => {
  load();
  render();

  document.getElementById('taskForm').addEventListener('submit', saveTask);
  document.getElementById('filter').addEventListener('change', render);
  document.getElementById('clearAll').addEventListener('click', clearAll);
});

function saveTask(e) {
  e.preventDefault();
  const id = document.getElementById('taskId').value || Date.now().toString();
  const task = {
    id,
    title: document.getElementById('title').value,
    subject: document.getElementById('subject').value,
    due: document.getElementById('due').value,
    duration: document.getElementById('duration').value,
    priority: document.getElementById('priority').value,
    notes: document.getElementById('notes').value,
    progress: 0,
    done: false
  };

  const existing = tasks.find(t => t.id === id);
  if (existing) Object.assign(existing, task);
  else tasks.push(task);

  save();
  render();
  e.target.reset();
}

function render() {
  const list = document.getElementById('tasks');
  list.innerHTML = '';

  tasks.forEach(t => {
    const div = document.createElement('div');
    div.className = 'task';
    div.innerHTML = `
      <strong>${t.title}</strong> (${t.subject || 'General'})<br>
      <small>Due: ${t.due || 'No date'}</small>
      <div class="progress"><div class="bar" style="width:${t.progress}%"></div></div>
      <button onclick="deleteTask('${t.id}')">Delete</button>
    `;
    list.appendChild(div);
  });

  document.getElementById('summary').textContent = `${tasks.length} tasks`;
}

function save() {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

function load() {
  tasks = JSON.parse(localStorage.getItem(TASKS_KEY)) || [];
}

function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  save();
  render();
}

function clearAll() {
  if (confirm('Clear all tasks?')) {
    tasks = [];
    save();
    render();
  }
}
