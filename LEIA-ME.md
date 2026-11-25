# Cadastro e login pelo MySQL

Este pacote inclui a integração do catálogo e acrescenta cadastro, login e saída no mesmo servidor Node. Use a pasta da Biblioteca Maynard que já contém `api/.env` e `api/node_modules`.

## Instalação

1. Pressione **Ctrl+C** no terminal que está rodando o servidor.
2. Extraia o ZIP. Na pasta extraída, copie `api`, `js`, `index.html` e `login.html` para dentro da pasta existente **Biblioteca Maynard**. No Windows, confirme a mesclagem das pastas e a substituição dos arquivos com o mesmo nome. A pasta do projeto deve continuar contendo `css`, `js`, `api`, `index.html` e `login.html`.
3. Preserve `api/.env` e `api/node_modules`. O pacote usa `express`, `mysql2`, `dotenv` e `bcryptjs`, já instalados na pasta principal. A conta da API usa as permissões de leitura e inserção existentes. A importação inicial já foi feita.
4. No terminal do VS Code, dentro de `api`, execute `node server.js`. Se o terminal estiver na pasta principal do projeto, execute `cd api` antes.
5. Abra o endereço abaixo e pressione **Ctrl+F5**. Clique em **Criar conta**. Para gravar a conta que você criou no navegador antes da atualização, preencha o formulário novamente. Após o cadastro, o site abre o catálogo com a nova sessão.

[Abrir Biblioteca Maynard](http://127.0.0.1:3000/)

O pacote contém `api/server.js`, `api/contas.js`, `js/api-client.js`, `js/app.js`, `js/auth.js`, `js/data.js`, `index.html` e `login.html`.

## Conferência no Workbench

Execute a consulta abaixo. O cadastro mais recente aparece primeiro, com tipo `usuario`.

```sql
SELECT id, nome, email, tipo
FROM biblioteca_maynard.usuarios
ORDER BY id DESC;
```

Use **Sair da conta** e entre novamente com o e-mail e a senha cadastrados para conferir o login. Se o site disser que o e-mail já está cadastrado, tente a aba **Entrar**. Após reiniciar o Node, entre novamente. As sessões ficam na memória do servidor e os usuários ficam no MySQL.

Empréstimos, edição de perfil e operações administrativas ficam fora desta entrega. O formulário público cria contas de leitor. A senha é armazenada como hash bcrypt. A API de sessão devolve apenas os dados da conta autenticada.

O fluxo HTTP foi testado com Express e bcrypt instalados e um banco simulado. A consulta acima é a confirmação final no seu MySQL.
