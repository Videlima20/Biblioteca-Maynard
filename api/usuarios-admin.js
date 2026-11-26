'use strict';
const bcrypt=require('bcryptjs');
const {Int32}=require('mongodb');
const {obterBancoMongoDB}=require('./config/mongodb');
module.exports=(app,pool,auth,post,json)=>{
 const admin=(req,res,next)=>req.usuario.tipo==='admin'?next():res.status(403).json({erro:'Acesso negado.'});
 const fail=m=>{throw Object.assign(new Error(m),{publico:true});};
 const route=fn=>async(req,res,next)=>{try{await fn(req,res);}catch(e){if(e.publico||e.code==='ER_DUP_ENTRY'||e.code==='ER_ROW_IS_REFERENCED_2')return res.status(409).json({erro:e.publico?e.message:'Conta duplicada ou vinculada a registros.'});next(e);}};
 const tx=async(u,fn)=>{const c=await pool.getConnection();try{await c.beginTransaction();const [admins]=await c.query("SELECT id FROM usuarios WHERE papel='administrador' AND ativo=1 ORDER BY id FOR UPDATE");if(!admins.some(a=>a.id===u.id))fail('Permissão administrativa revogada.');const r=await fn(c);await c.commit();return r;}catch(e){await c.rollback();throw e;}finally{c.release();}};
 const log=async(u,id,acao)=>{try{await obterBancoMongoDB().collection('logs_atividade').insertOne({usuario_id:new Int32(u.id),entidade:'usuario',entidade_id:new Int32(id),acao,data_hora:new Date()});}catch(e){console.error('Falha no log:',e.code||e.name);}};
 const papel=t=>{if(!['admin','usuario'].includes(t))fail('Tipo inválido.');return t==='admin'?'administrador':'leitor';};
 app.post('/api/admin/usuarios/criar',post,json,auth,admin,route(async(req,res)=>{const b=req.body,nome=String(b.nome||'').trim(),email=String(b.email||'').trim().toLowerCase(),senha=b.senha,p=papel(b.tipo);if(!nome||nome.length>150||email.length>255||!/^\S+@[^\s@]+\.[^\s@]+$/.test(email)||typeof senha!=='string'||senha.length<8||Buffer.byteLength(senha)>72||!/[a-z]/i.test(senha)||!/\d/.test(senha))fail('Nome, e-mail ou senha inválidos.');const hash=await bcrypt.hash(senha,12);const id=await tx(req.usuario,async c=>{const [r]=await c.execute('INSERT INTO usuarios(nome,email,senha_hash,papel) VALUES(?,?,?,?)',[nome,email,hash,p]);return r.insertId;});await log(req.usuario,id,'criar_usuario');res.status(201).json({ok:true,id});}));
 app.post('/api/admin/usuarios/papel',post,json,auth,admin,route(async(req,res)=>{const p=papel(req.body.tipo);const id=await tx(req.usuario,async c=>{const [[u]]=await c.execute('SELECT id FROM usuarios WHERE email=? FOR UPDATE',[String(req.body.email||'').trim()]);if(!u||u.id===req.usuario.id)fail('Conta inexistente ou alteração da própria conta proibida.');await c.execute('UPDATE usuarios SET papel=? WHERE id=?',[p,u.id]);return u.id;});await log(req.usuario,id,'alterar_papel');res.json({ok:true});}));
 // Exclusão física desabilitada para preservar referências MySQL e MongoDB.
 app.post('/api/admin/usuarios/excluir',post,json,auth,admin,route(async(req,res)=>{const id=await tx(req.usuario,async c=>{const [[u]]=await c.execute('SELECT id,ativo FROM usuarios WHERE email=? FOR UPDATE',[String(req.body.email||'')]);if(!u||u.id===req.usuario.id)fail('Operação proibida.');await c.execute('UPDATE usuarios SET ativo=? WHERE id=?',[u.ativo?0:1,u.id]);return u.id;});await log(req.usuario,id,'alterar_atividade');res.json({ok:true});}));
};
