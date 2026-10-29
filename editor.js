const storageKey = "aarush-portfolio-v1";
const status = document.querySelector("#editor-status");
const editorToggle = document.querySelector("#editor-toggle");
const editorPanel = document.querySelector("#editor-panel");
const projectForm = document.querySelector("#project-form");
const projectList = document.querySelector("#project-list");
const projectEmpty = document.querySelector("#project-empty");
const formTitle = document.querySelector("#project-form-title");
const formSubmit = document.querySelector("#project-submit");
const formCancel = document.querySelector("#project-cancel");
const editableElements = [...document.querySelectorAll("[data-editable]")];
const defaultText = Object.fromEntries(
  editableElements.map((element) => [element.dataset.editable, element.textContent.trim()])
);

let editing = false;
let editingIndex = null;
let storageHealthy = true;

function isAllowedUrl(value) {
  if (!value) return true;

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch (error) {
    if (error instanceof TypeError) return false;
    throw error;
  }
}

function isProject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    typeof value.title === "string" &&
    typeof value.description === "string" &&
    typeof value.url === "string" &&
    isAllowedUrl(value.url)
  );
}

function showStorageError(message) {
  storageHealthy = false;
  status.textContent = message;
  status.classList.add("editor-status-error");
}

function loadState() {
  let saved;
  try {
    saved = window.localStorage.getItem(storageKey);
  } catch (error) {
    if (error instanceof DOMException && error.name === "SecurityError") {
      showStorageError("This browser blocks local storage, so edits cannot be saved.");
      return { text: { ...defaultText }, projects: [] };
    }
    throw error;
  }

  if (saved === null) return { text: { ...defaultText }, projects: [] };

  let parsed;
  try {
    parsed = JSON.parse(saved);
  } catch (error) {
    if (error instanceof SyntaxError) {
      showStorageError("Saved portfolio data is unreadable. Clear this site’s browser storage before editing again.");
      return { text: { ...defaultText }, projects: [] };
    }
    throw error;
  }

  const valid =
    parsed !== null &&
    typeof parsed === "object" &&
    parsed.version === 1 &&
    parsed.text !== null &&
    typeof parsed.text === "object" &&
    Object.keys(defaultText).every((key) => typeof parsed.text[key] === "string") &&
    Array.isArray(parsed.projects) &&
    parsed.projects.every(isProject);

  if (!valid) {
    showStorageError("Saved portfolio data is invalid. Clear this site’s browser storage before editing again.");
    return { text: { ...defaultText }, projects: [] };
  }

  return {
    text: { ...defaultText, ...parsed.text },
    projects: parsed.projects,
  };
}

const state = loadState();

function saveState() {
  if (!storageHealthy) return;

  try {
    window.localStorage.setItem(storageKey, JSON.stringify({ version: 1, ...state }));
    status.textContent = "Saved in this browser only.";
    status.classList.remove("editor-status-error");
  } catch (error) {
    if (
      error instanceof DOMException &&
      (error.name === "QuotaExceededError" || error.name === "SecurityError")
    ) {
      showStorageError("The browser could not save this edit. Check storage permissions or available space.");
      return;
    }
    throw error;
  }
}

function setEditorEnabled(enabled) {
  editing = enabled;
  document.body.classList.toggle("editing", enabled);
  editorToggle.setAttribute("aria-pressed", String(enabled));
  editorToggle.textContent = enabled ? "Done editing" : "Edit portfolio";
  editorPanel.hidden = !enabled;

  for (const element of editableElements) {
    element.contentEditable = enabled ? "plaintext-only" : "false";
    if (enabled) {
      element.setAttribute("aria-label", `Edit ${element.dataset.editable.replaceAll("-", " ")}`);
    } else {
      element.removeAttribute("aria-label");
    }
  }

  renderProjects();
  if (!enabled) resetProjectForm();
}

