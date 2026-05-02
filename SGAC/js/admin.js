import { adminNav, API_BASE_URL, AREAS_ENUM } from "./config.js";
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
import { escapeHtml, filterBySearch, formatDate, uniqueNumbers } from "./utils.js";
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

const COURSES_API_URL = `${API_BASE_URL}/cursos`;
const REGRAS_API_URL = `${API_BASE_URL}/regras`;
const USUARIOS_API_URL = `${API_BASE_URL}/usuarios`;
const DASHBOARD_API_URL = `${API_BASE_URL}/dashboard`;
const SUBMISSOES_API_URL = `${API_BASE_URL}/submissoes`;
let cursosRegrasCache = [];

function labelArea(enumVal = "") {
  const found = AREAS_ENUM.find(
    (a) => a.value === String(enumVal).toUpperCase(),
  );
  return found ? found.label : enumVal;
}

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
    if (btnSalvarCurso) btnSalvarCurso.textContent = "Salvar Alterações";
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
      showToast("Não foi possível carregar os cursos. Verifique se o back está rodando na porta 8080.", "danger");
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

        showToast("Curso excluído com sucesso.", "success");
        await carregarCursos();
      } catch (error) {
        showToast("Não foi possível excluir o curso.", "danger");
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

      showToast(isEdicao ? "Curso atualizado com sucesso." : "Curso salvo com sucesso.", "success");
      prepararModalNovoCurso();
      fecharModalCurso();
      await carregarCursos();
    } catch (error) {
      showToast(
        isEdicao
          ? "Não foi possível atualizar o curso."
          : "Não foi possível salvar o curso. Verifique se a API está no ar.",
        "danger",
      );
      console.error(error);
    }
  });

  carregarCursos();
}

function normalizeRegra(regra = {}) {
  const cursoObj =
    regra.curso && typeof regra.curso === "object" ? regra.curso : null;
  const cursoId = Number(
    regra.cursoId || regra.idCurso || cursoObj?.id || cursoObj?.cursoId || 0,
  );
  const cursoCache = cursosRegrasCache.find(
    (curso) => Number(curso.id) === cursoId,
  );
  const cursoNome = String(
    regra.cursoNome ||
      regra.nomeCurso ||
      cursoObj?.nome ||
      cursoObj?.name ||
      cursoCache?.nome ||
      cursoCache?.name ||
      "",
  ).trim();

  return {
    id: Number(regra.id || 0),
    area: String(regra.area || regra.nome || regra.nomeArea || "").trim(),
    cursoId,
    curso: cursoNome || (cursoId ? "ADS" : "Curso não informado"),
    limite: Number(regra.limiteHoras || regra.limite || regra.hour_limit || 0),
  };
}

function criarLinhaRegra(regra) {
  const item = normalizeRegra(regra);
  const areaLabel = escapeHtml(labelArea(item.area));
  const areaRaw = escapeHtml(item.area);
  return `<tr>
    <td><strong>${areaLabel}</strong></td>
    <td>${escapeHtml(item.curso)}</td>
    <td>${item.limite}h</td>
    <td class="actions-cell">
      <button class="icon-btn edit btn-editar-regra" type="button"
        data-regra-id="${item.id}"
        data-regra-area="${areaRaw}"
        data-regra-curso-id="${item.cursoId}"
        data-regra-curso="${escapeHtml(item.curso)}"
        data-regra-limite="${item.limite}"
        aria-label="Editar regra">✎</button>
      <button class="icon-btn delete btn-excluir-regra" type="button"
        data-regra-id="${item.id}"
        aria-label="Excluir regra">🗑</button>
    </td>
  </tr>`;
}

