import { createSubmission, getAreaLabel, getCourses, getRulesByCourse } from "./api.js";
import { studentNav } from "./config.js";
import { getUser } from "./state.js";
import { escapeHtml, formatHours } from "./utils.js";
import { emptyState, infoCard, shell, showToast } from "./ui.js";

const studentState = {
  selectedCourseId: null
};

export async function studentDashboardPage() {
  const courses = await getCourses();
  const user = getUser();

  return shell({
    roleLabel: "Aluno",
    navItems: studentNav,
    heroTitle: "Painel do Aluno",
    heroText:
      "Com o back atual, o aluno já consegue consultar cursos, visualizar regras e enviar uma atividade com comprovante.",
    content: `
      <section class="stats-grid four">
        <div class="stat-card blue">
          <span>Login usado</span>
          <strong>${escapeHtml(user?.email || "-")}</strong>
          <em>🔐</em>
        </div>

        <div class="stat-card orange">
          <span>ID usado na submissão</span>
          <strong>${user?.backendUserId || "-"}</strong>
          <em>🪪</em>
        </div>

        <div class="stat-card navy">
          <span>Cursos disponíveis</span>
          <strong>${courses.length}</strong>
          <em>🎓</em>
        </div>

        <div class="stat-card light">
          <span>Minhas atividades</span>
          <strong>Back pendente</strong>
          <em>🗂</em>
        </div>
      </section>

      <section class="content-card">
        <h3>O que já funciona</h3>
        <div class="quick-actions">
          <button class="quick-card" data-go="student-add">
            Enviar atividade
            <span>POST real para /api/submissoes com arquivo</span>
          </button>

          <button class="quick-card quick-card-warm" data-go="student-rules">
            Consultar regras
            <span>GET real das regras por curso</span>
          </button>
        </div>
      </section>
    `
  });
}

export async function studentAddPage() {
  const courses = await getCourses();
  const selectedCourseId = resolveSelectedCourseId(courses);
  const rules = selectedCourseId ? await getRulesByCourse(selectedCourseId) : [];

  return shell({
    roleLabel: "Aluno",
    navItems: studentNav,
    heroClass: "hero-orange",
    heroTitle: "Enviar atividade complementar",
    heroText:
      "Essa tela já envia dados e comprovante para o back atual. O histórico ainda depende de rotas novas.",
    content: `
      <section class="content-card">
        ${
          !courses.length
            ? emptyState({
                icon: "🎓",
                title: "Nenhum curso disponível",
                text: "Cadastre um curso no back antes de enviar atividades."
              })
            : `
              <form class="form-grid" id="submissionForm">
                <label>
                  Curso
                  <select name="cursoId" id="studentCourseSelect">
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

                <label>
                  Área
                  <select name="area" ${rules.length ? "" : "disabled"}>
                    ${
                      rules.length
                        ? rules
                            .map(
                              (rule) => `
                                <option value="${rule.area}">
                                  ${escapeHtml(getAreaLabel(rule.area))} (${formatHours(rule.limiteHoras)})
                                </option>
                              `
                            )
                            .join("")
                        : '<option value="">Cadastre regras para esse curso</option>'
                    }
                  </select>
                </label>

                <label>
                  Título
                  <input type="text" name="titulo" placeholder="Ex.: Monitoria de PI" required />
                </label>

                <label>
                  Horas declaradas
                  <input type="number" min="1" step="0.5" name="horasDeclaradas" required />
                </label>

                <label class="full-span">
                  Descrição
                  <textarea name="descricao" placeholder="Descreva a atividade realizada"></textarea>
                </label>

                <label>
                  Data da atividade
                  <input type="date" name="dataAtividade" required />
                </label>

                <label>
                  Comprovante
                  <input type="file" name="arquivo" accept=".pdf,image/*" required />
                </label>

                <button type="submit" class="btn btn-primary btn-full" ${rules.length ? "" : "disabled"}>
                  Enviar solicitação
                </button>
              </form>
            `
        }
      </section>

      ${infoCard(
        "Importante",
        "Como o back atual ainda não tem um endpoint /me, o front usa o ID seed do aluno para enviar a submissão real."
      )}
    `
  });
}

