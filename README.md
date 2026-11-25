# Biblioteca Maynard

Sistema web de apoio à organização de uma biblioteca escolar, desenvolvido como projeto de Trabalho de Conclusão de Curso (TCC) por estudantes do curso Técnico em Desenvolvimento de Sistemas.

## Sobre o projeto

O Biblioteca Maynard busca facilitar o gerenciamento do acervo e das movimentações da biblioteca, reunindo catálogo, cadastro de usuários, empréstimos, devoluções e ferramentas administrativas em uma interface web.

## Problema

A organização manual do acervo e dos empréstimos pode dificultar o registro, a consulta e o acompanhamento dos livros. O projeto propõe centralizar essas tarefas em uma aplicação para apoiar o trabalho da bibliotecária.

## Funcionalidades da versão local

- Consulta, pesquisa e filtragem do catálogo.
- Visualização de informações de livros e autores.
- Cadastro e gerenciamento de livros, autores e categorias.
- Cadastro e gerenciamento local de usuários.
- Solicitações, gerenciamento, devolução e acompanhamento de empréstimos.
- Notificações internas.
- Painel administrativo e indicadores.
- Exportação e importação de backup JSON.
- Tema claro/escuro e interface responsiva.

> A lista descreve recursos identificados na aplicação local. Não representa um relatório de testes de aceitação.

## Arquitetura e estágio atual

A aplicação principal utiliza HTML, CSS e JavaScript e, na versão local, mantém os dados no armazenamento do navegador (`localStorage`/`sessionStorage`). O repositório também contém uma API em Node.js, Express e MySQL, com consultas públicas do catálogo e rotas de cadastro/login de contas.

**A integração integral entre a interface principal e a API/MySQL ainda não está concluída.** Empréstimos, administração e persistência principal da interface continuam no modo local. A API deve ser entendida como uma etapa de desenvolvimento separada, não como backend completo da aplicação.

## Tecnologias

- HTML5
- CSS3
- JavaScript
- Node.js
- Express
- MySQL
- `mysql2`
- `bcryptjs`
- `dotenv`

## Executar a aplicação local

1. Clone ou baixe o repositório.
2. Abra `login.html` em um navegador atualizado.
3. Entre com uma conta de demonstração ou crie uma conta local.
4. Os dados são armazenados no navegador utilizado.

A execução local não exige que a API/MySQL esteja iniciada.

## Executar a API (componente separado)

Consulte [`docs/EXECUCAO-E-MANUTENCAO.md`](docs/EXECUCAO-E-MANUTENCAO.md) e [`docs/API-E-MYSQL.md`](docs/API-E-MYSQL.md). A API exige Node.js, dependências, MySQL e configuração de ambiente.

## Documentação

- [Arquitetura e dados](docs/ARQUITETURA-E-DADOS.md)
- [API e MySQL](docs/API-E-MYSQL.md)
- [Execução e manutenção](docs/EXECUCAO-E-MANUTENCAO.md)
- [Status de implementação](docs/STATUS-IMPLEMENTACAO.md)
- [Auditoria estática e roteiro de testes](docs/AUDITORIA-CODIGO.md)

## Limitações conhecidas

- Dados da versão local não são compartilhados entre computadores ou navegadores.
- Backup e restauração são operações manuais na versão local.
- O backup da versão local contém credenciais de demonstração em texto puro; mantenha-o privado e utilize apenas dados fictícios.
- A integração completa do frontend com o backend MySQL ainda é trabalho futuro.
- A API mantém sessões em memória; elas são perdidas quando o processo do servidor é reiniciado.
- A API não deve ser exposta à internet ou tratada como implantação de produção sem uma revisão adicional e implementação de autorização adequada.

## Equipe

Consulte a apresentação e a documentação do TCC para conhecer os integrantes e suas atribuições.

## Licença

Consulte o arquivo [`LICENSE`](LICENSE).
