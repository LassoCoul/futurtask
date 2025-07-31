// Application de gestion de tâches futuriste
class FuturTaskApp {
  constructor() {
    this.tasks = [];
    this.currentEditId = null;
    this.searchQuery = "";
    this.filters = {
      year: "",
      month: "",
      status: "",
      tag: "",
    };

    // Variables PWA
    this.deferredPrompt = null;
    this.isPWAInstalled = false;

    // Variables de profils
    this.profiles = [];
    this.currentProfile = null;

    this.init();
  }

  init() {
    this.loadProfiles();
    this.setupProfiles();
    this.loadTasks();
    this.setupEventListeners();
    this.setupTheme();
    this.populateYearFilter();
    this.updateUI();
    this.setDefaultDate();

    // Initialiser PWA
    this.setupPWA();

    // Vérifier les notifications au démarrage
    setTimeout(() => {
      this.checkNotifications();
    }, 1000);

    // Vérifier les notifications toutes les 5 minutes
    setInterval(() => {
      this.checkNotifications();
    }, 5 * 60 * 1000);
  }

  // Configuration des écouteurs d'événements
  setupEventListeners() {
    // Formulaire d'ajout de tâche
    document.getElementById("taskForm").addEventListener("submit", (e) => {
      e.preventDefault();
      this.addTask();
    });

    // Toggle du thème
    document.getElementById("themeToggle").addEventListener("click", () => {
      this.toggleTheme();
    });

    // Filtres avec mise à jour instantanée
    document.getElementById("yearFilter").addEventListener("change", (e) => {
      this.filters.year = e.target.value;
      this.applyFilters();
    });

    document.getElementById("monthFilter").addEventListener("change", (e) => {
      this.filters.month = e.target.value;
      this.applyFilters();
    });

    document.getElementById("statusFilter").addEventListener("change", (e) => {
      this.filters.status = e.target.value;
      this.applyFilters();
    });

    document.getElementById("tagFilter").addEventListener("change", (e) => {
      this.filters.tag = e.target.value;
      this.applyFilters();
    });

    // Recherche en temps réel
    document.getElementById("searchInput").addEventListener("input", (e) => {
      this.searchQuery = e.target.value.trim();
      this.applySearch();
    });

    document.getElementById("clearFilters").addEventListener("click", () => {
      this.clearFilters();
    });

    // Supprimer toutes les tâches
    document.getElementById("deleteAllBtn").addEventListener("click", () => {
      this.showConfirmModal(
        "Supprimer toutes les tâches",
        "Êtes-vous sûr de vouloir supprimer toutes les tâches ? Cette action est irréversible.",
        () => this.deleteAllTasks()
      );
    });

    // Modales
    document.getElementById("modalCancel").addEventListener("click", () => {
      this.hideModal();
    });

    document.getElementById("modalConfirm").addEventListener("click", () => {
      this.confirmAction();
    });

    // Modal d'édition
    document.getElementById("closeEditModal").addEventListener("click", () => {
      this.hideEditModal();
    });

    document.getElementById("cancelEdit").addEventListener("click", () => {
      this.hideEditModal();
    });

    document.getElementById("saveEdit").addEventListener("click", () => {
      this.saveEditTask();
    });

    // Fermer les modales en cliquant à l'extérieur
    document.getElementById("modalOverlay").addEventListener("click", (e) => {
      if (e.target === e.currentTarget) {
        this.hideModal();
      }
    });

    document
      .getElementById("editModalOverlay")
      .addEventListener("click", (e) => {
        if (e.target === e.currentTarget) {
          this.hideEditModal();
        }
      });
  }

  // Configuration du thème
  setupTheme() {
    const savedTheme = localStorage.getItem("futurTask-theme") || "dark";
    this.setTheme(savedTheme);
  }

  setTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    const themeIcon = document.querySelector(".theme-icon");
    themeIcon.textContent = theme === "dark" ? "🌙" : "☀️";
    localStorage.setItem("futurTask-theme", theme);

