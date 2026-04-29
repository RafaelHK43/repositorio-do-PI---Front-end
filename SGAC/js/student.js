import { studentNav, studentRulesReference } from "./config.js";
import {
  createActivity,
  deleteActivity,
  getAreaName,
  getCourseName,
  getData,
  getUser,
} from "./state.js";
import { escapeHtml, formatDate, statusClass } from "./utils.js";
import {
  bindModalClose,
  closeModal,
  emptyState,
  modalActions,
  openModal,
  shell,
  showToast,
} from "./ui.js";
const API_BASE_URL = "http://localhost:8080/api";

function normalizeCourse(course) {
  return {
    id: course?.id ?? course?.courseId ?? course?.codigo ?? "",
    name: course?.name ?? course?.nome ?? course?.titulo ?? "Curso sem nome",
  };
}

function resolveCourseTargets(target) {
  if (target instanceof Element) return [target];
  if (typeof target === "string") {
    const element = document.querySelector(target);
    return element ? [element] : [];
  }
  if (target) return Array.from(target);
  return Array.from(
    document.querySelectorAll("[data-cursos-select], [data-cursos-list]"),
  );
}

function renderCoursesInElement(element, courses) {
  if (element.matches("select")) {
    const selectedValue = element.value;
    element.innerHTML = courses.length
      ? courses
          .map(
            (course, index) =>
              `<option value="${course.id}" ${String(course.id) === String(selectedValue || courses[0]?.id) || (!selectedValue && index === 0) ? "selected" : ""}>${escapeHtml(course.name)}</option>`,
          )
          .join("")
      : '<option value="">Nenhum curso disponível</option>';
    if (courses.length && !courses.some((course) => String(course.id) === String(selectedValue))) {
      element.value = String(courses[0].id);
    }
    return;
  }

  if (element.matches("ul, ol")) {
    element.innerHTML = courses.length
      ? courses
          .map((course) => `<li data-curso-id="${course.id}">${escapeHtml(course.name)}</li>`)
          .join("")
      : '<li class="muted-text">Nenhum curso disponível</li>';
    return;
  }

  const select = element.querySelector("select");
  if (select) renderCoursesInElement(select, courses);

  const list = element.querySelector("ul, ol");
  if (list) renderCoursesInElement(list, courses);
}

function renderAreaOptions(areaSelect, courseId, areas) {
  if (!areaSelect) return;
  const filteredAreas = areas.filter(
    (area) => Number(area.courseId) === Number(courseId),
  );
  areaSelect.innerHTML = filteredAreas.length
    ? filteredAreas
        .map((area) => `<option value="${area.id}">${escapeHtml(area.name)}</option>`)
        .join("")
    : '<option value="">Nenhuma área disponível</option>';
}

async function getApiErrorMessage(response, fallback) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const payload = await response.json().catch(() => null);
    return (
      payload?.message ||
      payload?.mensagem ||
      payload?.error ||
      payload?.detail ||
      fallback
    );
  }

  const text = await response.text().catch(() => "");
  return text.trim() || fallback;
}

