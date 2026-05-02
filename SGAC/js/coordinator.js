import { coordinatorNav, API_BASE_URL } from "./config.js";
import { escapeHtml, formatDate } from "./utils.js";
import { emptyState, shell, showToast } from "./ui.js";
import { getUser } from "./state.js";

const SUBMISSOES_API_URL = `${API_BASE_URL}/submissoes`;

function montarUrlComprovante(value = "") {
  const raw = String(value || "").trim();
  if (!raw || /^[a-zA-Z]:\\/.test(raw) || raw.includes("\\")) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;

  const apiUrl = new URL(API_BASE_URL);
  const origin = apiUrl.origin;
  const apiPath = apiUrl.pathname.replace(/\/$/, "");

  if (raw.startsWith("/api/")) return `${origin}${raw}`;
  if (raw.startsWith("api/")) return `${origin}/${raw}`;
  if (raw.startsWith("/")) return `${origin}${apiPath}${raw}`;
  return `${origin}${apiPath}/uploads/${raw.replace(/^uploads\//, "")}`;
}

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
    comprovanteUrl: montarUrlComprovante(
      item.comprovanteUrl ||
        item.certificadoUrl ||
        item.comprovante ||
        item.proofUrl ||
        item.nomeArquivoComprovante ||
        item.nomeArquivo ||
        "",
    ),
    observacaoCoordenacao: String(item.observacaoCoordenacao || item.observacao || item.ocr || "").trim(),
    status,
  };
}

