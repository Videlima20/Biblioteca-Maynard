'use strict';

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

function criarPoolMySQL() {
  const obrigatorias = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
  const ausentes = obrigatorias.filter((chave) => !process.env[chave]);
  if (ausentes.length) {
    throw new Error(`Variáveis MySQL ausentes no .env: ${ausentes.join(', ')}`);
  }

  const sslCaPath = process.env.DB_SSL_CA;
  if (!sslCaPath) {
    throw new Error('Defina DB_SSL_CA no .env apontando para o certificado CA do Aiven.');
  }

  const caminhoCa = path.isAbsolute(sslCaPath)
    ? sslCaPath
    : path.resolve(__dirname, '..', sslCaPath);

  if (!fs.existsSync(caminhoCa)) {
    throw new Error(`Certificado CA do MySQL não encontrado: ${caminhoCa}`);
  }

  const sslCa = fs.readFileSync(caminhoCa, 'utf8');
  if (!sslCa.includes('BEGIN CERTIFICATE')) {
    throw new Error('O arquivo indicado em DB_SSL_CA não parece ser um certificado PEM válido.');
  }

  return mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { ca: sslCa, rejectUnauthorized: true },
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 5),
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    charset: 'utf8mb4',
  });
}

module.exports = { criarPoolMySQL };
