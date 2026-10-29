/* TaskFlow — CRUD, filters, DOM events, and localStorage persistence */
"use strict";

const STORAGE_KEY = "taskflow-tasks-v1";

const taskForm = document.getElementById("task-form");
const taskInput = document.getElementById("task-input");
const taskList = document.getElementById("task-list");
const emptyState = document.getElementById("empty-state");
const statusMessage = document.getElementById("status-message");
const totalCount = document.getElementById("total-count");
const activeCount = document.getElementById("active-count");
const completedCount = document.getElementById("completed-count");
const filterButtons = document.querySelectorAll("[data-filter]");
const clearCompletedButton = document.getElementById("clear-completed");
const todayLabel = document.getElementById("today-label");

let tasks = loadTasks();
let currentFilter = "all";
let messageTimer;

todayLabel.textContent = new Intl.DateTimeFormat("en", {
  weekday: "short",
  month: "short",
  day: "numeric"
}).format(new Date()).toUpperCase();

function loadTasks() {
  try {
    const storedTasks = localStorage.getItem(STORAGE_KEY);
    if (!storedTasks) return [];
    const parsed = JSON.parse(storedTasks);
    return Array.isArray(parsed) ? parsed.filter(
      (task) => task && typeof task.id === "string" &&
      typeof task.text === "string" && typeof task.completed === "boolean"
    ) : [];
  } catch (error) {
    console.warn("Could not load saved tasks:", error);
    return [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (error) {
    showMessage("Unable to save tasks in this browser.");
    console.warn("Could not save tasks:", error);
  }
}

function showMessage(message) {
  statusMessage.textContent = message;
  window.clearTimeout(messageTimer);
  messageTimer = window.setTimeout(() => {
    statusMessage.textContent = "";
  }, 2500);
}

function updateSummary() {
  totalCount.textContent = tasks.length;
  activeCount.textContent = tasks.filter((task) => !task.completed).length;
  completedCount.textContent = tasks.filter((task) => task.completed).length;
}

function getVisibleTasks() {
  if (currentFilter === "active") return tasks.filter((task) => !task.completed);
  if (currentFilter === "completed") return tasks.filter((task) => task.completed);
  return tasks;
}

function createButton(label, className, symbol, taskId, action) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = symbol;
  button.setAttribute("aria-label", label);
  button.dataset.action = action;
  button.dataset.id = taskId;
  return button;
}

function renderTasks() {
  taskList.replaceChildren();
  const visibleTasks = getVisibleTasks();

  visibleTasks.forEach((task) => {
    const item = document.createElement("li");
    item.className = `task-item${task.completed ? " completed" : ""}`;

    const checkButton = createButton(
      task.completed ? "Mark task active" : "Mark task completed",
      "task-check",
      task.completed ? "✓" : "",
      task.id,
      "toggle"
    );

    const text = document.createElement("span");
    text.className = "task-text";
    text.textContent = task.text;

    const actions = document.createElement("div");
    actions.className = "task-actions";

    const editButton = createButton("Edit task", "icon-button", "✎", task.id, "edit");
    const deleteButton = createButton("Delete task", "icon-button delete", "×", task.id, "delete");
    actions.append(editButton, deleteButton);
    item.append(checkButton, text, actions);
    taskList.append(item);
  });

  emptyState.classList.toggle("visible", visibleTasks.length === 0);
  const emptyHeading = emptyState.querySelector("h3");
  const emptyDescription = emptyState.querySelector("p");

  if (tasks.length === 0) {
    emptyHeading.textContent = "Nothing here just yet";
    emptyDescription.textContent = "Add a task above and make your day count.";
  } else if (visibleTasks.length === 0 && currentFilter === "active") {
    emptyHeading.textContent = "All caught up!";
    emptyDescription.textContent = "There are no active tasks right now.";
  } else if (visibleTasks.length === 0) {
    emptyHeading.textContent = "No completed tasks yet";
    emptyDescription.textContent = "Completed tasks will appear here.";
  }

  updateSummary();
}

taskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = taskInput.value.trim();
  if (!text) {
    showMessage("Please enter a task first.");
    taskInput.focus();
    return;
  }

  tasks.unshift({
    id: (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    text,
    completed: false,
    createdAt: new Date().toISOString()
  });

  saveTasks();
  renderTasks();
  taskForm.reset();
  taskInput.focus();
  showMessage("Task added successfully.");
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    currentFilter = button.dataset.filter;
    filterButtons.forEach((filterButton) => {
      const selected = filterButton === button;
      filterButton.classList.toggle("active", selected);
      filterButton.setAttribute("aria-pressed", String(selected));
    });
    renderTasks();
  });
});

// Event delegation handles dynamically created task controls.
taskList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const task = tasks.find((item) => item.id === button.dataset.id);
  if (!task) return;

  switch (button.dataset.action) {
    case "toggle":
      task.completed = !task.completed;
      saveTasks();
      renderTasks();
      showMessage(task.completed ? "Task completed." : "Task marked active.");
      break;

    case "edit": {
      const updatedText = window.prompt("Edit your task:", task.text);
      if (updatedText === null) return;
      const cleanedText = updatedText.trim();
      if (!cleanedText) {
        showMessage("Task text cannot be empty.");
        return;
      }
      task.text = cleanedText;
      saveTasks();
      renderTasks();
      showMessage("Task updated successfully.");
      break;
    }

    case "delete":
      tasks = tasks.filter((item) => item.id !== task.id);
      saveTasks();
      renderTasks();
      showMessage("Task deleted.");
      break;
  }
});

clearCompletedButton.addEventListener("click", () => {
  const completedTasks = tasks.filter((task) => task.completed).length;
  if (completedTasks === 0) {
    showMessage("There are no completed tasks to clear.");
    return;
  }

  tasks = tasks.filter((task) => !task.completed);
  saveTasks();
  renderTasks();
  showMessage(`${completedTasks} completed task(s) cleared.`);
});

renderTasks();
