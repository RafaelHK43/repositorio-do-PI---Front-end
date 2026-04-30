import { coordinatorNav } from "./config.js";
import { escapeHtml, formatDate } from "./utils.js";
import { emptyState, shell } from "./ui.js";

const API_BASE_URL = "http://localhost:8080/api";
const SUBMISSOES_API_URL = `${API_BASE_URL}/submissoes`;

function obterTokenBasic() {
  return (
    localStorage.getItem("tokenBasic") ||
    localStorage.getItem("authBasic") ||
    ""
  );
}

function obterHeadersJsonComAuth() {
  return {
    "Content-Type": "application/json",
    Authorization: `Basic ${obterTokenBasic()}`,
  };
}

function statusLabel(status = "") {
  if (status === "aprovada") return "Aprovado";
  if (status === "reprovada") return "Reprovado";
  return "Pendente";
}

function normalizarSubmissao(item = {}) {
  const statusRaw = String(item.status || item.situacao || "PENDENTE").toUpperCase();
  const status = statusRaw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
  return {
    id: Number(item.id || item.submissaoId || 0),
    alunoNome: String(item.alunoNome || item.nomeAluno || item.aluno?.nome || "Aluno").trim(),
    cursoNome: String(item.cursoNome || item.nomeCurso || item.curso?.nome || "-").trim(),
    areaNome: String(item.areaNome || item.categoria || item.area?.nome || "-").trim(),
    cargaHoraria: Number(item.cargaHoraria || item.horas || item.workload || 0),
    dataEnvio: item.dataEnvio || item.createdAt || item.dataCriacao || "",
    comprovanteUrl: String(
      item.comprovanteUrl || item.comprovante || item.certificadoUrl || item.proofUrl || "",
    ).trim(),
    status,
  };
}

function criarLinhaSubmissao(submissao) {
  const item = normalizarSubmissao(submissao);
  const linkComprovante = item.comprovanteUrl
    ? `<a class="btn btn-outline btn-small" href="${escapeHtml(item.comprovanteUrl)}" target="_blank" rel="noopener noreferrer">Ver Comprovante</a>`
    : '<span class="muted">Sem arquivo</span>';

  return `<tr>
    <td><strong>${escapeHtml(item.alunoNome)}</strong></td>
    <td>${escapeHtml(item.cursoNome)}</td>
    <td>${escapeHtml(item.areaNome)}</td>
    <td>${item.cargaHoraria}h</td>
    <td>${formatDate(item.dataEnvio)}</td>
    <td>${linkComprovante}</td>
    <td class="actions-cell wide">
      <button class="btn btn-success small btn-aprovar-submissao" type="button" data-submissao-id="${item.id}">Aprovar</button>
      <button class="btn btn-danger small btn-reprovar-submissao" type="button" data-submissao-id="${item.id}">Reprovar</button>
    </td>
  </tr>`;
}

export function initTelaValidacoes() {
  const tbody = document.getElementById("tbody-validacoes");
  const count = document.getElementById("validacoes-count");
  if (!tbody) return;

  async function carregarSubmissoesPendentes() {
    try {
      const response = await fetch(SUBMISSOES_API_URL, {
        method: "GET",
        headers: obterHeadersJsonComAuth(),
      });
      if (!response.ok) throw new Error("Falha ao listar submissões");

      const payload = await response.json();
      const lista = Array.isArray(payload) ? payload : [];
      const pendentes = lista
        .map(normalizarSubmissao)
        .filter((item) => item.status === "PENDENTE");

      tbody.innerHTML = "";
      if (!pendentes.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="muted">Nenhuma submissão pendente.</td></tr>';
      } else {
        pendentes.forEach((item) => {
          tbody.insertAdjacentHTML("beforeend", criarLinhaSubmissao(item));
        });
      }

      if (count) count.textContent = `${pendentes.length} submissão(ões) pendente(s)`;
    } catch (error) {
      alert("Não foi possível carregar as submissões pendentes.");
      console.error(error);
    }
  }

  tbody.addEventListener("click", async (event) => {
    const btnAprovar = event.target.closest(".btn-aprovar-submissao");
    const btnReprovar = event.target.closest(".btn-reprovar-submissao");

    if (btnAprovar) {
      const id = btnAprovar.dataset.submissaoId;
      if (!id) return;
      const confirmado = confirm("Deseja aprovar estas horas?");
      if (!confirmado) return;

      try {
        const response = await fetch(`${SUBMISSOES_API_URL}/${id}/aprovar`, {
          method: "PUT",
          headers: obterHeadersJsonComAuth(),
        });
        if (!response.ok) throw new Error("Falha ao aprovar submissão");

        alert("Submissão aprovada com sucesso!");
        await carregarSubmissoesPendentes();
      } catch (error) {
        alert("Não foi possível aprovar a submissão.");
        console.error(error);
      }
      return;
    }

    if (btnReprovar) {
      const id = btnReprovar.dataset.submissaoId;
      if (!id) return;
      const motivo = prompt("Motivo da reprovação (opcional):") || "";

      try {
        const response = await fetch(`${SUBMISSOES_API_URL}/${id}/reprovar`, {
          method: "PUT",
          headers: obterHeadersJsonComAuth(),
          body: JSON.stringify({ motivo: motivo.trim() || null }),
        });
        if (!response.ok) throw new Error("Falha ao reprovar submissão");

        alert("Submissão reprovada com sucesso!");
        await carregarSubmissoesPendentes();
      } catch (error) {
        alert("Não foi possível reprovar a submissão.");
        console.error(error);
      }
    }
  });

  carregarSubmissoesPendentes();
}