export function studentActivitiesPage() {
  return shell({
    roleLabel: "Aluno",
    navItems: studentNav,
    title: "Minhas atividades",
    subtitle: "Listagem aguardando endpoint no back-end",
    content: infoCard(
      "Integração pendente",
      "O envio já funciona, mas o back atual ainda não expõe uma rota para listar as submissões do aluno no front."
    )
  });
}

export async function studentRulesPage() {
  const courses = await getCourses();
  const selectedCourseId = resolveSelectedCourseId(courses);
  const rules = selectedCourseId ? await getRulesByCourse(selectedCourseId) : [];

  return shell({
    roleLabel: "Aluno",
    navItems: studentNav,
    title: "Regras do curso",
    subtitle: "Consulta em tempo real das regras cadastradas no back-end",
    content: `
      <section class="content-card filter-card">
        <label class="inline-field">
          Curso
          <select id="studentRulesCourseFilter">
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
                icon: "📖",
                title: "Nenhum curso disponível",
                text: "Cadastre um curso para consultar as regras."
              })
            : rules.length
              ? `
                <div class="table-wrap">
                  <table class="custom-table">
                    <thead>
                      <tr>
                        <th>Área</th>
                        <th>Limite por área</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${rules
                        .map(
                          (rule) => `
                            <tr>
                              <td><strong>${escapeHtml(getAreaLabel(rule.area))}</strong></td>
                              <td>${formatHours(rule.limiteHoras)}</td>
                            </tr>
                          `
                        )
                        .join("")}
                    </tbody>
                  </table>
                </div>
              `
              : emptyState({
                  icon: "📖",
                  title: "Nenhuma regra cadastrada",
                  text: "Esse curso ainda não possui regras definidas no back."
                })
        }
      </section>
    `
  });
}

export function attachStudentPage(page, { render }) {
  if (page === "student-add") {
    attachStudentSubmission(render);
  }

  if (page === "student-rules") {
    document.querySelector("#studentRulesCourseFilter")?.addEventListener("change", async (event) => {
      studentState.selectedCourseId = Number(event.target.value);
      await render();
    });
  }
}

function attachStudentSubmission(render) {
  document.querySelector("#studentCourseSelect")?.addEventListener("change", async (event) => {
    studentState.selectedCourseId = Number(event.target.value);
    await render();
  });

  document.querySelector("#submissionForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const form = event.currentTarget;
    const button = form.querySelector('button[type="submit"]');
    const formData = new FormData(form);
    const arquivo = formData.get("arquivo");
    const user = getUser();

    if (!(arquivo instanceof File) || !arquivo.name) {
      showToast("Selecione um comprovante para enviar.", "danger");
      return;
    }

    button.disabled = true;
    button.textContent = "Enviando...";

    try {
      await createSubmission({
        dados: {
          alunoId: Number(user?.backendUserId || 3),
          cursoId: Number(formData.get("cursoId")),
          titulo: String(formData.get("titulo")).trim(),
          descricao: String(formData.get("descricao")).trim(),
          area: String(formData.get("area")),
          horasDeclaradas: Number(formData.get("horasDeclaradas")),
          dataAtividade: String(formData.get("dataAtividade"))
        },
        arquivo
      });

      form.reset();
      showToast("Solicitação enviada com sucesso.", "success");
    } catch (error) {
      showToast(error.message || "Não foi possível enviar a atividade.", "danger");
    } finally {
      button.disabled = false;
      button.textContent = "Enviar solicitação";
    }
  });
}

function resolveSelectedCourseId(courses) {
  if (!courses.length) {
    studentState.selectedCourseId = null;
    return null;
  }

  const exists = courses.some((course) => Number(course.id) === Number(studentState.selectedCourseId));

  if (!exists) {
    studentState.selectedCourseId = Number(courses[0].id);
  }

  return studentState.selectedCourseId;
}
