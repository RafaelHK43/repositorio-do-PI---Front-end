import { studentNav, studentRulesReference, API_BASE_URL } from "./config.js";
import {
  getAreaName,
  getCourseName,
  getData,
  getUser,
} from "./state.js";
import { escapeHtml, formatDate, statusClass } from "./utils.js";
import { abrirArquivoProtegido, baixarArquivoProtegido } from "./protected-file.js";
import {
  bindModalClose,
  closeModal,
  emptyState,
  modalActions,
  openModal,
  shell,
  showToast,
} from "./ui.js";

let activeCourseId = null;

function obterHeaders() {
  const token = localStorage.getItem("tokenBasic") || "";
  return {
    Authorization: `Basic ${token}`,
    Accept: "application/json",
  };
}

function areaEnumToLabel(enumVal = "") {
  const map = {
    ENSINO: "Ensino",
    PESQUISA: "Pesquisa",
    EXTENSAO: "Extensão",
    CULTURA: "Cultura",
    EVENTOS: "Eventos",
  };
  return map[String(enumVal).toUpperCase()] || enumVal;
}

function normalizarAreaParaEnum(area = "") {
  const normalized = String(area)
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
  const map = {
    ENSINO: "ENSINO",
    PESQUISA: "PESQUISA",
    EXTENSAO: "EXTENSAO",
    CULTURA: "CULTURA",
    EVENTOS: "EVENTOS",
  };
  return map[normalized] || "";
}

function statusLabelPt(status = "") {
  if (status === "aprovada") return "Aprovada";
  if (status === "reprovada") return "Reprovada";
  return "Pendente";
}

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

async function buscarSubmissoesDoAluno(studentId) {
  if (!studentId) return [];
  try {
    const response = await fetch(
      `${API_BASE_URL}/submissoes/aluno/${studentId}`,
      { method: "GET", headers: obterHeaders() },
    );

    if (!response.ok) {
      if (response.status === 404) return [];
      return [];
    }

    const submissoes = await response.json();
    return Array.isArray(submissoes)
      ? submissoes.map((item) => ({
          id: item.id,
          studentId: item.alunoId || item.studentId || studentId,
          courseId: item.cursoId || item.courseId,
          cursoNome: String(item.cursoNome || item.nomeCurso || ""),
          areaId: String(item.areaId || item.area || ""),
          areaNome: String(item.areaNome || item.nomeArea || ""),
          title: String(item.title || item.atividadeTitulo || item.titulo || "Sem título"),
          description: String(item.descricao || item.description || ""),
          workload: Number(item.cargaHoraria || item.workload || 0),
          activityDate: item.dataAtividade || item.activityDate || "",
          proofFile: String(
            item.nomeArquivoComprovante || item.nomeArquivo || item.proofFile || "",
          ),
          comprovanteUrl: montarUrlComprovante(
            item.certificadoUrl ||
              item.comprovanteUrl ||
              item.comprovante ||
              item.proofUrl ||
              item.nomeArquivoComprovante ||
              item.nomeArquivo ||
              item.proofFile ||
              "",
          ),
          status: String(item.status || "pendente").toLowerCase(),
          feedback: String(item.observacaoCoordenacao || item.feedback || ""),
        }))
      : [];
  } catch (error) {
    console.error("Erro ao buscar submissões:", error);
    return [];
  }
}

async function getApiErrorMessage(response, fallback) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const payload = await response.json().catch(() => null);
    return payload?.message || payload?.mensagem || payload?.error || payload?.detail || fallback;
  }
  const text = await response.text().catch(() => "");
  return text.trim() || fallback;
}

export async function carregarCursos(target = null) {
  try {
    const response = await fetch(`${API_BASE_URL}/cursos`, { headers: obterHeaders() });
    if (!response.ok) {
      throw new Error(
        await getApiErrorMessage(response, "Não foi possível carregar os cursos."),
      );
    }
    const cursos = await response.json();
    const normalized = Array.isArray(cursos)
      ? cursos
          .map((c) => ({
            id: c.id ?? c.courseId ?? "",
            name: c.nome ?? c.name ?? "Curso sem nome",
            cargaHorariaMinima: c.cargaHorariaMinima ?? 0,
          }))
          .filter((c) => c.id !== "")
      : [];

    if (target) {
      const el = target instanceof Element ? target : document.querySelector(target);
      if (el && el.matches("select")) {
        el.innerHTML = normalized.length
          ? normalized
              .map(
                (c, i) =>
                  `<option value="${c.id}" ${i === 0 ? "selected" : ""}>${escapeHtml(c.name)}</option>`,
              )
              .join("")
          : '<option value="">Nenhum curso disponível</option>';
      }
    }
    return normalized;
  } catch (error) {
    console.error(error);
    return [];
  }
}

