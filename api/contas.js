'use strict';

const bcrypt = require('bcryptjs');
const { randomBytes } = require('node:crypto');

const NOME_COOKIE = 'maynard_sessao';
const DURACAO_SESSAO = 8 * 60 * 60 * 1000;
const CUSTO_HASH = 12;
const COOKIE = { httpOnly: true, sameSite: 'strict', path: '/' };

function dadosEntrada(body) {
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const senha = typeof body?.senha === 'string' ? body.senha : '';
  return { email, senha };
}

function emailValido(email) {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function dadosPublicos({ id, nome, email, tipo }) {
  return { id, nome, email, tipo };
}

module.exports = function registrarContas(app, pool, interpretarJson, origem) {
  const sessoes = new Map();
  const hashInexistente = bcrypt.hashSync(randomBytes(32).toString('hex'), CUSTO_HASH);
  const limpeza = setInterval(() => {
    const agora = Date.now();
    for (const [token, sessao] of sessoes) {
      if (sessao.expiraEm <= agora) sessoes.delete(token);
    }
  }, 60_000);
  limpeza.unref();

  function tokenDaRequisicao(req) {
    const cookies = req.get('cookie') || '';
    const match = cookies.match(/(?:^|;\s*)maynard_sessao=([a-f0-9]{64})(?:;|$)/);
    return match ? match[1] : null;
  }

  function iniciarSessao(req, res, usuario) {
    sessoes.delete(tokenDaRequisicao(req));
    const token = randomBytes(32).toString('hex');
    sessoes.set(token, { usuario, expiraEm: Date.now() + DURACAO_SESSAO });
    res.cookie(NOME_COOKIE, token, { ...COOKIE, maxAge: DURACAO_SESSAO });
  }

  function protegerPost(req, res, next) {
    res.set('Cache-Control', 'no-store');
    if (req.get('origin') !== origem) {
      return res.status(403).json({ erro: 'Abra o formulário em ' + origem + '/.' });
    }
    if (!req.is('application/json')) {
      return res.status(415).json({ erro: 'Formato de solicitação inválido.' });
    }
    next();
  }

  // O servidor local atende uma única origem. O limite também contém o custo do bcrypt.
  let janelaAte = 0;
  let tentativas = 0;
  function limitarTentativas(req, res, next) {
    const agora = Date.now();
    if (agora >= janelaAte) {
      janelaAte = agora + 60_000;
      tentativas = 0;
    }
    if (tentativas >= 20) {
      res.set('Retry-After', String(Math.ceil((janelaAte - agora) / 1000)));
      return res.status(429).json({ erro: 'Muitas tentativas. Aguarde um minuto e tente novamente.' });
    }
    tentativas++;
    next();
  }

  app.post('/api/cadastro', protegerPost, interpretarJson, limitarTentativas, async (req, res, next) => {
    const nome = typeof req.body?.nome === 'string' ? req.body.nome.trim().replace(/\s+/g, ' ') : '';
    const { email, senha } = dadosEntrada(req.body);
    if (nome.length < 3 || nome.length > 150) {
      return res.status(400).json({ erro: 'Informe um nome com 3 a 150 caracteres.' });
    }
    if (!emailValido(email)) return res.status(400).json({ erro: 'Informe um e-mail válido.' });
    if (senha.length < 8 || Buffer.byteLength(senha, 'utf8') > 72 || !/[A-Za-z]/.test(senha) || !/\d/.test(senha)) {
      return res.status(400).json({ erro: 'Use ao menos 8 caracteres, com letras e números. Se a senha for muito longa, use uma mais curta.' });
    }
    try {
      const hash = await bcrypt.hash(senha, CUSTO_HASH);
      const [resultado] = await pool.execute(
        "INSERT INTO usuarios (nome, email, senha_hash, tipo) VALUES (?, ?, ?, 'usuario')",
        [nome, email, hash],
      );
      const usuario = { id: resultado.insertId, nome, email, tipo: 'usuario' };
      iniciarSessao(req, res, usuario);
      return res.status(201).json({ usuario });
    } catch (erro) {
      if (erro.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ erro: 'Já existe uma conta com esse e-mail. Use a opção Entrar.' });
      }
      next(erro);
    }
  });

  app.post('/api/login', protegerPost, interpretarJson, limitarTentativas, async (req, res, next) => {
    const { email, senha } = dadosEntrada(req.body);
    const invalida = () => res.status(401).json({ erro: 'E-mail ou senha inválidos.' });
    if (!emailValido(email) || !senha || Buffer.byteLength(senha, 'utf8') > 72) return invalida();
    try {
      const [usuarios] = await pool.execute(
        'SELECT id, nome, email, tipo, senha_hash FROM usuarios WHERE email = ? LIMIT 1',
        [email],
      );
      const registro = usuarios[0];
      const senhaCorreta = await bcrypt.compare(senha, registro?.senha_hash || hashInexistente);
      if (!registro || !senhaCorreta) return invalida();
      const usuario = dadosPublicos(registro);
      iniciarSessao(req, res, usuario);
      return res.json({ usuario });
    } catch (erro) {
      next(erro);
    }
  });

  app.get('/api/sessao', (req, res) => {
    res.set('Cache-Control', 'no-store');
    const token = tokenDaRequisicao(req);
    const sessao = sessoes.get(token);
    if (!sessao || sessao.expiraEm <= Date.now()) {
      sessoes.delete(token);
      return res.status(401).json({ erro: 'Entre na sua conta para continuar.' });
    }
    res.json({ usuario: sessao.usuario });
  });

  app.post('/api/sair', protegerPost, (req, res) => {
    sessoes.delete(tokenDaRequisicao(req));
    res.clearCookie(NOME_COOKIE, COOKIE);
    res.status(204).end();
  });
};
