import { API_BASE_URL } from "./config.js";
import { setPage, setUser } from "./state.js";
import { showToast } from "./ui.js";

export function loginPage() {
  return `
    <div class="login-page">
      <div class="login-brand">
        <div class="senac-badge">
          <img src="assets/senac-logo.png" alt="Senac" class="senac-badge-image" />
        </div>
        <h1>Sistema de Atividades Complementares</h1>
      </div>

      <div class="login-card">
        <h2>Acessar conta</h2>

        <form class="form-grid" id="loginForm">
          <label>
            Perfil de acesso
            <select name="perfil">
              <option value="ALUNO" selected>Aluno</option>
              <option value="COORDENADOR">Coordenador</option>
              <option value="SUPER_ADMIN">Administrador</option>
            </select>
          </label>

          <label>
            E-mail
            <input type="email" name="email" placeholder="exemplo@senac.br" required />
          </label>

          <label>
            Senha
            <input type="password" name="senha" placeholder="••••••••" required />
          </label>

          <button type="submit" class="btn btn-primary btn-full">
            Entrar no sistema
          </button>
        </form>
      </div>
    </div>
  `;
}

export function attachLogin(onSuccess) {
  const form = document.querySelector("#loginForm");

  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const email = formData.get("email")?.toString().trim().toLowerCase();
    const senha = formData.get("senha")?.toString().trim();
    const perfil = formData.get("perfil")?.toString().trim().toUpperCase();

    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email,
          senha,
          perfil,
        }),
      });

      if (!response.ok) {
        const message = await readErrorMessage(response);
        showToast(message || "Usuário ou senha incorretos", "danger");
        return;
      }

      const payload = await response.json().catch(() => null);
      const user = buildUser(payload, { email, perfil, senha });

      setUser(user);
      saveBasicToken(email, senha);
      redirectByRole(user.role);
      onSuccess();
    } catch (error) {
      showToast(
        error instanceof Error && error.message
          ? error.message
          : "Usuário ou senha incorretos",
        "danger",
      );
      return;
    }
  });
}

async function readErrorMessage(response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const payload = await response.json().catch(() => null);
    return payload?.message || payload?.mensagem || payload?.error || "";
  }

  return response.text().catch(() => "");
}

function buildUser(payload, fallback) {
  const apiUser = payload?.usuario || payload?.user || payload?.data || payload || {};
  const roleMap = {
    ALUNO: "student",
    COORDENADOR: "coordinator",
    SUPER_ADMIN: "superadmin",
  };
  const apiRole = String(
    apiUser?.perfil || apiUser?.role || apiUser?.perfilUsuario || fallback.perfil,
  ).toUpperCase();
  const role = roleMap[apiRole] || roleMap[fallback.perfil] || "student";
  const name =
    apiUser?.nome ||
    apiUser?.name ||
    apiUser?.nomeCompleto ||
    apiUser?.email ||
    fallback.email;
  const courseIds = Array.isArray(apiUser?.cursoIds)
    ? apiUser.cursoIds.map(Number).filter(Boolean)
    : Array.isArray(apiUser?.cursos)
    ? apiUser.cursos.map((curso) => Number(curso.id ?? curso.cursoId)).filter(Boolean)
    : [];

  return {
    id: apiUser?.id ?? apiUser?.userId ?? apiUser?.usuarioId ?? 0,
    nome: name,
    name,
    email: apiUser?.email ?? fallback.email,
    role,
    perfil: apiRole || fallback.perfil,
    courseIds,
  };
}

function saveBasicToken(email, senha) {
  const raw = `${String(email || "").trim()}:${String(senha || "").trim()}`;
  if (raw === ":") return;
  localStorage.setItem("tokenBasic", btoa(raw));
}

function redirectByRole(role) {
  const pages = {
    superadmin: "admin-dashboard",
    coordinator: "coordinator-dashboard",
    student: "student-dashboard",
  };

  setPage(pages[role]);
}
