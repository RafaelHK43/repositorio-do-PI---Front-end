export const API_BASE_URL = "http://localhost:8080";

export const STORAGE_KEYS = {
  user: "sgac_user",
  page: "sgac_page"
};

export const AREA_OPTIONS = [
  { value: "ENSINO", label: "Ensino" },
  { value: "PESQUISA", label: "Pesquisa" },
  { value: "EXTENSAO", label: "Extensão" },
  { value: "CULTURA", label: "Cultura" },
  { value: "EVENTOS", label: "Eventos" }
];

export const ROLE_LABELS = {
  superadmin: "Administrador",
  coordinator: "Coordenador",
  student: "Aluno"
};

export const KNOWN_USERS = {
  "superadmin@senac.br": {
    role: "superadmin",
    name: "Super Admin",
    backendUserId: 1
  },
  "coordenador@senac.br": {
    role: "coordinator",
    name: "Coordenador",
    backendUserId: 2
  },
  "aluno@senac.br": {
    role: "student",
    name: "Aluno",
    backendUserId: 3
  }
};

export const adminNav = [
  { label: "Dashboard", page: "admin-dashboard", icon: "⌂" },
  { label: "Cursos", page: "courses", icon: "🎓" },
  { label: "Regras", page: "admin-areas", icon: "📘" },
  { label: "Coordenadores", page: "admin-coordinators", icon: "👥" },
  { label: "Alunos", page: "admin-students", icon: "🧑‍🎓" }
];

export const coordinatorNav = [
  { label: "Dashboard", page: "coordinator-dashboard", icon: "⌂" },
  { label: "Cursos", page: "courses", icon: "🎓" },
  { label: "Regras", page: "admin-areas", icon: "📘" },
  { label: "Validação", page: "coordinator-validate", icon: "📝" },
  { label: "Alunos", page: "coordinator-students", icon: "🧑‍🎓" }
];

export const studentNav = [
  { label: "Início", page: "student-dashboard", icon: "⌂" },
  { label: "Enviar atividade", page: "student-add", icon: "+" },
  { label: "Minhas atividades", page: "student-activities", icon: "🗂" },
  { label: "Regras do curso", page: "student-rules", icon: "📖" }
];
