const fs = require("node:fs/promises");
const path = require("node:path");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");

require("dotenv").config({ path: path.join(__dirname, ".env") });

async function importar() {
  let conexao;
  let emTransacao = false;

  try {
    const caminho = path.join(
      __dirname, "..", "backup",
      "biblioteca-maynard-backup-inicial.json"
    );

    const backup = JSON.parse(
      (await fs.readFile(caminho, "utf8")).replace(/^\uFEFF/, "")
    );
    const dados = backup.dados;
    const tabelas = [
      "categorias", "autores", "usuarios",
      "livros", "emprestimos", "notificacoes"
    ];

    if (
      backup.schema !== 2 ||
      !dados ||
      !tabelas.every((tabela) => Array.isArray(dados[tabela]))
    ) {
      throw new Error("O backup não está no formato esperado.");
    }

    conexao = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      timezone: "Z",
    });

    await conexao.beginTransaction();
    emTransacao = true;

    // Evita importar novamente sobre dados já existentes.
    for (const tabela of tabelas) {
      const [[resultado]] = await conexao.query(
        `SELECT COUNT(*) AS total FROM \`${tabela}\``
      );
      if (Number(resultado.total) !== 0) {
        throw new Error(
          `Importação cancelada: a tabela ${tabela} já contém dados.`
        );
      }
    }

    const categorias = new Map();
    const autores = new Map();
    const usuarios = new Map();
    const emailNormalizado = (email) =>
      String(email).trim().toLowerCase();

    for (const categoria of dados.categorias) {
      const [resultado] = await conexao.execute(
        "INSERT INTO categorias (nome, descricao) VALUES (?, ?)",
        [categoria.nome, categoria.desc ?? null]
      );
      categorias.set(categoria.id, resultado.insertId);
    }

    for (const autor of dados.autores) {
      const [resultado] = await conexao.execute(
        `INSERT INTO autores
         (nome, anos, bio, citacao, wiki, destaque)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          autor.nome,
          autor.anos ?? null,
          autor.bio ?? null,
          autor.citacao ?? null,
          autor.wiki ?? null,
          autor.destaque !== false,
        ]
      );
      autores.set(autor.id, resultado.insertId);
    }

    for (const usuario of dados.usuarios) {
      if (
        typeof usuario.senha !== "string" ||
        !usuario.senha ||
        bcrypt.truncates(usuario.senha)
      ) {
        throw new Error("Uma conta contém senha inválida para a importação.");
      }

      const hash = await bcrypt.hash(usuario.senha, 12);
      const email = emailNormalizado(usuario.email);

      const [resultado] = await conexao.execute(
        `INSERT INTO usuarios
         (nome, email, senha_hash, telefone, tipo)
         VALUES (?, ?, ?, ?, ?)`,
        [
          usuario.nome,
          email,
          hash,
          usuario.telefone ?? null,
          usuario.tipo,
        ]
      );
      usuarios.set(email, resultado.insertId);
    }

    for (const livro of dados.livros) {
      const autorId = autores.get(livro.autorId);
      const categoriaId = categorias.get(livro.categoria);

      if (!autorId || !categoriaId) {
        throw new Error("Um livro referencia autor ou categoria inexistente.");
      }

      await conexao.execute(
        `INSERT INTO livros
         (id, titulo, autor_id, categoria_id, editora, ano,
          quantidade_total, descricao, acessos, criado_em, arquivado)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          livro.id,
          livro.titulo,
          autorId,
          categoriaId,
          livro.editora,
          livro.ano ?? null,
          livro.qtdTotal,
          livro.descricao ?? null,
          livro.acessos ?? 0,
          new Date(livro.criadoEm),
          livro.arquivado === true,
        ]
      );
    }

    for (const emprestimo of dados.emprestimos) {
      const usuarioId = usuarios.get(emailNormalizado(emprestimo.email));
      if (!usuarioId) {
        throw new Error("Um empréstimo referencia usuário inexistente.");
      }

      await conexao.execute(
        `INSERT INTO emprestimos
         (id, usuario_id, livro_id, data_emprestimo,
          data_prevista_devolucao, devolvido_em, status)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          emprestimo.id,
          usuarioId,
          emprestimo.livroId,
          emprestimo.data,
          emprestimo.devolucao,
          emprestimo.devolvidoEm == null
            ? null
            : new Date(emprestimo.devolvidoEm),
          emprestimo.status,
        ]
      );
    }

    for (const notificacao of dados.notificacoes) {
      const usuarioId = usuarios.get(emailNormalizado(notificacao.email));
      if (!usuarioId) {
        throw new Error("Uma notificação referencia usuário inexistente.");
      }

      await conexao.execute(
        `INSERT INTO notificacoes
         (id, usuario_id, emprestimo_id, mensagem, detalhes, lida, criado_em)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          notificacao.id,
          usuarioId,
          notificacao.detalhes?.emprestimoId ?? null,
          notificacao.mensagem,
          notificacao.detalhes == null
            ? null
            : JSON.stringify(notificacao.detalhes),
          notificacao.lida === true,
          new Date(notificacao.criadoEm),
        ]
      );
    }

    await conexao.commit();
    emTransacao = false;

    console.log("Importação concluída.");
    for (const tabela of tabelas) {
      console.log(`${tabela}: ${dados[tabela].length} registros`);
    }
  } catch (erro) {
    if (conexao && emTransacao) {
      try {
        await conexao.rollback();
        console.error("As inserções desta tentativa foram desfeitas.");
      } catch {
        console.error("Não foi possível confirmar a reversão. Confira o banco.");
      }
    }
    console.error("Falha na importação:", erro.code || erro.message);
    process.exitCode = 1;
  } finally {
    if (conexao) await conexao.end();
  }
}

importar();