async function carregarRegrasParaSelect(cursoId, areaSelect) {
  if (!areaSelect || !cursoId) return;
  areaSelect.innerHTML = '<option value="">Carregando áreas...</option>';

  let regras = [];

  try {
    const res = await fetch(`${API_BASE_URL}/regras/curso/${cursoId}`, {
      headers: obterHeaders(),
    });
    if (res.ok) {
      regras = await res.json();
    } else {
      // fallback: buscar todas as regras e filtrar
      const allRes = await fetch(`${API_BASE_URL}/regras`, { headers: obterHeaders() });
      if (allRes.ok) {
        const all = await allRes.json();
        regras = Array.isArray(all)
          ? all.filter((r) => Number(r.cursoId) === Number(cursoId))
          : [];
      }
    }
  } catch {
    areaSelect.innerHTML =
      '<option value="">Cadastre regras para este curso antes de enviar atividade.</option>';
    return;
  }

  if (!Array.isArray(regras) || !regras.length) {
    areaSelect.innerHTML = '<option value="">Nenhuma área disponível</option>';
    showToast("Cadastre regras para este curso antes de enviar atividade.", "warning");
    return;
  }

  areaSelect.innerHTML = regras
    .map((r) => {
      const val = String(r.area || "").trim();
      const label = areaEnumToLabel(val);
      return `<option value="${escapeHtml(val)}">${escapeHtml(label)}</option>`;
    })
    .join("");
}

export async function salvarSubmissao(formElement, navigate) {
  const user = getUser();

  if (!formElement || !user) return null;

  if (!user.id || Number(user.id) === 0) {
    showToast("Usuário sem ID. Faça login novamente.", "danger");
    return null;
  }

  const fd = new FormData(formElement);
  const courseId = Number(fd.get("courseId"));
  const areaSelect = formElement.elements?.areaId;
  const rawArea = String(fd.get("areaId") || "").trim();
  const areaLabel =
    areaSelect instanceof HTMLSelectElement
      ? String(areaSelect.selectedOptions[0]?.textContent || "").trim()
      : "";
  const areaEnum =
    normalizarAreaParaEnum(/^\d+$/.test(rawArea) ? areaLabel : rawArea) ||
    normalizarAreaParaEnum(areaLabel);
  const title = String(fd.get("title") || "").trim();
  const description = String(fd.get("description") || "").trim();
  const workload = Number(fd.get("workload"));
  const activityDate = String(fd.get("activityDate") || "");
  const certificate = fd.get("certificado");

  if (!courseId) {
    showToast("Selecione um curso.", "danger");
    return null;
  }
  if (!rawArea && !areaLabel) {
    showToast("Área obrigatória. Cadastre regras para este curso antes de enviar atividade.", "danger");
    return null;
  }
  if (!areaEnum) {
    showToast("Selecione uma área válida.", "danger");
    return null;
  }
  if (!title) {
    showToast("Preencha o título da atividade.", "danger");
    return null;
  }
  if (!workload || workload <= 0) {
    showToast("Carga horária deve ser maior que zero.", "danger");
    return null;
  }
  if (!activityDate) {
    showToast("Data da atividade é obrigatória.", "danger");
    return null;
  }
  if (!(certificate instanceof File) || certificate.size === 0) {
    showToast("Escolha um certificado antes de enviar.", "danger");
    return null;
  }

  const dados = {
    alunoId: Number(user.id),
    cursoId: Number(courseId),
    titulo: title,
    descricao: description,
    area: areaEnum,
    cargaHoraria: Number(workload),
    dataAtividade: activityDate,
  };

  const payload = new FormData();
  payload.append(
    "dados",
    new Blob([JSON.stringify(dados)], { type: "application/json" }),
  );
  payload.append("arquivo", certificate);

  try {
    const token = localStorage.getItem("tokenBasic") || "";
    console.log("Enviando submissão:", dados);

    const response = await fetch(`${API_BASE_URL}/submissoes`, {
      method: "POST",
      headers: { Authorization: `Basic ${token}` },
      body: payload,
    });

    if (!response.ok) {
      throw new Error(
        await getApiErrorMessage(response, "Não foi possível enviar a submissão."),
      );
    }

    formElement.reset();
    closeModal();
    showToast("Solicitação enviada. A coordenação será notificada por e-mail.", "success");

    if (typeof navigate === "function") {
      navigate("student-activities");
    }

    return true;
  } catch (error) {
    showToast(
      error instanceof Error ? error.message : "Não foi possível enviar a submissão.",
      "danger",
    );
    return false;
  }
}

