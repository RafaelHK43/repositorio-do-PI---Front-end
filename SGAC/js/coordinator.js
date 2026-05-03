import { coordinatorNav, API_BASE_URL } from "./config.js";
import { escapeHtml, formatDate } from "./utils.js";
import { emptyState, shell, showToast } from "./ui.js";
import { getUser } from "./state.js";
import { abrirArquivoProtegido, baixarArquivoProtegido } from "./protected-file.js";

const SUBMISSOES_API_URL = `${API_BASE_URL}/submissoes`;
const ocrPorSubmissao = new Map();

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

function labelArea(enumVal = "") {
  const map = { ENSINO: "Ensino", PESQUISA: "Pesquisa", EXTENSAO: "Extensão", CULTURA: "Cultura", EVENTOS: "Eventos" };
  const key = String(enumVal).trim().toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  return map[key] || enumVal || "-";
}

function normalizarSubmissao(item = {}) {
  const statusRaw = String(item.status || item.situacao || "PENDENTE").toUpperCase();
  const status = statusRaw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
  const areaRaw = String(
    item.area || item.areaNome || item.categoria || item.areaAtividade || item.atividade?.area || ""
  ).trim();
  const dataRaw = item.dataSubmissao || item.dataEnvio || item.createdAt || item.dataCriacao || item.dataAtividade || item.atividade?.dataAtividade || "";
  const ocrRaw = String(
    item.resultadoOcr || item.resultado_ocr || item.ocr || item.observacaoOcr || item.observacaoCoordenacao || item.observacao || ""
  ).trim();
  return {
    id: Number(item.id || item.submissaoId || 0),
    alunoNome: String(item.alunoNome || item.nomeAluno || item.aluno?.nome || "Aluno").trim(),
    cursoNome: String(item.cursoNome || item.nomeCurso || item.curso?.nome || "-").trim(),
    areaNome: areaRaw ? labelArea(areaRaw) : "-",
    cargaHoraria: Number(item.cargaHoraria || item.horas || item.workload || 0),
    dataEnvio: dataRaw,
    comprovanteUrl: montarUrlComprovante(
      item.comprovanteUrl ||
        item.certificadoUrl ||
        item.comprovante ||
        item.proofUrl ||
        item.nomeArquivoComprovante ||
        item.nomeArquivo ||
        "",
    ),
    ocr: ocrRaw,
    status,
  };
}

function criarLinhaSubmissao(submissao) {
  const item = normalizarSubmissao(submissao);
  if (item.ocr) {
    ocrPorSubmissao.set(String(item.id), item.ocr);
  }

  const linkComprovante = item.comprovanteUrl
    ? `<div class="comprovante-btns">
        <button class="btn btn-outline btn-small activity-proof-link" type="button" data-proof-open="${escapeHtml(item.comprovanteUrl)}">Abrir comprovante</button>
        <button class="btn btn-outline btn-small" type="button" data-proof-download="${escapeHtml(item.comprovanteUrl)}">Baixar comprovante</button>
      </div>`
    : '<span class="muted">Comprovante indisponível</span>';

  const ocrCell = item.ocr
    ? `<div class="ocr-cell-wrap">
        <span class="status-badge neutral">Processado</span>
        <button class="btn btn-outline btn-small btn-ver-ocr" type="button" data-ocr-id="${item.id}">Ver OCR</button>
      </div>`
    : '<span class="muted">OCR não processado</span>';

  return `<tr>
    <td><strong>${escapeHtml(item.alunoNome)}</strong></td>
    <td>${escapeHtml(item.cursoNome)}</td>
    <td>${escapeHtml(item.areaNome)}</td>
    <td>${item.cargaHoraria}h</td>
    <td>${formatDate(item.dataEnvio)}</td>
    <td>${linkComprovante}</td>
    <td class="ocr-col">${ocrCell}</td>
    <td class="actions-cell wide">
      <button class="btn btn-success small btn-aprovar-submissao" type="button" data-submissao-id="${item.id}">Aprovar</button>
      <button class="btn btn-danger small btn-reprovar-submissao" type="button" data-submissao-id="${item.id}">Reprovar</button>
    </td>
  </tr>`;
}

