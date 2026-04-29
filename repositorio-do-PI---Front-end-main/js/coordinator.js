import { getCourses } from "./api.js";
import { coordinatorNav } from "./config.js";
import { infoCard, shell } from "./ui.js";

export async function coordinatorDashboardPage() {
  const courses = await getCourses();

  return shell({
    roleLabel: "Coordenador",
    navItems: coordinatorNav,
    heroTitle: "Painel da Coordenação",
    heroText:
      "Com o back atual, o coordenador já consegue usar os endpoints de cursos e regras. Validação e listagem de alunos ainda dependem de novas rotas.",
    content: `
      <section class="stats-grid four">
        <div class="stat-card blue">
          <span>Cursos visíveis</span>
          <strong>${courses.length}</strong>
          <em>🎓</em>
        </div>

        <div class="stat-card orange">
          <span>Validação</span>
          <strong>Back pendente</strong>
          <em>📝</em>
        </div>

        <div class="stat-card navy">
          <span>Alunos</span>
          <strong>Back pendente</strong>
          <em>🧑‍🎓</em>
        </div>

        <div class="stat-card light">
          <span>Submissões</span>
          <strong>Somente POST</strong>
          <em>📤</em>
        </div>
      </section>

      ${infoCard(
        "Rotas já aproveitadas",
        "Use as páginas de Cursos e Regras no menu para testar os endpoints já disponíveis para o coordenador."
      )}
    `
  });
}

export function coordinatorValidatePage() {
  return shell({
    roleLabel: "Coordenador",
    navItems: coordinatorNav,
    title: "Validar atividades",
    subtitle: "Aguardando endpoint de listagem e decisão da coordenação",
    content: infoCard(
      "Integração pendente",
      "O back atual ainda não expõe rotas para listar pendências, aprovar ou reprovar submissões no front."
    )
  });
}

export function coordinatorStudentsPage() {
  return shell({
    roleLabel: "Coordenador",
    navItems: coordinatorNav,
    title: "Alunos do curso",
    subtitle: "Aguardando endpoint específico no back-end",
    content: infoCard(
      "Integração pendente",
      "Assim que o back disponibilizar os alunos por curso, essa tela já pode ser ligada sem refazer a interface."
    )
  });
}

export function attachCoordinatorPage() {}
