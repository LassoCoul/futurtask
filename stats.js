// Page Statistiques FuturTask
class StatsPage {
  constructor() {
    this.tasks = [];
    this.charts = {};
    this.init();
  }

  init() {
    this.loadTasks();
    this.setupEventListeners();
    this.setupTheme();
    this.updateAllStats();
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
}

// Initialisation de la page statistiques
document.addEventListener("DOMContentLoaded", () => {
  new StatsPage();
});
