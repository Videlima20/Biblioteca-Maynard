/* =========================================================================
   theme.js — Alternância entre modo dia (bege) e modo noturno (tons
   amenos, pensados para não cansar a vista à noite — nada de preto
   puro ou brilho forte, só uma paleta mais escura e suave).
   A preferência fica salva no localStorage e é aplicada assim que a
   página carrega (ver script inline no <head> de cada página), então
   não há "flash" de tema errado.
   ========================================================================= */
const Tema = {
  KEY: "biblioteca_tema",

  atual() {
    return document.documentElement.getAttribute("data-tema") === "noturno" ? "noturno" : "dia";
  },

  aplicar(tema) {
    if (tema === "noturno") {
      document.documentElement.setAttribute("data-tema", "noturno");
    } else {
      document.documentElement.removeAttribute("data-tema");
    }
    try {
      localStorage.setItem(this.KEY, tema);
    } catch (e) {}
    this._atualizarIcone(tema);
    const viewDashboard = document.getElementById("view-dashboard");
    if (viewDashboard && viewDashboard.classList.contains("ativo") && typeof renderDashboard === "function") {
      renderDashboard();
    }
  },

  alternar() {
    this.aplicar(this.atual() === "noturno" ? "dia" : "noturno");
  },

  _atualizarIcone(tema) {
    const icone = document.getElementById("icone-tema");
    if (!icone) return;
    icone.innerHTML =
      tema === "noturno"
        ? '<circle cx="12" cy="12" r="4.5"/><path d="M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/>'
        : '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
  },

  init() {
    this._atualizarIcone(this.atual());
    const btn = document.getElementById("btn-tema");
    if (btn) btn.addEventListener("click", () => this.alternar());
  },
};

document.addEventListener("DOMContentLoaded", () => Tema.init());
