'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { criarPoolMySQL } = require('./config/mysql');
const { conectarMongoDB, fecharMongoDB } = require('./config/mongodb');

async function testar() {
  let pool;
  try {
    pool = criarPoolMySQL();
    await pool.query('SELECT 1 AS conectado');
    console.log('[OK] MySQL Aiven conectado com TLS e certificado CA.');

    await conectarMongoDB();
    console.log('[OK] MongoDB Atlas conectado.');

    console.log('As duas conexões foram testadas com sucesso.');
  } catch (erro) {
    console.error('[FALHA] Não foi possível testar as conexões.');
    console.error('Código:', erro.code || erro.name || 'ERRO');
    console.error('Mensagem:', erro.message);
    process.exitCode = 1;
  } finally {
    if (pool) await pool.end().catch(() => {});
    await fecharMongoDB().catch(() => {});
  }
}

testar();