function getStudentContext() {
  const user = getUser();
  const data = getData();
  const activities = data.activities.filter(
    (item) => Number(item.studentId) === Number(user?.id),
  );
  const primaryCourseId = user?.courseIds?.[0] || data.courses[0]?.id;
  return { user, data, activities, primaryCourseId };
}

async function getStudentContextAsync() {
  const user = getUser();
  const data = getData();
  const activities = await buscarSubmissoesDoAluno(user?.id);
  const primaryCourseId = user?.courseIds?.[0] || data.courses[0]?.id;
  return { user, data, activities, primaryCourseId };
}

export async function studentDashboardPage() {
  const user = getUser();
  const data = getData();
  const student = user;

  let availableCourses = [];
  try {
    const res = await fetch(`${API_BASE_URL}/usuarios/${user.id}`, {
      headers: obterHeaders(),
    });
    if (res.ok) {
      const userData = await res.json();
      const ids = Array.isArray(userData.cursoIds)
        ? userData.cursoIds.map(Number)
        : Array.isArray(userData.cursos)
        ? userData.cursos.map((c) => Number(c.id))
        : (user?.courseIds || []).map(Number);
      const allRes = await fetch(`${API_BASE_URL}/cursos`, {
        headers: obterHeaders(),
      });
      if (allRes.ok) {
        const all = await allRes.json();
        availableCourses = Array.isArray(all)
          ? all.filter((c) => !ids.length || ids.includes(Number(c.id)))
          : [];
      }
    }
  } catch {
    /* fallback sem cursos */
  }

  if (
    !activeCourseId ||
    !availableCourses.some((c) => Number(c.id) === Number(activeCourseId))
  ) {
    activeCourseId = availableCourses[0]?.id || user?.courseIds?.[0] || null;
  }

  const activities = await buscarSubmissoesDoAluno(user?.id);
  const courseActivities = activeCourseId
    ? activities.filter((a) => Number(a.courseId) === Number(activeCourseId))
    : activities;

  const approved = courseActivities.filter(
    (a) => String(a.status).toLowerCase() === "aprovada",
  );
  const pending = courseActivities.filter(
    (a) => String(a.status).toLowerCase() === "pendente",
  );
  const rejected = courseActivities.filter(
    (a) => String(a.status).toLowerCase() === "reprovada",
  );
  const hours = approved.reduce((t, a) => t + Number(a.workload), 0);

  const activeCourse = availableCourses.find(
    (c) => Number(c.id) === Number(activeCourseId),
  );
  const required = Number(
    activeCourse?.cargaHorariaMinima || activeCourse?.workload_required || 200,
  );
  const progress = Math.min(100, Math.round((hours / required) * 100));
  const courseName = escapeHtml(
    activeCourse?.nome ||
      activeCourse?.name ||
      getCourseName(activeCourseId, data),
  );

  const courseSelectorHtml =
    availableCourses.length > 1
      ? `<section class="content-card compact"><label style="display:flex;align-items:center;gap:.5rem;font-weight:600">Curso ativo: <select id="student-course-select" style="flex:1">${availableCourses.map((c) => `<option value="${c.id}" ${Number(c.id) === Number(activeCourseId) ? "selected" : ""}>${escapeHtml(c.nome || c.name || "")}</option>`).join("")}</select></label></section>`
      : "";

  const areaMap = new Map();
  approved.forEach((a) => {
    const k = String(a.areaId || "").trim();
    if (k) areaMap.set(k, (areaMap.get(k) || 0) + Number(a.workload));
  });
  const areaBreakdownHtml = areaMap.size
    ? `<section class="content-card"><h3>Horas por Área</h3><div class="cards-grid">${[...areaMap.entries()].map(([area, h]) => `<div class="summary-card"><strong>${escapeHtml(areaEnumToLabel(area))}</strong><span>${h}h aprovadas</span></div>`).join("")}</div></section>`
    : "";

  return shell({
    roleLabel: "Atividades Complementares",
    navItems: studentNav,
    content: `${courseSelectorHtml}<section class="student-welcome-banner"><div class="student-banner-icon">🏅</div><div><h3>Olá, ${escapeHtml(student?.name || student?.nome || "Aluno")}!</h3><p>Acompanhe suas atividades e o progresso no curso ${courseName}.</p></div></section><section class="student-stats-grid"><div class="student-stat-card"><span>Total de Atividades</span><strong>${courseActivities.length}</strong><em>🏅</em></div><div class="student-stat-card success"><span>Aprovadas</span><strong>${approved.length}</strong><em>✓</em></div><div class="student-stat-card warning"><span>Pendentes</span><strong>${pending.length}</strong><em>🕘</em></div><div class="student-stat-card info"><span>Reprovadas</span><strong>${rejected.length}</strong><em>✕</em></div></section><section class="content-card student-progress-card"><div class="student-progress-head"><div><h3>Progresso Geral</h3><p>Meta: ${required}h obrigatórias</p></div><span class="student-progress-badge">${progress}%</span></div><div class="student-progress-bar"><div style="width:${progress}%"></div></div><p class="student-progress-text">${hours}h concluídas de ${required}h. Faltam <strong>${Math.max(required - hours, 0)}h</strong>.</p></section>${areaBreakdownHtml}<section class="content-card"><h3>Ações rápidas</h3><div class="quick-actions"><button class="quick-card quick-card-warm" data-go="student-add">Adicionar Atividade<span>Registrar nova solicitação</span></button><button class="quick-card" data-go="student-activities">Minhas Atividades<span>Acompanhar status</span></button></div></section>`,
  });
}

