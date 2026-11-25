# Status de implementação

## Aplicação local

Recursos identificados nos arquivos:

- Catálogo, pesquisa, filtros e detalhes.
- Categorias e autores.
- Cadastro, edição e arquivamento de livros.
- Cadastro e gestão local de usuários.
- Login/sessão local.
- Empréstimos, devoluções e notificações.
- Painel administrativo e indicadores.
- Backup e restauração JSON.
- Tema e layout responsivo.

## API existente

- Express e pool MySQL.
- Consulta de livros, autores e categorias.
- Cadastro e login via API com bcrypt.
- Consulta de sessão e logout.
- Script de importação inicial.

## Pendências de integração

- A interface principal não utiliza atualmente o adaptador `js/api-client.js`.
- Migrar autenticação da interface para o backend.
- Migrar catálogo para fonte MySQL na aplicação.
- Implementar endpoints e integração de empréstimos/devoluções.
- Implementar endpoints administrativos e de usuários.
- Autorização no servidor para operações privilegiadas.
- Esquema SQL versionado e documentado.
- Persistência de sessão adequada para a implantação pretendida.
- Testes automatizados e evidências de validação.

## Descrição adequada para o TCC

O Biblioteca Maynard possui uma aplicação web funcional em modo local, com catálogo, administração do acervo, usuários, empréstimos, devoluções e backup no armazenamento do navegador. Como etapa evolutiva, existe uma API em Node.js e Express conectada ao MySQL, com consultas públicas do catálogo e rotas de cadastro e autenticação. A integração integral da interface com o banco de dados e a migração das operações administrativas permanece pendente.