export async function carregarCursos(target = null) {
  try {
    const response = await fetch(`${API_BASE_URL}/cursos`);
    if (!response.ok) {
      throw new Error(
        await getApiErrorMessage(response, "Não foi possível carregar os cursos."),
      );
    }

    const cursos = await response.json();
    const normalizedCourses = Array.isArray(cursos)
      ? cursos.map(normalizeCourse).filter((course) => course.id !== "")
      : [];

    resolveCourseTargets(target).forEach((element) => {
      renderCoursesInElement(element, normalizedCourses);
    });

    return normalizedCourses;
  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function salvarSubmissao(formElement, navigate) {
  const user = getUser();
  if (!formElement || !user) return null;

  const fd = new FormData(formElement);
  const courseId = Number(fd.get("courseId"));
  const areaId = Number(fd.get("areaId"));
  const title = String(fd.get("title") || "").trim();
  const description = String(fd.get("description") || "").trim();
  const workload = Number(fd.get("workload"));
  const activityDate = String(fd.get("activityDate") || "");
  const certificate = fd.get("certificado");

  const payload = new FormData();
  payload.append("studentId", String(user.id));
  payload.append("courseId", String(courseId));
  payload.append("areaId", String(areaId));
  payload.append("title", title);
  payload.append("description", description);
  payload.append("workload", String(workload));
  payload.append("activityDate", activityDate);

  if (certificate instanceof File && certificate.size > 0) {
    payload.append("certificado", certificate);
    payload.append("proof_upload", certificate);
  }

  try {
    const response = await fetch(`${API_BASE_URL}/submissoes`, {
      method: "POST",
      body: payload,
    });

    if (!response.ok) {
      throw new Error(
        await getApiErrorMessage(response, "Não foi possível enviar a submissão."),
      );
    }

    createActivity({
      studentId: user.id,
      courseId,
      areaId,
      title,
      description,
      workload,
      activityDate,
      proofFile: certificate instanceof File ? certificate.name : "",
      status: "pendente",
      feedback: "",
    });

    formElement.reset();
    closeModal();
    showToast("Solicitação enviada com sucesso.", "success");

    if (typeof navigate === "function") {
      navigate("student-activities");
    }

    return true;
  } catch (error) {
    alert(error instanceof Error ? error.message : "Não foi possível enviar a submissão.");
    return false;
  }
}

function getStudentContext() {
  const user = getUser();
  const data = getData();
  const student =
    data.students.find((item) => Number(item.id) === Number(user.id)) || user;
  const activities = data.activities.filter(
    (item) => Number(item.studentId) === Number(student.id),
  );
  const primaryCourseId = student.courseIds?.[0] || data.courses[0]?.id;
  return { user: student, data, activities, primaryCourseId };
}
export function studentDashboardPage() {
  const { user, data, activities, primaryCourseId } = getStudentContext();
  const approved = activities.filter((item) => item.status === "aprovada");
  const pending = activities.filter((item) => item.status === "pendente");
  const rejected = activities.filter((item) => item.status === "reprovada");
  const hours = approved.reduce(
    (total, item) => total + Number(item.workload),
    0,
  );
  const required =
    data.courses.find((course) => Number(course.id) === Number(primaryCourseId))
      ?.workload_required || 200;
  const progress = Math.min(100, Math.round((hours / required) * 100));
  return shell({
    roleLabel: "Atividades Complementares",
    navItems: studentNav,
    content: `<section class="student-welcome-banner"><div class="student-banner-icon">🏅</div><div><h3>Olá, ${escapeHtml(user.name)}!</h3><p>Acompanhe suas atividades e o progresso no curso ${escapeHtml(getCourseName(primaryCourseId, data))}.</p></div></section><section class="student-stats-grid"><div class="student-stat-card"><span>Total de Atividades</span><strong>${activities.length}</strong><em>🏅</em></div><div class="student-stat-card success"><span>Aprovadas</span><strong>${approved.length}</strong><em>✓</em></div><div class="student-stat-card warning"><span>Pendentes</span><strong>${pending.length}</strong><em>🕘</em></div><div class="student-stat-card info"><span>Reprovadas</span><strong>${rejected.length}</strong><em>✕</em></div></section><section class="content-card student-progress-card"><div class="student-progress-head"><div><h3>Progresso Geral</h3><p>Meta: ${required}h obrigatórias</p></div><span class="student-progress-badge">${progress}%</span></div><div class="student-progress-bar"><div style="width:${progress}%"></div></div><p class="student-progress-text">${hours}h concluídas de ${required}h. Faltam <strong>${Math.max(required - hours, 0)}h</strong>.</p></section><section class="content-card"><h3>Ações rápidas</h3><div class="quick-actions"><button class="quick-card quick-card-warm" data-go="student-add">Adicionar Atividade<span>Registrar nova solicitação</span></button><button class="quick-card" data-go="student-activities">Minhas Atividades<span>Acompanhar status</span></button></div></section>`,
  });
}
function activityModal(student) {
  const data = getData();
  const courseId = student.courseIds?.[0] || data.courses[0]?.id;
  const areas = data.areas.filter(
    (area) => Number(area.courseId) === Number(courseId),
  );
  const courseSource = Array.isArray(student.courseIds) && student.courseIds.length
    ? student.courseIds
    : data.courses.map((course) => course.id);
  const courseOptions = courseSource
    .map(
      (id) =>
        `<option value="${id}" ${Number(id) === Number(courseId) ? "selected" : ""}>${escapeHtml(getCourseName(id, data))}</option>`,
    )
    .join("");
  return `<h3>Nova Atividade</h3><form class="form-grid" id="activityForm"><label>Curso<select name="courseId" id="activityCourseSelect" data-cursos-select>${courseOptions}</select></label><label>Área<select name="areaId" id="activityAreaSelect">${areas.map((area) => `<option value="${area.id}">${escapeHtml(area.name)}</option>`).join("")}</select></label><label>Título<input type="text" name="title" required></label><label>Carga Horária<input type="number" min="1" name="workload" required></label><label>Data da Atividade<input type="date" name="activityDate" required></label><label class="full-span">Descrição<textarea name="description" rows="4" required></textarea></label><label class="full-span">Certificado<input type="file" name="certificado" accept=".pdf,.png,.jpg,.jpeg"></label>${modalActions("Enviar Solicitação")}</form>`;
}
export function studentActivitiesPage() {
  const { activities, data } = getStudentContext();
  const pending = activities.filter((item) => item.status === "pendente");
  const approved = activities.filter((item) => item.status === "aprovada");
  const rejected = activities.filter((item) => item.status === "reprovada");
  const approvedHours = approved.reduce(
    (total, item) => total + Number(item.workload),
    0,
  );
  return shell({
    roleLabel: "Atividades Complementares",
    navItems: studentNav,
    title: "Minhas Atividades",
    subtitle: `${activities.length} atividade(s) cadastradas`,
    content: `<div class="page-toolbar"><button class="btn btn-warning" data-open-activity>+ Adicionar Atividade</button></div><section class="student-stats-grid"><div class="student-stat-card warning compact"><span>Pendentes</span><strong>${pending.length}</strong></div><div class="student-stat-card success compact"><span>Aprovadas</span><strong>${approved.length}</strong></div><div class="student-stat-card danger compact"><span>Reprovadas</span><strong>${rejected.length}</strong></div><div class="student-stat-card info compact"><span>Horas Aprovadas</span><strong>${approvedHours}h</strong></div></section><section class="content-card">${activities.length ? `<div class="table-wrap"><table class="custom-table"><thead><tr><th>Título</th><th>Curso</th><th>Área</th><th>Horas</th><th>Data</th><th>Status</th><th>Ações</th></tr></thead><tbody>${activities.map((activity) => `<tr><td><strong>${escapeHtml(activity.title)}</strong><div class="table-sub">${escapeHtml(activity.proofFile || "Sem arquivo")}</div></td><td>${escapeHtml(getCourseName(activity.courseId, data))}</td><td>${escapeHtml(getAreaName(activity.areaId, data))}</td><td>${activity.workload}h</td><td>${formatDate(activity.activityDate)}</td><td><span class="${statusClass(activity.status)}">${escapeHtml(activity.status)}</span></td><td class="actions-cell">${activity.status === "pendente" ? `<button class="icon-btn delete" data-delete-activity="${activity.id}">🗑</button>` : '<span class="muted-text">-</span>'}</td></tr>`).join("")}</tbody></table></div>` : emptyState({ icon: "🏅", title: "Nenhuma atividade cadastrada", text: "Comece adicionando sua primeira atividade complementar!", actionLabel: "Adicionar Atividade", actionPage: "student-add" })}</section>`,
  });
}
export function studentAddPage() {
  const { user } = getStudentContext();
  return shell({
    roleLabel: "Atividades Complementares",
    navItems: studentNav,
    title: "Adicionar Atividade",
    subtitle: "Registre uma nova atividade complementar",
    content: `<section class="content-card"><div class="note-box student-note-box"><strong>Antes de enviar:</strong><p>Preencha os dados obrigatórios e adicione o comprovante da atividade.</p></div><div class="page-toolbar left"><button class="btn btn-primary" data-open-activity>Preencher Formulário</button></div></section><section class="content-card"><h3>Conta atual</h3><p>${escapeHtml(user.name)} · ${escapeHtml(user.email)}</p></section>`,
  });
}
export function studentRulesPage() {
  const { primaryCourseId, data } = getStudentContext();
  const courseAreas = data.areas.filter(
    (area) => Number(area.courseId) === Number(primaryCourseId),
  );
  return shell({
    roleLabel: "Atividades Complementares",
    navItems: studentNav,
    title: "Regras do Curso",
    subtitle: `Curso atual: ${escapeHtml(getCourseName(primaryCourseId, data))}`,
    content: `<section class="student-rules-alert">As regras abaixo orientam o cadastro das atividades e o limite de horas por categoria.</section><section class="cards-grid rules-summary-grid">${courseAreas.map((area) => `<div class="summary-card"><strong>${escapeHtml(area.name)}</strong><span>${area.hour_limit}h máximas</span><p>${escapeHtml(area.description)}</p></div>`).join("")}</section><section class="student-rules-list">${studentRulesReference.map((rule) => `<details class="student-rule-card student-rule-accordion"><summary class="student-rule-head"><div class="student-rule-title ${rule.color}"><span class="student-rule-dot"></span><div><strong>${escapeHtml(rule.name)}</strong><small>Exemplos de atividades válidas</small></div></div><div class="student-rule-head-right"><span class="student-rule-badge ${rule.color}">${rule.limit}h</span><span class="student-rule-arrow">⌄</span></div></summary><div class="student-rule-content"><table class="custom-table student-rule-table"><thead><tr><th>Atividade</th><th>Horas</th></tr></thead><tbody>${rule.items.map((item) => `<tr><td>${escapeHtml(item[0])}</td><td>${escapeHtml(item[1])}</td></tr>`).join("")}</tbody></table></div></details>`).join("")}</section>`,
  });
}
export function attachStudentPage(page, { render, navigate }) {
  const { user, data } = getStudentContext();
  document.querySelectorAll("[data-open-activity]").forEach((button) =>
    button.addEventListener("click", async () => {
      openModal(activityModal(user));
      bindModalClose();
      const courseSelect = document.getElementById("activityCourseSelect");
      const areaSelect = document.getElementById("activityAreaSelect");
      courseSelect?.addEventListener("change", () => {
        renderAreaOptions(areaSelect, courseSelect.value, data.areas);
      });
      const cursos = await carregarCursos(courseSelect);
      renderAreaOptions(
        areaSelect,
        courseSelect?.value || cursos[0]?.id || data.courses[0]?.id,
        data.areas,
      );
      document
        .getElementById("activityForm")
        ?.addEventListener("submit", async (event) => {
          event.preventDefault();
          await salvarSubmissao(event.currentTarget, navigate);
        });
    }),
  );
  document.querySelectorAll("[data-delete-activity]").forEach((button) =>
    button.addEventListener("click", () => {
      deleteActivity(button.dataset.deleteActivity);
      showToast("Atividade removida.", "danger");
      render();
    }),
  );
}