function activityModal() {
  return `<h3>Nova Atividade</h3>
    <form class="form-grid" id="activityForm">
      <label>Curso
        <select name="courseId" id="activityCourseSelect" required>
          <option value="">Carregando cursos...</option>
        </select>
      </label>
      <label>Área
        <select name="areaId" id="activityAreaSelect" required>
          <option value="">Selecione o curso primeiro...</option>
        </select>
      </label>
      <label>Título
        <input type="text" name="title" placeholder="Ex: Monitoria de Lógica" required>
      </label>
      <label>Carga Horária (horas)
        <input type="number" min="1" name="workload" placeholder="Ex: 20" required>
      </label>
      <label>Data da Atividade
        <input type="date" name="activityDate" required>
      </label>
      <label class="full-span">Descrição
        <textarea name="description" rows="3" placeholder="Descreva brevemente a atividade (opcional)"></textarea>
      </label>
      <label class="full-span">Certificado / Comprovante (obrigatório)
        <input type="file" name="certificado" accept=".pdf,.png,.jpg,.jpeg" required>
      </label>
      ${modalActions("Enviar Solicitação")}
    </form>`;
}

export async function studentActivitiesPage() {
  const { activities } = await getStudentContextAsync();
  const data = getData();

  const pending = activities.filter((item) => item.status === "pendente");
  const approved = activities.filter((item) => item.status === "aprovada");
  const rejected = activities.filter((item) => item.status === "reprovada");
  const approvedHours = approved.reduce(
    (total, item) => total + Number(item.workload),
    0,
  );

  const activityRows = activities
    .map((activity) => {
      const courseDisplay = escapeHtml(
        activity.cursoNome || getCourseName(activity.courseId, data),
      );
      const areaDisplay = escapeHtml(
        activity.areaNome || areaEnumToLabel(activity.areaId),
      );
      const st = String(activity.status).toLowerCase();
      const comprovante = activity.comprovanteUrl
        ? `<div class="comprovante-btns">
            <button class="btn btn-outline btn-small activity-proof-link" type="button" data-proof-open="${escapeHtml(activity.comprovanteUrl)}">Ver comprovante</button>
            <button class="btn btn-outline btn-small" type="button" data-proof-download="${escapeHtml(activity.comprovanteUrl)}" data-proof-name="${escapeHtml(activity.proofFile || "")}">Baixar comprovante</button>
          </div>`
        : '<span class="muted">Comprovante indisponível</span>';
      return `<tr>
        <td>
          <div class="activity-title-cell">
            <strong class="activity-title">${escapeHtml(activity.title)}</strong>
            ${activity.proofFile ? `<span class="activity-file-name">${escapeHtml(activity.proofFile)}</span>` : ""}
            ${comprovante}
          </div>
        </td>
        <td>${courseDisplay}</td>
        <td>${areaDisplay}</td>
        <td>${activity.workload}h</td>
        <td>${formatDate(activity.activityDate)}</td>
        <td><span class="${statusClass(st)}">${statusLabelPt(st)}</span></td>
        <td class="actions-cell">${st === "pendente" ? `<button class="icon-btn delete" data-delete-activity="${activity.id}" title="Remover">🗑</button>` : '<span class="muted-text">-</span>'}</td>
      </tr>`;
    })
    .join("");

  return shell({
    roleLabel: "Atividades Complementares",
    navItems: studentNav,
    title: "Minhas Atividades",
    subtitle: `${activities.length} atividade(s) cadastrada(s)`,
    content: `
      <div class="page-toolbar">
        <button class="btn btn-warning" data-open-activity>+ Adicionar Atividade</button>
      </div>
      <section class="student-stats-grid">
        <div class="student-stat-card warning compact"><span>Pendentes</span><strong>${pending.length}</strong></div>
        <div class="student-stat-card success compact"><span>Aprovadas</span><strong>${approved.length}</strong></div>
        <div class="student-stat-card danger compact"><span>Reprovadas</span><strong>${rejected.length}</strong></div>
        <div class="student-stat-card info compact"><span>Horas Aprovadas</span><strong>${approvedHours}h</strong></div>
      </section>
      <section class="content-card">
        ${
          activities.length
            ? `<div class="table-wrap"><table class="custom-table"><thead><tr><th>Título</th><th>Curso</th><th>Área</th><th>Horas</th><th>Data</th><th>Status</th><th>Ações</th></tr></thead><tbody>${activityRows}</tbody></table></div>`
            : emptyState({
                icon: "🏅",
                title: "Nenhuma atividade cadastrada",
                text: "Comece adicionando sua primeira atividade complementar!",
                actionLabel: "Adicionar Atividade",
                actionPage: "student-add",
              })
        }
      </section>`,
  });
}