// APIs para o Dashboard e Alunos
async function buscarDashboardApi() {
  try {
    const res = await fetch(`${API_BASE_URL}/dashboard`, { headers: obterHeadersJsonComAuth() });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error("Erro ao buscar dashboard:", e);
    return null;
  }
}

async function buscarAlunosApi() {
  try {
    const res = await fetch(`${API_BASE_URL}/usuarios?perfil=ALUNO`, { headers: obterHeadersJsonComAuth() });
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    console.error("Erro ao buscar alunos:", e);
    return [];
  }
}

export function coordinatorDashboardPage() {
  return shell({
    roleLabel: "Coordenador",
    navItems: coordinatorNav,
    title: "Dashboard Geral",
    subtitle: "Visão consolidada das solicitações e dos alunos vinculados.",
    heroTitle: "Painel da coordenação",
    heroText: "Seus cursos vinculados",
    content: `
      <section class="stats-grid four">
        <div class="stat-card blue">
          <span>Total de Alunos</span>
          <strong id="dash-alunos">...</strong>
          <em>🧑‍🎓</em>
        </div>
        <div class="stat-card orange">
          <span>Solicitações Pendentes</span>
          <strong id="dash-pendentes">...</strong>
          <em>🕘</em>
        </div>
        <div class="stat-card green">
          <span>Total de Horas Validadas</span>
          <strong id="dash-horas">...</strong>
          <em>✓</em>
        </div>
        <div class="stat-card red">
          <span>Reprovadas</span>
          <strong id="dash-reprovadas">...</strong>
          <em>✕</em>
        </div>
      </section>
      <section class="content-card">
        <div class="section-head">
          <div>
            <h3>Atalhos da coordenação</h3>
            <p class="muted">Acesse a validação ou acompanhe os alunos do curso.</p>
          </div>
        </div>
        <div class="quick-actions">
          <button class="quick-card quick-card-warm" data-go="coordinator-validate">Validar Certificados<span>Conferir solicitações pendentes</span></button>
          <button class="quick-card" data-go="coordinator-students">Visualizar Alunos<span>Ver alunos vinculados</span></button>
        </div>
      </section>
    `,
  });
}

export function coordinatorValidatePage() {
  return shell({
    roleLabel: "Coordenador",
    navItems: coordinatorNav,
    title: "Validação de Certificados",
    subtitle: "Acompanhe e decida as submissões pendentes dos alunos.",
    heroTitle: "Ações de validação",
    heroText: "Revise as submissões pendentes e aprove ou reprove diretamente na tabela.",
    content: `
      <section class="content-card table-card">
        <div class="table-wrap">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Nome do Aluno</th>
                <th>Curso</th>
                <th>Área (Categoria)</th>
                <th>Carga Horária</th>
                <th>Data de Envio</th>
                <th>Comprovante</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody id="tbody-validacoes">
              <tr><td colspan="7" class="muted">Carregando submissões...</td></tr>
            </tbody>
          </table>
        </div>
      </section>
      <section class="info-banner">
        <span id="validacoes-count">Buscando pendências...</span>
      </section>
    `,
  });
}

export function coordinatorStudentsPage() {
  return shell({
    roleLabel: "Coordenador",
    navItems: coordinatorNav,
    title: "Alunos do Curso",
    subtitle: "Carregando lista de alunos...",
    content: `
      <section id="students-grid" class="cards-grid single-column-mobile">
        <p class="muted">Carregando alunos vinculados a você...</p>
      </section>
    `,
  });
}

export function attachCoordinatorPage(page, { render, navigate }) {
  if (page === "coordinator-validate") {
    initTelaValidacoes();
  }

  // Preencher dados do Dashboard de forma assíncrona
  if (page === "coordinator-dashboard") {
    buscarDashboardApi().then((dash) => {
      if (dash) {
        document.getElementById("dash-alunos").textContent = dash.totalAlunos || dash.alunos || 0;
        document.getElementById("dash-pendentes").textContent = dash.pendencias || dash.pendentes || 0;
        document.getElementById("dash-horas").textContent = (dash.horasAprovadas || dash.horas || 0) + "h";
        document.getElementById("dash-reprovadas").textContent = dash.submissoesReprovadas || dash.reprovadas || 0;
      } else {
        document.getElementById("dash-alunos").textContent = "0";
        document.getElementById("dash-pendentes").textContent = "0";
        document.getElementById("dash-horas").textContent = "0h";
        document.getElementById("dash-reprovadas").textContent = "0";
      }
    });
  }

  // Preencher dados dos alunos de forma assíncrona
  if (page === "coordinator-students") {
    buscarAlunosApi().then((alunos) => {
      const grid = document.getElementById("students-grid");
      if (!grid) return;

      if (!alunos || alunos.length === 0) {
        grid.innerHTML = emptyState({
          icon: "🎓",
          title: "Nenhum aluno vinculado",
          text: "Não há alunos registrados nos seus cursos.",
        });
        return;
      }

      grid.innerHTML = alunos.map((student) => {
        const cursosList = Array.isArray(student.cursos) 
          ? student.cursos.map(c => c.nome || c.name).join(", ") 
          : "Curso não especificado";

        return `
          <article class="person-card">
            <div class="person-avatar">🎓</div>
            <div class="person-body">
              <div class="person-head no-actions">
                <div>
                  <h3>${escapeHtml(student.nome || student.name || "Aluno")}</h3>
                  <p>${escapeHtml(student.email || "")}</p>
                </div>
              </div>
              <hr>
              <span class="person-meta">${escapeHtml(cursosList)}</span>
            </div>
          </article>
        `;
      }).join("");
      
      // Atualiza o subtítulo se a classe existir no header padrão do shell
      const subtitleEl = document.querySelector(".page-head p");
      if (subtitleEl) subtitleEl.textContent = `${alunos.length} aluno(s) encontrados`;
    });
  }
}