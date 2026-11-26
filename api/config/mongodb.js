'use strict';

const { MongoClient } = require('mongodb');

let cliente;
let banco;

async function conectarMongoDB() {
  const uri = process.env.MONGODB_URI;
  const nomeBanco = process.env.MONGODB_DB || 'biblioteca_maynard';

  if (!uri) {
    throw new Error('Defina MONGODB_URI no arquivo .env.');
  }

  cliente = new MongoClient(uri, {
    serverSelectionTimeoutMS: Number(process.env.MONGODB_TIMEOUT_MS || 10000),
  });

  await cliente.connect();
  await cliente.db('admin').command({ ping: 1 });
  banco = cliente.db(nomeBanco);
  return banco;
}

function obterBancoMongoDB() {
  if (!banco) {
    throw new Error('MongoDB ainda não foi conectado.');
  }
  return banco;
}

async function fecharMongoDB() {
  if (cliente) {
    await cliente.close();
    cliente = undefined;
    banco = undefined;
  }
}

module.exports = { conectarMongoDB, obterBancoMongoDB, fecharMongoDB };
