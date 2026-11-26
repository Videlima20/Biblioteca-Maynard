'use strict';
const path = require('node:path');
require('dotenv').config({path:path.join(__dirname,'.env')});
const {criarPoolMySQL}=require('./config/mysql');
const dados=require('./acervo-inicial.json');
async function main(){
 const aplicar=process.argv.includes('--aplicar');
 const pool=criarPoolMySQL(); let c;
 try {
  c=await pool.getConnection();
  await c.beginTransaction();
  for(const t of ['autores','categorias','secoes','livros','emprestimos','reservas']){
   const [[r]]=await c.query(`SELECT COUNT(*) AS total FROM ${t}`);
   if(Number(r.total)!==0) throw new Error(`Tabela ${t} não está vazia. Importação interrompida.`);
  }
  const autores=new Map(), categorias=new Map();
  for(const a of dados.autores){
   const [r]=await c.execute('INSERT INTO autores (nome,biografia,anos,citacao,wiki,destaque) VALUES (?,?,?,?,?,?)',[a.nome,a.bio??null,a.anos??null,a.citacao??null,a.wiki??null,!!a.destaque]); autores.set(a.id,r.insertId);
  }
  for(const a of dados.categorias){
   const [r]=await c.execute('INSERT INTO categorias (nome,descricao) VALUES (?,?)',[a.nome,a.desc??null]); categorias.set(a.id,r.insertId);
  }
  const [secao]=await c.execute('INSERT INTO secoes (nome) VALUES (?)',['A classificar']);
  for(const l of dados.livros){
   if(!autores.has(l.autorId)||!categorias.has(l.categoria)) throw new Error('Referência inválida no acervo.');
   await c.execute('INSERT INTO livros (id,titulo,autor_id,categoria_id,secao_id,editora,ano_publicacao,sinopse,quantidade_total,acessos,criado_em) VALUES (?,?,?,?,?,?,?,?,?,?,?)',[l.id,l.titulo,autores.get(l.autorId),categorias.get(l.categoria),secao.insertId,l.editora??null,l.ano??null,l.descricao??null,l.qtdTotal,l.acessos??0,new Date(l.criadoEm)]);
  }
  if(aplicar){await c.commit();console.log('[OK] Acervo importado.');}else{await c.rollback();console.log('[OK] Simulação concluída; nenhum registro salvo.');}
  console.log(`${dados.autores.length} autores, ${dados.categorias.length} categorias, ${dados.livros.length} livros, 1 seção.`);
 }catch(e){if(c) await c.rollback(); console.error('[FALHA]',e.code||e.message);process.exitCode=1;}finally{if(c)c.release();await pool.end();}
}
main().catch(e=>{console.error('[FALHA]',e.code||e.message);process.exitCode=1;});
