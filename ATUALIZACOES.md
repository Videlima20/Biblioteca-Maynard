# Biblioteca Maynard — atualizações (esquema de dados v2)

> Versão 4: inclui as três telas novas de administração, cadastro de leitores e backup (seção "Novidades da v4" abaixo).

## Estrutura nova
- `js/db.js` (novo): única camada de dados. Auth, Admin e app.js não tocam mais no `localStorage`.
- `js/data.js`: só dados semente + `seedDatabase()` (cria base v2 ou migra a antiga).

## Correções
- **Estoque derivado**: `qtdDisp` não é mais gravado; é `qtdTotal − empréstimos ativos`, calculado na leitura. Acabou a divergência (antes 25 de 28 livros nasciam inconsistentes).
- **Fuso horário**: datas usam o fuso local (`dataLocalISO`). Antes, à noite, o empréstimo era gravado com a data de amanhã.
- **Sem dados aleatórios**: o seed é determinístico (`acessosDemo`).
- **Reservas**: tabela, card e estatística removidos (nunca foram usados).
- **Código morto** `Auth.registrar` removido.
- "Urupês" agora é *conto*; nome do app padronizado como "Maynard".

## Integridade
- `autorId` obrigatório; autor digitado no cadastro é reaproveitado (ignora acento/caixa) ou criado. Autores fictícios agora existem na tabela `autores` com `destaque: false` (não entram no carrossel nem buscam foto na Wikipédia).
- Empréstimos guardam só `livroId`; título/autor/categoria vêm do livro na leitura (editar o título reflete no histórico).
- Excluir livro com histórico **arquiva** em vez de apagar (histórico preservado); com empréstimo ativo continua bloqueado.
- Validação no `DB`: título, autor, editora, descrição, ano (1500…ano atual+1), quantidade inteira 1–9999, categoria existente, e `qtdTotal` nunca abaixo dos exemplares emprestados.
- IDs de empréstimo/notificação sequenciais (antes `Date.now()`), notificações limitadas a 50 por usuário.
- Convenção documentada: datas de calendário `YYYY-MM-DD`; instantes em epoch ms.

## Robustez
- `JSON.parse` protegido: dado corrompido é ignorado com aviso no console, sem derrubar o app.
- Empréstimo e devolução são operações únicas (`DB.emprestar`, `DB.devolver`) que revalidam tudo e tratam armazenamento cheio.
- Cache de leitura (não re-parseia o JSON a cada livro).
- `biblioteca_schema` + migração automática v1 → v2 com backup (`biblioteca_backup_v1`) e rollback se falhar.

## Regras de negócio
- Prazo máximo de 30 dias; data do empréstimo sempre hoje (campo travado); e-mail vem da sessão.
- Máximo de 5 empréstimos ativos por leitor.
- Acessos contados só para leitores e 1x por livro por sessão.

## Novidades da v4

### Controle de empréstimos (bibliotecário) — menu *Administração*
- Lista todos os empréstimos com leitor, datas e situação (*Em dia*, *Vence em N dias*, *Atrasado há N dias*, *Devolvido*).
- Cards: ativos, atrasados, vencem em até 3 dias, já devolvidos. Busca por livro/leitor/e-mail e filtro por situação.
- **Confirmar devolução** de qualquer leitor; o estoque volta e o leitor recebe uma notificação ("confirmada pela biblioteca").
- O leitor continua podendo registrar a devolução dos próprios livros.

### Cadastro de leitores e gestão de usuários
- Tela de login com abas **Entrar / Criar conta**: cadastro público cria sempre conta de *leitor(a)* e já entra.
- Regras: nome (3+ letras), e-mail válido e único (sem diferenciar maiúsculas), senha com 8+ caracteres, letras e números.
- Menu **Usuários** (admin): lista com empréstimos ativos/atrasados, criar usuário (leitor ou admin), tornar admin/leitor, excluir.
- Proteções: não altera o próprio tipo, não exclui a si mesmo, não rebaixa/exclui o último administrador, não exclui quem tem empréstimo ativo (o histórico é mantido). Senhas nunca aparecem na tela.

### Backup e dados — menu *Administração*
- **Baixar backup**: arquivo `biblioteca-maynard-backup-AAAA-MM-DD.json` com todo o acervo, usuários, empréstimos e notificações.
- **Importar backup**: o arquivo é conferido por inteiro antes de mexer em qualquer coisa (formato, esquema, tipos, ids repetidos, referências de autor/categoria/livro, empréstimos ativos x exemplares, pelo menos um admin). Só campos conhecidos são aceitos. Se estiver tudo certo, **substitui todos os dados** (com confirmação) e desconecta; se a gravação falhar, tudo volta como estava.
- Mostra o espaço usado do navegador e permite **apagar o backup da migração v1→v2**.
- ⚠️ O arquivo de backup contém as senhas em texto puro. Guarde-o com cuidado.

### Outros
- Janela de confirmação agora tem rótulo próprio (antes dizia sempre "Excluir", até em "Registrar devolução").
- As tabelas novas viram cartões em telas de celular.

## Ainda NÃO feito (precisa de servidor/telas novas)
- Hash de senha e autorização no servidor (hoje senhas ficam em texto puro no navegador).
- Multa por atraso, renovação, fila de reserva, avisos automáticos de vencimento, redefinição de senha.
- Banco compartilhado entre computadores (o backup manual ajuda, mas não substitui um servidor).
