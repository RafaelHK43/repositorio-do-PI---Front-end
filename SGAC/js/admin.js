import { adminNav } from "./config.js";
import {
  createCoordinator,
  createStudent,
  deleteCoordinator,
  deleteStudent,
  getCourseName,
  getCourseNames,
  getData,
  updateCoordinator,
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

function statusLabel(status = "") {
  if (status === "aprovada") return "Aprovado";
  if (status === "reprovada") return "Reprovado";
  return "Pendente";
}

function userRoleLabel(role = "") {
  if (role === "coordinator") return "Coordenador";
  if (role === "superadmin") return "Administrador";
  return "Aluno";
}

function dashboardCards(data) {
  const pendingCount = data.activities.filter(
    (activity) => activity.status === "pendente",
  ).length;
  const approvedHours = data.activities
    .filter((activity) => activity.status === "aprovada")
    .reduce((total, activity) => total + Number(activity.workload || 0), 0);
  return { pendingCount, approvedHours };
}

function recentRequestRows(data, limit = 5) {
  return [...data.activities]
    .sort(
      (left, right) =>
        new Date(right.activityDate || 0).getTime() -
        new Date(left.activityDate || 0).getTime(),
    )
    .slice(0, limit)
    .map((activity) => {
      const student = data.students.find(
        (item) => Number(item.id) === Number(activity.studentId),
      );
      const course = getCourseName(activity.courseId, data);
      return `<tr><td><strong>${escapeHtml(student?.name || "Aluno")}</strong><div class="table-sub">${escapeHtml(student?.email || "")}</div></td><td>${escapeHtml(course)}</td><td>${escapeHtml(activity.title)}</td><td>${escapeHtml(activity.activityDate || "-")}</td><td><span class="status-badge ${activity.status || "pendente"}">${statusLabel(activity.status)}</span></td></tr>`;
    })
    .join("");
}

function searchInput(placeholder, value = "") {
  return `<section class="content-card compact search-card"><div class="search-input-wrap"><span>⌕</span><input class="search-input" data-search-input value="${escapeHtml(value)}" placeholder="${placeholder}" /></div></section>`;
}
function pillsCount(text) {
  return `<section class="info-banner">${text}</section>`;
}

const COURSES_API_URL = "http://localhost:8080/api/cursos";
const REGRAS_API_URL = "http://localhost:8080/api/regras";
const USUARIOS_API_URL = "http://localhost:8080/api/usuarios";
const DASHBOARD_API_URL = "http://localhost:8080/api/dashboard";

async function buscarDashboardAdminApi() {
  try {
    const res = await fetch(DASHBOARD_API_URL, { headers: obterHeadersJsonComAuth() });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error("Erro ao buscar dashboard admin:", e);
    return null;
  }
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

function criarLinhaCurso(curso) {
  const id = Number(curso.id);
  const nome = escapeHtml(curso.nome || "");
  const carga = Number(curso.cargaHorariaMinima || 0);
  return `<tr><td>${id}</td><td><div class="table-title">${nome}</div></td><td>${carga}h</td><td class="actions-cell"><button class="icon-btn edit btn-editar" type="button" data-curso-id="${id}" data-curso-nome="${nome}" data-curso-carga="${carga}" aria-label="Editar curso">✎</button><button class="icon-btn delete btn-excluir" type="button" data-curso-id="${id}" aria-label="Excluir curso">🗑</button></td></tr>`;
}

export function initTelaCursos() {
  const modal = document.getElementById("modal-novo-curso");
  const btnNovoCurso = document.getElementById("btn-novo-curso");
  const btnCancelarCurso = document.getElementById("btn-cancelar-curso");
  const formNovoCurso = document.getElementById("form-novo-curso");
  const inputNomeCurso = document.getElementById("input-nome-curso");
  const inputCargaHoraria = document.getElementById("input-carga-horaria");
  const tbodyCursos = document.getElementById("tbody-cursos");
  const tituloModalCurso = document.getElementById("titulo-modal-curso");
  const btnSalvarCurso = document.getElementById("btn-salvar-curso");

  let cursoEmEdicaoId = null;

  if (!modal || !formNovoCurso || !tbodyCursos) return;

  function abrirModalCurso() {
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    inputNomeCurso?.focus();
  }

  function fecharModalCurso() {
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
  }

  function prepararModalNovoCurso() {
    cursoEmEdicaoId = null;
    formNovoCurso.removeAttribute("data-edit-id");
    formNovoCurso.reset();
    if (tituloModalCurso) tituloModalCurso.textContent = "Novo Curso";
    if (btnSalvarCurso) btnSalvarCurso.textContent = "Salvar";
  }

  function prepararModalEdicaoCurso({ id, nome, cargaHorariaMinima }) {
    cursoEmEdicaoId = Number(id);
    formNovoCurso.dataset.editId = String(cursoEmEdicaoId);
    inputNomeCurso.value = nome || "";
    inputCargaHoraria.value = String(Number(cargaHorariaMinima || 0));
    if (tituloModalCurso) tituloModalCurso.textContent = "Editar Curso";
    if (btnSalvarCurso) btnSalvarCurso.textContent = "Salvar Alteracoes";
  }

  async function carregarCursos() {
    try {
      const response = await fetch(COURSES_API_URL, {
        method: "GET",
        headers: obterHeadersJsonComAuth(),
      });

      if (!response.ok) throw new Error("Falha ao carregar cursos");

      const cursos = await response.json();
      tbodyCursos.innerHTML = "";

      cursos.forEach((curso) => {
        tbodyCursos.insertAdjacentHTML("beforeend", criarLinhaCurso(curso));
      });

      const count = document.getElementById("cursos-count");
      if (count) count.textContent = `${cursos.length} curso(s) encontrado(s)`;
    } catch (error) {
      showToast("Nao foi possivel carregar os cursos da API.", "danger");
    }
  }

  btnNovoCurso?.addEventListener("click", () => {
    prepararModalNovoCurso();
    abrirModalCurso();
  });
  btnCancelarCurso?.addEventListener("click", () => {
    prepararModalNovoCurso();
    fecharModalCurso();
  });

  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      prepararModalNovoCurso();
      fecharModalCurso();
    }
  });

  tbodyCursos.addEventListener("click", async (event) => {
    const btnExcluir = event.target.closest(".btn-excluir");
    const btnEditar = event.target.closest(".btn-editar");

    if (btnExcluir) {
      const id = btnExcluir.dataset.cursoId;
      if (!id) return;
      const confirmou = confirm("Tem certeza que deseja excluir este curso?");
      if (!confirmou) return;

      try {
        const response = await fetch(`${COURSES_API_URL}/${id}`, {
          method: "DELETE",
          headers: obterHeadersJsonComAuth(),
        });

        if (!response.ok) throw new Error("Falha ao excluir curso");

        alert("Curso excluido!");
        await carregarCursos();
      } catch (error) {
        alert("Nao foi possivel excluir o curso.");
        console.error(error);
      }
      return;
    }

    if (btnEditar) {
      prepararModalEdicaoCurso({
        id: btnEditar.dataset.cursoId,
        nome: btnEditar.dataset.cursoNome,
        cargaHorariaMinima: btnEditar.dataset.cursoCarga,
      });
      abrirModalCurso();
    }
  });

  formNovoCurso.addEventListener("submit", async (event) => {
    event.preventDefault();

    const payload = {
      nome: String(inputNomeCurso?.value || "").trim(),
      cargaHorariaMinima: parseInt(inputCargaHoraria?.value || "0", 10),
    };

    const editId = formNovoCurso.dataset.editId || cursoEmEdicaoId;
    const isEdicao = Boolean(editId);
    const method = isEdicao ? "PUT" : "POST";
    const url = isEdicao ? `${COURSES_API_URL}/${editId}` : COURSES_API_URL;

    try {
      const response = await fetch(url, {
        method,
        headers: obterHeadersJsonComAuth(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(isEdicao ? "Falha ao atualizar curso" : "Falha ao salvar curso");
      }

      alert(isEdicao ? "Curso atualizado!" : "Curso salvo!");
      prepararModalNovoCurso();
      fecharModalCurso();
      await carregarCursos();
    } catch (error) {
      alert(
        isEdicao
          ? "Nao foi possivel atualizar o curso."
          : "Nao foi possivel salvar o curso. Verifique se a API esta no ar.",
      );
      console.error(error);
    }
  });

  carregarCursos();
}

function normalizeRegra(regra = {}) {
  return {
    id: Number(regra.id || 0),
    area: String(regra.area || regra.nome || regra.nomeArea || "").trim(),
    curso: String(regra.curso || regra.nomeCurso || "").trim(),
    limite: Number(regra.limite || regra.limiteHoras || regra.hour_limit || 0),
    descricao: String(regra.descricao || regra.description || "").trim(),
  };
}

function criarLinhaRegra(regra) {
  const item = normalizeRegra(regra);
  return `<tr><td><strong>${escapeHtml(item.area)}</strong></td><td>${escapeHtml(item.curso)}</td><td>${item.limite}h</td><td>${escapeHtml(item.descricao || "-")}</td><td class="actions-cell"><button class="icon-btn edit btn-editar-regra" type="button" data-regra-id="${item.id}" data-regra-area="${escapeHtml(item.area)}" data-regra-curso="${escapeHtml(item.curso)}" data-regra-limite="${item.limite}" data-regra-descricao="${escapeHtml(item.descricao)}" aria-label="Editar regra">✎</button><button class="icon-btn delete btn-excluir-regra" type="button" data-regra-id="${item.id}" aria-label="Excluir regra">🗑</button></td></tr>`;
}

export function initTelaRegras() {
  const modal = document.getElementById("modal-regra");
  const btnNovaArea = document.getElementById("btn-nova-area");
  const btnCancelarRegra = document.getElementById("btn-cancelar-regra");
  const formRegra = document.getElementById("form-regra");
  const inputArea = document.getElementById("input-regra-area");
  const inputCurso = document.getElementById("input-regra-curso");
  const inputLimite = document.getElementById("input-regra-limite");
  const inputDescricao = document.getElementById("input-regra-descricao");
  const tbodyRegras = document.getElementById("tbody-regras");
  const tituloModal = document.getElementById("titulo-modal-regra");
  const btnSalvar = document.getElementById("btn-salvar-regra");

  let regraEmEdicaoId = null;

  if (!modal || !formRegra || !tbodyRegras) return;

  function abrirModal() {
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    inputArea?.focus();
  }

  function fecharModal() {
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
  }

  function prepararNovoCadastro() {
    regraEmEdicaoId = null;
    formRegra.removeAttribute("data-edit-id");
    formRegra.reset();
    if (tituloModal) tituloModal.textContent = "Nova Área";
    if (btnSalvar) btnSalvar.textContent = "Salvar";
  }

  function prepararEdicao(regra) {
    const item = normalizeRegra(regra);
    regraEmEdicaoId = item.id;
    formRegra.dataset.editId = String(item.id);
    inputArea.value = item.area;
    inputCurso.value = item.curso;
    inputLimite.value = String(item.limite || 0);
    inputDescricao.value = item.descricao;
    if (tituloModal) tituloModal.textContent = "Editar Área";
    if (btnSalvar) btnSalvar.textContent = "Salvar Alterações";
  }

  async function carregarRegras() {
    try {
      const response = await fetch(REGRAS_API_URL, {
        method: "GET",
        headers: obterHeadersJsonComAuth(),
      });

      if (!response.ok) throw new Error("Falha ao carregar regras");

      const regras = await response.json();
      tbodyRegras.innerHTML = "";
      regras.forEach((regra) => {
        tbodyRegras.insertAdjacentHTML("beforeend", criarLinhaRegra(regra));
      });

      const count = document.getElementById("regras-count");
      if (count) count.textContent = `${regras.length} regra(s) encontrada(s)`;
    } catch (error) {
      showToast("Nao foi possivel carregar as regras da API.", "danger");
      console.error(error);
    }
  }

  btnNovaArea?.addEventListener("click", () => {
    prepararNovoCadastro();
    abrirModal();
  });

  btnCancelarRegra?.addEventListener("click", () => {
    prepararNovoCadastro();
    fecharModal();
  });

  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      prepararNovoCadastro();
      fecharModal();
    }
  });

  tbodyRegras.addEventListener("click", async (event) => {
    const btnEditar = event.target.closest(".btn-editar-regra");
    const btnExcluir = event.target.closest(".btn-excluir-regra");

    if (btnEditar) {
      prepararEdicao({
        id: btnEditar.dataset.regraId,
        area: btnEditar.dataset.regraArea,
        curso: btnEditar.dataset.regraCurso,
        limite: btnEditar.dataset.regraLimite,
        descricao: btnEditar.dataset.regraDescricao,
      });
      abrirModal();
      return;
    }

    if (btnExcluir) {
      const id = btnExcluir.dataset.regraId;
      if (!id) return;

      const confirmed = confirm("Tem certeza que deseja excluir esta regra?");
      if (!confirmed) return;

      try {
        const response = await fetch(`${REGRAS_API_URL}/${id}`, {
          method: "DELETE",
          headers: obterHeadersJsonComAuth(),
        });

        if (!response.ok) throw new Error("Falha ao excluir regra");

        alert("Regra excluída!");
        await carregarRegras();
      } catch (error) {
        alert("Nao foi possivel excluir a regra.");
        console.error(error);
      }
    }
  });

  formRegra.addEventListener("submit", async (event) => {
    event.preventDefault();

    const payload = {
      area: String(inputArea?.value || "").trim(),
      curso: String(inputCurso?.value || "").trim(),
      limite: parseInt(inputLimite?.value || "0", 10),
      descricao: String(inputDescricao?.value || "").trim(),
    };

    const editId = formRegra.dataset.editId || regraEmEdicaoId;
    const isEdit = Boolean(editId);
    const method = isEdit ? "PUT" : "POST";
    const url = isEdit ? `${REGRAS_API_URL}/${editId}` : REGRAS_API_URL;

    try {
      const response = await fetch(url, {
        method,
        headers: obterHeadersJsonComAuth(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(isEdit ? "Falha ao atualizar regra" : "Falha ao criar regra");
      }

      alert(isEdit ? "Regra atualizada!" : "Regra criada!");
      prepararNovoCadastro();
      fecharModal();
      await carregarRegras();
    } catch (error) {
      alert(isEdit ? "Nao foi possivel atualizar a regra." : "Nao foi possivel criar a regra.");
      console.error(error);
    }
  });

  carregarRegras();
}

function normalizarUsuario(usuario = {}) {
  const perfilRaw = String(usuario.perfil || usuario.role || "ALUNO").toUpperCase();
  const cursoIds = Array.isArray(usuario.cursoIds)
    ? usuario.cursoIds.map(Number).filter(Boolean)
    : usuario.cursoId || usuario.idCurso
    ? [Number(usuario.cursoId || usuario.idCurso)].filter(Boolean)
    : [];
  return {
    id: Number(usuario.id || usuario.usuarioId || 0),
    nome: String(usuario.nome || usuario.name || "").trim(),
    email: String(usuario.email || "").trim(),
    perfil: perfilRaw,
    cursoIds,
    cursoId: cursoIds[0] || null,
    cursoNome: String(usuario.cursoNome || usuario.nomeCurso || "").trim(),
  };
}

function labelPerfil(perfil = "") {
  if (perfil === "COORDENADOR") return "Coordenador";
  if (perfil === "SUPER_ADMIN") return "Super Admin";
  return "Aluno";
}

function criarLinhaUsuario(usuario, courseNameById = new Map()) {
  const item = normalizarUsuario(usuario);
  const cursoNomes = item.cursoIds.length
    ? item.cursoIds.map((id) => courseNameById.get(Number(id)) || `ID ${id}`).join(", ")
    : item.cursoNome || "Nao vinculado";
  return `<tr><td><strong>${escapeHtml(item.nome)}</strong></td><td>${escapeHtml(item.email)}</td><td><span class="status-badge neutral">${labelPerfil(item.perfil)}</span></td><td>${escapeHtml(cursoNomes)}</td><td class="actions-cell"><button class="icon-btn edit btn-editar-usuario" type="button" data-usuario-id="${item.id}" aria-label="Editar usuario">✎</button><button class="icon-btn delete btn-excluir-usuario" type="button" data-usuario-id="${item.id}" aria-label="Excluir usuario">🗑</button></td></tr>`;
}

export function initTelaUsuarios() {
  const modal = document.getElementById("modal-usuario");
  const btnNovoUsuario = document.getElementById("btn-novo-usuario");
  const btnCancelarUsuario = document.getElementById("btn-cancelar-usuario");
  const formUsuario = document.getElementById("form-usuario");
  const inputNome = document.getElementById("input-usuario-nome");
  const inputEmail = document.getElementById("input-usuario-email");
  const inputSenha = document.getElementById("input-usuario-senha");
  const selectPerfil = document.getElementById("select-usuario-perfil");
  const selectCurso = document.getElementById("select-usuario-curso");
  const tbodyUsuarios = document.getElementById("tbody-usuarios");
  const tituloModal = document.getElementById("titulo-modal-usuario");
  const btnSalvar = document.getElementById("btn-salvar-usuario");

  if (!modal || !formUsuario || !tbodyUsuarios || !selectCurso) return;

  let usuarioEmEdicaoId = null;
  let usuariosEmTela = [];
  let cursosCache = [];

  function abrirModal() {
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    inputNome?.focus();
  }

  function fecharModal() {
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
  }

  function resetModalNovoUsuario() {
    usuarioEmEdicaoId = null;
    formUsuario.removeAttribute("data-edit-id");
    formUsuario.reset();
    inputSenha.required = true;
    if (tituloModal) tituloModal.textContent = "Novo Usuário";
    if (btnSalvar) btnSalvar.textContent = "Salvar";
  }

  function prepararModalEdicao(usuario) {
    const item = normalizarUsuario(usuario);
    usuarioEmEdicaoId = item.id;
    formUsuario.dataset.editId = String(item.id);
    inputNome.value = item.nome;
    inputEmail.value = item.email;
    selectPerfil.value = item.perfil || "ALUNO";
    if (item.cursoIds && item.cursoIds.length) {
      Array.from(selectCurso.options).forEach((opt) => {
        opt.selected = item.cursoIds.includes(Number(opt.value));
      });
    }
    inputSenha.value = "";
    inputSenha.required = false;
    if (tituloModal) tituloModal.textContent = "Editar Usuário";
    if (btnSalvar) btnSalvar.textContent = "Salvar Alterações";
  }

  async function carregarCursosParaSelect() {
    try {
      const response = await fetch(COURSES_API_URL, {
        method: "GET",
        headers: obterHeadersJsonComAuth(),
      });
      if (!response.ok) throw new Error("Falha ao carregar cursos para select");

      const cursos = await response.json();
      cursosCache = Array.isArray(cursos) ? cursos : [];
      selectCurso.innerHTML = cursosCache
        .map(
          (curso) =>
            `<option value="${Number(curso.id)}">${escapeHtml(String(curso.nome || ""))}</option>`,
        )
        .join("");
    } catch (error) {
      showToast("Nao foi possivel carregar os cursos.", "danger");
      console.error(error);
    }
  }

  async function carregarUsuarios() {
    try {
      const response = await fetch(USUARIOS_API_URL, {
        method: "GET",
        headers: obterHeadersJsonComAuth(),
      });

      if (!response.ok) throw new Error("Falha ao carregar usuarios");

      const usuarios = await response.json();
      usuariosEmTela = Array.isArray(usuarios) ? usuarios.map(normalizarUsuario) : [];
      const courseNameById = new Map(
        cursosCache.map((curso) => [Number(curso.id), String(curso.nome || "")]),
      );
      tbodyUsuarios.innerHTML = "";

      usuariosEmTela.forEach((usuario) => {
        tbodyUsuarios.insertAdjacentHTML(
          "beforeend",
          criarLinhaUsuario(usuario, courseNameById),
        );
      });

      const count = document.getElementById("usuarios-count");
      if (count) count.textContent = `${usuariosEmTela.length} usuario(s) encontrado(s)`;
    } catch (error) {
      showToast("Nao foi possivel carregar os usuarios da API.", "danger");
      console.error(error);
    }
  }

  btnNovoUsuario?.addEventListener("click", async () => {
    await carregarCursosParaSelect();
    resetModalNovoUsuario();
    abrirModal();
  });

  btnCancelarUsuario?.addEventListener("click", () => {
    resetModalNovoUsuario();
    fecharModal();
  });

  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      resetModalNovoUsuario();
      fecharModal();
    }
  });

  tbodyUsuarios.addEventListener("click", async (event) => {
    const btnEditar = event.target.closest(".btn-editar-usuario");
    const btnExcluir = event.target.closest(".btn-excluir-usuario");

    if (btnEditar) {
      const id = Number(btnEditar.dataset.usuarioId);
      const usuario = usuariosEmTela.find((item) => Number(item.id) === id);
      if (!usuario) return;

      await carregarCursosParaSelect();
      prepararModalEdicao(usuario);
      abrirModal();
      return;
    }

    if (btnExcluir) {
      const id = Number(btnExcluir.dataset.usuarioId);
      if (!id) return;

      const confirmed = confirm("Tem certeza que deseja excluir este usuario?");
      if (!confirmed) return;

      try {
        const response = await fetch(`${USUARIOS_API_URL}/${id}`, {
          method: "DELETE",
          headers: obterHeadersJsonComAuth(),
        });

        if (!response.ok) throw new Error("Falha ao excluir usuario");

        alert("Usuario excluido!");
        await carregarUsuarios();
      } catch (error) {
        alert("Nao foi possivel excluir o usuario.");
        console.error(error);
      }
    }
  });

  formUsuario.addEventListener("submit", async (event) => {
    event.preventDefault();

    const editId = formUsuario.dataset.editId || usuarioEmEdicaoId;
    const isEdit = Boolean(editId);
    const method = isEdit ? "PUT" : "POST";
    const url = isEdit ? `${USUARIOS_API_URL}/${editId}` : USUARIOS_API_URL;

    const selectedCursoIds = Array.from(selectCurso.selectedOptions)
      .map((opt) => Number(opt.value))
      .filter(Boolean);
    if (!selectedCursoIds.length) {
      alert("Selecione ao menos um curso.");
      return;
    }
    const payload = {
      nome: String(inputNome.value || "").trim(),
      email: String(inputEmail.value || "").trim(),
      perfil: String(selectPerfil.value || "ALUNO").toUpperCase(),
      cursoIds: selectedCursoIds,
    };

    const senha = String(inputSenha.value || "").trim();
    if (!isEdit || senha) {
      payload.senha = senha;
    }

    try {
      const response = await fetch(url, {
        method,
        headers: obterHeadersJsonComAuth(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(isEdit ? "Falha ao atualizar usuario" : "Falha ao criar usuario");
      }

      alert(isEdit ? "Usuario atualizado!" : "Usuario criado!");
      resetModalNovoUsuario();
      fecharModal();
      await carregarUsuarios();
    } catch (error) {
      alert(isEdit ? "Nao foi possivel atualizar o usuario." : "Nao foi possivel criar o usuario.");
      console.error(error);
    }
  });

  Promise.all([carregarCursosParaSelect(), carregarUsuarios()]).catch(() => {
    // erros tratados individualmente nas funcoes
  });
}

export function adminDashboardPage() {
  const data = getData();
  const { pendingCount, approvedHours } = dashboardCards(data);
  return shell({
    roleLabel: "Administrador",
    navItems: adminNav,
    title: "Dashboard Geral",
    subtitle: "Resumo consolidado para coordenação e administração.",
    heroTitle: "Painel Geral",
    heroText: "Acompanhe as principais métricas e as solicitações mais recentes.",
    content: `<section class="stats-grid four"><div class="stat-card blue"><span>Total de Alunos</span><strong id="adash-alunos">${data.students.length}</strong><em>🧑‍🎓</em></div><div class="stat-card orange"><span>Solicitações Pendentes</span><strong id="adash-pendentes">${pendingCount}</strong><em>🕘</em></div><div class="stat-card green"><span>Total de Horas Validadas</span><strong id="adash-horas">${approvedHours}h</strong><em>✓</em></div><div class="stat-card navy"><span>Cursos Ativos</span><strong id="adash-cursos">${data.courses.length}</strong><em>🎓</em></div></section><section class="content-card"><div class="section-head"><div><h3>Solicitações Recentes</h3><p class="muted">Últimas atividades enviadas pelos alunos.</p></div></div><div class="table-wrap"><table class="custom-table dashboard-table"><thead><tr><th>Nome do Aluno</th><th>Curso</th><th>Atividade</th><th>Data</th><th>Status</th></tr></thead><tbody>${recentRequestRows(data)}</tbody></table></div></section><section id="adash-breakdown" class="content-card" hidden><div class="section-head"><div><h3>Resumo por Curso e Área</h3><p class="muted">Detalhamento das horas aprovadas por curso e categoria.</p></div></div><div id="adash-breakdown-content"></div></section>`,
  });
}
export function coursesPage(search = "") {
  return shell({
    roleLabel: "Administrador",
    navItems: adminNav,
    title: "Gestão de Cursos e Regras",
    subtitle: "Cadastre cursos e defina a carga horária mínima de validação.",
    heroTitle: "Cursos cadastrados",
    heroText: "Use o formulário para registrar novos cursos e manter as regras atualizadas.",
    heroAction:
      '<button class="btn btn-light" id="btn-novo-curso" type="button">Novo Curso</button>',
    content: `<section class="content-card table-card"><div class="table-wrap"><table class="custom-table"><thead><tr><th>ID</th><th>Nome do Curso</th><th>Carga Horária Mínima</th><th>Ações</th></tr></thead><tbody id="tbody-cursos"><tr><td colspan="4" class="muted">Carregando cursos...</td></tr></tbody></table></div></section>${pillsCount('<span id="cursos-count">0 curso(s) encontrado(s)</span>')}<div id="modal-novo-curso" class="modal-overlay" aria-hidden="true" hidden><div class="modal-card"><h3 id="titulo-modal-curso">Novo Curso</h3><form class="form-grid" id="form-novo-curso"><label for="input-nome-curso">Nome do Curso<input id="input-nome-curso" type="text" name="nome" required></label><label for="input-carga-horaria">Carga Horária Mínima<input id="input-carga-horaria" type="number" min="1" name="cargaHorariaMinima" required></label><div class="modal-actions"><button id="btn-cancelar-curso" type="button" class="btn btn-outline">Cancelar</button><button id="btn-salvar-curso" type="submit" class="btn btn-primary">Salvar</button></div></form></div></div>`,
  });
}
export function adminUsersPage(search = "", roleFilter = "all") {
  return shell({
    roleLabel: "Administrador",
    navItems: adminNav,
    title: "Gestão de Usuários",
    subtitle: "Cadastre e mantenha alunos, coordenadores e super admins.",
    heroTitle: "Usuários e acessos",
    heroText: "A lista e o cadastro são sincronizados diretamente com a API de usuários.",
    heroAction:
      '<button class="btn btn-light" id="btn-novo-usuario" type="button">Novo Usuário</button>',
    content: `<section class="content-card table-card"><div class="table-wrap"><table class="custom-table"><thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Curso Vinculado</th><th>Ações</th></tr></thead><tbody id="tbody-usuarios"><tr><td colspan="5" class="muted">Carregando usuarios...</td></tr></tbody></table></div></section>${pillsCount('<span id="usuarios-count">0 usuario(s) encontrado(s)</span>')}<div id="modal-usuario" class="modal-overlay" aria-hidden="true" hidden><div class="modal-card"><h3 id="titulo-modal-usuario">Novo Usuário</h3><form class="form-grid" id="form-usuario"><label for="input-usuario-nome">Nome<input id="input-usuario-nome" type="text" name="nome" required></label><label for="input-usuario-email">E-mail<input id="input-usuario-email" type="email" name="email" required></label><label for="input-usuario-senha">Senha<input id="input-usuario-senha" type="password" name="senha" required></label><label for="select-usuario-perfil">Perfil<select id="select-usuario-perfil" name="perfil" required><option value="ALUNO">ALUNO</option><option value="COORDENADOR">COORDENADOR</option><option value="SUPER_ADMIN">SUPER_ADMIN</option></select></label><label for="select-usuario-curso">Cursos (Ctrl+clique para múltiplos)<select id="select-usuario-curso" name="cursoIds" multiple size="4" style="height:auto;min-height:80px"></select></label><div class="modal-actions"><button id="btn-cancelar-usuario" type="button" class="btn btn-outline">Cancelar</button><button id="btn-salvar-usuario" type="submit" class="btn btn-primary">Salvar</button></div></form></div></div>`,
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
  return shell({
    roleLabel: "Administrador",
    navItems: adminNav,
    heroClass: "hero-amber",
    heroTitle: "Configurar Áreas e Regras",
    heroText: "Defina limites de horas e descreva critérios por curso.",
    heroAction:
      '<button class="btn btn-light" id="btn-nova-area" type="button">Nova Área</button>',
    content: `<section class="content-card table-card"><div class="table-wrap"><table class="custom-table"><thead><tr><th>Área</th><th>Curso</th><th>Limite</th><th>Descrição</th><th>Ações</th></tr></thead><tbody id="tbody-regras"><tr><td colspan="5" class="muted">Carregando regras...</td></tr></tbody></table></div></section>${pillsCount('<span id="regras-count">0 regra(s) encontrada(s)</span>')}<div id="modal-regra" class="modal-overlay" aria-hidden="true" hidden><div class="modal-card"><h3 id="titulo-modal-regra">Nova Área</h3><form class="form-grid" id="form-regra"><label for="input-regra-area">Área<input id="input-regra-area" type="text" name="area" required></label><label for="input-regra-curso">Curso<input id="input-regra-curso" type="text" name="curso" required></label><label for="input-regra-limite">Limite de Horas<input id="input-regra-limite" type="number" min="1" name="limite" required></label><label for="input-regra-descricao">Descrição<textarea id="input-regra-descricao" name="descricao" rows="4"></textarea></label><div class="modal-actions"><button id="btn-cancelar-regra" type="button" class="btn btn-outline">Cancelar</button><button id="btn-salvar-regra" type="submit" class="btn btn-primary">Salvar</button></div></form></div></div>`,
  });
}
function peopleModal(type, person = null) {
  const data = getData();
  const values = new Set((person?.courseIds || []).map(Number));
  return `<h3>${person ? `Editar ${type === "student" ? "Aluno" : "Coordenador"}` : `Novo ${type === "student" ? "Aluno" : "Coordenador"}`}</h3><form class="form-grid" id="${type}Form"><label>Nome Completo<input type="text" name="name" value="${escapeHtml(person?.name || "")}" required></label><label>E-mail<input type="email" name="email" value="${escapeHtml(person?.email || "")}" required></label><label>Senha<input type="password" name="password" value="${escapeHtml(person?.password || "")}" required></label><div class="checkbox-group full-span"><span>${type === "student" ? "Cursos do aluno" : "Cursos do coordenador"}</span><div class="checkbox-grid">${data.courses.map((course) => `<label class="check-card"><input type="checkbox" name="courseIds" value="${course.id}" ${values.has(Number(course.id)) ? "checked" : ""}><span>${escapeHtml(course.name)}</span></label>`).join("")}</div></div>${modalActions(person ? "Salvar Alterações" : "Cadastrar")}</form>`;
}
function collectCourseIds(form) {
  return uniqueNumbers(
    [...form.querySelectorAll('input[name="courseIds"]:checked')].map((input) =>
      Number(input.value),
    ),
  );
}
export function attachAdminPage(page, { render, navigate }) {
  if (page === "courses") {
    initTelaCursos();
  }
  if (page === "admin-areas") {
    initTelaRegras();
  }
  if (page === "admin-users") {
    initTelaUsuarios();
  }

  if (page === "admin-dashboard") {
    buscarDashboardAdminApi().then((dash) => {
      if (!dash) return;
      const elAlunos = document.getElementById("adash-alunos");
      const elPendentes = document.getElementById("adash-pendentes");
      const elHoras = document.getElementById("adash-horas");
      const elCursos = document.getElementById("adash-cursos");
      if (elAlunos) elAlunos.textContent = dash.totalAlunos ?? dash.alunos ?? elAlunos.textContent;
      if (elPendentes) elPendentes.textContent = dash.totalPendentes ?? dash.pendencias ?? dash.pendentes ?? elPendentes.textContent;
      if (elHoras) elHoras.textContent = (dash.totalHorasAprovadas ?? dash.horasAprovadas ?? "") + "h";
      if (elCursos) elCursos.textContent = dash.totalCursos ?? elCursos.textContent;

      const cursos = dash.porCurso || dash.cursos || [];
      if (cursos.length) {
        const breakdown = document.getElementById("adash-breakdown");
        const content = document.getElementById("adash-breakdown-content");
        if (breakdown && content) {
          breakdown.hidden = false;
          content.innerHTML = cursos
            .map(
              (curso) => `<div class="breakdown-curso">
                <h4>${escapeHtml(String(curso.cursoNome || curso.nome || "Curso"))}</h4>
                <p class="muted">${curso.alunos ?? 0} aluno(s) · ${curso.horasAprovadas ?? 0}h aprovadas · ${curso.pendentes ?? 0} pendente(s)</p>
                ${Array.isArray(curso.porArea) && curso.porArea.length
                  ? `<div class="table-wrap"><table class="custom-table"><thead><tr><th>Área</th><th>Horas Aprovadas</th></tr></thead><tbody>${curso.porArea.map((a) => `<tr><td>${escapeHtml(String(a.areaNome || a.area || "-"))}</td><td>${a.horasAprovadas ?? a.horas ?? 0}h</td></tr>`).join("")}</tbody></table></div>`
                  : ""}
              </div>`
            )
            .join("<hr>");
        }
      }
    });
  }

  const searchInputEl = document.querySelector("[data-search-input]");
  if (searchInputEl) {
    searchInputEl.addEventListener("input", () =>
      navigate(page, { search: searchInputEl.value.trim() }),
    );
  }
  document.querySelectorAll("[data-open-modal]").forEach((button) =>
    button.addEventListener("click", () => {
      const type = button.dataset.openModal;
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
}
