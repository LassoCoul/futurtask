// Page Statistiques FuturTask
class StatsPage {
  constructor() {
    this.tasks = [];
    this.charts = {};

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
    this.setupProfileEventListeners();
    this.updateProfileDisplay();
    this.loadTasks();
    this.setupEventListeners();
    this.setupTheme();
    this.updateAllStats();

    // Initialiser PWA
    this.setupPWA();
  }

  setupEventListeners() {
    // Toggle du thème
    document.getElementById("themeToggle").addEventListener("click", () => {
      this.toggleTheme();
    });
  }

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

    // Mettre à jour les graphiques avec les nouvelles couleurs
    setTimeout(() => {
      this.updateCharts();
    }, 100); // Petit délai pour s'assurer que le thème est appliqué

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

  getThemeColors() {
    const isDark =
      document.documentElement.getAttribute("data-theme") === "dark";

    return {
      textPrimary: getComputedStyle(document.documentElement).getPropertyValue(
        "--text-primary"
      ),
      textSecondary: getComputedStyle(
        document.documentElement
      ).getPropertyValue("--text-secondary"),
      accentPrimary: getComputedStyle(
        document.documentElement
      ).getPropertyValue("--accent-primary"),
      accentSecondary: getComputedStyle(
        document.documentElement
      ).getPropertyValue("--accent-secondary"),
      isDark: isDark,
    };
  }

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

  updateAllStats() {
    this.updateSummaryCards();
    this.updateCharts();
    this.updateRecentTasks();
    this.updateTopTags();
  }

  updateSummaryCards() {
    const totalTasks = this.tasks.length;
    const completedTasks = this.tasks.filter(
      (t) => t.status === "completed"
    ).length;
    const pendingTasks = totalTasks - completedTasks;
    const overdueTasks = this.tasks.filter((task) =>
      this.isTaskOverdue(task)
    ).length;

    document.getElementById("totalTasks").textContent = totalTasks;
    document.getElementById("completedTasks").textContent = completedTasks;
    document.getElementById("pendingTasks").textContent = pendingTasks;
    document.getElementById("overdueTasks").textContent = overdueTasks;
  }

  updateCharts() {
    this.updatePriorityChart();
    this.updateMonthlyChart();
    this.updateTagsChart();
    this.updatePerformanceMetrics();
  }

