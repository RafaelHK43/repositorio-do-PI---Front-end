# SGAC - Front-end

Front-end do **SGAC - Sistema de Gestão de Atividades Complementares**, desenvolvido para o Projeto Integrador.

O sistema permite que alunos registrem atividades complementares, anexem comprovantes, acompanhem o status das solicitações e que coordenadores validem, aprovem ou reprovem os certificados enviados.

---

## Tecnologias utilizadas

- HTML5
- CSS3
- JavaScript
- PWA com Service Worker
- Integração com API REST
- Live Server para execução local

---

## Funcionalidades principais

### Aluno

- Login no sistema
- Cadastro de atividade complementar
- Upload de comprovante em PDF ou imagem
- Visualização das atividades enviadas
- Consulta de status:
  - Pendente
  - Aprovada
  - Reprovada
- Visualização do comprovante enviado
- Acompanhamento de horas aprovadas
- Consulta das regras do curso

### Coordenador

- Login no sistema
- Visualização de submissões pendentes
- Abertura do comprovante enviado pelo aluno
- Aprovação de atividade
- Reprovação de atividade
- Notificação do aluno por e-mail após validação
- Cadastro e listagem de alunos do curso

### Administrador

- Login no sistema
- Gerenciamento de usuários
- Cadastro, edição e exclusão de cursos
- Cadastro, edição e exclusão de regras/áreas
- Controle geral dos dados do sistema

---

## Estrutura do projeto

```txt
SGAC/
├── index.html
├── manifest.json
├── service-worker.js
├── css/
│   └── style.css
├── js/
│   ├── admin.js
│   ├── auth.js
│   ├── config.js
│   ├── coordinator.js
│   ├── state.js
│   ├── student.js
│   ├── ui.js
│   └── utils.js
└── assets/
    └── imagens e ícones do sistema