export function studentAddPage() {
  const { user } = getStudentContext();
  return shell({
    roleLabel: "Atividades Complementares",
    navItems: studentNav,
    title: "Adicionar Atividade",
    subtitle: "Registre uma nova atividade complementar",
    content: `
      <section class="content-card student-add-hero">
        <div class="student-add-icon">📎</div>
        <div class="student-add-copy">
          <div class="note-box student-note-box student-add-note">
            <span class="student-add-note-icon">✅</span>
            <div>
              <strong>Antes de enviar:</strong>
              <p>Preencha os dados obrigatórios e adicione o comprovante da atividade.</p>
            </div>
          </div>
          <button class="btn btn-primary student-add-button" data-open-activity>Preencher Formulário</button>
        </div>
      </section>
      <section class="student-add-info-grid">
        <article class="student-add-mini-card">
          <span>1</span>
          <strong>Preencha os dados</strong>
        </article>
        <article class="student-add-mini-card">
          <span>2</span>
          <strong>Anexe o comprovante</strong>
        </article>
        <article class="student-add-mini-card">
          <span>3</span>
          <strong>Aguarde validação</strong>
        </article>
      </section>
      <section class="content-card student-account-card">
        <div class="student-account-icon">👤</div>
        <div>
          <h3>Aluno</h3>
          <p>${escapeHtml(user?.email || "")}</p>
        </div>
      </section>`,
  });
}