function criarLinhaSubmissao(submissao) {
  const item = normalizarSubmissao(submissao);
  const linkComprovante = item.comprovanteUrl
    ? `<div class="activity-title-cell"><a class="btn btn-outline btn-small activity-proof-link" href="${escapeHtml(item.comprovanteUrl)}" target="_blank" rel="noopener noreferrer">Abrir comprovante</a></div>`
    : '<div class="activity-title-cell"><span class="muted">Comprovante indisponível</span></div>';

  const ocr = item.observacaoCoordenacao
    ? `<span class="table-sub" title="Resultado do OCR">${escapeHtml(item.observacaoCoordenacao)}</span>`
    : '<span class="muted">—</span>';

  return `<tr>
    <td><strong>${escapeHtml(item.alunoNome)}</strong></td>
    <td>${escapeHtml(item.cursoNome)}</td>
    <td>${escapeHtml(item.areaNome)}</td>
    <td>${item.cargaHoraria}h</td>
    <td>${formatDate(item.dataEnvio)}</td>
    <td>${linkComprovante}</td>
    <td>${ocr}</td>
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
        tbody.innerHTML = '<tr><td colspan="8" class="muted">Nenhuma submissão pendente.</td></tr>';
      } else {
        pendentes.forEach((item) => {
          tbody.insertAdjacentHTML("beforeend", criarLinhaSubmissao(item));
        });
      }

      if (count) count.textContent = `${pendentes.length} submissão(ões) pendente(s)`;
    } catch (error) {
      showToast("Não foi possível carregar as submissões. Verifique se o back está rodando na porta 8080.", "danger");
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

        showToast("Status atualizado. O aluno será notificado por e-mail.", "success");
        await carregarSubmissoesPendentes();
      } catch (error) {
        showToast("Não foi possível aprovar a submissão.", "danger");
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

        showToast("Status atualizado. O aluno será notificado por e-mail.", "success");
        await carregarSubmissoesPendentes();
      } catch (error) {
        showToast("Não foi possível reprovar a submissão.", "danger");
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
      <section id="dash-breakdown" class="content-card" hidden>
        <div class="section-head">
          <div>
            <h3>Resumo por Curso e Área</h3>
            <p class="muted">Detalhamento das horas aprovadas por curso e categoria.</p>
          </div>
        </div>
        <div id="dash-breakdown-content"></div>
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
                <th>Resultado OCR</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody id="tbody-validacoes">
              <tr><td colspan="8" class="muted">Carregando submissões...</td></tr>
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
    heroAction: '<button class="btn btn-light" id="btn-novo-aluno-coord" type="button">+ Novo Aluno</button>',
    content: `
      <section id="students-grid" class="cards-grid single-column-mobile">
        <p class="muted">Carregando alunos vinculados a você...</p>
      </section>
      <div id="modal-novo-aluno-coord" class="modal-overlay" aria-hidden="true" hidden>
        <div class="modal-card">
          <h3>Cadastrar Novo Aluno</h3>
          <form class="form-grid" id="form-novo-aluno-coord">
            <label for="input-aluno-nome">Nome Completo<input id="input-aluno-nome" type="text" name="nome" required></label>
            <label for="input-aluno-email">E-mail<input id="input-aluno-email" type="email" name="email" required></label>
            <label for="input-aluno-senha">Senha<input id="input-aluno-senha" type="password" name="senha" required></label>
            <div class="modal-actions">
              <button type="button" class="btn btn-outline" id="btn-cancelar-novo-aluno">Cancelar</button>
              <button type="submit" class="btn btn-primary">Cadastrar</button>
            </div>
          </form>
        </div>
      </div>
    `,
  });
}

export function attachCoordinatorPage(page, { render, navigate }) {
  if (page === "coordinator-validate") {
    initTelaValidacoes();
  }

  if (page === "coordinator-dashboard") {
    buscarDashboardApi().then((dash) => {
      const elAlunos = document.getElementById("dash-alunos");
      const elPendentes = document.getElementById("dash-pendentes");
      const elHoras = document.getElementById("dash-horas");
      const elReprovadas = document.getElementById("dash-reprovadas");

      if (!dash) {
        if (elAlunos) elAlunos.textContent = "0";
        if (elPendentes) elPendentes.textContent = "0";
        if (elHoras) elHoras.textContent = "0h";
        if (elReprovadas) elReprovadas.textContent = "0";
        return;
      }

      if (elAlunos) elAlunos.textContent = dash.totalAlunos ?? dash.alunos ?? 0;
      if (elPendentes) elPendentes.textContent = dash.totalPendentes ?? dash.pendencias ?? dash.pendentes ?? 0;
      if (elHoras) elHoras.textContent = (dash.totalHorasAprovadas ?? dash.horasAprovadas ?? dash.horas ?? 0) + "h";
      if (elReprovadas) elReprovadas.textContent = dash.totalReprovadas ?? dash.submissoesReprovadas ?? dash.reprovadas ?? 0;

      const cursos = dash.metricasPorCurso || [];
      if (cursos.length) {
        const breakdown = document.getElementById("dash-breakdown");
        const content = document.getElementById("dash-breakdown-content");
        if (breakdown && content) {
          breakdown.hidden = false;
          content.innerHTML = cursos
            .map(
              (curso) => `<div class="breakdown-curso">
                <h4>${escapeHtml(String(curso.cursoNome || "Curso"))}</h4>
                <p class="muted">${curso.alunos ?? 0} aluno(s) · ${curso.horasAprovadas ?? 0}h aprovadas · ${curso.pendentes ?? 0} pendente(s)</p>
                ${Array.isArray(curso.metricasPorArea) && curso.metricasPorArea.length
                  ? `<div class="table-wrap"><table class="custom-table"><thead><tr><th>Área</th><th>Horas Aprovadas</th></tr></thead><tbody>${curso.metricasPorArea.map((a) => `<tr><td>${escapeHtml(String(a.area || "-"))}</td><td>${a.horasAprovadas ?? 0}h</td></tr>`).join("")}</tbody></table></div>`
                  : ""}
              </div>`
            )
            .join("<hr>");
        }
      }
    });
  }

  if (page === "coordinator-students") {
    function renderAlunos(alunos) {
      const grid = document.getElementById("students-grid");
      if (!grid) return;
      if (!alunos || alunos.length === 0) {
        grid.innerHTML = emptyState({ icon: "🎓", title: "Nenhum aluno vinculado", text: "Não há alunos registrados nos seus cursos." });
        return;
      }
      grid.innerHTML = alunos.map((student) => {
        const cursosList = Array.isArray(student.cursos)
          ? student.cursos.map((c) => c.nome || c.name).join(", ")
          : "Curso não especificado";
        return `<article class="person-card"><div class="person-avatar">🎓</div><div class="person-body"><div class="person-head no-actions"><div><h3>${escapeHtml(student.nome || student.name || "Aluno")}</h3><p>${escapeHtml(student.email || "")}</p></div></div><hr><span class="person-meta">${escapeHtml(cursosList)}</span></div></article>`;
      }).join("");
      const subtitleEl = document.querySelector(".page-head p");
      if (subtitleEl) subtitleEl.textContent = `${alunos.length} aluno(s) encontrados`;
    }

    buscarAlunosApi().then(renderAlunos);

    const modal = document.getElementById("modal-novo-aluno-coord");
    const formNovoAluno = document.getElementById("form-novo-aluno-coord");
    const btnNovo = document.getElementById("btn-novo-aluno-coord");
    const btnCancelar = document.getElementById("btn-cancelar-novo-aluno");

    function abrirModal() { if (modal) { modal.hidden = false; modal.setAttribute("aria-hidden", "false"); } }
    function fecharModal() { if (modal) { modal.hidden = true; modal.setAttribute("aria-hidden", "true"); formNovoAluno?.reset(); } }

    btnNovo?.addEventListener("click", abrirModal);
    btnCancelar?.addEventListener("click", fecharModal);
    modal?.addEventListener("click", (e) => { if (e.target === modal) fecharModal(); });

    formNovoAluno?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const user = getUser();
      let cursoIds = [];
      try {
        const res = await fetch(`${API_BASE_URL}/usuarios/${user.id}`, { headers: obterHeadersJsonComAuth() });
        if (res.ok) {
          const coordData = await res.json();
          cursoIds = Array.isArray(coordData.cursoIds)
            ? coordData.cursoIds.map(Number).filter(Boolean)
            : Array.isArray(coordData.cursos)
            ? coordData.cursos.map((c) => Number(c.id)).filter(Boolean)
            : [];
        }
      } catch { /* usa cursoIds vazio */ }

      const payload = {
        nome: String(document.getElementById("input-aluno-nome")?.value || "").trim(),
        email: String(document.getElementById("input-aluno-email")?.value || "").trim(),
        senha: String(document.getElementById("input-aluno-senha")?.value || "").trim(),
        perfil: "ALUNO",
        cursoIds,
      };

      try {
        const res = await fetch(`${API_BASE_URL}/usuarios`, {
          method: "POST",
          headers: obterHeadersJsonComAuth(),
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Falha ao cadastrar aluno");
        fecharModal();
        showToast("Aluno cadastrado com sucesso.", "success");
        buscarAlunosApi().then(renderAlunos);
      } catch {
        showToast("Não foi possível cadastrar o aluno.", "danger");
      }
    });
  }
}
