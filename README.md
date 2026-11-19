# Biblioteca Maynard

Sistema web desenvolvido para facilitar a organização e o gerenciamento do acervo de uma biblioteca escolar.

## Sobre o projeto

O Biblioteca Maynard surgiu a partir da dificuldade enfrentada pela bibliotecária para registrar, localizar e organizar os livros da biblioteca. A proposta é centralizar as informações do acervo em um sistema simples, facilitando o cadastro, a consulta e o acompanhamento dos livros.

## Principais funcionalidades

- Cadastro, edição e organização de livros.
- Pesquisa e consulta do catálogo.
- Organização por autores e categorias.
- Visualização da disponibilidade dos exemplares.
- Acesso separado para administrador e leitor.
- Registro e acompanhamento de empréstimos e devoluções.
- Painel administrativo com informações do acervo.
- Backup e restauração dos dados locais.
- Interface adaptável e opção de tema claro/escuro.

## Tecnologias utilizadas

- HTML5
- CSS3
- JavaScript
- Node.js
- Express
- MySQL
- bcryptjs

## Como executar a aplicação

### Aplicação web local

1. Extraia a pasta completa do projeto.
2. Abra `login.html` em um navegador atualizado.
3. Entre com uma conta de demonstração ou crie uma conta de leitor.

Contas locais de demonstração:

| Perfil | E-mail | Senha |
|---|---|---|
| Administrador | `admin@biblioteca.com` | `Admin123!` |
| Leitor | `usuario@biblioteca.com` | `Usuario123!` |

### API

A API está na pasta `api`. Para instalar as dependências:

```bash
cd api
npm install
```

Configure as variáveis de conexão com o MySQL em um arquivo `.env`, utilizando `.env.example` como referência, e inicie o servidor:

```bash
node server.js
```

Consulte `api/README.md` e `docs/API-E-MYSQL.md` para os detalhes da API e do banco de dados.

## Atualização da integração com MySQL

Esta seção reúne as instruções que estavam no antigo `LEIA-ME.md`. Ela se aplica especificamente ao pacote de atualização que contém a integração do catálogo, cadastro, login e saída no mesmo servidor Node.js. Não é um procedimento necessário para simplesmente abrir a versão local da aplicação.

### Aplicar o pacote de atualização

1. Se o servidor estiver em execução, interrompa-o no terminal com **Ctrl+C**.
2. Extraia o pacote de atualização. Copie as pastas `api` e `js`, além dos arquivos `index.html` e `login.html`, para dentro da pasta existente `Biblioteca Maynard`. No Windows, confirme a mesclagem das pastas e a substituição dos arquivos correspondentes.
3. Preserve o arquivo `api/.env` e a pasta `api/node_modules` já configurados no ambiente de destino. Não compartilhe o arquivo `.env`, pois ele pode conter credenciais do banco de dados.
4. No terminal, entre na pasta `api` e execute:

```bash
node server.js
```

5. Acesse `http://127.0.0.1:3000/` e atualize a página com **Ctrl+F5**. Use a opção **Criar conta** para cadastrar um leitor. Se a conta já existir, tente a opção **Entrar**.

Se o terminal estiver na pasta principal do projeto, execute `cd api` antes de iniciar o servidor.

### Conferir o cadastro no MySQL Workbench

Execute a consulta abaixo para visualizar os usuários cadastrados, com os registros mais recentes primeiro:

```sql
SELECT id, nome, email, tipo
FROM biblioteca_maynard.usuarios
ORDER BY id DESC;
```

Depois, use **Sair da conta** e entre novamente com o e-mail e a senha cadastrados. Se o site informar que o e-mail já está cadastrado, tente entrar pela opção **Entrar**.

### Observações sobre essa integração

- O formulário público de cadastro cria contas de leitor.
- A senha é armazenada como hash bcrypt.
- A API de sessão devolve apenas os dados da conta autenticada.
- As sessões ficam na memória do servidor; após reiniciar o Node.js, pode ser necessário entrar novamente.
- Empréstimos, edição de perfil e operações administrativas não fazem parte dessa entrega específica de integração.
- O procedimento original foi testado com Express e bcrypt instalados e um banco simulado. A consulta no Workbench é a verificação final no banco MySQL do ambiente utilizado.

## Observação sobre armazenamento

Na versão local, a interface pode utilizar o armazenamento do navegador (`localStorage`) para os dados e a autenticação. A integração com a API/MySQL depende de estar utilizando o pacote de atualização e a configuração descritos na seção anterior. Os dados armazenados localmente no navegador não são compartilhados automaticamente entre computadores.

As contas de demonstração são destinadas apenas a testes.

## Equipe

- Antônio Gabriel
- Arnaldo Portella
- Yuri Henrique
- Victor Leandro
- Isabela Aparecida

Projeto desenvolvido na área de Desenvolvimento de Sistemas.