export async function studentRulesPage() {
  const user = getUser();
  const data = getData();
  const student = user;

  let courseId = student?.courseIds?.[0] || null;
  let courseName = getCourseName(courseId, data);
  let regras = [];

  // Tentar obter curso do aluno via API
  try {
    const userRes = await fetch(`${API_BASE_URL}/usuarios/${user.id}`, {
      headers: obterHeaders(),
    });
    if (userRes.ok) {
      const userData = await userRes.json();
      const ids = Array.isArray(userData.cursoIds)
        ? userData.cursoIds.map(Number).filter(Boolean)
        : Array.isArray(userData.cursos)
        ? userData.cursos.map((c) => Number(c.id)).filter(Boolean)
        : [];
      if (ids.length) courseId = ids[0];
    }
  } catch {
    /* usa courseId local */
  }

  // Buscar regras do curso via API
  if (courseId) {
    try {
      const regrasRes = await fetch(`${API_BASE_URL}/regras/curso/${courseId}`, {
        headers: obterHeaders(),
      });
      if (regrasRes.ok) {
        regras = await regrasRes.json();
      } else {
        // fallback: todas as regras filtradas
        const allRes = await fetch(`${API_BASE_URL}/regras`, {
          headers: obterHeaders(),
        });
        if (allRes.ok) {
          const all = await allRes.json();
          regras = Array.isArray(all)
            ? all.filter((r) => Number(r.cursoId) === Number(courseId))
            : [];
        }
      }
    } catch {
      /* sem regras da API */
    }
  }

  // Buscar nome do curso via API
  if (courseId) {
    try {
      const cursosRes = await fetch(`${API_BASE_URL}/cursos`, {
        headers: obterHeaders(),
      });
      if (cursosRes.ok) {
        const cursos = await cursosRes.json();
        const curso = cursos.find((c) => Number(c.id) === Number(courseId));
        if (curso) courseName = curso.nome || curso.name || courseName;
      }
    } catch {
      /* usa courseName local */
    }
  }

  const cursoExibicao = courseName && courseName !== "Nenhum curso vinculado"
    ? courseName
    : courseId ? "ADS" : "Nenhum curso vinculado";

  const regrasHtml = regras.length
    ? `<section class="cards-grid rules-summary-grid">${regras
        .map(
          (r) =>
            `<div class="summary-card"><strong>${escapeHtml(areaEnumToLabel(r.area || ""))}</strong><span>${r.limiteHoras || 0}h máximas</span></div>`,
        )
        .join("")}</section>`
    : studentRulesReference.length
    ? ""
    : `<section class="cards-grid rules-summary-grid"><p class="muted">Nenhuma regra cadastrada para este curso. O administrador deve configurar as regras primeiro.</p></section>`;

  return shell({
    roleLabel: "Atividades Complementares",
    navItems: studentNav,
    title: "Regras do Curso",
    subtitle: `Curso atual: ${escapeHtml(cursoExibicao)}`,
    content: `
      <section class="student-rules-alert">As regras abaixo orientam o cadastro das atividades e o limite de horas por categoria.</section>
      ${regrasHtml}
      <section class="student-rules-list">${studentRulesReference
        .map(
          (rule) =>
            `<details class="student-rule-card student-rule-accordion"><summary class="student-rule-head"><div class="student-rule-title ${rule.color}"><span class="student-rule-dot"></span><div><strong>${escapeHtml(rule.name)}</strong><small>Exemplos de atividades válidas</small></div></div><div class="student-rule-head-right"><span class="student-rule-badge ${rule.color}">${rule.limit}h</span><span class="student-rule-arrow">⌄</span></div></summary><div class="student-rule-content"><table class="custom-table student-rule-table"><thead><tr><th>Atividade</th><th>Horas</th></tr></thead><tbody>${rule.items.map((item) => `<tr><td>${escapeHtml(item[0])}</td><td>${escapeHtml(item[1])}</td></tr>`).join("")}</tbody></table></div></details>`,
        )
        .join("")}</section>`,
  });
}

export function attachStudentPage(page, { render, navigate }) {
  const user = getUser();

  if (page === "student-dashboard") {
    document
      .getElementById("student-course-select")
      ?.addEventListener("change", (e) => {
        activeCourseId = Number(e.target.value);
        navigate("student-dashboard");
      });
  }

  document.querySelectorAll("[data-open-activity]").forEach((button) =>
    button.addEventListener("click", async () => {
      openModal(activityModal());
      bindModalClose();
      const courseSelect = document.getElementById("activityCourseSelect");
      const areaSelect = document.getElementById("activityAreaSelect");
      const cursos = await carregarCursos(courseSelect);
      const initialCourseId = courseSelect?.value || cursos[0]?.id;
      if (initialCourseId) {
        await carregarRegrasParaSelect(initialCourseId, areaSelect);
      }
      courseSelect?.addEventListener("change", async () => {
        await carregarRegrasParaSelect(courseSelect.value, areaSelect);
      });
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
      showToast("Atividade enviada. Para cancelar, contate a coordenação.", "info");
    }),
  );

  document.querySelectorAll("[data-proof-open]").forEach((button) =>
    button.addEventListener("click", async () => {
      await abrirArquivoProtegido(button.dataset.proofOpen || "");
    }),
  );

  document.querySelectorAll("[data-proof-download]").forEach((button) =>
    button.addEventListener("click", async () => {
      await baixarArquivoProtegido(
        button.dataset.proofDownload || "",
        button.dataset.proofName || "",
      );
    }),
  );
}