    // Forcer la mise à jour des styles après le changement de thème
    this.forceThemeUpdate();
  }

  toggleTheme() {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    this.setTheme(newTheme);
  }

  forceThemeUpdate() {
    // Forcer le recalcul des styles CSS
    document.body.offsetHeight; // Trigger reflow

    // Mettre à jour l'interface si nécessaire
    if (typeof this.updateUI === "function") {
      this.updateUI();
    }

    // Forcer la mise à jour des éléments spécifiques
    this.updateThemeSpecificElements();
  }

  updateThemeSpecificElements() {
    // Mettre à jour les éléments qui pourraient avoir des styles spécifiques au thème
    const elements = document.querySelectorAll(
      ".summary-card, .chart-card, .details-card, .recent-task-item, .tag-item, .nav-btn"
    );

    elements.forEach((element) => {
      // Forcer le recalcul des styles
      element.style.display = "none";
      element.offsetHeight; // Trigger reflow
      element.style.display = "";
    });
  }

  // Définir la date par défaut à aujourd'hui
  setDefaultDate() {
    const today = new Date().toISOString().split("T")[0];
    document.getElementById("taskDate").value = today;
  }

  // Gestion des tâches
  addTask() {
    const title = document.getElementById("taskTitle").value.trim();
    const description = document.getElementById("taskDescription").value.trim();
    const tags = document.getElementById("taskTags").value.trim();
    const date = document.getElementById("taskDate").value;
    const priority = document.getElementById("taskPriority").value;
    const status = "pending"; // Statut automatique pour les nouvelles tâches

    if (!title || !date) {
      this.showNotification(
        "Veuillez remplir tous les champs obligatoires",
        "error"
      );
      return;
    }

    const task = {
      id: Date.now().toString(),
      title,
      description,
      tags: this.parseTags(tags),
      date,
      priority,
      status,
      createdAt: new Date().toISOString(),
    };

    this.tasks.push(task);
    this.saveTasks();
    this.updateUI();
    this.clearForm();
    this.showNotification("Tâche ajoutée avec succès !", "success");

    // Animation d'ajout
    setTimeout(() => {
      const taskCard = document.querySelector(`[data-task-id="${task.id}"]`);
      if (taskCard) {
        taskCard.style.animation = "slideInUp 0.4s ease-out";
      }
    }, 100);
  }

  editTask(id) {
    const task = this.tasks.find((t) => t.id === id);
    if (!task) return;

    this.currentEditId = id;

    // Remplir le formulaire d'édition
    document.getElementById("editTaskTitle").value = task.title;
    document.getElementById("editTaskDescription").value = task.description;
    document.getElementById("editTaskTags").value = task.tags
      ? task.tags.join(" ")
      : "";
    document.getElementById("editTaskDate").value = task.date;
    document.getElementById("editTaskPriority").value =
      task.priority || "medium";
    document.getElementById("editTaskStatus").value = task.status;

    this.showEditModal();
  }

  saveEditTask() {
    const title = document.getElementById("editTaskTitle").value.trim();
    const description = document
      .getElementById("editTaskDescription")
      .value.trim();
    const tags = document.getElementById("editTaskTags").value.trim();
    const date = document.getElementById("editTaskDate").value;
    const priority = document.getElementById("editTaskPriority").value;
    const status = document.getElementById("editTaskStatus").value;

    if (!title || !date) {
      this.showNotification(
        "Veuillez remplir tous les champs obligatoires",
        "error"
      );
      return;
    }

    const taskIndex = this.tasks.findIndex((t) => t.id === this.currentEditId);
    if (taskIndex === -1) return;

    this.tasks[taskIndex] = {
      ...this.tasks[taskIndex],
      title,
      description,
      tags: this.parseTags(tags),
      date,
      priority,
      status,
    };

    this.saveTasks();
    this.updateUI();
    this.hideEditModal();
    this.showNotification("Tâche modifiée avec succès !", "success");
  }

  deleteTask(id) {
    this.showConfirmModal(
      "Supprimer la tâche",
      "Êtes-vous sûr de vouloir supprimer cette tâche ?",
      () => {
        const taskCard = document.querySelector(`[data-task-id="${id}"]`);
        if (taskCard) {
          taskCard.classList.add("removing");
          setTimeout(() => {
            this.tasks = this.tasks.filter((t) => t.id !== id);
            this.saveTasks();
            this.updateUI();
            this.showNotification("Tâche supprimée", "success");
          }, 400);
        }
      }
    );
  }

  toggleTaskStatus(id) {
    const task = this.tasks.find((t) => t.id === id);
    if (!task) return;

    // Mettre à jour le statut
    task.status = task.status === "completed" ? "pending" : "completed";

    // Sauvegarder immédiatement
    this.saveTasks();

    // Mettre à jour l'interface immédiatement
    this.updateSingleTask(id);
    this.updateProgress();
    this.updateStats();

    const statusText = task.status === "completed" ? "terminée" : "en attente";
    this.showNotification(`Tâche marquée comme ${statusText}`, "success");
  }

  deleteAllTasks() {
    this.tasks = [];
    this.saveTasks();
    this.updateUI();
    this.showNotification("Toutes les tâches ont été supprimées", "success");
  }

  // Gestion des filtres
  populateYearFilter() {
    const yearFilter = document.getElementById("yearFilter");
    const years = [
      ...new Set(this.tasks.map((task) => new Date(task.date).getFullYear())),
    ];
    years.sort((a, b) => b - a);

    // Ajouter l'année actuelle si elle n'existe pas
    const currentYear = new Date().getFullYear();
    if (!years.includes(currentYear)) {
      years.unshift(currentYear);
    }

    yearFilter.innerHTML = '<option value="">Toutes les années</option>';
    years.forEach((year) => {
      const option = document.createElement("option");
      option.value = year;
      option.textContent = year;
      yearFilter.appendChild(option);
    });
  }

  applyFilters() {
    // Mise à jour instantanée des filtres
    this.renderFilteredTasks();
    this.updateFilterButtonState();
  }

  clearFilters() {
    this.filters = { year: "", month: "", status: "", tag: "" };
    this.searchQuery = "";
    document.getElementById("yearFilter").value = "";
    document.getElementById("monthFilter").value = "";
    document.getElementById("statusFilter").value = "";
    document.getElementById("tagFilter").value = "";
    document.getElementById("searchInput").value = "";

    // Mise à jour instantanée après effacement des filtres
    this.renderFilteredTasks();
    this.updateSearchResultsInfo();
    this.updateFilterButtonState();

    this.showNotification("Filtres et recherche effacés", "info");
  }

  getFilteredTasks() {
    return this.tasks.filter((task) => {
      const taskDate = new Date(task.date);
      const taskYear = taskDate.getFullYear().toString();
      const taskMonth = (taskDate.getMonth() + 1).toString().padStart(2, "0");

      const yearMatch = !this.filters.year || taskYear === this.filters.year;
      const monthMatch =
        !this.filters.month || taskMonth === this.filters.month;
      const statusMatch =
        !this.filters.status || task.status === this.filters.status;
      const tagMatch =
        !this.filters.tag ||
        (task.tags && task.tags.includes(this.filters.tag));
      const searchMatch = this.isTaskMatch(task);

      return yearMatch && monthMatch && statusMatch && tagMatch && searchMatch;
    });
  }

  // Interface utilisateur
  updateUI() {
    this.renderTasks();
    this.updateProgress();
    this.updateStats();
    this.populateYearFilter();
    this.populateTagFilter();
    this.updateFilterButtonState();
  }

  forceUpdateUI() {
    // Forcer un re-rendu complet avec un délai minimal
    requestAnimationFrame(() => {
      this.renderTasks();
      this.updateProgress();
      this.updateStats();
    });
  }

  updateSingleTask(id) {
    // Mettre à jour une tâche spécifique sans re-rendre tout
    const taskElement = document.querySelector(`[data-task-id="${id}"]`);
    if (taskElement) {
      const task = this.tasks.find((t) => t.id === id);
      if (task) {
        const newElement = this.createTaskElement(task);
        taskElement.parentNode.replaceChild(newElement, taskElement);
      }
    }
  }

  renderTasks() {
    const container = document.getElementById("tasksContainer");

    // Vérification de sécurité
    if (!container) {
      console.error("Container manquant");
      return;
    }

    const filteredTasks = this.getFilteredTasks();

    if (filteredTasks.length === 0) {
      // Créer l'état vide s'il n'existe pas
      let emptyState = document.getElementById("emptyState");
      if (!emptyState) {
        emptyState = document.createElement("div");
        emptyState.id = "emptyState";
        emptyState.className = "empty-state";
        emptyState.innerHTML = `
          <div class="empty-icon">📝</div>
          <h3>Aucune tâche</h3>
          <p>Commencez par ajouter votre première tâche !</p>
        `;
      }

      container.innerHTML = "";
      container.appendChild(emptyState);
      emptyState.style.display = "block";
      return;
    }

    // Cacher l'état vide s'il existe
    const emptyState = document.getElementById("emptyState");
    if (emptyState) {
      emptyState.style.display = "none";
    }

    // Trier les tâches par date (plus récentes en premier)
    filteredTasks.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Créer un fragment pour optimiser les performances
    const fragment = document.createDocumentFragment();

    filteredTasks.forEach((task) => {
      const taskElement = this.createTaskElement(task);
      fragment.appendChild(taskElement);
    });

    // Vider le conteneur et ajouter le nouveau contenu de manière synchrone
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    container.appendChild(fragment);
  }

  renderFilteredTasks() {
    // Méthode simplifiée pour le rendu des tâches filtrées
    const container = document.getElementById("tasksContainer");

    // Vérification de sécurité
    if (!container) {
      console.error("Container manquant");
      return;
    }

    const filteredTasks = this.getFilteredTasks();

    console.log(
      "Tâches filtrées:",
      filteredTasks.length,
      "sur",
      this.tasks.length
    );

    if (filteredTasks.length === 0) {
      // Créer l'état vide s'il n'existe pas
      let emptyState = document.getElementById("emptyState");
      if (!emptyState) {
        emptyState = document.createElement("div");
        emptyState.id = "emptyState";
        emptyState.className = "empty-state";
        emptyState.innerHTML = `
          <div class="empty-icon">📝</div>
          <h3>Aucune tâche</h3>
          <p>Commencez par ajouter votre première tâche !</p>
        `;
      }

      container.innerHTML = "";
      container.appendChild(emptyState);
      emptyState.style.display = "block";
    } else {
      // Cacher l'état vide s'il existe
      const emptyState = document.getElementById("emptyState");
      if (emptyState) {
        emptyState.style.display = "none";
      }

      // Trier les tâches par date (plus récentes en premier)
      filteredTasks.sort((a, b) => new Date(b.date) - new Date(a.date));

      // Créer un fragment pour optimiser les performances
      const fragment = document.createDocumentFragment();

      filteredTasks.forEach((task) => {
        const taskElement = this.createTaskElement(task);
        fragment.appendChild(taskElement);
      });

      // Vider le conteneur et ajouter le nouveau contenu
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
      container.appendChild(fragment);
    }
  }

  createTaskElement(task) {
    const date = new Date(task.date);
    const formattedDate = date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const statusClass = task.status === "completed" ? "completed" : "pending";
    const statusText = task.status === "completed" ? "Terminée" : "En attente";
    const toggleIcon = task.status === "completed" ? "↩️" : "✅";
    const toggleTitle =
      task.status === "completed"
        ? "Marquer comme en attente"
        : "Marquer comme terminée";

    const priorityInfo = this.getPriorityInfo(task.priority || "medium");
    const isOverdue = this.isTaskOverdue(task);
    const overdueClass = isOverdue ? " task-overdue" : "";

    const taskElement = document.createElement("div");
    const isSearchMatch = this.searchQuery && this.isTaskMatch(task);
    taskElement.className = `task-card ${statusClass}${overdueClass}${
      isSearchMatch ? " search-match" : ""
    }`;
    taskElement.setAttribute("data-task-id", task.id);

    taskElement.innerHTML = `
      <div class="task-header">
        <div class="task-info">
          <h3 class="task-title">${this.highlightSearchMatch(
            this.escapeHtml(task.title),
            this.searchQuery
          )}</h3>
          <div class="task-date">📅 ${formattedDate}</div>
        </div>
      </div>
      ${
        task.description
          ? `<div class="task-description">${this.highlightSearchMatch(
              this.escapeHtml(task.description),
              this.searchQuery
            )}</div>`
          : ""
      }
      ${
        task.tags && task.tags.length > 0
          ? `<div class="task-tags">${task.tags
              .map(
                (tag) =>
                  `<span class="task-tag ${tag.replace(
                    "#",
                    ""
                  )}">${this.highlightSearchMatch(
                    tag,
                    this.searchQuery
                  )}</span>`
              )
              .join("")}</div>`
          : ""
      }
      <div class="task-footer">
        <div class="task-info-footer">
          <span class="task-status ${task.status}">${statusText}</span>
          <span class="task-priority ${task.priority || "medium"}">
            ${priorityInfo.icon} ${priorityInfo.label}
          </span>
        </div>
        <div class="task-actions">
          <button class="task-btn toggle-btn" title="${toggleTitle}">${toggleIcon}</button>
          <button class="task-btn edit-btn" title="Modifier">✏️</button>
          <button class="task-btn delete-btn" title="Supprimer">🗑️</button>
        </div>
      </div>
    `;

    // Ajouter les événements directement aux boutons
    const toggleBtn = taskElement.querySelector(".toggle-btn");
    const editBtn = taskElement.querySelector(".edit-btn");
    const deleteBtn = taskElement.querySelector(".delete-btn");

    toggleBtn.addEventListener("click", () => this.toggleTaskStatus(task.id));
    editBtn.addEventListener("click", () => this.editTask(task.id));
    deleteBtn.addEventListener("click", () => this.deleteTask(task.id));

    return taskElement;
  }

  updateProgress() {
    const totalTasks = this.tasks.length;
    const completedTasks = this.tasks.filter(
      (t) => t.status === "completed"
    ).length;
    const percentage =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    document.getElementById(
      "progressPercentage"
    ).textContent = `${percentage}%`;
    document.getElementById("progressFill").style.width = `${percentage}%`;
  }

  updateStats() {
    const totalTasks = this.tasks.length;
    const completedTasks = this.tasks.filter(
      (t) => t.status === "completed"
    ).length;
    const pendingTasks = totalTasks - completedTasks;

    document.getElementById("totalTasks").textContent = totalTasks;
    document.getElementById("completedTasks").textContent = completedTasks;
    document.getElementById("pendingTasks").textContent = pendingTasks;
  }

  // Gestion des modales
  showConfirmModal(title, message, confirmCallback) {
    document.getElementById("modalTitle").textContent = title;
    document.getElementById("modalMessage").textContent = message;
    this.confirmCallback = confirmCallback;
    document.getElementById("modalOverlay").classList.add("active");
  }

  hideModal() {
    document.getElementById("modalOverlay").classList.remove("active");
    this.confirmCallback = null;
  }

  confirmAction() {
    if (this.confirmCallback) {
      this.confirmCallback();
    }
    this.hideModal();
  }

  showEditModal() {
    document.getElementById("editModalOverlay").classList.add("active");
  }

  hideEditModal() {
    document.getElementById("editModalOverlay").classList.remove("active");
    this.currentEditId = null;
  }

  // Notifications
  showNotification(message, type = "info") {
    // Supprimer les notifications existantes
    const existingNotifications = document.querySelectorAll(".notification");
    existingNotifications.forEach((n) => n.remove());

    const notification = document.createElement("div");
    notification.className = `notification notification-${type}`;
    notification.setAttribute("role", "alert"); // Accessibilité : annonce vocale pour les lecteurs d'écran
    notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${this.getNotificationIcon(
                  type
                )}</span>
                <span class="notification-message">${message}</span>
            </div>
        `;

    // Styles pour la notification (à compléter par un style de base .notification dans le CSS pour la cohérence)
    notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            padding: 15px 20px;
            backdrop-filter: blur(10px);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
            z-index: 10000;
            transform: translateX(100%);
            transition: all 0.3s ease;
            max-width: 300px;
        `;

    document.body.appendChild(notification);

    // Animation d'entrée
    setTimeout(() => {
      notification.style.transform = "translateX(0)";
    }, 100);

    // Suppression automatique
    setTimeout(() => {
      notification.style.transform = "translateX(100%)";
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 300);
    }, 3000);
  }

  getNotificationIcon(type) {
    const icons = {
      success: "✅",
      error: "❌",
      warning: "⚠️",
      info: "ℹ️",
    };
    return icons[type] || icons.info;
  }

  // Utilitaires
  clearForm() {
    document.getElementById("taskForm").reset();
    this.setDefaultDate();
    document.getElementById("taskTags").value = "";
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  parseTags(tagsString) {
    if (!tagsString) return [];
    return tagsString
      .split(/\s+/)
      .map((tag) => tag.trim())
      .filter((tag) => tag.startsWith("#"))
      .map((tag) => tag.toLowerCase());
  }

  getAllTags() {
    const allTags = new Set();
    this.tasks.forEach((task) => {
      if (task.tags) {
        task.tags.forEach((tag) => allTags.add(tag));
      }
    });
    return Array.from(allTags).sort();
  }

  populateTagFilter() {
    const tagFilter = document.getElementById("tagFilter");
    const allTags = this.getAllTags();

    // Garder l'option "Tous les tags"
    tagFilter.innerHTML = '<option value="">Tous les tags</option>';

    allTags.forEach((tag) => {
      const option = document.createElement("option");
      option.value = tag;
      option.textContent = tag;
      tagFilter.appendChild(option);
    });
  }

  applySearch() {
    // Mise à jour instantanée de la recherche
    this.renderTasks();
    this.updateSearchResultsInfo();
  }

  updateSearchResultsInfo() {
    const searchResultsInfo = document.getElementById("searchResultsInfo");
    const filteredTasks = this.getFilteredTasks();

    if (this.searchQuery) {
      const searchMatches = filteredTasks.filter((task) =>
        this.isTaskMatch(task)
      );
      searchResultsInfo.innerHTML = `
        <span class="highlight">${searchMatches.length}</span> résultat(s) trouvé(s) sur <span class="highlight">${filteredTasks.length}</span> tâche(s)
      `;
      searchResultsInfo.classList.add("visible");
    } else {
      searchResultsInfo.classList.remove("visible");
    }
  }

  updateFilterButtonState() {
    // Garder l'icône originale et le design original
    const clearFiltersBtn = document.getElementById("clearFilters");
    clearFiltersBtn.innerHTML =
      '<span class="btn-icon">🔄</span>Effacer les filtres';
  }

  isTaskMatch(task) {
    if (!this.searchQuery) return true;

    const searchLower = this.searchQuery.toLowerCase();
    const titleMatch = task.title.toLowerCase().includes(searchLower);
    const descriptionMatch =
      task.description && task.description.toLowerCase().includes(searchLower);
    const tagsMatch =
      task.tags &&
      task.tags.some((tag) => tag.toLowerCase().includes(searchLower));

    return titleMatch || descriptionMatch || tagsMatch;
  }

  highlightSearchMatch(text, searchQuery) {
    if (!searchQuery) return text;

    const regex = new RegExp(`(${searchQuery})`, "gi");
    return text.replace(regex, '<mark class="search-highlight">$1</mark>');
  }

  getPriorityInfo(priority) {
    const priorities = {
      low: { label: "Basse", icon: "🟢", color: "success" },
      medium: { label: "Moyenne", icon: "🔵", color: "primary" },
      high: { label: "Haute", icon: "🟡", color: "warning" },
      urgent: { label: "Urgente", icon: "🔴", color: "danger" },
    };
    return priorities[priority] || priorities.medium;
  }

  isTaskOverdue(task) {
    if (task.status === "completed") return false;
    const taskDate = new Date(task.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return taskDate < today;
  }

  isTaskDueSoon(task) {
    if (task.status === "completed") return false;
    const taskDate = new Date(task.date);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    today.setHours(0, 0, 0, 0);
    return taskDate >= today && taskDate <= tomorrow;
  }

  checkNotifications() {
    const overdueTasks = this.tasks.filter((task) => this.isTaskOverdue(task));
    const dueSoonTasks = this.tasks.filter((task) => this.isTaskDueSoon(task));

    // Notifications pour les tâches en retard
    overdueTasks.forEach((task) => {
      this.showNotificationToast(
        "⚠️ Tâche en retard",
        `${task.title} était due le ${new Date(task.date).toLocaleDateString(
          "fr-FR"
        )}`,
        "overdue"
      );
    });

    // Notifications pour les tâches à venir
    dueSoonTasks.forEach((task) => {
      this.showNotificationToast(
        "⏰ Rappel",
        `${task.title} est due ${
          task.date === new Date().toISOString().split("T")[0]
            ? "aujourd'hui"
            : "demain"
        }`,
        "reminder"
      );
    });
  }

  showNotificationToast(title, message, type = "info") {
    // Supprimer les notifications existantes du même type
    const existingNotifications = document.querySelectorAll(
      `.notification-toast.${type}`
    );
    existingNotifications.forEach((n) => n.remove());

    const notification = document.createElement("div");
    notification.className = `notification-toast ${type}`;
    notification.innerHTML = `
      <div class="notification-icon">${
        type === "overdue" ? "⚠️" : type === "reminder" ? "⏰" : "ℹ️"
      }</div>
      <div class="notification-content">
        <div class="notification-title">${title}</div>
        <div class="notification-message">${message}</div>
      </div>
      <button class="notification-close" onclick="this.parentElement.remove()">×</button>
    `;

    document.body.appendChild(notification);

    // Animation d'entrée
    setTimeout(() => {
      notification.classList.add("show");
    }, 100);

    // Suppression automatique après 5 secondes
    setTimeout(() => {
      notification.classList.remove("show");
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 300);
    }, 5000);
  }

  // Stockage local
  saveTasks() {
    localStorage.setItem("futurTask-tasks", JSON.stringify(this.tasks));
  }

  loadTasks() {
    const saved = localStorage.getItem("futurTask-tasks");
    if (saved) {
      try {
        this.tasks = JSON.parse(saved);
      } catch (error) {
        console.error("Erreur lors du chargement des tâches:", error);
        this.tasks = [];
      }
    }
  }

  // Méthodes PWA
  setupPWA() {
    // Écouter l'événement beforeinstallprompt
    window.addEventListener("beforeinstallprompt", (e) => {
      // Empêcher l'affichage automatique du prompt
      e.preventDefault();

      // Stocker l'événement pour l'utiliser plus tard
      this.deferredPrompt = e;

      // Vérifier si l'app est déjà installée
      this.checkIfPWAInstalled();

      // Afficher le bouton d'installation si nécessaire
      this.showInstallButton();
    });

    // Écouter l'événement appinstalled
    window.addEventListener("appinstalled", (evt) => {
      console.log("Application installée avec succès");
      this.isPWAInstalled = true;
      this.hideInstallButton();

      // Afficher une notification de succès
      this.showNotificationToast(
        "Installation réussie !",
        "FuturTask a été installé sur votre appareil.",
        "success"
      );
    });

    // Vérifier si l'app est déjà installée au chargement
    this.checkIfPWAInstalled();
  }

  checkIfPWAInstalled() {
    // Vérifier si l'app est en mode standalone (installée)
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true
    ) {
      this.isPWAInstalled = true;
      this.hideInstallButton();
    }
  }

  showInstallButton() {
    // Créer le bouton d'installation s'il n'existe pas
    let installButton = document.getElementById("installButton");

    if (!installButton && this.deferredPrompt && !this.isPWAInstalled) {
      installButton = document.createElement("button");
      installButton.id = "installButton";
      installButton.className = "install-btn-header";
      installButton.innerHTML = `
        <span class="btn-icon">📱</span>
        Installer
      `;

      // Ajouter le bouton dans le header
      const headerActions = document.querySelector(".header-actions");
      if (headerActions) {
        headerActions.appendChild(installButton);

        // Ajouter l'événement de clic
        installButton.addEventListener("click", () => {
          this.installPWA();
        });
      }
    }
  }

  hideInstallButton() {
    const installButton = document.getElementById("installButton");
    if (installButton) {
      installButton.remove();
    }
  }

  async installPWA() {
    if (!this.deferredPrompt) {
      console.log("Aucun prompt d'installation disponible");
      return;
    }

    // Afficher le prompt d'installation
    this.deferredPrompt.prompt();

    // Attendre la réponse de l'utilisateur
    const { outcome } = await this.deferredPrompt.userChoice;

    if (outcome === "accepted") {
      console.log("Utilisateur a accepté l'installation");
      this.showNotificationToast(
        "Installation en cours...",
        "FuturTask sera bientôt installé sur votre appareil.",
        "info"
      );
    } else {
      console.log("Utilisateur a refusé l'installation");
      this.showNotificationToast(
        "Installation annulée",
        "Vous pouvez installer l'application plus tard.",
        "info"
      );
    }

    // Réinitialiser le prompt
    this.deferredPrompt = null;
  }

  // Méthodes de gestion des profils
  loadProfiles() {
    const saved = localStorage.getItem("futurTask-profiles");
    if (saved) {
      try {
        this.profiles = JSON.parse(saved);
      } catch (error) {
        console.error("Erreur lors du chargement des profils:", error);
        this.profiles = [];
      }
    }

    // Créer un profil par défaut s'il n'y en a pas
    if (this.profiles.length === 0) {
      this.createDefaultProfile();
    }

    // Charger le profil actuel
    const currentProfileId = localStorage.getItem("futurTask-currentProfile");
    if (currentProfileId) {
      this.currentProfile = this.profiles.find(
        (p) => p.id === currentProfileId
      );
    }

    if (!this.currentProfile && this.profiles.length > 0) {
      this.currentProfile = this.profiles[0];
    }
  }

  createDefaultProfile() {
    const defaultProfile = {
      id: "default",
      name: "Principal",
      icon: "👤",
      color: "#00ff88",
      createdAt: new Date().toISOString(),
    };

    this.profiles.push(defaultProfile);
    this.currentProfile = defaultProfile;
    this.saveProfiles();
  }

  saveProfiles() {
    localStorage.setItem("futurTask-profiles", JSON.stringify(this.profiles));
    if (this.currentProfile) {
      localStorage.setItem("futurTask-currentProfile", this.currentProfile.id);
    }
  }

  setupProfiles() {
    this.updateProfileDisplay();
    this.setupProfileEventListeners();
  }

  updateProfileDisplay() {
    const profileName = document.getElementById("currentProfileName");
    const profileBtn = document.getElementById("profileBtn");

    if (this.currentProfile) {
      profileName.textContent = this.currentProfile.name;
      profileBtn.querySelector(".btn-icon").textContent =
        this.currentProfile.icon;
    } else {
      profileName.textContent = "Profil";
      profileBtn.querySelector(".btn-icon").textContent = "👤";
    }
  }

  setupProfileEventListeners() {
    // Bouton de sélection de profil
    document.getElementById("profileBtn").addEventListener("click", () => {
      this.toggleProfileDropdown();
    });

    // Bouton d'ajout de profil
    document.getElementById("addProfileBtn").addEventListener("click", () => {
      this.showProfileModal();
    });

    // Bouton de gestion des profils
    document
      .getElementById("manageProfilesBtn")
      .addEventListener("click", () => {
        this.showProfileModal();
      });

    // Fermer le dropdown en cliquant ailleurs
    document.addEventListener("click", (e) => {
      const profileSelector = document.querySelector(".profile-selector");
      if (!profileSelector.contains(e.target)) {
        this.hideProfileDropdown();
      }
    });

    // Formulaire de création de profil
    document.getElementById("profileForm").addEventListener("submit", (e) => {
      e.preventDefault();
      this.createProfile();
    });

    // Fermer la modal de profil
    document
      .getElementById("closeProfileModal")
      .addEventListener("click", () => {
        this.hideProfileModal();
      });

    // Fermer la modal en cliquant sur l'overlay
    document
      .getElementById("profileModalOverlay")
      .addEventListener("click", (e) => {
        if (e.target.id === "profileModalOverlay") {
          this.hideProfileModal();
        }
      });
  }

  toggleProfileDropdown() {
    const dropdown = document.getElementById("profileDropdown");
    dropdown.classList.toggle("active");

    if (dropdown.classList.contains("active")) {
      this.updateProfileList();
    }
  }

  hideProfileDropdown() {
    const dropdown = document.getElementById("profileDropdown");
    dropdown.classList.remove("active");
  }

  updateProfileList() {
    const profileList = document.getElementById("profileList");
    profileList.innerHTML = "";

    this.profiles.forEach((profile) => {
      const profileItem = document.createElement("div");
      profileItem.className = `profile-item ${
        profile.id === this.currentProfile?.id ? "active" : ""
      }`;
      profileItem.innerHTML = `
        <span class="profile-item-icon">${profile.icon}</span>
        <span class="profile-item-name">${profile.name}</span>
        <div class="profile-item-color" style="background-color: ${profile.color}"></div>
      `;

      profileItem.addEventListener("click", () => {
        this.switchProfile(profile);
      });

      profileList.appendChild(profileItem);
    });
  }

  switchProfile(profile) {
    this.currentProfile = profile;
    this.saveProfiles();
    this.updateProfileDisplay();
    this.hideProfileDropdown();

    // Recharger les tâches du nouveau profil
    this.loadTasks();
    this.updateUI();

    this.showNotificationToast(
      `Profil changé`,
      `Vous utilisez maintenant le profil "${profile.name}"`,
      "info"
    );
  }

  showProfileModal() {
    document.getElementById("profileModalOverlay").classList.add("active");
    this.updateProfilesList();
  }

  hideProfileModal() {
    document.getElementById("profileModalOverlay").classList.remove("active");
    document.getElementById("profileForm").reset();
  }

  createProfile() {
    const name = document.getElementById("profileName").value.trim();
    const color = document.getElementById("profileColor").value;
    const icon = document.getElementById("profileIcon").value;

    if (!name) {
      this.showNotification("Veuillez entrer un nom de profil", "error");
      return;
    }

    // Vérifier si le nom existe déjà
    if (
      this.profiles.some((p) => p.name.toLowerCase() === name.toLowerCase())
    ) {
      this.showNotification("Un profil avec ce nom existe déjà", "error");
      return;
    }

    const newProfile = {
      id: `profile_${Date.now()}`,
      name: name,
      icon: icon,
      color: color,
      createdAt: new Date().toISOString(),
    };

    this.profiles.push(newProfile);
    this.saveProfiles();
    this.updateProfilesList();

    // Basculer vers le nouveau profil
    this.switchProfile(newProfile);

    this.hideProfileModal();
    this.showNotificationToast(
      "Profil créé",
      `Le profil "${name}" a été créé avec succès`,
      "success"
    );
  }

  updateProfilesList() {
    const profilesList = document.getElementById("profilesList");
    profilesList.innerHTML = "";

    this.profiles.forEach((profile) => {
      const profileCard = document.createElement("div");
      profileCard.className = "profile-card";
      profileCard.innerHTML = `
        <span class="profile-card-icon">${profile.icon}</span>
        <span class="profile-card-name">${profile.name}</span>
        <div class="profile-card-color" style="background-color: ${profile.color}"></div>
        <div class="profile-card-actions">
          <button class="profile-card-btn" onclick="app.deleteProfile('${profile.id}')" title="Supprimer le profil">🗑️</button>
        </div>
      `;

      profilesList.appendChild(profileCard);
    });
  }

  deleteProfile(profileId) {
    if (this.profiles.length <= 1) {
      this.showNotification(
        "Impossible de supprimer le dernier profil",
        "error"
      );
      return;
    }

    const profile = this.profiles.find((p) => p.id === profileId);
    if (!profile) return;

    this.showConfirmModal(
      "Supprimer le profil",
      `Êtes-vous sûr de vouloir supprimer le profil "${profile.name}" ? Toutes les tâches associées seront également supprimées.`,
      () => {
        // Supprimer le profil
        this.profiles = this.profiles.filter((p) => p.id !== profileId);

        // Si c'était le profil actuel, basculer vers le premier profil
        if (this.currentProfile?.id === profileId) {
          this.currentProfile = this.profiles[0];
        }

        this.saveProfiles();
        this.updateProfileDisplay();
        this.updateProfilesList();

        // Recharger les tâches
        this.loadTasks();
        this.updateUI();

        this.showNotificationToast(
          "Profil supprimé",
          `Le profil "${profile.name}" a été supprimé`,
          "info"
        );
      }
    );
  }

  // Modifier les méthodes existantes pour utiliser les profils
  loadTasks() {
    if (!this.currentProfile) return;

    const saved = localStorage.getItem(
      `futurTask-tasks-${this.currentProfile.id}`
    );
    if (saved) {
      try {
        this.tasks = JSON.parse(saved);
      } catch (error) {
        console.error("Erreur lors du chargement des tâches:", error);
        this.tasks = [];
      }
    } else {
      this.tasks = [];
    }
  }

  saveTasks() {
    if (!this.currentProfile) return;
    localStorage.setItem(
      `futurTask-tasks-${this.currentProfile.id}`,
      JSON.stringify(this.tasks)
    );
  }
}

