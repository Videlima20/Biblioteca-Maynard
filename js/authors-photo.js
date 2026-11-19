/* =========================================================================
   authors-photo.js — Fotos reais de autores.
   Busca em tempo real na API pública da Wikipédia (primeiro em
   pt.wikipedia.org, com fallback para en.wikipedia.org quando o verbete
   em português não tem uma imagem de destaque) e guarda em cache no
   localStorage por 7 dias. Se a busca falhar, existe ainda uma segunda
   camada: uma foto de reserva já conhecida (Wikimedia Commons) para os
   autores do acervo padrão, evitando depender de uma única chamada de
   API instável. Só na ausência de qualquer imagem real é que aparece o
   avatar tipográfico (iniciais sobre gradiente) — nunca um ícone
   decorativo no lugar da foto.
   ========================================================================= */

/* Foto de reserva (Wikimedia Commons) por autor, usada quando a busca em
   tempo real falha ou demora. Usa Special:FilePath, o mesmo mecanismo já
   usado na tela de login para a foto da estante — é um link estável que
   não depende do resultado da API de resumo da Wikipédia. */
const AUTHOR_PHOTO_FALLBACK = {
  "machado-de-assis": "Machado de Assis 1904.jpg",
  "clarice-lispector": "Clarice Lispector (cropped).jpg",
  "cecilia-meireles": "Cecília-Meireles.jpg",
  "jorge-amado": "Jorge Amado, Headshot 2, 1988 (cropped).png",
  "monteiro-lobato": "Monteiro Lobato.jpg",
  "carlos-drummond-de-andrade": "Carlos Drummond de Andrade, 1970 (cropped).jpg",
};

function commonsFilePath(filename) {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}`;
}

const AuthorPhoto = {
  CACHE_KEY: "biblioteca_fotos_autores_v2",
  CACHE_TTL_OK: 1000 * 60 * 60 * 24 * 7, // 7 dias para um resultado que funcionou
  CACHE_TTL_FALHA: 1000 * 60 * 30, // só 30 min para uma falha — tenta de novo em breve

  _readCache() {
    try {
      return JSON.parse(localStorage.getItem(this.CACHE_KEY) || "{}");
    } catch {
      return {};
    }
  },

  _writeCache(cache) {
    try {
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(cache));
    } catch {}
  },

  async _buscarNaWikipedia(dominio, titulo) {
    const resp = await fetch(
      `https://${dominio}/api/rest_v1/page/summary/${encodeURIComponent(titulo)}`
    );
    if (!resp.ok) throw new Error("not ok");
    const data = await resp.json();
    const url = (data.thumbnail && data.thumbnail.source) || (data.originalimage && data.originalimage.source) || null;
    return url ? url.replace(/\/\d+px-/, "/480px-") : null;
  },

  /* Busca ao vivo, tentando primeiro o verbete em português e, se não
     houver imagem, o verbete em inglês (mesmo título — funciona para
     nomes próprios, que não são traduzidos). */
  async _buscarAoVivo(wikiTitle) {
    for (const dominio of ["pt.wikipedia.org", "en.wikipedia.org"]) {
      try {
        const url = await this._buscarNaWikipedia(dominio, wikiTitle);
        if (url) return url;
      } catch {
        /* tenta o próximo domínio */
      }
    }
    return null;
  },

  /* Retorna uma lista ordenada de URLs candidatas para a foto de um autor:
     1) resultado em cache (se ainda válido), 2) busca ao vivo, 3) foto de
     reserva conhecida. O <img> tenta cada uma em sequência (via onerror)
     até uma funcionar de verdade. */
  async candidatos(autor) {
    const lista = [];
    const cache = this._readCache();
    const hit = cache[autor.wiki];
    const ttl = hit && hit.url ? this.CACHE_TTL_OK : this.CACHE_TTL_FALHA;
    const cacheValido = hit && Date.now() - hit.t < ttl;

    let urlAoVivo = cacheValido ? hit.url : undefined;
    if (urlAoVivo === undefined) {
      urlAoVivo = await this._buscarAoVivo(autor.wiki);
      cache[autor.wiki] = { url: urlAoVivo, t: Date.now() };
      this._writeCache(cache);
    }
    if (urlAoVivo) lista.push(urlAoVivo);

    const reserva = AUTHOR_PHOTO_FALLBACK[autor.id];
    if (reserva) lista.push(commonsFilePath(reserva));

    return lista;
  },

  initials(nome) {
    return nome
      .split(" ")
      .filter((w) => w.length > 2)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase();
  },

  /* Aplica a foto (ou o retrato alternativo) num elemento <img>, com uma
     classe irmã .avatar-fallback que é revelada em caso de falha real de
     carregamento de TODAS as candidatas (rede indisponível etc.). */
  async apply(imgEl, autor) {
    const wrap = imgEl.closest(".foto-autor, .autor-perfil-foto");
    const fallback = wrap ? wrap.querySelector(".avatar-fallback, #autor-modal-fallback") : null;
    if (fallback) fallback.textContent = this.initials(autor.nome);

    const candidatos = await this.candidatos(autor);
    if (!candidatos.length) {
      if (wrap) wrap.classList.add("sem-foto");
      return;
    }

    imgEl.alt = `Fotografia de ${autor.nome}`;
    let i = 0;
    const tentarProxima = () => {
      if (i >= candidatos.length) {
        if (wrap) wrap.classList.add("sem-foto");
        return;
      }
      imgEl.src = candidatos[i++];
    };
    imgEl.onerror = tentarProxima;
    tentarProxima();
  },
};
