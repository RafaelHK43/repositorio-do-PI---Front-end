SGAC - Front pronto para integrar com o back atual

O que já está ligado ao backend:
- Login com HTTP Basic
- Listagem de cursos
- Cadastro de cursos
- Listagem de regras por curso
- Cadastro e atualização de regras
- Envio de submissão com arquivo

O que ainda depende de novas rotas no backend:
- CRUD de coordenadores
- CRUD de alunos
- Listagem de submissões
- Aprovação e reprovação de submissões
- Dashboard real por perfil

Back esperado:
- URL: http://localhost:8080
- Swagger: http://localhost:8080/swagger-ui.html

Usuários seed do back:
- superadmin@senac.br / 123456
- coordenador@senac.br / 123456
- aluno@senac.br / 123456

Observação:
- O back atual ainda não expõe um endpoint /me.
- Por isso, o envio de atividade usa o ID seed do aluno para o caso de teste do login aluno.
