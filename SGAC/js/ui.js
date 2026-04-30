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
  content = "",
}) {
  const user = getUser();
  return `<div class="app-shell"><aside class="sidebar"><div class="sidebar-brand"><div class="brand-logo-wrap"><img src="assets/senac-logo.png" alt="Senac" class="brand-logo-image" /></div><div class="brand-copy"><h1>SGAC</h1><p>${roleLabel}</p></div></div><nav class="sidebar-nav">${navItems.map((item) => `<button class="sidebar-link ${getPage() === item.page ? "active" : ""}" data-go="${item.page}"><span class="sidebar-icon">${item.icon || ""}</span><span>${item.label}</span></button>`).join("")}</nav><div class="sidebar-footer"><div class="user-chip">${user?.name || "Usuário"}</div><button class="btn btn-outline sidebar-logout" data-action="logout">Sair</button></div></aside><div class="shell-main"><header class="topbar"><div class="topbar-copy">${title ? `<p class="page-kicker">${roleLabel}</p><h2>${title}</h2><p>${subtitle}</p>` : `<p class="page-kicker">${roleLabel}</p><h2>${heroTitle || "SGAC"}</h2><p>${heroText || subtitle}</p>`}</div></header>${heroTitle ? `<section class="hero-card ${heroClass}"><div><h3>${heroTitle}</h3><p>${heroText}</p></div>${heroAction ? `<div class="hero-card-action">${heroAction}</div>` : ""}</section>` : ""}<main class="page-container">${content}</main><footer class="footer">© 2026 SGAC - Sistema de Gestão de Atividades Complementares</footer></div></div>`;
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
  }, 2200);
}
export function attachShellEvents({ onNavigate, onLogout }) {
  document
    .querySelectorAll("[data-go]")
    .forEach((button) =>
      button.addEventListener("click", () => onNavigate(button.dataset.go)),
    );
  document
    .querySelectorAll('[data-action="logout"]')
    .forEach((button) => button.addEventListener("click", onLogout));
}
export function emptyState({
  icon = "○",
  title = "Nenhum dado encontrado",
  text = "",
  actionLabel = "",
  actionPage = "",
}) {
  return `<div class="empty-state large"><div class="empty-icon">${icon}</div><h3>${title}</h3><p>${text}</p>${actionLabel ? `<button class="btn btn-warning" data-go="${actionPage}">${actionLabel}</button>` : ""}</div>`;
}
export function modalActions(primaryLabel, danger = false) {
  return `<div class="modal-actions"><button type="button" class="btn btn-outline" data-modal-close>Cancelar</button><button type="submit" class="btn ${danger ? "btn-danger" : "btn-primary"}">${primaryLabel}</button></div>`;
}
export function bindModalClose() {
  document
    .querySelectorAll("[data-modal-close]")
    .forEach((button) => button.addEventListener("click", closeModal));
  document
    .querySelector(".modal-overlay")
    ?.addEventListener("click", (event) => {
      if (event.target.classList.contains("modal-overlay")) closeModal();
    });
}