// Styles CSS pour les notifications (ajoutés dynamiquement)
const notificationStyles = `
    .notification-content {
        display: flex;
        align-items: center;
        gap: 10px;
        color: var(--text-primary);
    }
    
    .notification-icon {
        font-size: 1.2rem;
    }
    
    .notification-message {
        font-weight: 500;
    }
    
    .notification-success {
        border-left: 4px solid var(--accent-success);
    }
    
    .notification-error {
        border-left: 4px solid var(--accent-danger);
    }
    
    .notification-warning {
        border-left: 4px solid var(--accent-warning);
    }
    
    .notification-info {
        border-left: 4px solid var(--accent-primary);
    }
`;

// Ajouter les styles des notifications
const styleSheet = document.createElement("style");
styleSheet.textContent = notificationStyles;
document.head.appendChild(styleSheet);

// Initialisation de l'application
let app;
document.addEventListener("DOMContentLoaded", () => {
  app = new FuturTaskApp();
  window.app = app; // Rendre l'application accessible globalement pour les boutons dynamiques
});

// Gestion des raccourcis clavier
document.addEventListener("keydown", (e) => {
  // Échap pour fermer les modales
  if (e.key === "Escape") {
    const modalOverlay = document.getElementById("modalOverlay");
    const editModalOverlay = document.getElementById("editModalOverlay");

    if (modalOverlay.classList.contains("active")) {
      app.hideModal();
    }

    if (editModalOverlay.classList.contains("active")) {
      app.hideEditModal();
    }
  }

  // Ctrl/Cmd + Enter pour ajouter une tâche rapidement
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    const taskForm = document.getElementById("taskForm");
    const titleInput = document.getElementById("taskTitle");

    if (
      document.activeElement === titleInput ||
      taskForm.contains(document.activeElement)
    ) {
      e.preventDefault();
      app.addTask();
    }
  }
});