export function initTelaRegras() {
  const modal = document.getElementById("modal-regra");
  const btnNovaArea = document.getElementById("btn-nova-area");
  const btnCancelarRegra = document.getElementById("btn-cancelar-regra");
  const formRegra = document.getElementById("form-regra");
  const inputArea = document.getElementById("input-regra-area");
  const inputCurso = document.getElementById("input-regra-curso");
  const inputLimite = document.getElementById("input-regra-limite");
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

  async function carregarCursosParaSelectRegra() {
    try {
      const response = await fetch(COURSES_API_URL, { headers: obterHeadersJsonComAuth() });
      if (!response.ok) throw new Error();
      const cursos = await response.json();
      cursosRegrasCache = Array.isArray(cursos) ? cursos : [];
      inputCurso.innerHTML = cursosRegrasCache.length
        ? cursosRegrasCache.map((c) => `<option value="${Number(c.id)}">${escapeHtml(String(c.nome || c.name || ""))}</option>`).join("")
        : '<option value="">Nenhum curso disponível</option>';
    } catch {
      showToast("Não foi possível carregar os cursos.", "danger");
    }
  }

  async function carregarCursosParaNomeRegra() {
    if (cursosRegrasCache.length) return;
    try {
      const response = await fetch(COURSES_API_URL, { headers: obterHeadersJsonComAuth() });
      if (!response.ok) throw new Error();
      const cursos = await response.json();
      cursosRegrasCache = Array.isArray(cursos) ? cursos : [];
    } catch {
      cursosRegrasCache = [];
    }
  }

  function prepararNovoCadastro() {
    regraEmEdicaoId = null;
    formRegra.removeAttribute("data-edit-id");
    formRegra.reset();
    if (tituloModal) tituloModal.textContent = "Nova Regra";
    if (btnSalvar) btnSalvar.textContent = "Salvar";
  }

  function prepararEdicao(regra) {
    const item = normalizeRegra(regra);
    regraEmEdicaoId = item.id;
    formRegra.dataset.editId = String(item.id);
    if (inputArea) inputArea.value = item.area;
    if (item.cursoId && inputCurso) inputCurso.value = String(item.cursoId);
    if (inputLimite) inputLimite.value = String(item.limite || 0);
    if (tituloModal) tituloModal.textContent = "Editar Regra";
    if (btnSalvar) btnSalvar.textContent = "Salvar Alterações";
  }

  async function carregarRegras() {
    try {
      await carregarCursosParaNomeRegra();
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
      showToast("Não foi possível carregar as regras. Verifique se a API está no ar.", "danger");
      console.error(error);
    }
  }

  btnNovaArea?.addEventListener("click", async () => {
    prepararNovoCadastro();
    await carregarCursosParaSelectRegra();
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
      await carregarCursosParaSelectRegra();
      prepararEdicao({
        id: btnEditar.dataset.regraId,
        area: btnEditar.dataset.regraArea,
        cursoId: btnEditar.dataset.regraCursoId,
        curso: btnEditar.dataset.regraCurso,
        limite: btnEditar.dataset.regraLimite,
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

        showToast("Regra excluída com sucesso.", "success");
        await carregarRegras();
      } catch (error) {
        showToast("Não foi possível excluir a regra.", "danger");
        console.error(error);
      }
    }
  });

  formRegra.addEventListener("submit", async (event) => {
    event.preventDefault();

    const areaVal = String(inputArea?.value || "").trim();
    const cursoIdVal = Number(inputCurso?.value || 0);
    const limiteVal = parseFloat(inputLimite?.value || "0");

    if (!areaVal) {
      showToast("Selecione uma área.", "danger");
      return;
    }
    if (!cursoIdVal) {
      showToast("Selecione um curso.", "danger");
      return;
    }
    if (!limiteVal || limiteVal <= 0) {
      showToast("Informe um limite de horas válido.", "danger");
      return;
    }

    const payload = {
      area: areaVal,
      cursoId: cursoIdVal,
      limiteHoras: limiteVal,
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

      showToast(isEdit ? "Regra atualizada com sucesso." : "Regra criada com sucesso.", "success");
      prepararNovoCadastro();
      fecharModal();
      await carregarRegras();
    } catch (error) {
      showToast(isEdit ? "Não foi possível atualizar a regra." : "Não foi possível criar a regra.", "danger");
      console.error(error);
    }
  });

  carregarRegras();
}

