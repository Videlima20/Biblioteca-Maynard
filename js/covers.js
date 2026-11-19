/* =========================================================================
   covers.js — Capas visuais reais (não-emoji) para os livros do catálogo.
   Como os 10 livros do acervo são fictícios, cada capa é composta em
   HTML/CSS: gradiente exclusivo por categoria + variação por título,
   tipografia e um símbolo gráfico do gênero. Nenhuma capa repete a outra.
   ========================================================================= */

const CATEGORY_PALETTE = {
  romance: ["#7A2B44", "#C1495A"],
  conto: ["#1F5C56", "#4FB0A5"],
  novela: ["#2C3568", "#5B6BD6"],
  teatro: ["#5C2C68", "#A15BD6"],
  ensaios: ["#3A3320", "#D4A24C"],
  poema: ["#1E3A5C", "#4C8FD4"],
  texto: ["#4A3320", "#B87B3A"],
  diario: ["#2E2A45", "#7A6BC7"],
  biografia: ["#1D2B1E", "#4C8F55"],
};

const CATEGORY_GLYPH = {
  romance: "M12 21s-7.5-4.6-10-9.1C.5 8.4 2.4 5 6 5c2 0 3.4 1.1 4 2.4C10.6 6.1 12 5 14 5c3.6 0 5.5 3.4 4 6.9C19.5 16.4 12 21 12 21z",
  conto: "M4 4h9a4 4 0 0 1 4 4v13H8a4 4 0 0 1-4-4V4z M20 4v13a3 3 0 0 1-3 3",
  novela: "M4 19V5a2 2 0 0 1 2-2h9l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z M14 3v5h5",
  teatro: "M8 4c0 2-2 2-2 4s2 2 2 4-2 2-2 4 2 2 2 4M16 4c0 2 2 2 2 4s-2 2-2 4 2 2 2 4-2 2-2 4",
  ensaios: "M4 6h16M4 12h16M4 18h10",
  poema: "M6 3v18M6 3c4 0 4 3 8 3s4-3 4-3v9c0 0 0 3-4 3s-4-3-8-3",
  texto: "M5 4h14v3H5zM5 10.5h14M5 14h9M5 17.5h11",
  diario: "M4 6a2 2 0 0 1 2-2h9l5 5v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z M15 4v5h5 M8 13h8 M8 16.5h5",
  biografia: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4.4 3.6-7 8-7s8 2.6 8 7",
};

/* Hash simples e determinístico a partir do título, para variar o ângulo
   e o padrão decorativo sem depender de aleatoriedade (a capa de um mesmo
   livro é sempre igual, mesmo depois de recarregar a página). */
function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function renderCoverHTML(book, { withMeta = false } = {}) {
  const [c1, c2] = CATEGORY_PALETTE[book.categoria] || CATEGORY_PALETTE.romance;
  const glyph = CATEGORY_GLYPH[book.categoria] || CATEGORY_GLYPH.romance;
  const h = hashString(book.titulo + (book.autor || ""));
  const angle = 100 + (h % 80);
  const shift = h % 30;

  return `
    <div class="capa" style="--c1:${c1};--c2:${c2};--ang:${angle}deg;--shift:${shift}%">
      <svg class="capa-glifo" viewBox="0 0 24 24" aria-hidden="true"><path d="${glyph}" /></svg>
      <div class="capa-conteudo">
        <span class="capa-categoria">${(book.categoria || "").toUpperCase()}</span>
        <h3 class="capa-titulo">${escapeHTML(book.titulo)}</h3>
        <span class="capa-autor">${escapeHTML(book.autor || "")}</span>
      </div>
      <div class="capa-textura"></div>
    </div>
    ${withMeta ? `<div class="livro-meta"><strong>${escapeHTML(book.titulo)}</strong><span>${escapeHTML(book.autor || "")}</span></div>` : ""}
  `;
}

function escapeHTML(str) {
  return String(str || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}
