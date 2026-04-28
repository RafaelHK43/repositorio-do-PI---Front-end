import { getAreaLabel, createCourse, getCourses, getRulesByCourse, saveRule } from "./api.js";
import { adminNav, AREA_OPTIONS } from "./config.js";
import { escapeHtml, formatHours } from "./utils.js";
import {
  bindModalClose,
  closeModal,
  emptyState,
  infoCard,
  modalActions,
  openModal,
  shell,
  showToast
} from "./ui.js";

const adminState = {
  selectedCourseId: null
};

export async function adminDashboardPage() {
  const courses = await getCourses();
  const rulesCount = await getRulesCount(courses);

  return shell({
    roleLabel: "Administrador",
    navItems: adminNav,
    heroTitle: "Painel do Administrador",
    heroText:
      "Esse front já está ligado aos endpoints atuais de cursos, regras e submissão do back.",
    content: `
      <section class="stats-grid four">
        <div class="stat-card blue">
          <span>Cursos cadastrados</span>
          <strong>${courses.length}</strong>
          <em>🎓</em>
        </div>

        <div class="stat-card orange">
          <span>Regras cadastradas</span>
          <strong>${rulesCount}</strong>
          <em>📘</em>
        </div>

        <div class="stat-card light">
          <span>Coordenadores</span>
          <strong>Back pendente</strong>
          <em>👥</em>
        </div>

        <div class="stat-card navy">
          <span>Alunos</span>
          <strong>Back pendente</strong>
          <em>🧑‍🎓</em>
        </div>
      </section>

      <section class="content-card">
        <h3>O que já está integrado</h3>
        <div class="quick-actions quick-actions-3">
          <button class="quick-card" data-go="courses">
            Cursos
            <span>Listar e cadastrar cursos via API</span>
          </button>

          <button class="quick-card quick-card-warm" data-go="admin-areas">
            Regras
            <span>Cadastrar e atualizar limites por curso</span>
          </button>

          <button class="quick-card" data-go="student-add">
            Submissões
            <span>Envio real de atividade com arquivo</span>
          </button>
        </div>
      </section>
    `
  });
}

export async function coursesPage() {
  const courses = await getCourses();

  return shell({
    roleLabel: "Administrador",
    navItems: adminNav,
    heroTitle: "Gerenciar Cursos",
    heroText:
      "O back atual já permite listar e cadastrar cursos. Edição e exclusão ainda dependem de novas rotas.",
    heroAction: '<button class="btn btn-light" data-open-course-modal>+ Novo Curso</button>',
    content: `
      <section class="content-card table-card">
        ${
          courses.length
            ? `
              <div class="table-wrap">
                <table class="custom-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Nome</th>
                      <th>Status da integração</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${courses
                      .map(
                        (course) => `
                          <tr>
                            <td>${course.id}</td>
                            <td><strong>${escapeHtml(course.nome)}</strong></td>
                            <td><span class="tag pendente">Somente leitura + cadastro</span></td>
                          </tr>
                        `
                      )
                      .join("")}
                  </tbody>
                </table>
              </div>
            `
            : emptyState({
                icon: "🎓",
                title: "Nenhum curso encontrado",
                text: "Cadastre o primeiro curso direto na API para começar."
              })
        }
      </section>
    `
  });
}

export async function areasPage() {
  const courses = await getCourses();
  const selectedCourseId = resolveSelectedCourseId(courses);
  const rules = selectedCourseId ? await getRulesByCourse(selectedCourseId) : [];

  return shell({
    roleLabel: "Administrador",
    navItems: adminNav,
    heroClass: "hero-amber",
    heroTitle: "Configurar Regras por Curso",
    heroText:
      "O back atual permite cadastrar e atualizar regras por curso usando a mesma rota. Exclusão ainda não existe.",
    heroAction: courses.length
      ? '<button class="btn btn-light" data-open-rule-modal>+ Nova Regra</button>'
      : "",
    content: `
      <section class="content-card filter-card">
        <label class="inline-field">
          Curso
          <select id="rulesCourseFilter">
            ${courses
              .map(
                (course) => `
                  <option value="${course.id}" ${
                    Number(course.id) === Number(selectedCourseId) ? "selected" : ""
                  }>
                    ${escapeHtml(course.nome)}
                  </option>
                `
              )
              .join("")}
          </select>
        </label>
      </section>

      <section class="content-card table-card">
        ${
          !courses.length
            ? emptyState({
                icon: "📘",
                title: "Cadastre um curso primeiro",
                text: "As regras dependem de um curso já salvo no back."
              })
            : rules.length
              ? `
                <div class="table-wrap">
                  <table class="custom-table">
                    <thead>
                      <tr>
                        <th>Área</th>
                        <th>Limite</th>
                        <th>Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${rules
                        .map(
                          (rule) => `
                            <tr>
                              <td><strong>${escapeHtml(getAreaLabel(rule.area))}</strong></td>
                              <td>${formatHours(rule.limiteHoras)}</td>
                              <td>
                                <button class="btn btn-primary small" data-edit-rule="${rule.id}"
                                  data-rule-area="${rule.area}"
                                  data-rule-limit="${rule.limiteHoras}">
                                  Editar limite
                                </button>
                              </td>
                            </tr>
                          `
                        )
                        .join("")}
                    </tbody>
                  </table>
                </div>
              `
              : emptyState({
                  icon: "📘",
                  title: "Nenhuma regra cadastrada para esse curso",
                  text: "Cadastre a primeira regra para liberar a submissão correta das atividades."
                })
        }
      </section>

      ${infoCard(
        "Observação",
        "As telas de coordenadores e alunos continuam no front, mas o back atual ainda não oferece esses CRUDs."
      )}
    `
  });
}

