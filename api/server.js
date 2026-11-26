'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const registrarContas = require('./contas');
const express = require('express');
const { criarPoolMySQL } = require('./config/mysql');
const { conectarMongoDB, fecharMongoDB } = require('./config/mongodb');

const app = express();
const porta = Number(process.env.PORT || 3000);
const hospedado = process.env.RENDER === 'true';
const origem = hospedado ? process.env.RENDER_EXTERNAL_URL : `http://127.0.0.1:${porta}`;
if (!origem || (hospedado && new URL(origem).protocol !== 'https:')) {
  throw new Error('Configure RENDER_EXTERNAL_URL com o endereço HTTPS do serviço.');
}
const hostEsperado = new URL(origem).host;
const pastaSite = path.join(__dirname, '..');
const pool = criarPoolMySQL();

app.disable('x-powered-by');

// Mantém a API e o site na mesma origem, local ou HTTPS.
// Health check sem dados sensíveis, inclusive para sondas internas do Render.
app.get('/healthz', (req, res) => res.status(200).send('ok'));
app.use((req, res, next) => {
  if (req.get('host') !== hostEsperado) {
    return res.status(400).json({ erro: 'Abra o site em ' + origem + '/.' });
  }
  next();
});

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
    l.ano_publicacao AS ano, l.sinopse AS descricao, l.quantidade_total AS qtdTotal,
    GREATEST(0, CAST(l.quantidade_total AS SIGNED) -
      (SELECT COUNT(*) FROM emprestimos e WHERE e.livro_id = l.id AND e.status IN ('ativo', 'pendente'))) AS qtdDisp,
    l.acessos, l.criado_em AS criadoEm
  FROM livros l
  JOIN autores a ON a.id = l.autor_id
  JOIN categorias c ON c.id = l.categoria_id
  WHERE l.arquivado = FALSE
  ORDER BY l.titulo, l.id
`);
consultaPublica('/api/autores', `
  SELECT id, nome, anos, biografia AS bio, citacao, wiki, destaque
  FROM autores ORDER BY nome, id
`);
consultaPublica('/api/categorias', `
  SELECT id, nome, descricao FROM categorias ORDER BY nome, id
`);

consultaPublica('/api/secoes', 'SELECT id, nome FROM secoes ORDER BY nome, id');

registrarContas(app, pool, express.json({ limit: '4kb' }), origem);
app.use((req, res) => res.status(404).json({ erro: 'Rota não disponível.' }));
app.use((erro, req, res, next) => {
  console.error('Falha HTTP:', erro.code || 'ERRO_HTTP');
  if (res.headersSent) return next(erro);
  const status = [400, 404, 413].includes(erro.status) ? erro.status : 500;
  res.status(status).json({ erro: 'Não foi possível processar a solicitação.' });
});

async function encerrar(servidor, sinal) {
  console.log(`Recebido ${sinal}; encerrando conexões...`);
  if (servidor) await new Promise((resolve) => servidor.close(resolve));
  await Promise.allSettled([pool.end(), fecharMongoDB()]);
}

async function iniciar() {
  let servidor;
  try {
    await pool.query('SELECT 1');
    console.log('MySQL Aiven conectado com TLS.');

    await conectarMongoDB();
    console.log(`MongoDB Atlas conectado (banco: ${process.env.MONGODB_DB || 'biblioteca_maynard'}).`);

    servidor = app.listen(porta, hospedado ? '0.0.0.0' : '127.0.0.1', () => {
      console.log(`Biblioteca Maynard: ${origem}/`);
      console.log('Catálogo, cadastro e login conectados ao MySQL. MongoDB disponível para uso pela API.');
    });

    servidor.on('error', async (erro) => {
      console.error('Não foi possível iniciar o servidor:', erro.code || 'ERRO_SERVIDOR');
      await encerrar(null, 'erro do servidor');
      process.exitCode = 1;
    });

    const tratarSinal = async (sinal) => {
      process.off('SIGINT', aoInterromper);
      process.off('SIGTERM', aoTerminar);
      await encerrar(servidor, sinal);
    };
    const aoInterromper = () => tratarSinal('SIGINT').catch((e) => console.error(e.message));
    const aoTerminar = () => tratarSinal('SIGTERM').catch((e) => console.error(e.message));
    process.once('SIGINT', aoInterromper);
    process.once('SIGTERM', aoTerminar);
  } catch (erro) {
    console.error('Falha ao iniciar a API.');
    console.error('Código:', erro.code || erro.name || 'ERRO_INICIALIZACAO');
    console.error('Mensagem:', erro.message);
    await encerrar(null, 'falha na inicialização');
    process.exitCode = 1;
  }
}

iniciar();
