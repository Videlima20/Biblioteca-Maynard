# Biblioteca Maynard — como usar em outro computador

## 1. Abrir o sistema
1. Extraia o `.zip` em qualquer pasta.
2. Dê duplo clique em **`login.html`** (abre no navegador; não precisa instalar nada).
3. Entre com uma conta de demonstração:
   - Administrador(a): `admin@biblioteca.com` / `Admin123!`
   - Leitor(a): `usuario@biblioteca.com` / `Usuario123!`

Na primeira abertura o sistema cria sozinho a base de demonstração (28 livros, 2 contas, 4 empréstimos).
Fotos de autores e a imagem da tela de login vêm da internet; sem conexão o resto funciona normalmente.

## 2. Levar os SEUS dados para o outro computador
Os dados ficam guardados **dentro do navegador** de cada computador. Eles não viajam junto com a pasta do projeto.
Para levar o que você cadastrou:

**No computador onde estão os dados**
1. Entre como administrador(a) → menu **Backup e dados** → **Baixar backup**.
2. Guarde o arquivo `.json` (pen drive, e-mail para você mesmo, nuvem…).

**No computador novo**
1. Abra `login.html` e entre como `admin@biblioteca.com` / `Admin123!`.
2. Menu **Backup e dados** → **Escolher arquivo de backup…** → selecione o `.json`.
3. Confirme. O backup **substitui** todos os dados daquele computador e o sistema desconecta.
4. Entre de novo com uma conta que existia no backup.

> O arquivo `backup/biblioteca-maynard-backup-inicial.json` desta pasta é só a base de demonstração.
> Se você não cadastrou nada seu, não precisa importar nada.

## 3. Cuidados
- **O backup contém as senhas em texto puro.** Guarde em local seguro e não compartilhe.
- Cada navegador (e cada perfil do mesmo navegador) tem a sua própria base. Se limpar os dados do site, tudo se perde — faça backups de vez em quando.
- Dois computadores **não** compartilham dados automaticamente. Para isso seria preciso um servidor com banco de dados.

## 4. Colocar dentro de outro projeto
- Copie a pasta `css/` e `js/` e as páginas `index.html` e `login.html`, mantendo a estrutura de pastas.
- Toda a leitura/gravação de dados passa por `js/db.js`; se um dia for usar um banco de verdade, só esse arquivo precisa mudar.
- Detalhes das mudanças: `ATUALIZACOES.md`.
