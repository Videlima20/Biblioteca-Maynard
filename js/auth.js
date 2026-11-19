/* =========================================================================
   auth.js — Autenticação simulada (sem backend)
   A sessão vive em sessionStorage; os usuários vêm de DB (js/db.js). Estruturado para que, no futuro,
   Auth.login() possa virar uma chamada fetch('/api/login') sem mudar
   quem consome (app.js só chama Auth.getUser() / Auth.isAdmin()).
   ========================================================================= */

const Auth = {
  SESSION_KEY: "biblioteca_sessao",

  getUsuarios() {
    return DB.getUsuarios();
  },

  getUser() {
    const raw = sessionStorage.getItem(this.SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  },

  isLogged() {
    return !!this.getUser();
  },

  isAdmin() {
    const u = this.getUser();
    return !!u && u.tipo === "admin";
  },

  login(email, senha) {
    const usuarios = this.getUsuarios();
    const found = usuarios.find(
      (u) => u.email.toLowerCase() === String(email).toLowerCase().trim() && u.senha === senha
    );
    if (!found) return { ok: false, erro: "E-mail ou senha inválidos." };
    const sessao = { email: found.email, nome: found.nome, tipo: found.tipo, telefone: found.telefone || "" };
    sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(sessao));
    return { ok: true, usuario: sessao };
  },

  /* Cadastro público: sempre cria conta de leitor (administrador só é criado por outro administrador). */
  registrar(nome, email, senha) {
    const res = DB.criarUsuario({ nome, email, senha, tipo: "usuario" });
    if (!res.ok) return res;
    return this.login(email, senha);
  },

  logout() {
    sessionStorage.removeItem(this.SESSION_KEY);
    window.location.href = "login.html";
  },

  /* Protege uma página: redireciona para login.html se não houver sessão;
     se exigirAdmin=true e o usuário não for admin, redireciona para index. */
  requireSession({ exigirAdmin = false } = {}) {
    const user = this.getUser();
    if (!user) {
      window.location.href = "login.html";
      return null;
    }
    if (exigirAdmin && user.tipo !== "admin") {
      window.location.href = "index.html";
      return null;
    }
    return user;
  },

  atualizarPerfil(dados) {
    const user = this.getUser();
    if (!user) return;
    const usuarios = this.getUsuarios();
    const idx = usuarios.findIndex((u) => u.email === user.email);
    if (idx === -1) return;
    usuarios[idx] = { ...usuarios[idx], ...dados };
    DB.setUsuarios(usuarios);
    const novaSessao = { ...user, ...dados };
    sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(novaSessao));
  },
};