function normalizarUsuario(usuario = {}) {
  const perfilRaw = String(usuario.perfil || usuario.role || "ALUNO").toUpperCase();
  const cursoIds = Array.isArray(usuario.cursoIds)
    ? usuario.cursoIds.map(Number).filter(Boolean)
    : Array.isArray(usuario.cursos)
    ? usuario.cursos.map((c) => Number(c.id)).filter(Boolean)
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
    : item.cursoNome || "Não vinculado";
  return `<tr><td><strong>${escapeHtml(item.nome)}</strong></td><td>${escapeHtml(item.email)}</td><td><span class="status-badge neutral">${labelPerfil(item.perfil)}</span></td><td>${escapeHtml(cursoNomes)}</td><td class="actions-cell"><button class="icon-btn edit btn-editar-usuario" type="button" data-usuario-id="${item.id}" aria-label="Editar usuário">✎</button><button class="icon-btn delete btn-excluir-usuario" type="button" data-usuario-id="${item.id}" aria-label="Excluir usuário">🗑</button></td></tr>`;
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
    if (inputSenha) inputSenha.required = true;
    if (tituloModal) tituloModal.textContent = "Novo Usuário";
    if (btnSalvar) btnSalvar.textContent = "Salvar";
  }

  function prepararModalEdicao(usuario) {
    const item = normalizarUsuario(usuario);
    usuarioEmEdicaoId = item.id;
    formUsuario.dataset.editId = String(item.id);
    if (inputNome) inputNome.value = item.nome;
    if (inputEmail) inputEmail.value = item.email;
    if (selectPerfil) selectPerfil.value = item.perfil || "ALUNO";
    if (item.cursoIds && item.cursoIds.length) {
      Array.from(selectCurso.options).forEach((opt) => {
        opt.selected = item.cursoIds.includes(Number(opt.value));
      });
    }
    if (inputSenha) {
      inputSenha.value = "";
      inputSenha.required = false;
    }
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
      showToast("Não foi possível carregar os cursos.", "danger");
      console.error(error);
    }
  }

  async function carregarUsuarios() {
    try {
      const response = await fetch(USUARIOS_API_URL, {
        method: "GET",
        headers: obterHeadersJsonComAuth(),
      });

      if (!response.ok) throw new Error("Falha ao carregar usuários");

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
      if (count) count.textContent = `${usuariosEmTela.length} usuário(s) encontrado(s)`;
    } catch (error) {
      showToast("Não foi possível carregar os usuários da API.", "danger");
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

      const confirmed = confirm("Tem certeza que deseja excluir este usuário?");
      if (!confirmed) return;

      try {
        const response = await fetch(`${USUARIOS_API_URL}/${id}`, {
          method: "DELETE",
          headers: obterHeadersJsonComAuth(),
        });

        if (!response.ok) throw new Error("Falha ao excluir usuário");

        showToast("Usuário excluído com sucesso.", "success");
        await carregarUsuarios();
      } catch (error) {
        showToast("Não foi possível excluir o usuário.", "danger");
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
      showToast("Selecione ao menos um curso.", "danger");
      return;
    }
    const payload = {
      nome: String(inputNome?.value || "").trim(),
      email: String(inputEmail?.value || "").trim(),
      perfil: String(selectPerfil?.value || "ALUNO").toUpperCase(),
      cursoIds: selectedCursoIds,
    };

    const senha = String(inputSenha?.value || "").trim();
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
        const errText = await response.text().catch(() => "");
        throw new Error(errText || (isEdit ? "Falha ao atualizar usuário" : "Falha ao criar usuário"));
      }

      showToast(isEdit ? "Usuário atualizado com sucesso." : "Usuário criado com sucesso.", "success");
      resetModalNovoUsuario();
      fecharModal();
      await carregarUsuarios();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : (isEdit ? "Não foi possível atualizar o usuário." : "Não foi possível criar o usuário."),
        "danger",
      );
      console.error(error);
    }
  });

  Promise.all([carregarCursosParaSelect(), carregarUsuarios()]).catch(() => {});
}