function abrirModalOcr(texto = "") {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `<div class="modal-card ocr-modal-card">
    <h3>Resultado OCR</h3>
    <div class="ocr-modal-text">${escapeHtml(texto || "OCR não processado")}</div>
    <div class="modal-actions">
      <button type="button" class="btn btn-outline" data-modal-close>Fechar</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);

  const fechar = () => overlay.remove();
  overlay.querySelector("[data-modal-close]")?.addEventListener("click", fechar);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) fechar();
  });
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

      ocrPorSubmissao.clear();
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
      showToast("Não foi possível carregar as submissões. Verifique sua conexão ou tente novamente em instantes.", "danger");
      console.error(error);
    }
  }

  tbody.addEventListener("click", async (event) => {
    const btnOcr = event.target.closest(".btn-ver-ocr");
    const btnAbrirComprovante = event.target.closest("[data-proof-open]");
    const btnBaixarComprovante = event.target.closest("[data-proof-download]");
    const btnAprovar = event.target.closest(".btn-aprovar-submissao");
    const btnReprovar = event.target.closest(".btn-reprovar-submissao");

    if (btnAbrirComprovante) {
      await abrirArquivoProtegido(btnAbrirComprovante.dataset.proofOpen || "");
      return;
    }

    if (btnBaixarComprovante) {
      await baixarArquivoProtegido(btnBaixarComprovante.dataset.proofDownload || "");
      return;
    }

    if (btnOcr) {
      abrirModalOcr(ocrPorSubmissao.get(String(btnOcr.dataset.ocrId)) || "");
      return;
    }

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
    (async () => {
      const grid = document.getElementById("students-grid");
      if (!grid) return;
      const headers = obterHeadersJsonComAuth();
      try {
        const [alunos, todasSubmissoes, cursos] = await Promise.all([
          buscarAlunosApi(),
          fetch(`${API_BASE_URL}/submissoes`, { headers }).then((r) => r.ok ? r.json() : []).catch(() => []),
          fetch(`${API_BASE_URL}/cursos`, { headers }).then((r) => r.ok ? r.json() : []).catch(() => []),
        ]);

        const subtitleEl = document.querySelector(".page-head p");

        if (!alunos || !alunos.length) {
          grid.innerHTML = emptyState({ icon: "🎓", title: "Nenhum aluno vinculado", text: "Nenhum aluno vinculado ao curso." });
          if (subtitleEl) subtitleEl.textContent = "Nenhum aluno encontrado";
          return;
        }

        const submissoesList = Array.isArray(todasSubmissoes) ? todasSubmissoes : [];
        const cursosList = Array.isArray(cursos) ? cursos : [];

        const normalizeStatus = (s) =>
          String(s || "").toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

        grid.innerHTML = alunos.map((student) => {
          const nome = escapeHtml(student.nome || student.name || "Aluno");
          const email = escapeHtml(student.email || "");
          const studentId = Number(student.id || 0);

          const cursoIds = Array.isArray(student.cursoIds)
            ? student.cursoIds.map(Number)
            : Array.isArray(student.cursos)
            ? student.cursos.map((c) => Number(c.id))
            : student.cursoId ? [Number(student.cursoId)] : [];

          const cursoNome = cursoIds.length
            ? cursoIds.map((cid) => {
                const c = cursosList.find((x) => Number(x.id) === cid);
                return c ? (c.nome || c.name || `Curso ${cid}`) : `Curso ${cid}`;
              }).join(", ")
            : (student.cursoNome || student.nomeCurso || "Curso não especificado");

          const cargaMinima = (() => {
            const c = cursosList.find((x) => cursoIds.includes(Number(x.id)));
            return Number(c?.cargaHorariaMinima || 120);
          })();

          const subs = submissoesList.filter((s) =>
            Number(s.alunoId || s.studentId || s.aluno?.id) === studentId
          );
          const aprovadas = subs.filter((s) => normalizeStatus(s.status) === "APROVADA");
          const pendentes = subs.filter((s) => normalizeStatus(s.status) === "PENDENTE");
          const reprovadas = subs.filter((s) => normalizeStatus(s.status) === "REPROVADA");
          const horasAprovadas = aprovadas.reduce(
            (t, s) => t + Number(s.cargaHoraria || s.horas || s.workload || 0), 0
          );
          const progresso = Math.min(100, Math.round((horasAprovadas / cargaMinima) * 100));

          return `<article class="person-card">
            <div class="person-body">
              <div class="person-head no-actions">
                <div class="person-avatar">🎓</div>
                <div>
                  <h3>${nome}</h3>
                  <p>${email}</p>
                  <small class="muted">Curso: ${escapeHtml(cursoNome)}</small>
                </div>
              </div>
              <hr>
              <div style="display:flex;flex-wrap:wrap;gap:.35rem;margin-bottom:.5rem">
                <span class="status-badge neutral">${subs.length} atividade(s)</span>
                <span class="status-badge pendente">${pendentes.length} pendente(s)</span>
                <span class="status-badge aprovada">${aprovadas.length} aprovada(s)</span>
                <span class="status-badge reprovada">${reprovadas.length} reprovada(s)</span>
              </div>
              <div>
                <small>${horasAprovadas}h aprovadas / ${cargaMinima}h mínimas &mdash; ${progresso}%</small>
                <div class="student-progress-bar" style="margin-top:4px"><div style="width:${progresso}%"></div></div>
              </div>
            </div>
          </article>`;
        }).join("");

        if (subtitleEl) subtitleEl.textContent = `${alunos.length} aluno(s) encontrado(s)`;
      } catch {
        if (grid) grid.innerHTML = emptyState({ icon: "🎓", title: "Erro ao carregar", text: "Não foi possível carregar os alunos." });
      }
    })();

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