function renderProjects() {
  projectList.replaceChildren();
  projectEmpty.hidden = state.projects.length > 0;

  state.projects.forEach((project, index) => {
    const card = document.createElement("article");
    card.className = "project-card";

    const info = document.createElement("div");
    info.className = "project-info";

    const heading = document.createElement("div");
    heading.className = "project-heading";

    const title = document.createElement("h3");
    title.textContent = project.title;
    if (editing) {
      title.contentEditable = "plaintext-only";
      title.setAttribute("aria-label", `Edit title for ${project.title}`);
      title.addEventListener("input", () => {
        state.projects[index].title = title.textContent;
        saveState();
      });
    }
    heading.append(title);

    info.append(heading);

    const description = document.createElement("p");
    description.textContent = project.description;
    if (editing) {
      description.contentEditable = "plaintext-only";
      description.setAttribute("aria-label", `Edit description for ${project.title}`);
      description.addEventListener("input", () => {
        state.projects[index].description = description.textContent;
        saveState();
      });
    }
    info.append(description);

    const footer = document.createElement("div");
    footer.className = "project-footer";
    const progress = document.createElement("span");
    progress.className = "project-progress";
    progress.textContent = project.url ? "Project" : "In progress";
    footer.append(progress);

    if (project.url) {
      const link = document.createElement("a");
      link.href = project.url;
      link.textContent = "View project ↗";
      link.rel = "noopener noreferrer";
      footer.append(link);
    }

    if (editing) {
      const actions = document.createElement("div");
      actions.className = "project-edit-actions";
      const editButton = document.createElement("button");
      editButton.className = "text-button";
      editButton.type = "button";
      editButton.textContent = "Edit details";
      editButton.addEventListener("click", () => beginProjectEdit(index));
      actions.append(editButton);

      const removeButton = document.createElement("button");
      removeButton.className = "text-button text-button-danger";
      removeButton.type = "button";
      removeButton.textContent = "Remove";
      removeButton.addEventListener("click", () => {
        if (!window.confirm(`Remove “${state.projects[index].title}”?`)) return;
        state.projects.splice(index, 1);
        if (editingIndex === index) {
          resetProjectForm();
        } else if (editingIndex !== null && index < editingIndex) {
          editingIndex -= 1;
        }
        saveState();
        renderProjects();
        if (storageHealthy) status.textContent = "Project removed.";
      });
      actions.append(removeButton);
      footer.append(actions);
    }

    info.append(footer);
    card.append(info);
    projectList.append(card);
  });
}

function resetProjectForm() {
  projectForm.reset();
  editingIndex = null;
  formTitle.textContent = "Add a project";
  formSubmit.textContent = "Add project";
  formCancel.hidden = true;
}

function beginProjectEdit(index) {
  const project = state.projects[index];
  editingIndex = index;
  projectForm.elements.title.value = project.title;
  projectForm.elements.description.value = project.description;
  projectForm.elements.url.value = project.url;
  formTitle.textContent = "Edit project";
  formSubmit.textContent = "Save project";
  formCancel.hidden = false;
  projectForm.elements.title.focus();
}

for (const element of editableElements) {
  const key = element.dataset.editable;
  element.textContent = state.text[key];
  element.addEventListener("input", () => {
    state.text[key] = element.textContent;
    saveState();
  });
}

editorToggle.addEventListener("click", () => setEditorEnabled(!editing));
formCancel.addEventListener("click", resetProjectForm);

projectForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = projectForm.elements.title.value.trim();
  const description = projectForm.elements.description.value.trim();
  const url = projectForm.elements.url.value.trim();

  if (!title || !description) {
    status.textContent = "Enter a project title and describe what it does or what you did.";
    status.classList.add("editor-status-error");
    projectForm.elements[!title ? "title" : "description"].focus();
    return;
  }

  if (!isAllowedUrl(url)) {
    status.textContent = "Use a project link that starts with http:// or https://.";
    status.classList.add("editor-status-error");
    projectForm.elements.url.focus();
    return;
  }

  const project = { title, description, url };
  if (editingIndex === null) {
    state.projects.push(project);
  } else {
    state.projects[editingIndex] = project;
  }

  saveState();
  renderProjects();
  resetProjectForm();
});

renderProjects();