export function coordinatorsPage() {
  return shell({
    roleLabel: "Administrador",
    navItems: adminNav,
    title: "Coordenadores",
    subtitle: "CRUD aguardando novas rotas do back-end",
    content: infoCard(
      "Integração pendente",
      "O front está separado e pronto para ligar com a API, mas o back atual ainda não expõe endpoints de coordenadores.",
      '<p class="notice-inline">Enquanto isso, o login pode ser testado com o usuário seed coordenador@senac.br.</p>'
    )
  });
}

export function studentsPage() {
  return shell({
    roleLabel: "Administrador",
    navItems: adminNav,
    title: "Alunos",
    subtitle: "CRUD aguardando novas rotas do back-end",
    content: infoCard(
      "Integração pendente",
      "O front já foi preparado para integração, mas o back atual ainda não oferece endpoints de alunos e listagem de submissões.",
      '<p class="notice-inline">O envio de atividade já funciona no login do aluno seed.</p>'
    )
  });
}

export function attachAdminPage(page, { render }) {
  if (page === "courses") {
    attachCoursesPage(render);
  }

  if (page === "admin-areas") {
    attachRulesPage(render);
  }
}

function attachCoursesPage(render) {
  document.querySelector("[data-open-course-modal]")?.addEventListener("click", () => {
    openModal(courseModal());
    bindModalClose();

    document.querySelector("#courseForm")?.addEventListener("submit", async (event) => {
      event.preventDefault();

      const form = event.currentTarget;
      const formData = new FormData(form);
      const nome = String(formData.get("nome")).trim();

      try {
        await createCourse({ nome });
        closeModal();
        showToast("Curso cadastrado com sucesso.", "success");
        await render();
      } catch (error) {
        showToast(error.message || "Não foi possível cadastrar o curso.", "danger");
      }
    });
  });
}

function attachRulesPage(render) {
  document.querySelector("#rulesCourseFilter")?.addEventListener("change", async (event) => {
    adminState.selectedCourseId = Number(event.target.value);
    await render();
  });

  document.querySelector("[data-open-rule-modal]")?.addEventListener("click", () => {
    openRuleModal();
    attachRuleForm(render);
  });

  document.querySelectorAll("[data-edit-rule]").forEach((button) => {
    button.addEventListener("click", () => {
      openRuleModal({
        area: button.dataset.ruleArea,
        limiteHoras: button.dataset.ruleLimit
      });
      attachRuleForm(render);
    });
  });
}

function courseModal() {
  return `
    <h3>Novo curso</h3>
    <form class="form-grid" id="courseForm">
      <label>
        Nome do curso
        <input type="text" name="nome" placeholder="Ex.: ADS" required />
      </label>

      ${modalActions("Cadastrar curso")}
    </form>
  `;
}

function openRuleModal(rule = null) {
  openModal(ruleModal(rule));
  bindModalClose();
}

function ruleModal(rule = null) {
  return `
    <h3>${rule ? "Atualizar regra" : "Nova regra"}</h3>
    <form class="form-grid" id="ruleForm">
      <label>
        Área
        <select name="area" ${rule ? "disabled" : ""}>
          ${AREA_OPTIONS.map(
            (option) => `
              <option value="${option.value}" ${option.value === rule?.area ? "selected" : ""}>
                ${option.label}
              </option>
            `
          ).join("")}
        </select>
      </label>

      <label>
        Limite de horas
        <input
          type="number"
          min="1"
          step="0.5"
          name="limiteHoras"
          value="${rule?.limiteHoras || ""}"
          required
        />
      </label>

      <input type="hidden" name="areaAtual" value="${rule?.area || ""}" />
      ${modalActions(rule ? "Salvar regra" : "Cadastrar regra")}
    </form>
  `;
}

function attachRuleForm(render) {
  document.querySelector("#ruleForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const area = String(formData.get("area") || formData.get("areaAtual"));

    try {
      await saveRule({
        cursoId: Number(adminState.selectedCourseId),
        area,
        limiteHoras: Number(formData.get("limiteHoras"))
      });

      closeModal();
      showToast("Regra salva com sucesso.", "success");
      await render();
    } catch (error) {
      showToast(error.message || "Não foi possível salvar a regra.", "danger");
    }
  });
}

function resolveSelectedCourseId(courses) {
  if (!courses.length) {
    adminState.selectedCourseId = null;
    return null;
  }

  const exists = courses.some((course) => Number(course.id) === Number(adminState.selectedCourseId));

  if (!exists) {
    adminState.selectedCourseId = Number(courses[0].id);
  }

  return adminState.selectedCourseId;
}

async function getRulesCount(courses) {
  const allRules = await Promise.all(courses.map((course) => getRulesByCourse(course.id)));

  return allRules.reduce((total, courseRules) => total + courseRules.length, 0);
}
