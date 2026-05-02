import { attachLogin, loginPage } from "./auth.js";
import {
  adminDashboardPage,
  areasPage,
  attachAdminPage,
  adminUsersPage,
  coordinatorsPage,
  coursesPage,
  studentsPage,
} from "./admin.js";
import {
  attachCoordinatorPage,
  coordinatorDashboardPage,
  coordinatorStudentsPage,
  coordinatorValidatePage,
} from "./coordinator.js";
import { registerPWA } from "./pwa.js";
import { clearUser, getPage, getUser, setPage } from "./state.js";
import {
  attachStudentPage,
  studentActivitiesPage,
  studentAddPage,
  studentDashboardPage,
  studentRulesPage,
} from "./student.js";
import { attachShellEvents, showToast } from "./ui.js";
const app = document.getElementById("app");
const viewState = {
  searches: {
    courses: "",
    "admin-users": "",
    "admin-coordinators": "",
    "admin-students": "",
    "admin-areas": "",
    "coordinator-validate": "",
  },
  filters: {
    "admin-users": { role: "all" },
  },
  selected: {
    "coordinator-validate": null,
  },
};
function navigate(page, params = {}, rerender = true) {
  setPage(page);
  if (typeof params.search === "string")
    viewState.searches[page] = params.search;
  if (params.filters && typeof params.filters === "object") {
    viewState.filters[page] = {
      ...(viewState.filters[page] || {}),
      ...params.filters,
    };
  }
  if (Object.prototype.hasOwnProperty.call(params, "selected")) {
    viewState.selected[page] = params.selected;
  }
  if (rerender) render();
}
function logout() {
  clearUser();
  setPage("login");
  showToast("Sessão encerrada.", "info");
  render();
}
function validPagesByRole(role) {
  return (
    {
      superadmin: [
        "admin-dashboard",
        "courses",
        "admin-users",
        "admin-coordinators",
        "admin-students",
        "admin-areas",
      ],
      coordinator: [
        "coordinator-dashboard",
        "coordinator-validate",
        "coordinator-students",
      ],
      student: [
        "student-dashboard",
        "student-add",
        "student-activities",
        "student-rules",
      ],
    }[role] || ["login"]
  );
}
function pageRenderer(page) {
  const search = viewState.searches[page] || "";
  return {
    "admin-dashboard": () => adminDashboardPage(),
    courses: () => coursesPage(search),
    "admin-users": () =>
      adminUsersPage(search, viewState.filters[page]?.role || "all"),
    "admin-coordinators": () => coordinatorsPage(search),
    "admin-students": () => studentsPage(search),
    "admin-areas": () => areasPage(search),
    "coordinator-dashboard": () => coordinatorDashboardPage(),
    "coordinator-validate": () =>
      coordinatorValidatePage(viewState.selected[page]),
    "coordinator-students": () => coordinatorStudentsPage(),
    "student-dashboard": () => studentDashboardPage(),
    "student-add": () => studentAddPage(),
    "student-activities": () => studentActivitiesPage(),
    "student-rules": () => studentRulesPage(),
  }[page];
}
function attachPageHandlers(page) {
  const user = getUser();
  if (!user) return;
  if (user.role === "superadmin") attachAdminPage(page, { render, navigate });
  if (user.role === "coordinator")
    attachCoordinatorPage(page, { render, navigate });
  if (user.role === "student") attachStudentPage(page, { render, navigate });
}
function render() {
  const user = getUser();
  const page = getPage();
  if (!user) {
    app.innerHTML = loginPage();
    attachLogin(render);
    return;
  }
  const allowed = validPagesByRole(user.role);
  const finalPage = allowed.includes(page) ? page : allowed[0];
  setPage(finalPage);

  const finalize = (html) => {
    app.innerHTML = html;
    attachShellEvents({ onNavigate: navigate, onLogout: logout });
    attachPageHandlers(finalPage);
  };

  const renderer = pageRenderer(finalPage) || studentDashboardPage;
  const result = renderer();
  if (result instanceof Promise) {
    result.then(finalize).catch(() => {
      finalize("<p class='muted' style='padding:2rem'>Erro ao carregar a página. Tente novamente.</p>");
    });
  } else {
    finalize(result);
  }
}
registerPWA();
render();
