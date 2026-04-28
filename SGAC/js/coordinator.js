import { coordinatorNav } from "./config.js";
import {
  getAreaName,
  getCourseName,
  getCourseNames,
  getData,
  getStudentById,
  getUser,
  updateActivityStatus,
} from "./state.js";
import { escapeHtml, formatDate } from "./utils.js";
import {
  bindModalClose,
  closeModal,
  emptyState,
  modalActions,
  openModal,
  shell,
  showToast,
} from "./ui.js";
function getCoordinatorContext() {
  const user = getUser();
  const data = getData();
  const coordinator =
    data.coordinators.find((item) => Number(item.id) === Number(user.id)) ||
    user;
  const courseIds = coordinator.courseIds || [];
  const students = data.students.filter((student) =>
    student.courseIds.some((courseId) => courseIds.includes(courseId)),
  );
  const activities = data.activities.filter((activity) =>
    courseIds.includes(activity.courseId),
  );
  return { coordinator, data, courseIds, students, activities };
}
export function coordinatorDashboardPage() {
  const { activities, students, courseIds } = getCoordinatorContext();
  const approved = activities.filter((item) => item.status === "aprovada");
  const pending = activities.filter((item) => item.status === "pendente");
  const rejected = activities.filter((item) => item.status === "reprovada");
  return shell({
    roleLabel: "Coordenador",
    navItems: coordinatorNav,
    heroTitle: "Painel da Coordenação",
    heroText: `Cursos vinculados: ${escapeHtml(courseIds.map((id) => getCourseName(id)).join(", ") || "Nenhum curso vinculado")}`,
    content: `<section class="stats-grid four"><div class="stat-card blue"><span>Alunos Vinculados</span><strong>${students.length}</strong><em>🧑‍🎓</em></div><div class="stat-card orange"><span>Pendências</span><strong>${pending.length}</strong><em>🕘</em></div><div class="stat-card green"><span>Aprovadas</span><strong>${approved.length}</strong><em>✓</em></div><div class="stat-card red"><span>Reprovadas</span><strong>${rejected.length}</strong><em>✕</em></div></section><section class="content-card"><h3>Ações rápidas</h3><div class="quick-actions"><button class="quick-card quick-card-warm" data-go="coordinator-validate">Validar Atividades<span>Conferir solicitações pendentes</span></button><button class="quick-card" data-go="coordinator-students">Visualizar Alunos<span>Ver alunos vinculados</span></button></div></section>`,
  });
}
function feedbackModal(activityId, status) {
  return `<h3>${status === "aprovada" ? "Aprovar atividade" : "Reprovar atividade"}</h3><form class="form-grid" id="feedbackForm"><label class="full-span">Observação<textarea name="feedback" rows="4" placeholder="Escreva um feedback para o aluno..."></textarea></label>${modalActions(status === "aprovada" ? "Confirmar Aprovação" : "Confirmar Reprovação", status !== "aprovada")}<input type="hidden" name="activityId" value="${activityId}" /><input type="hidden" name="status" value="${status}" /></form>`;
}
export function coordinatorValidatePage() {
  const { activities, data } = getCoordinatorContext();
  const pending = activities.filter((item) => item.status === "pendente");
  return shell({
    roleLabel: "Coordenador",
    navItems: coordinatorNav,
    title: "Validar Atividades",
    subtitle: `${pending.length} pendência(s) aguardando análise`,
    content: `<section class="content-card">${
      pending.length
        ? `<div class="table-wrap"><table class="custom-table"><thead><tr><th>Aluno</th><th>Título</th><th>Curso</th><th>Área</th><th>Horas</th><th>Comprovante</th><th>Ações</th></tr></thead><tbody>${pending
            .map((activity) => {
              const student = getStudentById(activity.studentId, data);
              return `<tr><td><strong>${escapeHtml(student?.name || "Aluno")}</strong><div class="table-sub">${escapeHtml(student?.email || "")}</div></td><td>${escapeHtml(activity.title)}<div class="table-sub">${formatDate(activity.activityDate)}</div></td><td>${escapeHtml(getCourseName(activity.courseId, data))}</td><td>${escapeHtml(getAreaName(activity.areaId, data))}</td><td>${activity.workload}h</td><td>${escapeHtml(activity.proofFile || "Sem arquivo")}</td><td class="actions-cell wide"><button class="btn btn-primary small" data-approve-activity="${activity.id}">Aprovar</button><button class="btn btn-danger small" data-reject-activity="${activity.id}">Reprovar</button></td></tr>`;
            })
            .join("")}</tbody></table></div>`
        : emptyState({
            icon: "✓",
            title: "Nenhuma atividade pendente",
            text: "Todas as solicitações já foram avaliadas.",
          })
    }</section>`,
  });
}
export function coordinatorStudentsPage() {
  const { students, data, activities } = getCoordinatorContext();
  return shell({
    roleLabel: "Coordenador",
    navItems: coordinatorNav,
    title: "Alunos do Curso",
    subtitle: `${students.length} aluno(s) encontrados`,
    content: `<section class="cards-grid single-column-mobile">${
      students.length
        ? students
            .map((student) => {
              const studentActivities = activities.filter(
                (activity) => Number(activity.studentId) === Number(student.id),
              );
              const approvedHours = studentActivities
                .filter((activity) => activity.status === "aprovada")
                .reduce(
                  (total, activity) => total + Number(activity.workload),
                  0,
                );
              return `<article class="person-card"><div class="person-avatar">🎓</div><div class="person-body"><div class="person-head no-actions"><div><h3>${escapeHtml(student.name)}</h3><p>${escapeHtml(student.email)}</p></div></div><hr><span class="person-meta">${escapeHtml(getCourseNames(student.courseIds, data).join(", "))}</span><div class="person-stats"><span>${studentActivities.length} atividade(s)</span><span>${approvedHours}h aprovadas</span></div></div></article>`;
            })
            .join("")
        : emptyState({
            icon: "🎓",
            title: "Nenhum aluno vinculado",
            text: "Associe alunos aos cursos para visualizar aqui.",
          })
    }</section>`,
  });
}
export function attachCoordinatorPage(page, { render }) {
  document
    .querySelectorAll("[data-approve-activity], [data-reject-activity]")
    .forEach((button) =>
      button.addEventListener("click", () => {
        const activityId =
          button.dataset.approveActivity || button.dataset.rejectActivity;
        const status = button.dataset.approveActivity
          ? "aprovada"
          : "reprovada";
        openModal(feedbackModal(activityId, status));
        bindModalClose();
        document
          .getElementById("feedbackForm")
          ?.addEventListener("submit", (event) => {
            event.preventDefault();
            const fd = new FormData(event.currentTarget);
            updateActivityStatus(
              fd.get("activityId"),
              fd.get("status"),
              String(fd.get("feedback")).trim(),
            );
            closeModal();
            showToast(
              `Atividade ${fd.get("status")}.`,
              fd.get("status") === "aprovada" ? "success" : "danger",
            );
            render();
          });
      }),
    );
}
