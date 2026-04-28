import { getData, setPage, setUser } from "./state.js";
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

  if (!form) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const role = formData.get("role");
    const email = formData.get("email")?.toString().trim().toLowerCase();
    const password = formData.get("password")?.toString().trim();

    const user = authenticateUser(role, email, password);

    if (!user) {
      showToast("Usuário ou senha incorretos", "danger");
      return;
    }

    setUser(user);
    redirectByRole(user.role);
    onSuccess();
  });
}

function authenticateUser(role, email, password) {
  const { coordinators, students } = getData();

  if (role === "superadmin") {
    if (email === "admin@senac.br" && password === "123456") {
      return {
        id: 0,
        name: "Admin Geral",
        email,
        role: "superadmin",
      };
    }

    return null;
  }

  if (role === "coordinator") {
    const coordinator = coordinators.find(
      (item) =>
        item.email.toLowerCase() === email && item.password === password,
    );

    return coordinator ? { ...coordinator, role: "coordinator" } : null;
  }

  if (role === "student") {
    const student = students.find(
      (item) =>
        item.email.toLowerCase() === email && item.password === password,
    );

    return student ? { ...student, role: "student" } : null;
  }

  return null;
}

function redirectByRole(role) {
  const pages = {
    superadmin: "admin-dashboard",
    coordinator: "coordinator-dashboard",
    student: "student-dashboard",
  };

  setPage(pages[role]);
}
