import { adminNav } from "./config.js";
import {
  createArea,
  createCoordinator,
  createCourse,
  createStudent,
  deleteArea,
  deleteCoordinator,
  deleteCourse,
  deleteStudent,
  getAreaName,
  getCourseName,
  getCourseNames,
  getData,
  updateArea,
  updateCoordinator,
  updateCourse,
  updateStudent,
} from "./state.js";
import { escapeHtml, filterBySearch, uniqueNumbers } from "./utils.js";
import {
  bindModalClose,
  closeModal,
  emptyState,
  modalActions,
  openModal,
  shell,
  showToast,
} from "./ui.js";

function searchInput(placeholder, value = "") {
  return `<section class="content-card compact search-card"><div class="search-input-wrap"><span>⌕</span><input class="search-input" data-search-input value="${escapeHtml(value)}" placeholder="${placeholder}" /></div></section>`;
}
function pillsCount(text) {
  return `<section class="info-banner">${text}</section>`;
}

export function adminDashboardPage() {
  const data = getData();
  return shell({
    roleLabel: "Administrador",
    navItems: adminNav,
    heroTitle: "Painel do Administrador",
    heroText: "Gerencie cursos, coordenadores, alunos e regras da plataforma.",
    content: `<section class="stats-grid four"><div class="stat-card blue"><span>Total de Cursos</span><strong>${data.courses.length}</strong><em>🎓</em></div><div class="stat-card navy"><span>Coordenadores</span><strong>${data.coordinators.length}</strong><em>👥</em></div><div class="stat-card orange"><span>Alunos</span><strong>${data.students.length}</strong><em>🧑‍🎓</em></div><div class="stat-card light"><span>Áreas de Atividades</span><strong>${data.areas.length}</strong><em>📘</em></div></section><section class="content-card"><h3>Ações Rápidas</h3><div class="quick-actions quick-actions-3"><button class="quick-card" data-go="courses">Gerenciar Cursos<span>Adicionar, editar e excluir cursos</span></button><button class="quick-card" data-go="admin-coordinators">Gerenciar Coordenadores<span>Vincular coordenadores a cursos</span></button><button class="quick-card quick-card-warm" data-go="admin-areas">Gerenciar Áreas<span>Configurar limites por curso</span></button></div></section>`,
  });
}
export function coursesPage(search = "") {
  const data = getData();
  const items = filterBySearch(
    data.courses,
    search,
    (item) => `${item.name} ${item.workload_required}`,
  );
  return shell({
    roleLabel: "Administrador",
    navItems: adminNav,
    heroTitle: "Gerenciar Cursos",
    heroText: "Cadastre, edite e remova cursos do sistema.",
    heroAction:
      '<button class="btn btn-light" data-open-modal="course">+ Novo Curso</button>',
    content: `${searchInput("Buscar curso por nome...", search)}<section class="content-card table-card">${items.length ? `<div class="table-wrap"><table class="custom-table"><thead><tr><th>Nome</th><th>Carga Horária</th><th>Ações</th></tr></thead><tbody>${items.map((course) => `<tr><td><div class="table-title">${escapeHtml(course.name)}</div></td><td>${course.workload_required}h</td><td class="actions-cell"><button class="icon-btn edit" data-edit-course="${course.id}">✎</button><button class="icon-btn delete" data-delete-course="${course.id}">🗑</button></td></tr>`).join("")}</tbody></table></div>` : emptyState({ icon: "🎓", title: "Nenhum curso encontrado", text: "Cadastre o primeiro curso para continuar." })}</section>${pillsCount(`${items.length} curso(s) encontrado(s)`)}`,
  });
}
export function coordinatorsPage(search = "") {
  const data = getData();
  const items = filterBySearch(
    data.coordinators,
    search,
    (item) =>
      `${item.name} ${item.email} ${getCourseNames(item.courseIds, data).join(" ")}`,
  );
  return shell({
    roleLabel: "Administrador",
    navItems: adminNav,
    heroTitle: "Gerenciar Coordenadores",
    heroText: "Cadastre coordenadores e vincule um ou mais cursos.",
    heroAction:
      '<button class="btn btn-light" data-open-modal="coordinator">+ Novo Coordenador</button>',
    content: `${searchInput("Buscar coordenador por nome ou e-mail...", search)}<section class="cards-grid single-column-mobile">${items.length ? items.map((item) => `<article class="person-card left-blue"><div class="person-avatar">👤</div><div class="person-body"><div class="person-head"><div><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.email)}</p></div><div class="actions-cell"><button class="icon-btn edit" data-edit-coordinator="${item.id}">✎</button><button class="icon-btn delete" data-delete-coordinator="${item.id}">🗑</button></div></div><hr><span class="person-meta">${getCourseNames(item.courseIds, data).join(", ") || "Nenhum curso vinculado"}</span></div></article>`).join("") : emptyState({ icon: "👥", title: "Nenhum coordenador encontrado", text: "Cadastre um coordenador para continuar." })}</section>${pillsCount(`${items.length} coordenador(es) encontrado(s)`)}`,
  });
}
export function studentsPage(search = "") {
  const data = getData();
  const items = filterBySearch(
    data.students,
    search,
    (item) =>
      `${item.name} ${item.email} ${getCourseNames(item.courseIds, data).join(" ")}`,
  );
  return shell({
    roleLabel: "Administrador",
    navItems: adminNav,
    heroClass: "hero-orange",
    heroTitle: "Gerenciar Alunos",
    heroText: "Cadastre e gerencie os alunos do sistema.",
    heroAction:
      '<button class="btn btn-light" data-open-modal="student">+ Novo Aluno</button>',
    content: `${searchInput("Buscar aluno por nome ou e-mail...", search)}<section class="content-card table-card">${items.length ? `<div class="table-wrap"><table class="custom-table"><thead><tr><th>Nome</th><th>E-mail</th><th>Curso</th><th>Ações</th></tr></thead><tbody>${items.map((item) => `<tr><td><div class="row-with-icon"><span class="table-avatar">🎓</span><strong>${escapeHtml(item.name)}</strong></div></td><td>${escapeHtml(item.email)}</td><td>${escapeHtml(getCourseNames(item.courseIds, data).join(", ") || "Nenhum curso vinculado")}</td><td class="actions-cell"><button class="icon-btn edit" data-edit-student="${item.id}">✎</button><button class="icon-btn delete" data-delete-student="${item.id}">🗑</button></td></tr>`).join("")}</tbody></table></div>` : emptyState({ icon: "🧑‍🎓", title: "Nenhum aluno encontrado", text: "Cadastre um aluno para continuar." })}</section>${pillsCount(`${items.length} aluno(s) encontrado(s)`)}`,
  });
}
export function areasPage(search = "") {
  const data = getData();
  const items = filterBySearch(
    data.areas,
    search,
    (item) =>
      `${item.name} ${item.description} ${getCourseName(item.courseId, data)}`,
  );
  return shell({
    roleLabel: "Administrador",
    navItems: adminNav,
    heroClass: "hero-amber",
    heroTitle: "Configurar Áreas e Regras",
    heroText: "Defina limites de horas e descreva critérios por curso.",
    heroAction:
      '<button class="btn btn-light" data-open-modal="area">+ Nova Área</button>',
    content: `${searchInput("Buscar área por nome ou curso...", search)}<section class="content-card table-card">${items.length ? `<div class="table-wrap"><table class="custom-table"><thead><tr><th>Área</th><th>Curso</th><th>Limite</th><th>Descrição</th><th>Ações</th></tr></thead><tbody>${items.map((item) => `<tr><td><strong>${escapeHtml(item.name)}</strong></td><td>${escapeHtml(getCourseName(item.courseId, data))}</td><td>${item.hour_limit}h</td><td>${escapeHtml(item.description || "-")}</td><td class="actions-cell"><button class="icon-btn edit" data-edit-area="${item.id}">✎</button><button class="icon-btn delete" data-delete-area="${item.id}">🗑</button></td></tr>`).join("")}</tbody></table></div>` : emptyState({ icon: "📘", title: "Nenhuma área encontrada", text: "Cadastre uma área para continuar." })}</section>${pillsCount(`${items.length} área(s) encontrada(s)`)}`,
  });
}
function courseModal(course = null) {
  return `<h3>${course ? "Editar Curso" : "Novo Curso"}</h3><form class="form-grid" id="courseForm"><label>Nome do Curso<input type="text" name="name" value="${escapeHtml(course?.name || "")}" required></label><label>Carga Horária Exigida<input type="number" min="1" name="workload_required" value="${course?.workload_required || ""}" required></label>${modalActions(course ? "Salvar Alterações" : "Cadastrar")}</form>`;
}
function peopleModal(type, person = null) {
  const data = getData();
  const values = new Set((person?.courseIds || []).map(Number));
  return `<h3>${person ? `Editar ${type === "student" ? "Aluno" : "Coordenador"}` : `Novo ${type === "student" ? "Aluno" : "Coordenador"}`}</h3><form class="form-grid" id="${type}Form"><label>Nome Completo<input type="text" name="name" value="${escapeHtml(person?.name || "")}" required></label><label>E-mail<input type="email" name="email" value="${escapeHtml(person?.email || "")}" required></label><label>Senha<input type="password" name="password" value="${escapeHtml(person?.password || "")}" required></label><div class="checkbox-group full-span"><span>${type === "student" ? "Cursos do aluno" : "Cursos do coordenador"}</span><div class="checkbox-grid">${data.courses.map((course) => `<label class="check-card"><input type="checkbox" name="courseIds" value="${course.id}" ${values.has(Number(course.id)) ? "checked" : ""}><span>${escapeHtml(course.name)}</span></label>`).join("")}</div></div>${modalActions(person ? "Salvar Alterações" : "Cadastrar")}</form>`;
}
function areaModal(area = null) {
  const data = getData();
  return `<h3>${area ? "Editar Área" : "Nova Área"}</h3><form class="form-grid" id="areaForm"><label>Nome da Área<input type="text" name="name" value="${escapeHtml(area?.name || "")}" required></label><label>Curso<select name="courseId" required>${data.courses.map((course) => `<option value="${course.id}" ${Number(area?.courseId) === Number(course.id) ? "selected" : ""}>${escapeHtml(course.name)}</option>`).join("")}</select></label><label>Limite de Horas<input type="number" min="1" name="hour_limit" value="${area?.hour_limit || ""}" required></label><label class="full-span">Descrição<textarea name="description" rows="4">${escapeHtml(area?.description || "")}</textarea></label>${modalActions(area ? "Salvar Alterações" : "Cadastrar")}</form>`;
}
function collectCourseIds(form) {
  return uniqueNumbers(
    [...form.querySelectorAll('input[name="courseIds"]:checked')].map((input) =>
      Number(input.value),
    ),
  );
}
export function attachAdminPage(page, { render, navigate }) {
  const searchInputEl = document.querySelector("[data-search-input]");
  if (searchInputEl) {
    searchInputEl.addEventListener("input", () =>
      navigate(page, { search: searchInputEl.value.trim() }),
    );
  }
  document.querySelectorAll("[data-open-modal]").forEach((button) =>
    button.addEventListener("click", () => {
      const type = button.dataset.openModal;
      if (type === "course") {
        openModal(courseModal());
        bindModalClose();
        document
          .getElementById("courseForm")
          ?.addEventListener("submit", (event) => {
            event.preventDefault();
            const fd = new FormData(event.currentTarget);
            createCourse({
              name: String(fd.get("name")).trim(),
              workload_required: Number(fd.get("workload_required")),
            });
            closeModal();
            showToast("Curso cadastrado com sucesso.", "success");
            render();
          });
      }
      if (type === "coordinator") {
        openModal(peopleModal("coordinator"));
        bindModalClose();
        document
          .getElementById("coordinatorForm")
          ?.addEventListener("submit", (event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const fd = new FormData(form);
            createCoordinator({
              name: String(fd.get("name")).trim(),
              email: String(fd.get("email")).trim(),
              password: String(fd.get("password")).trim(),
              courseIds: collectCourseIds(form),
            });
            closeModal();
            showToast("Coordenador cadastrado com sucesso.", "success");
            render();
          });
      }
      if (type === "student") {
        openModal(peopleModal("student"));
        bindModalClose();
        document
          .getElementById("studentForm")
          ?.addEventListener("submit", (event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const fd = new FormData(form);
            createStudent({
              name: String(fd.get("name")).trim(),
              email: String(fd.get("email")).trim(),
              password: String(fd.get("password")).trim(),
              courseIds: collectCourseIds(form),
            });
            closeModal();
            showToast("Aluno cadastrado com sucesso.", "success");
            render();
          });
      }
      if (type === "area") {
        openModal(areaModal());
        bindModalClose();
        document
          .getElementById("areaForm")
          ?.addEventListener("submit", (event) => {
            event.preventDefault();
            const fd = new FormData(event.currentTarget);
            createArea({
              name: String(fd.get("name")).trim(),
              courseId: Number(fd.get("courseId")),
              hour_limit: Number(fd.get("hour_limit")),
              description: String(fd.get("description")).trim(),
            });
            closeModal();
            showToast("Área cadastrada com sucesso.", "success");
            render();
          });
      }
    }),
  );
  document.querySelectorAll("[data-edit-course]").forEach((button) =>
    button.addEventListener("click", () => {
      const item = getData().courses.find(
        (course) => Number(course.id) === Number(button.dataset.editCourse),
      );
      openModal(courseModal(item));
      bindModalClose();
      document
        .getElementById("courseForm")
        ?.addEventListener("submit", (event) => {
          event.preventDefault();
          const fd = new FormData(event.currentTarget);
          updateCourse(item.id, {
            name: String(fd.get("name")).trim(),
            workload_required: Number(fd.get("workload_required")),
          });
          closeModal();
          showToast("Curso atualizado com sucesso.", "success");
          render();
        });
    }),
  );
  document.querySelectorAll("[data-delete-course]").forEach((button) =>
    button.addEventListener("click", () => {
      deleteCourse(button.dataset.deleteCourse);
      showToast("Curso removido.", "danger");
      render();
    }),
  );
  document.querySelectorAll("[data-edit-coordinator]").forEach((button) =>
    button.addEventListener("click", () => {
      const item = getData().coordinators.find(
        (coord) => Number(coord.id) === Number(button.dataset.editCoordinator),
      );
      openModal(peopleModal("coordinator", item));
      bindModalClose();
      document
        .getElementById("coordinatorForm")
        ?.addEventListener("submit", (event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const fd = new FormData(form);
          updateCoordinator(item.id, {
            name: String(fd.get("name")).trim(),
            email: String(fd.get("email")).trim(),
            password: String(fd.get("password")).trim(),
            courseIds: collectCourseIds(form),
          });
          closeModal();
          showToast("Coordenador atualizado com sucesso.", "success");
          render();
        });
    }),
  );
  document.querySelectorAll("[data-delete-coordinator]").forEach((button) =>
    button.addEventListener("click", () => {
      deleteCoordinator(button.dataset.deleteCoordinator);
      showToast("Coordenador removido.", "danger");
      render();
    }),
  );
  document.querySelectorAll("[data-edit-student]").forEach((button) =>
    button.addEventListener("click", () => {
      const item = getData().students.find(
        (student) => Number(student.id) === Number(button.dataset.editStudent),
      );
      openModal(peopleModal("student", item));
      bindModalClose();
      document
        .getElementById("studentForm")
        ?.addEventListener("submit", (event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const fd = new FormData(form);
          updateStudent(item.id, {
            name: String(fd.get("name")).trim(),
            email: String(fd.get("email")).trim(),
            password: String(fd.get("password")).trim(),
            courseIds: collectCourseIds(form),
          });
          closeModal();
          showToast("Aluno atualizado com sucesso.", "success");
          render();
        });
    }),
  );
  document.querySelectorAll("[data-delete-student]").forEach((button) =>
    button.addEventListener("click", () => {
      deleteStudent(button.dataset.deleteStudent);
      showToast("Aluno removido.", "danger");
      render();
    }),
  );
  document.querySelectorAll("[data-edit-area]").forEach((button) =>
    button.addEventListener("click", () => {
      const item = getData().areas.find(
        (area) => Number(area.id) === Number(button.dataset.editArea),
      );
      openModal(areaModal(item));
      bindModalClose();
      document
        .getElementById("areaForm")
        ?.addEventListener("submit", (event) => {
          event.preventDefault();
          const fd = new FormData(event.currentTarget);
          updateArea(item.id, {
            name: String(fd.get("name")).trim(),
            courseId: Number(fd.get("courseId")),
            hour_limit: Number(fd.get("hour_limit")),
            description: String(fd.get("description")).trim(),
          });
          closeModal();
          showToast("Área atualizada com sucesso.", "success");
          render();
        });
    }),
  );
  document.querySelectorAll("[data-delete-area]").forEach((button) =>
    button.addEventListener("click", () => {
      deleteArea(button.dataset.deleteArea);
      showToast("Área removida.", "danger");
      render();
    }),
  );
}
