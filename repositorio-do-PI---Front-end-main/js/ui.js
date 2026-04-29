import { getPage, getUser } from "./state.js";

export function shell({
  title = "",
  subtitle = "",
  roleLabel = "",
  navItems = [],
  heroClass = "",
  heroTitle = "",
  heroText = "",
  heroAction = "",
  content = ""
}) {
  const user = getUser();

  return `
    <div class="app-shell">
      <header class="topbar">
        <div class="brand">
          <div class="brand-logo-wrap">
            <img src="assets/senac-logo.png" alt="Senac" class="brand-logo-image" />
          </div>

          <div class="brand-copy">
            <h1>SGAC</h1>
            <p>${roleLabel}</p>
          </div>
        </div>

        <div class="topbar-actions">
          <div class="user-chip">${user?.name || "Usuário"}</div>
          <button class="btn btn-outline" data-action="logout">Sair</button>
        </div>
      </header>

      <nav class="topnav">
        ${navItems
          .map(
            (item) => `
              <button
                class="topnav-link ${getPage() === item.page ? "active" : ""}"
                data-go="${item.page}"
              >
                <span class="topnav-icon">${item.icon || ""}</span>
                ${item.label}
              </button>
            `
          )
          .join("")}
      </nav>

      <main class="page-container">
        ${
          title
            ? `
              <section class="page-header compact ${heroClass}">
                <div class="page-header-icon">${title.slice(0, 1)}</div>
                <div>
                  <h2>${title}</h2>
                  <p>${subtitle}</p>
                </div>
              </section>
            `
            : ""
        }

        ${
          heroTitle
            ? `
              <section class="hero-card ${heroClass}">
                <div>
                  <h3>${heroTitle}</h3>
                  <p>${heroText}</p>
                </div>
                ${heroAction}
              </section>
            `
            : ""
        }

        ${content}
      </main>

      <footer class="footer">© 2026 SGAC - Sistema de Gestão de Atividades Complementares</footer>
    </div>
  `;
}

export function emptyState({
  icon = "○",
  title = "Nenhum dado encontrado",
  text = "",
  actionLabel = "",
  actionPage = ""
}) {
  return `
    <div class="empty-state large">
      <div class="empty-icon">${icon}</div>
      <h3>${title}</h3>
      <p>${text}</p>
      ${
        actionLabel
          ? `<button class="btn btn-warning" data-go="${actionPage}">${actionLabel}</button>`
          : ""
      }
    </div>
  `;
}

export function infoCard(title, text, extra = "") {
  return `
    <section class="content-card info-card">
      <h3>${title}</h3>
      <p>${text}</p>
      ${extra}
    </section>
  `;
}

export function modalActions(primaryLabel, danger = false) {
  return `
    <div class="modal-actions">
      <button type="button" class="btn btn-outline" data-modal-close>Cancelar</button>
      <button type="submit" class="btn ${danger ? "btn-danger" : "btn-primary"}">
        ${primaryLabel}
      </button>
    </div>
  `;
}

export function openModal(content) {
  const modal = document.createElement("div");

  modal.className = "modal-overlay";
  modal.innerHTML = `<div class="modal-card">${content}</div>`;
  document.body.appendChild(modal);

  return modal;
}

export function closeModal() {
  document.querySelector(".modal-overlay")?.remove();
}

export function bindModalClose() {
  document.querySelectorAll("[data-modal-close]").forEach((button) => {
    button.addEventListener("click", closeModal);
  });

  document.querySelector(".modal-overlay")?.addEventListener("click", (event) => {
    if (event.target.classList.contains("modal-overlay")) {
      closeModal();
    }
  });
}

export function showToast(message, variant = "info") {
  document.querySelector(".toast")?.remove();

  const toast = document.createElement("div");

  toast.className = `toast toast-${variant}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add("visible"), 30);
  setTimeout(() => {
    toast.classList.remove("visible");
    setTimeout(() => toast.remove(), 250);
  }, 2400);
}

export function attachShellEvents({ onNavigate, onLogout }) {
  document.querySelectorAll("[data-go]").forEach((button) => {
    button.addEventListener("click", () => onNavigate(button.dataset.go));
  });

  document.querySelectorAll('[data-action="logout"]').forEach((button) => {
    button.addEventListener("click", onLogout);
  });
}
