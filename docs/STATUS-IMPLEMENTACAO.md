# Status de implementação

Este documento separa os recursos encontrados no código da aplicação local, os componentes de API existentes e as integrações que ainda precisam ser concluídas.

## 1. Aplicação local

Os recursos abaixo possuem implementação identificável nos arquivos do projeto:

| Recurso | Evidência no código |
|---|---|
| Catálogo e cartões de livros | `js/app.js`, `index.html` |
| Pesquisa global e filtros | `js/app.js` |
| Detalhes do livro | `js/app.js` |
| Categorias e autores em destaque | `js/app.js`, `js/data.js` |
| Cadastro, edição e arquivamento de livros | `js/db.js`, `js/admin.js` |
| Login e sessão local | `js/auth.js` |
| Cadastro local de leitores | `js/auth.js`, `js/db.js` |
| Gerenciamento local de usuários | `js/db.js`, `js/app.js` |
| Empréstimos e devoluções locais | `js/db.js`, `js/app.js` |
| Notificações internas locais | `js/db.js`, `js/app.js` |
| Dashboard e indicadores | `js/admin.js`, `js/app.js` |
| Backup e restauração JSON | `js/db.js`, `js/app.js` |
| Tema diurno/noturno | `js/theme.js` |
| Layout responsivo e animações | `css/` |

A identificação de uma implementação no código não substitui um relatório de testes executados com resultados registrados.

## 2. Componentes de API existentes

| Componente | Situação identificada |
|---|---|
| Servidor Express | Implementado em `api/server.js`. |
| Pool de conexão MySQL | Configurado em `api/server.js`. |
| Consulta pública de livros | Rota GET `/api/livros`. |
| Consulta pública de autores | Rota GET `/api/autores`. |
| Consulta pública de categorias | Rota GET `/api/categorias`. |
| Cadastro via API | POST `/api/cadastro`, com hash bcrypt. |
| Login via API | POST `/api/login`, com verificação bcrypt. |
| Consulta de sessão | GET `/api/sessao`. |
| Logout | POST `/api/sair`. |
| Importação inicial | Script `api/importar.js`, com transação. |

## 3. Integrações ainda pendentes

A interface principal não inclui `js/api-client.js` e os módulos de autenticação e dados continuam utilizando armazenamento do navegador.

Por isso, ainda precisam ser desenvolvidos ou conectados:

- autenticação das páginas por meio das rotas da API;
- consulta da sessão do servidor na inicialização;
- uso do MySQL como fonte do catálogo na interface;
- endpoints de cadastro, edição e arquivamento de livros;
- endpoints de empréstimos e devoluções;
- endpoints de usuários e notificações;
- autorização no servidor para todas as operações administrativas;
- estratégia persistente de sessão, caso o sistema seja executado em mais de uma instância;
- exportação e importação de dados pelo backend;
- script SQL de criação e versionamento do banco;
- testes automatizados e evidências dos testes executados.

## 4. Limitações de segurança conhecidas

Na aplicação local, as senhas ficam em texto puro no `localStorage`, e as permissões são verificadas no código do navegador. O backup também inclui essas senhas.

A API possui hash bcrypt para as contas criadas por suas rotas, mas a autenticação da interface ainda não utiliza essas rotas. A API também mantém sessões em memória.

O sistema não deve ser descrito como pronto para implantação pública ou como uma solução de autenticação centralizada até que essas pendências sejam resolvidas.

## 5. Como apresentar o estágio atual no TCC

Uma descrição tecnicamente fiel ao repositório é:

> O Biblioteca Maynard possui uma aplicação web funcional em modo local, com catálogo, gerenciamento administrativo do acervo, usuários, empréstimos, devoluções e backup no armazenamento do navegador. Como evolução da arquitetura, foi desenvolvida uma API com Node.js e Express, conectada ao MySQL para consultas do catálogo e operações de cadastro e autenticação de contas. A integração entre a interface principal e essa API, assim como a migração integral das operações para o banco de dados, permanece como etapa de evolução do projeto.

A equipe deve atualizar este documento caso a integração ou os testes sejam concluídos posteriormente.
