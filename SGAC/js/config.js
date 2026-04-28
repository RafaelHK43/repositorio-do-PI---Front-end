export const STORAGE_KEYS = {
  data: "sgac_modular_data",
  user: "sgac_modular_user",
  page: "sgac_modular_page",
};
export const initialData = {
  courses: [
    {
      id: 1,
      name: "Análise e Desenvolvimento de Sistemas",
      workload_required: 200,
    },
    { id: 2, name: "Redes de Computadores", workload_required: 180 },
    { id: 3, name: "Design Gráfico", workload_required: 160 },
  ],
  coordinators: [
    {
      id: 1,
      name: "Prof. João Silva",
      email: "joao@senac.br",
      password: "123456",
      courseIds: [1],
    },
    {
      id: 2,
      name: "Profa. Carla Mendes",
      email: "carla@senac.br",
      password: "123456",
      courseIds: [2, 3],
    },
  ],
  students: [
    {
      id: 1,
      name: "Maria Santos",
      email: "maria@email.com",
      password: "123456",
      courseIds: [1],
    },
    {
      id: 2,
      name: "Lucas Ferreira",
      email: "lucas@email.com",
      password: "123456",
      courseIds: [2],
    },
    {
      id: 3,
      name: "Ana Souza",
      email: "ana@email.com",
      password: "123456",
      courseIds: [1, 3],
    },
  ],
  areas: [
    {
      id: 1,
      name: "Ensino",
      courseId: 1,
      hour_limit: 40,
      description: "Monitoria, tutoria, optativas e idiomas.",
    },
    {
      id: 2,
      name: "Pesquisa",
      courseId: 1,
      hour_limit: 60,
      description: "Iniciação científica, artigos e produção acadêmica.",
    },
    {
      id: 3,
      name: "Extensão",
      courseId: 1,
      hour_limit: 40,
      description: "Projetos de extensão e responsabilidade social.",
    },
    {
      id: 4,
      name: "Eventos Técnicos",
      courseId: 2,
      hour_limit: 50,
      description: "Congressos, hackathons e semanas técnicas.",
    },
    {
      id: 5,
      name: "Projetos Criativos",
      courseId: 3,
      hour_limit: 60,
      description: "Portfólio, workshops e produção visual.",
    },
  ],
  activities: [
    {
      id: 1,
      studentId: 1,
      courseId: 1,
      areaId: 1,
      title: "Monitoria de Lógica de Programação",
      description: "Apoio em laboratório durante o semestre.",
      workload: 20,
      activityDate: "2026-03-20",
      proofFile: "monitoria-logica.pdf",
      status: "aprovada",
      feedback: "Atividade validada com sucesso.",
    },
    {
      id: 2,
      studentId: 3,
      courseId: 3,
      areaId: 5,
      title: "Workshop de Branding",
      description: "Participação em evento de criação de marca.",
      workload: 12,
      activityDate: "2026-04-10",
      proofFile: "branding.png",
      status: "pendente",
      feedback: "",
    },
  ],
};
export const adminNav = [
  { label: "Dashboard", page: "admin-dashboard", icon: "⌂" },
  { label: "Cursos", page: "courses", icon: "🎓" },
  { label: "Coordenadores", page: "admin-coordinators", icon: "👥" },
  { label: "Áreas", page: "admin-areas", icon: "📘" },
  { label: "Alunos", page: "admin-students", icon: "🧑‍🎓" },
];
export const coordinatorNav = [
  { label: "Dashboard", page: "coordinator-dashboard", icon: "⌂" },
  { label: "Validar Atividades", page: "coordinator-validate", icon: "📝" },
  { label: "Alunos", page: "coordinator-students", icon: "🧑‍🎓" },
];
export const studentNav = [
  { label: "Início", page: "student-dashboard", icon: "⌂" },
  { label: "Adicionar", page: "student-add", icon: "+" },
  { label: "Minhas Atividades", page: "student-activities", icon: "🗂" },
  { label: "Regras do Curso", page: "student-rules", icon: "📖" },
];
export const studentRulesReference = [
  {
    id: 1,
    name: "Ensino",
    limit: 40,
    color: "blue",
    items: [
      ["Monitoria em disciplinas do curso", "20h por semestre"],
      ["Tutoria em cursos a distância", "20h por semestre"],
      [
        "Disciplinas optativas além da grade curricular",
        "60h por disciplina concluída",
      ],
    ],
  },
  {
    id: 2,
    name: "Pesquisa e Iniciação Científica",
    limit: 60,
    color: "deep",
    items: [
      ["Iniciação científica", "60h por ano"],
      ["Publicação de artigo", "30h por artigo"],
      ["Trabalho em anais de evento", "20h por trabalho"],
    ],
  },
  {
    id: 3,
    name: "Extensão e Responsabilidade Social",
    limit: 40,
    color: "green",
    items: [
      ["Projeto de extensão", "40h por projeto"],
      ["Serviço voluntário", "40h por semestre"],
      ["Organização de evento acadêmico", "20h por evento"],
    ],
  },
];
