# SGAC — Sistema de Gestão de Atividades Complementares

PWA em HTML/CSS/JavaScript modular, integrado ao back-end Spring Boot.

## Como rodar

1. Inicie o back-end Spring Boot na porta **8080** (`http://localhost:8080`).
2. Abra o projeto com **Live Server** (VS Code) ou qualquer servidor HTTP local.
3. Acesse: `http://127.0.0.1:5501/SGAC/index.html`

> O arquivo `index.html` define a URL base da API via meta tag:
> ```html
> <meta name="sgac-api-base" content="http://localhost:8080/api" />
> ```
> Para apontar para outro endereço, altere apenas essa meta tag.

## Logins de teste (seed do back-end)

| Perfil        | E-mail                    | Senha  |
|---------------|---------------------------|--------|
| Administrador | admin@senac.br            | 123456 |
| Coordenador   | coordenador@senac.br      | 123456 |
| Aluno         | aluno@senac.br            | 123456 |

## Perfis e telas

| Perfil       | Telas disponíveis                                      |
|--------------|--------------------------------------------------------|
| SUPER_ADMIN  | Dashboard · Cursos · Usuários · Regras                 |
| COORDENADOR  | Dashboard · Validar Certificados · Alunos              |
| ALUNO        | Início · Adicionar · Minhas Atividades · Regras do Curso |

## Endpoints consumidos

| Recurso       | Endpoints                                               |
|---------------|---------------------------------------------------------|
| Login         | `POST /api/login`                                       |
| Cursos        | `GET/POST /api/cursos`, `PUT/DELETE /api/cursos/{id}`   |
| Usuários      | `GET/POST /api/usuarios`, `PUT/DELETE /api/usuarios/{id}` |
| Regras        | `GET/POST /api/regras`, `PUT/DELETE /api/regras/{id}`   |
| Regras/curso  | `GET /api/regras/curso/{cursoId}`                       |
| Submissões    | `POST /api/submissoes` (multipart)                      |
| Submissões aluno | `GET /api/submissoes/aluno/{id}`                     |
| Validação     | `PUT /api/submissoes/{id}/aprovar`                      |
|               | `PUT /api/submissoes/{id}/reprovar` (body: `{motivo}`)  |
| Dashboard     | `GET /api/dashboard`                                    |

## Envio de atividade (multipart)

O formulário envia `multipart/form-data` com duas partes:
- `dados` — JSON com campos `alunoId, cursoId, title, descricao, areaId, workload, dataAtividade`
- `arquivo` — arquivo binário do comprovante

O `Content-Type` **não** é definido manualmente — o browser gera o boundary automaticamente.

## Tecnologias

- HTML5 + CSS3 + JavaScript ES Modules (sem frameworks)
- PWA: `manifest.json` + `service-worker.js` (cache `sgac-front-v2`)
- Autenticação via HTTP Basic (token armazenado em `localStorage`)

## Fora de escopo desta entrega

- React / React Native / mobile
- PostgreSQL (responsabilidade do back-end)
- Qualquer build step (Webpack, Vite, etc.)