export function adminDashboardPage() {
  return shell({
    roleLabel: "Administrador",
    navItems: adminNav,
    title: "Dashboard Geral",
    subtitle: "Resumo consolidado para coordenação e administração.",
    heroTitle: "Painel Geral",
    heroText: "Acompanhe as principais métricas e as solicitações mais recentes.",
    content: `<section class="stats-grid four"><div class="stat-card blue"><span>Total de Alunos</span><strong id="adash-alunos">...</strong><em>🧑‍🎓</em></div><div class="stat-card orange"><span>Solicitações Pendentes</span><strong id="adash-pendentes">...</strong><em>🕘</em></div><div class="stat-card green"><span>Total de Horas Validadas</span><strong id="adash-horas">...</strong><em>✓</em></div><div class="stat-card navy"><span>Cursos Ativos</span><strong id="adash-cursos">...</strong><em>🎓</em></div></section><section class="content-card"><div class="section-head"><div><h3>Solicitações Recentes</h3><p class="muted">Últimas atividades enviadas pelos alunos.</p></div></div><div class="table-wrap"><table class="custom-table dashboard-table"><thead><tr><th>Nome do Aluno</th><th>Curso</th><th>Atividade</th><th>Data</th><th>Status</th><th>Ações</th></tr></thead><tbody id="adash-recent-tbody"><tr><td colspan="6" class="muted">Carregando...</td></tr></tbody></table></div></section><section id="adash-breakdown" class="content-card" hidden><div class="section-head"><div><h3>Resumo por Curso e Área</h3><p class="muted">Detalhamento das horas aprovadas por curso e categoria.</p></div></div><div id="adash-breakdown-content"></div></section>`,
  });
}
export function coursesPage(search = "") {
  return shell({
    roleLabel: "Administrador",
    navItems: adminNav,
    title: "Gestão de Cursos",
    subtitle: "Cadastre cursos e defina a carga horária mínima de validação.",
    heroTitle: "Cursos cadastrados",
    heroText: "Use o formulário para registrar novos cursos e manter as informações atualizadas.",
    heroAction:
      '<button class="btn btn-light" id="btn-novo-curso" type="button">Novo Curso</button>',
    content: `<section class="content-card table-card"><div class="table-wrap"><table class="custom-table"><thead><tr><th>ID</th><th>Nome do Curso</th><th>Carga Horária Mínima</th><th>Ações</th></tr></thead><tbody id="tbody-cursos"><tr><td colspan="4" class="muted">Carregando cursos...</td></tr></tbody></table></div></section>${pillsCount('<span id="cursos-count">0 curso(s) encontrado(s)</span>')}<div id="modal-novo-curso" class="modal-overlay" aria-hidden="true" hidden><div class="modal-card"><h3 id="titulo-modal-curso">Novo Curso</h3><form class="form-grid" id="form-novo-curso"><label for="input-nome-curso">Nome do Curso<input id="input-nome-curso" type="text" name="nome" required></label><label for="input-carga-horaria">Carga Horária Mínima (horas)<input id="input-carga-horaria" type="number" min="1" name="cargaHorariaMinima" required></label><div class="modal-actions"><button id="btn-cancelar-curso" type="button" class="btn btn-outline">Cancelar</button><button id="btn-salvar-curso" type="submit" class="btn btn-primary">Salvar</button></div></form></div></div>`,
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
    content: `<section class="content-card table-card"><div class="table-wrap"><table class="custom-table"><thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Curso Vinculado</th><th>Ações</th></tr></thead><tbody id="tbody-usuarios"><tr><td colspan="5" class="muted">Carregando usuários...</td></tr></tbody></table></div></section>${pillsCount('<span id="usuarios-count">0 usuário(s) encontrado(s)</span>')}<div id="modal-usuario" class="modal-overlay" aria-hidden="true" hidden><div class="modal-card"><h3 id="titulo-modal-usuario">Novo Usuário</h3><form class="form-grid" id="form-usuario"><label for="input-usuario-nome">Nome<input id="input-usuario-nome" type="text" name="nome" required></label><label for="input-usuario-email">E-mail<input id="input-usuario-email" type="email" name="email" required></label><label for="input-usuario-senha">Senha<input id="input-usuario-senha" type="password" name="senha" required></label><label for="select-usuario-perfil">Perfil<select id="select-usuario-perfil" name="perfil" required><option value="ALUNO">Aluno</option><option value="COORDENADOR">Coordenador</option><option value="SUPER_ADMIN">Administrador</option></select></label><label for="select-usuario-curso">Cursos (Ctrl+clique para múltiplos)<select id="select-usuario-curso" name="cursoIds" multiple size="4" style="height:auto;min-height:80px"></select></label><div class="modal-actions"><button id="btn-cancelar-usuario" type="button" class="btn btn-outline">Cancelar</button><button id="btn-salvar-usuario" type="submit" class="btn btn-primary">Salvar</button></div></form></div></div>`,
  });
}
export function coordinatorsPage(search = "") {
  return shell({
    roleLabel: "Administrador",
    navItems: adminNav,
    heroTitle: "Gerenciar Coordenadores",
    heroText: "Cadastre coordenadores e vincule um ou mais cursos.",
    heroAction:
      '<button class="btn btn-light" id="btn-novo-coordenador" type="button">+ Novo Coordenador</button>',
    content: `<section id="coordenadores-grid" class="cards-grid single-column-mobile"><p class="muted">Carregando coordenadores...</p></section>${pillsCount('<span id="coordenadores-count">0 coordenador(es) encontrado(s)</span>')}`,
  });
}
export function studentsPage(search = "") {
  return shell({
    roleLabel: "Administrador",
    navItems: adminNav,
    heroClass: "hero-orange",
    heroTitle: "Gerenciar Alunos",
    heroText: "Cadastre e gerencie os alunos do sistema.",
    heroAction:
      '<button class="btn btn-light" id="btn-novo-aluno" type="button">+ Novo Aluno</button>',
    content: `<section class="content-card table-card"><div class="table-wrap"><table class="custom-table"><thead><tr><th>Nome</th><th>E-mail</th><th>Curso</th><th>Ações</th></tr></thead><tbody id="tbody-alunos"><tr><td colspan="4" class="muted">Carregando alunos...</td></tr></tbody></table></div></section>${pillsCount('<span id="alunos-count">0 aluno(s) encontrado(s)</span>')}`,
  });
}
export function areasPage(search = "") {
  const areaOptions = AREAS_ENUM.map(
    (a) => `<option value="${a.value}">${a.label}</option>`,
  ).join("");
  return shell({
    roleLabel: "Administrador",
    navItems: adminNav,
    heroClass: "hero-amber",
    heroTitle: "Configurar Regras por Área",
    heroText: "Defina limites de horas por área e curso.",
    heroAction:
      '<button class="btn btn-light" id="btn-nova-area" type="button">Nova Regra</button>',
    content: `<section class="content-card table-card"><div class="table-wrap"><table class="custom-table"><thead><tr><th>Área</th><th>Curso</th><th>Limite de Horas</th><th>Ações</th></tr></thead><tbody id="tbody-regras"><tr><td colspan="4" class="muted">Carregando regras...</td></tr></tbody></table></div></section>${pillsCount('<span id="regras-count">0 regra(s) encontrada(s)</span>')}<div id="modal-regra" class="modal-overlay" aria-hidden="true" hidden><div class="modal-card"><h3 id="titulo-modal-regra">Nova Regra</h3><form class="form-grid" id="form-regra"><label for="input-regra-area">Área<select id="input-regra-area" name="area" required><option value="">Selecione a área...</option>${areaOptions}</select></label><label for="input-regra-curso">Curso<select id="input-regra-curso" name="cursoId" required><option value="">Carregando cursos...</option></select></label><label for="input-regra-limite">Limite de Horas<input id="input-regra-limite" type="number" min="1" step="0.5" name="limiteHoras" required></label><div class="modal-actions"><button id="btn-cancelar-regra" type="button" class="btn btn-outline">Cancelar</button><button id="btn-salvar-regra" type="submit" class="btn btn-primary">Salvar</button></div></form></div></div>`,
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
      const elAlunos = document.getElementById("adash-alunos");
      const elPendentes = document.getElementById("adash-pendentes");
      const elHoras = document.getElementById("adash-horas");
      const elCursos = document.getElementById("adash-cursos");

      if (!dash) {
        if (elAlunos) elAlunos.textContent = "0";
        if (elPendentes) elPendentes.textContent = "0";
        if (elHoras) elHoras.textContent = "0h";
        if (elCursos) elCursos.textContent = "0";
        return;
      }

      if (elAlunos) elAlunos.textContent = dash.totalAlunos ?? dash.alunos ?? 0;
      if (elPendentes) elPendentes.textContent = dash.submissoesPendentes ?? dash.totalPendentes ?? dash.pendentes ?? 0;
      if (elHoras) elHoras.textContent = (dash.horasAprovadas ?? dash.totalHorasAprovadas ?? 0) + "h";
      if (elCursos) elCursos.textContent = dash.totalCursos ?? 0;

      const cursos = dash.metricasPorCurso || [];
      if (cursos.length) {
        const breakdown = document.getElementById("adash-breakdown");
        const content = document.getElementById("adash-breakdown-content");
        if (breakdown && content) {
          breakdown.hidden = false;
          content.innerHTML = cursos
            .map(
              (curso) => `<div class="breakdown-curso">
                <h4>${escapeHtml(String(curso.cursoNome || "Curso"))}</h4>
                <p class="muted">${curso.alunos ?? 0} aluno(s) · ${curso.horasAprovadas ?? 0}h aprovadas · ${curso.pendentes ?? 0} pendente(s)</p>
                ${Array.isArray(curso.metricasPorArea) && curso.metricasPorArea.length
                  ? `<div class="table-wrap"><table class="custom-table"><thead><tr><th>Área</th><th>Horas Aprovadas</th></tr></thead><tbody>${curso.metricasPorArea.map((a) => `<tr><td>${escapeHtml(labelArea(String(a.area || "-")))}</td><td>${a.horasAprovadas ?? 0}h</td></tr>`).join("")}</tbody></table></div>`
                  : ""}
              </div>`
            )
            .join("<hr>");
        }
      }
    });

    let todasSubmissoesAdmin = [];

    function renderAdminRecentRows(lista) {
      const tbody = document.getElementById("adash-recent-tbody");
      if (!tbody) return;
      if (!lista.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="muted">Nenhuma solicitação encontrada.</td></tr>';
        return;
      }
      tbody.innerHTML = lista
        .map((s) => {
          const statusRaw = String(s.status || "PENDENTE").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
          const sLabel = statusRaw === "aprovada" ? "Aprovado" : statusRaw === "reprovada" ? "Reprovado" : "Pendente";
          const dataRaw = s.dataSubmissao || s.dataEnvio || s.createdAt || s.dataCriacao || s.dataAtividade || s.atividade?.dataAtividade || "";
          return `<tr data-submissao-id="${s.id}"><td><strong>${escapeHtml(String(s.alunoNome || s.nomeAluno || "Aluno"))}</strong></td><td>${escapeHtml(String(s.cursoNome || s.nomeCurso || "-"))}</td><td>${escapeHtml(String(s.title || s.titulo || s.descricao || "-"))}</td><td>${escapeHtml(formatDate(dataRaw))}</td><td><span class="status-badge ${statusRaw}">${sLabel}</span></td><td class="actions-cell"><button class="icon-btn delete btn-excluir-submissao" type="button" data-submissao-id="${s.id}" aria-label="Excluir submissão">🗑</button></td></tr>`;
        })
        .join("");

      tbody.querySelectorAll(".btn-excluir-submissao").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const id = btn.dataset.submissaoId;
          if (!confirm("Tem certeza que deseja excluir esta submissão?")) return;
          try {
            const r = await fetch(`${SUBMISSOES_API_URL}/${id}`, {
              method: "DELETE",
              headers: obterHeadersJsonComAuth(),
            });
            if (!r.ok) throw new Error("Falha ao excluir");
            showToast("Submissão excluída com sucesso.", "success");
            todasSubmissoesAdmin = todasSubmissoesAdmin.filter((s) => String(s.id) !== String(id));
            renderAdminRecentRows(todasSubmissoesAdmin.slice(0, 5));
            buscarDashboardAdminApi().then((dash) => {
              if (!dash) return;
              const el = document.getElementById("adash-pendentes");
              if (el) el.textContent = dash.submissoesPendentes ?? dash.totalPendentes ?? dash.pendentes ?? 0;
            });
          } catch {
            showToast("Não foi possível excluir a submissão.", "danger");
          }
        });
      });
    }

    fetch(SUBMISSOES_API_URL, { headers: obterHeadersJsonComAuth() })
      .then((res) => (res.ok ? res.json() : []))
      .then((lista) => {
        todasSubmissoesAdmin = Array.isArray(lista) ? lista : [];
        renderAdminRecentRows(todasSubmissoesAdmin.slice(0, 5));
      })
      .catch(() => {});
  }

  if (page === "admin-coordinators") {
    (async () => {
      const grid = document.getElementById("coordenadores-grid");
      const count = document.getElementById("coordenadores-count");
      try {
        const res = await fetch(`${USUARIOS_API_URL}?perfil=COORDENADOR`, { headers: obterHeadersJsonComAuth() });
        const lista = res.ok ? await res.json() : [];
        if (!grid) return;
        if (!Array.isArray(lista) || !lista.length) {
          grid.innerHTML = emptyState({ icon: "👥", title: "Nenhum coordenador encontrado", text: "Cadastre coordenadores na página de Usuários." });
        } else {
          grid.innerHTML = lista
            .map((u) => {
              const item = normalizarUsuario(u);
              return `<article class="person-card left-blue"><div class="person-avatar">👤</div><div class="person-body"><div class="person-head"><div><h3>${escapeHtml(item.nome)}</h3><p>${escapeHtml(item.email)}</p></div><div class="actions-cell"><button class="icon-btn delete btn-excluir-coord" type="button" data-id="${item.id}" aria-label="Excluir coordenador">🗑</button></div></div><hr><span class="person-meta">${escapeHtml(item.cursoNome || "Nenhum curso vinculado")}</span></div></article>`;
            })
            .join("");
          grid.querySelectorAll(".btn-excluir-coord").forEach((btn) => {
            btn.addEventListener("click", async () => {
              if (!confirm("Tem certeza que deseja excluir este coordenador?")) return;
              try {
                const r = await fetch(`${USUARIOS_API_URL}/${btn.dataset.id}`, { method: "DELETE", headers: obterHeadersJsonComAuth() });
                if (!r.ok) throw new Error();
                showToast("Coordenador removido.", "success");
                navigate("admin-coordinators");
              } catch {
                showToast("Não foi possível excluir o coordenador.", "danger");
              }
            });
          });
        }
        if (count) count.textContent = `${Array.isArray(lista) ? lista.length : 0} coordenador(es) encontrado(s)`;
      } catch {
        if (grid) grid.innerHTML = emptyState({ icon: "👥", title: "Erro ao carregar", text: "Não foi possível carregar os coordenadores." });
      }
      document.getElementById("btn-novo-coordenador")?.addEventListener("click", () => {
        navigate("admin-users");
        showToast("Use a página de Usuários para cadastrar coordenadores.", "info");
      });
    })();
  }

  if (page === "admin-students") {
    (async () => {
      const tbody = document.getElementById("tbody-alunos");
      const count = document.getElementById("alunos-count");
      try {
        const res = await fetch(`${USUARIOS_API_URL}?perfil=ALUNO`, { headers: obterHeadersJsonComAuth() });
        const lista = res.ok ? await res.json() : [];
        if (!tbody) return;
        if (!Array.isArray(lista) || !lista.length) {
          tbody.innerHTML = '<tr><td colspan="4" class="muted">Nenhum aluno encontrado.</td></tr>';
        } else {
          tbody.innerHTML = lista
            .map((u) => {
              const item = normalizarUsuario(u);
              return `<tr><td><div class="row-with-icon"><span class="table-avatar">🎓</span><strong>${escapeHtml(item.nome)}</strong></div></td><td>${escapeHtml(item.email)}</td><td>${escapeHtml(item.cursoNome || "Nenhum curso vinculado")}</td><td class="actions-cell"><button class="icon-btn delete btn-excluir-aluno" type="button" data-id="${item.id}" aria-label="Excluir aluno">🗑</button></td></tr>`;
            })
            .join("");
          tbody.querySelectorAll(".btn-excluir-aluno").forEach((btn) => {
            btn.addEventListener("click", async () => {
              if (!confirm("Tem certeza que deseja excluir este aluno?")) return;
              try {
                const r = await fetch(`${USUARIOS_API_URL}/${btn.dataset.id}`, { method: "DELETE", headers: obterHeadersJsonComAuth() });
                if (!r.ok) throw new Error();
                showToast("Aluno removido.", "success");
                navigate("admin-students");
              } catch {
                showToast("Não foi possível excluir o aluno.", "danger");
              }
            });
          });
        }
        if (count) count.textContent = `${Array.isArray(lista) ? lista.length : 0} aluno(s) encontrado(s)`;
      } catch {
        if (tbody) tbody.innerHTML = '<tr><td colspan="4" class="muted">Erro ao carregar alunos.</td></tr>';
      }
      document.getElementById("btn-novo-aluno")?.addEventListener("click", () => {
        navigate("admin-users");
        showToast("Use a página de Usuários para cadastrar alunos.", "info");
      });
    })();
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
