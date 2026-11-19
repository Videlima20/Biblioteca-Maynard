'use strict';
const path = require('path');
const registrarContas = require('./contas');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const mysql = require('mysql2/promise');
const app = express();
const porta = Number(process.env.PORT || 3000);
const origem = `http://127.0.0.1:${porta}`;
app.disable('x-powered-by');
const pastaSite = path.join(__dirname, '..');
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 5,
});

// O site e o cookie de sessão usam o mesmo endereço local.
app.use((req, res, next) => {
  if (req.get('host') !== new URL(origem).host) {
    return res.status(400).json({ erro: 'Abra o site em ' + origem + '/.' });
  }
  next();
});

// A raiz inteira jamais é publicada: .env, api e backup ficam fora da web.
app.use('/css', express.static(path.join(pastaSite, 'css'), { dotfiles: 'deny', index: false }));
app.use('/js', express.static(path.join(pastaSite, 'js'), { dotfiles: 'deny', index: false }));
app.get(['/', '/login.html'], (req, res) => res.sendFile(path.join(pastaSite, 'login.html')));
app.get('/index.html', (req, res) => res.sendFile(path.join(pastaSite, 'index.html')));

function consultaPublica(rota, sql) {
  app.get(rota, async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
      const [rows] = await pool.query(sql);
      res.json(rows);
    } catch (erro) {
      console.error('Falha na consulta pública:', erro.code || 'ERRO_CONSULTA');
      res.status(500).json({ erro: 'Não foi possível consultar o catálogo. Confira o servidor e tente novamente.' });
    }
  });
}

consultaPublica('/api/livros', `
  SELECT l.id, l.titulo, l.autor_id AS autorId, a.nome AS autor,
    l.categoria_id AS categoria, c.nome AS categoriaNome, l.editora,
    l.ano, l.descricao, l.quantidade_total AS qtdTotal,
    GREATEST(0, CAST(l.quantidade_total AS SIGNED) -
      (SELECT COUNT(*) FROM emprestimos e WHERE e.livro_id = l.id AND e.status = 'ativo')) AS qtdDisp,
    l.acessos, l.criado_em AS criadoEm
  FROM livros l
  JOIN autores a ON a.id = l.autor_id
  JOIN categorias c ON c.id = l.categoria_id
  WHERE l.arquivado = FALSE
  ORDER BY l.titulo, l.id
`);
consultaPublica('/api/autores', `
  SELECT id, nome, anos, bio, citacao, wiki, destaque
  FROM autores ORDER BY nome, id
`);
consultaPublica('/api/categorias', `
  SELECT id, nome, descricao FROM categorias ORDER BY nome, id
`);

registrarContas(app, pool, express.json({ limit: "4kb" }), origem);
app.use((req, res) => res.status(404).json({ erro: 'Rota não disponível.' }));
app.use((erro, req, res, next) => {
  console.error('Falha HTTP:', erro.code || 'ERRO_HTTP');
  if (res.headersSent) return next(erro);
  const status = [400, 404, 413].includes(erro.status) ? erro.status : 500;
  res.status(status).json({ erro: 'Não foi possível processar a solicitação.' });
});

async function iniciar() {
  try {
    await pool.query('SELECT 1');
    const servidor = app.listen(porta, '127.0.0.1', () => {
      console.log(`Biblioteca Maynard: http://127.0.0.1:${Number(process.env.PORT || 3000)}/`);
      console.log('Catálogo, cadastro e login conectados ao MySQL.');
    });
    servidor.on('error', (erro) => {
      console.error('Não foi possível iniciar o servidor:', erro.code || 'ERRO_SERVIDOR');
      pool.end().catch(() => {}).finally(() => { process.exitCode = 1; });
    });
  } catch (erro) {
    console.error('Não foi possível conectar ao banco:', erro.code || 'ERRO_CONEXAO');
    await pool.end().catch(() => {});
    process.exitCode = 1;
  }
}
iniciar();
