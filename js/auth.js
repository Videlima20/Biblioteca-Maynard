// Impede reentrada enquanto a ação assíncrona estiver em andamento.
function acaoUnica(fn) {
  let ocupada = false;
  return async function (event) {
    if (event?.type === 'submit') event.preventDefault();
    if (ocupada) return;
    ocupada = true;
    const alvo = event?.currentTarget;
    const botao = event?.type === 'submit'
      ? (event.submitter || alvo?.querySelector('button[type="submit"], input[type="submit"]'))
      : event?.target?.closest('button');
    const desabilitado = botao?.disabled;
    if (botao) { botao.disabled = true; botao.setAttribute('aria-busy', 'true'); }
    try { return await fn.call(this, event); }
    catch (erro) {
      console.error("[Maynard] Falha na ação:", erro);
      const mensagem = "Não foi possível concluir a ação. Confira os dados antes de tentar novamente.";
      if (typeof toast === "function") toast(mensagem, "erro");
      else alert(mensagem);
    }
    finally {
      ocupada = false;
      if (botao) { botao.disabled = desabilitado; botao.removeAttribute('aria-busy'); }
    }
  };
}
const Auth = {
  usuario: null,
  async request(url, body) {
    try {
      const r = await fetch(url, {cache:'no-store', credentials:'same-origin', ...(body === undefined ? {} : {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})});
      const d = r.status === 204 ? {} : await r.json();
      return r.ok ? {ok:true,...d} : {ok:false,erro:d.erro || 'Solicitação recusada.',status:r.status};
    } catch { return {ok:false,erro:'Não foi possível comunicar com a API.'}; }
  },
  async iniciar() { const r=await this.request('/api/sessao'); this.usuario=r.ok?r.usuario:null; return r; },
  getUser(){return this.usuario;}, isLogged(){return !!this.usuario;}, isAdmin(){return this.usuario?.tipo==='admin';},
  async login(email,senha){const r=await this.request('/api/login',{email,senha}); if(r.ok)this.usuario=r.usuario; return r;},
  async registrar(nome,email,senha){const r=await this.request('/api/cadastro',{nome,email,senha}); if(r.ok)this.usuario=r.usuario; return r;},
  async logout(){const r=await this.request('/api/sair',{}); if(!r.ok){alert(r.erro);return;} this.usuario=null; location.href='login.html';},
  requireSession(){if(!this.usuario)location.href='login.html';return this.usuario;},
  async atualizarPerfil(dados){const r=await this.request('/api/perfil',dados);if(r.ok)this.usuario=r.usuario;return r;}
};
