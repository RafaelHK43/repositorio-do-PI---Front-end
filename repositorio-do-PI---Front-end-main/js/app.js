import { attachLogin, loginPage } from "./auth.js";
import {
  adminDashboardPage,
  areasPage,
  attachAdminPage,
  coordinatorsPage,
  coursesPage,
  studentsPage
} from "./admin.js";
import {
  attachCoordinatorPage,
  coordinatorDashboardPage,
  coordinatorStudentsPage,
  coordinatorValidatePage
} from "./coordinator.js";
import { registerPWA } from "./pwa.js";
import { clearUser, getPage, getUser, setPage } from "./state.js";
import {
  attachStudentPage,
  studentActivitiesPage,
  studentAddPage,
  studentDashboardPage,
  studentRulesPage
} from "./student.js";
import { attachShellEvents, showToast } from "./ui.js";

const app = document.getElementById("app");

function navigate(page) {
  setPage(page);
  render();
}

function logout() {
  clearUser();
  setPage("login");
  showToast("Sessão encerrada.", "info");
  render();
}

function validPagesByRole(role) {
  if (role === "superadmin") {
    return [
      "admin-dashboard",
      "courses",
      "admin-areas",
      "admin-coordinators",
      "admin-students"
    ];
  }

  if (role === "coordinator") {
    return [
      "coordinator-dashboard",
      "courses",
      "admin-areas",
      "coordinator-validate",
      "coordinator-students"
    ];
  }

  if (role === "student") {
    return ["student-dashboard", "student-add", "student-activities", "student-rules"];
  }

  return ["login"];
}

function getPageRenderer(page) {
  const map = {
    "admin-dashboard": adminDashboardPage,
    courses: coursesPage,
    "admin-areas": areasPage,
    "admin-coordinators": coordinatorsPage,
    "admin-students": studentsPage,
    "coordinator-dashboard": coordinatorDashboardPage,
    "coordinator-validate": coordinatorValidatePage,
    "coordinator-students": coordinatorStudentsPage,
    "student-dashboard": studentDashboardPage,
    "student-add": studentAddPage,
    "student-activities": studentActivitiesPage,
    "student-rules": studentRulesPage
  };

  return map[page] || studentDashboardPage;
}

function attachPageHandlers(page) {
  const user = getUser();

  if (!user) {
    return;
  }

  if (user.role === "superadmin" || (user.role === "coordinator" && ["courses", "admin-areas"].includes(page))) {
    attachAdminPage(page, { render, navigate });
  }

  if (user.role === "coordinator") {
    attachCoordinatorPage(page, { render, navigate });
  }

  if (user.role === "student") {
    attachStudentPage(page, { render, navigate });
  }
}

async function render() {
  const user = getUser();

  if (!user) {
    app.innerHTML = loginPage();
    attachLogin(render);
    return;
  }

  const allowedPages = validPagesByRole(user.role);
  const currentPage = getPage();
  const finalPage = allowedPages.includes(currentPage) ? currentPage : allowedPages[0];

  setPage(finalPage);
  app.innerHTML = '<div class="page-loading">Carregando...</div>';

  try {
    const renderer = getPageRenderer(finalPage);

    app.innerHTML = await renderer();
    attachShellEvents({ onNavigate: navigate, onLogout: logout });
    attachPageHandlers(finalPage);
  } catch (error) {
    if (error.status === 401) {
      clearUser();
      setPage("login");
      showToast("Sua sessão expirou. Entre novamente.", "danger");
      render();
      return;
    }

    app.innerHTML = `
      <div class="page-loading page-error">
        <strong>Não foi possível carregar a tela.</strong>
        <span>${error.message || "Confira se o back-end está rodando em http://localhost:8080."}</span>
      </div>
    `;
  }
}

registerPWA();
render();