  updatePriorityChart() {
    const ctx = document.getElementById("priorityChart");
    if (!ctx) return;

    const priorityData = this.getPriorityData();
    const colors = this.getThemeColors();

    if (this.charts.priority) {
      this.charts.priority.destroy();
    }

    this.charts.priority = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: priorityData.labels,
        datasets: [
          {
            data: priorityData.values,
            backgroundColor: [
              "rgba(0, 255, 136, 0.8)",
              "rgba(0, 212, 255, 0.8)",
              "rgba(255, 170, 0, 0.8)",
              "rgba(255, 71, 87, 0.8)",
            ],
            borderColor: [
              "rgba(0, 255, 136, 1)",
              "rgba(0, 212, 255, 1)",
              "rgba(255, 170, 0, 1)",
              "rgba(255, 71, 87, 1)",
            ],
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              color: colors.textPrimary,
              font: { size: 12 },
            },
          },
        },
      },
    });
  }

  updateMonthlyChart() {
    const ctx = document.getElementById("monthlyChart");
    if (!ctx) return;

    const monthlyData = this.getMonthlyData();

    if (this.charts.monthly) {
      this.charts.monthly.destroy();
    }

    this.charts.monthly = new Chart(ctx, {
      type: "line",
      data: {
        labels: monthlyData.labels,
        datasets: [
          {
            label: "Tâches créées",
            data: monthlyData.created,
            borderColor: "rgba(0, 212, 255, 1)",
            backgroundColor: "rgba(0, 212, 255, 0.1)",
            tension: 0.4,
          },
          {
            label: "Tâches terminées",
            data: monthlyData.completed,
            borderColor: "rgba(0, 255, 136, 1)",
            backgroundColor: "rgba(0, 255, 136, 0.1)",
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "top",
            labels: {
              color: getComputedStyle(
                document.documentElement
              ).getPropertyValue("--text-primary"),
              font: { size: 12 },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              color: getComputedStyle(
                document.documentElement
              ).getPropertyValue("--text-primary"),
            },
            grid: {
              color: getComputedStyle(
                document.documentElement
              ).getPropertyValue("--border-color"),
            },
          },
          x: {
            ticks: {
              color: getComputedStyle(
                document.documentElement
              ).getPropertyValue("--text-primary"),
            },
            grid: {
              color: getComputedStyle(
                document.documentElement
              ).getPropertyValue("--border-color"),
            },
          },
        },
      },
    });
  }

  updateTagsChart() {
    const ctx = document.getElementById("tagsChart");
    if (!ctx) return;

    const tagsData = this.getTagsData();

    if (this.charts.tags) {
      this.charts.tags.destroy();
    }

    this.charts.tags = new Chart(ctx, {
      type: "bar",
      data: {
        labels: tagsData.labels,
        datasets: [
          {
            label: "Utilisation",
            data: tagsData.values,
            backgroundColor: "rgba(255, 0, 110, 0.8)",
            borderColor: "rgba(255, 0, 110, 1)",
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              color: getComputedStyle(
                document.documentElement
              ).getPropertyValue("--text-primary"),
            },
            grid: {
              color: getComputedStyle(
                document.documentElement
              ).getPropertyValue("--border-color"),
            },
          },
          x: {
            ticks: {
              color: getComputedStyle(
                document.documentElement
              ).getPropertyValue("--text-primary"),
            },
            grid: {
              color: getComputedStyle(
                document.documentElement
              ).getPropertyValue("--border-color"),
            },
          },
        },
      },
    });
  }

  updatePerformanceMetrics() {
    const metrics = this.calculatePerformanceMetrics();

    document.getElementById(
      "completionRate"
    ).textContent = `${metrics.completionRate}%`;
    document.getElementById(
      "avgCompletionTime"
    ).textContent = `${metrics.avgCompletionTime}j`;
    document.getElementById(
      "overdueRate"
    ).textContent = `${metrics.overdueRate}%`;
  }

  updateRecentTasks() {
    const recentTasksContainer = document.getElementById("recentTasks");
    const recentTasks = this.tasks
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);

    if (recentTasks.length === 0) {
      recentTasksContainer.innerHTML =
        '<p class="no-data">Aucune tâche récente</p>';
      return;
    }

    recentTasksContainer.innerHTML = recentTasks
      .map(
        (task) => `
      <div class="recent-task-item">
        <div class="task-info">
          <span class="task-title">${this.escapeHtml(task.title)}</span>
          <span class="task-date">${new Date(task.date).toLocaleDateString(
            "fr-FR"
          )}</span>
        </div>
        <span class="task-status ${task.status}">${
          task.status === "completed" ? "✅" : "⏳"
        }</span>
      </div>
    `
      )
      .join("");
  }

  updateTopTags() {
    const topTagsContainer = document.getElementById("topTags");
    const tagCounts = {};

    this.tasks.forEach((task) => {
      if (task.tags) {
        task.tags.forEach((tag) => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      }
    });

    const sortedTags = Object.entries(tagCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);

    if (sortedTags.length === 0) {
      topTagsContainer.innerHTML = '<p class="no-data">Aucun tag utilisé</p>';
      return;
    }

    topTagsContainer.innerHTML = sortedTags
      .map(
        ([tag, count]) => `
      <div class="tag-item">
        <span class="tag-name">${tag}</span>
        <span class="tag-count">${count}</span>
      </div>
    `
      )
      .join("");
  }

  // Méthodes utilitaires
  getPriorityData() {
    const priorities = { low: 0, medium: 0, high: 0, urgent: 0 };
    const labels = {
      low: "Basse",
      medium: "Moyenne",
      high: "Haute",
      urgent: "Urgente",
    };

    this.tasks.forEach((task) => {
      const priority = task.priority || "medium";
      priorities[priority]++;
    });

    return {
      labels: Object.keys(priorities).map((key) => labels[key]),
      values: Object.values(priorities),
    };
  }

  getMonthlyData() {
    const months = {};
    const currentYear = new Date().getFullYear();

    for (let i = 0; i < 12; i++) {
      const month = new Date(currentYear, i, 1).toLocaleDateString("fr-FR", {
        month: "short",
      });
      months[month] = { created: 0, completed: 0 };
    }

    this.tasks.forEach((task) => {
      const taskDate = new Date(task.date);
      const month = taskDate.toLocaleDateString("fr-FR", { month: "short" });

      if (taskDate.getFullYear() === currentYear) {
        months[month].created++;
        if (task.status === "completed") {
          months[month].completed++;
        }
      }
    });

    return {
      labels: Object.keys(months),
      created: Object.values(months).map((m) => m.created),
      completed: Object.values(months).map((m) => m.completed),
    };
  }

  getTagsData() {
    const tagCounts = {};

    this.tasks.forEach((task) => {
      if (task.tags) {
        task.tags.forEach((tag) => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      }
    });

    const sortedTags = Object.entries(tagCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    return {
      labels: sortedTags.map(([tag]) => tag),
      values: sortedTags.map(([, count]) => count),
    };
  }

  calculatePerformanceMetrics() {
    const totalTasks = this.tasks.length;
    const completedTasks = this.tasks.filter(
      (t) => t.status === "completed"
    ).length;
    const overdueTasks = this.tasks.filter((task) =>
      this.isTaskOverdue(task)
    ).length;

    const completionRate =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const overdueRate =
      totalTasks > 0 ? Math.round((overdueTasks / totalTasks) * 100) : 0;

    let totalDays = 0;
    let completedCount = 0;

    this.tasks.forEach((task) => {
      if (task.status === "completed" && task.createdAt) {
        const created = new Date(task.createdAt);
        const completed = new Date(task.date);
        const days = Math.ceil((completed - created) / (1000 * 60 * 60 * 24));
        totalDays += days;
        completedCount++;
      }
    });

    const avgCompletionTime =
      completedCount > 0 ? Math.round(totalDays / completedCount) : 0;

    return {
      completionRate,
      overdueRate,
      avgCompletionTime,
    };
  }

  isTaskOverdue(task) {
    if (task.status === "completed") return false;
    const taskDate = new Date(task.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return taskDate < today;
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
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
    } else {
      console.log("Utilisateur a refusé l'installation");
    }

    // Réinitialiser le prompt
    this.deferredPrompt = null;
  }

  // Méthodes de gestion des profils pour la page statistiques
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
    localStorage.setItem("futurTask-currentProfile", profile.id);
    this.updateProfileDisplay();
    this.hideProfileDropdown();

    // Recharger les tâches du nouveau profil
    this.loadTasks();
    this.updateAllStats();
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
      alert("Veuillez entrer un nom de profil");
      return;
    }

    // Vérifier si le nom existe déjà
    if (
      this.profiles.some((p) => p.name.toLowerCase() === name.toLowerCase())
    ) {
      alert("Un profil avec ce nom existe déjà");
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
    localStorage.setItem("futurTask-profiles", JSON.stringify(this.profiles));
    this.updateProfilesList();

    // Basculer vers le nouveau profil
    this.switchProfile(newProfile);

    this.hideProfileModal();
    alert(`Le profil "${name}" a été créé avec succès`);
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
          <button class="profile-card-btn" onclick="statsPage.deleteProfile('${profile.id}')" title="Supprimer le profil">🗑️</button>
        </div>
      `;

      profilesList.appendChild(profileCard);
    });
  }

  deleteProfile(profileId) {
    if (this.profiles.length <= 1) {
      alert("Impossible de supprimer le dernier profil");
      return;
    }

    const profile = this.profiles.find((p) => p.id === profileId);
    if (!profile) return;

    if (
      confirm(
        `Êtes-vous sûr de vouloir supprimer le profil "${profile.name}" ? Toutes les tâches associées seront également supprimées.`
      )
    ) {
      // Supprimer le profil
      this.profiles = this.profiles.filter((p) => p.id !== profileId);

      // Si c'était le profil actuel, basculer vers le premier profil
      if (this.currentProfile?.id === profileId) {
        this.currentProfile = this.profiles[0];
      }

      localStorage.setItem("futurTask-profiles", JSON.stringify(this.profiles));
      this.updateProfileDisplay();
      this.updateProfilesList();

      // Recharger les tâches
      this.loadTasks();
      this.updateAllStats();

      alert(`Le profil "${profile.name}" a été supprimé`);
    }
  }
}

// Initialisation de la page statistiques
document.addEventListener("DOMContentLoaded", () => {
  new StatsPage();
});
