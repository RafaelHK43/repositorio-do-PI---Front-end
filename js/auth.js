import { buildBasicAuthHeader, checkLogin } from "./api.js";
import { KNOWN_USERS } from "./config.js";
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
            <select name="role">
              <option value="student" selected>Aluno</option>
              <option value="coordinator">Coordenador</option>
              <option value="superadmin">Administrador</option>
            </select>
          </label>

          <label>
            E-mail
            <input type="email" name="email" placeholder="exemplo@senac.br" required />
          </label>

          <label>
            Senha
            <input type="password" name="password" placeholder="••••••••" required />
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

  if (!form) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const submitButton = form.querySelector('button[type="submit"]');
    const formData = new FormData(form);
    const selectedRole = String(formData.get("role"));
    const email = String(formData.get("email")).trim().toLowerCase();
    const password = String(formData.get("password")).trim();

    submitButton.disabled = true;
    submitButton.textContent = "Entrando...";

    try {
      const user = await authenticateUser(selectedRole, email, password);

      setUser(user);
      setPage(getInitialPage(user.role));
      onSuccess();
    } catch (error) {
      showToast(error.message || "Não foi possível entrar.", "danger");
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Entrar no sistema";
    }
  });
}

async function authenticateUser(selectedRole, email, password) {
  const knownUser = KNOWN_USERS[email];

  if (knownUser && knownUser.role !== selectedRole) {
    throw new Error("Esse e-mail pertence a outro perfil de acesso.");
  }

  const authHeader = buildBasicAuthHeader(email, password);

  await checkLogin(authHeader);

  return {
    name: knownUser?.name || email.split("@")[0],
    email,
    role: knownUser?.role || selectedRole,
    authHeader,
    backendUserId: knownUser?.backendUserId || null
  };
}

function getInitialPage(role) {
  if (role === "superadmin") {
    return "admin-dashboard";
  }

  if (role === "coordinator") {
    return "coordinator-dashboard";
  }

  return "student-dashboard";
}
