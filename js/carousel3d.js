/* =========================================================================
   carousel3d.js — Carrossel 3D de autores ("Estante Orbital")
   CSS 3D real: perspective + transform-style: preserve-3d + rotateY,
   cada autor posicionado em um ponto de um círculo (translate3d + rotateY),
   e o grupo inteiro gira para trazer o autor ativo ao centro.
   ========================================================================= */

class Carousel3D {
  constructor({ trackEl, indicatorsEl, prevBtn, nextBtn, autores, onChange }) {
    this.trackEl = trackEl;
    this.indicatorsEl = indicatorsEl;
    this.prevBtn = prevBtn;
    this.nextBtn = nextBtn;
    this.autores = autores;
    this.onChange = onChange;
    this.index = 0;
    this.radius = 340;
    this.dragging = false;
    this.dragStartX = 0;
    this.dragBaseAngle = 0;

    this._buildSlides();
    this._buildIndicators();
    this._bindEvents();
    this._render();
  }

  _step() {
    return 360 / this.autores.length;
  }

  _buildSlides() {
    this.trackEl.innerHTML = "";
    this.slideEls = this.autores.map((autor, i) => {
      const el = document.createElement("div");
      el.className = "orbita-item";
      el.dataset.index = i;
      el.innerHTML = `
        <div class="foto-autor">
          <img alt="" />
          <span class="avatar-fallback"></span>
        </div>
        <span class="orbita-nome">${typeof sobrenomeAutor === "function" ? sobrenomeAutor(autor) : (autor.nome.split(" ").slice(1).join(" ") || autor.nome)}</span>
      `;
      el.addEventListener("click", () => {
        if (this.dragging) return;
        this.goTo(i);
      });
      this.trackEl.appendChild(el);
      AuthorPhoto.apply(el.querySelector("img"), autor);
      return el;
    });
  }

  _buildIndicators() {
    this.indicatorsEl.innerHTML = "";
    this.dotEls = this.autores.map((autor, i) => {
      const dot = document.createElement("button");
      dot.className = "indicador-dot";
      dot.setAttribute("aria-label", `Ver ${autor.nome}`);
      dot.addEventListener("click", () => this.goTo(i));
      this.indicatorsEl.appendChild(dot);
      return dot;
    });
  }

  _bindEvents() {
    this.prevBtn.addEventListener("click", () => this.prev());
    this.nextBtn.addEventListener("click", () => this.next());

    document.addEventListener("keydown", (e) => {
      if (!this._isInView()) return;
      if (e.key === "ArrowLeft") this.prev();
      if (e.key === "ArrowRight") this.next();
    });

    const onDown = (clientX) => {
      this.dragging = true;
      this.dragStartX = clientX;
      this.dragBaseAngle = -this.index * this._step();
      this.trackEl.classList.add("arrastando");
    };
    const onMove = (clientX) => {
      if (!this.dragging) return;
      const delta = clientX - this.dragStartX;
      const angle = this.dragBaseAngle - delta * 0.35;
      this.trackEl.style.transform = `rotateY(${angle}deg)`;
    };
    const onUp = (clientX) => {
      if (!this.dragging) return;
      this.dragging = false;
      this.trackEl.classList.remove("arrastando");
      const delta = clientX - this.dragStartX;
      if (Math.abs(delta) > 40) {
        delta > 0 ? this.prev() : this.next();
      } else {
        this._render();
      }
    };

    this.trackEl.addEventListener("mousedown", (e) => onDown(e.clientX));
    window.addEventListener("mousemove", (e) => onMove(e.clientX));
    window.addEventListener("mouseup", (e) => onUp(e.clientX));

    this.trackEl.addEventListener("touchstart", (e) => onDown(e.touches[0].clientX), { passive: true });
    this.trackEl.addEventListener("touchmove", (e) => onMove(e.touches[0].clientX), { passive: true });
    this.trackEl.addEventListener("touchend", (e) => onUp(e.changedTouches[0].clientX));
  }

  _isInView() {
    const rect = this.trackEl.getBoundingClientRect();
    return rect.top < window.innerHeight && rect.bottom > 0;
  }

  goTo(i) {
    const total = this.autores.length;
    if (!total) return;

    // Mantém um índice virtual crescente/decrescente. Assim, ao passar
    // do último autor para o primeiro (ou vice-versa), o carrossel não
    // precisa saltar visualmente para o começo: ele continua girando.
    const target = ((i % total) + total) % total;
    const current = ((this.index % total) + total) % total;
    let delta = target - current;

    // Ao clicar em uma bolinha/autor, escolhe o caminho mais curto sem
    // quebrar a continuidade visual do giro infinito.
    if (delta > total / 2) delta -= total;
    if (delta < -total / 2) delta += total;

    this.index += delta;
    this._render();
  }

  next() { this.index += 1; this._render(); }
  prev() { this.index -= 1; this._render(); }

  _render() {
    const total = this.autores.length;
    const step = this._step();
    const activeIndex = ((this.index % total) + total) % total;

    // O ângulo nunca volta para zero; ele continua acumulando a rotação.
    // Como 360° equivale a uma volta completa, a aparência permanece
    // idêntica a cada ciclo, mas a transição entre autores é contínua.
    this.trackEl.style.transform = `rotateY(${-this.index * step}deg)`;

    this.slideEls.forEach((el, i) => {
      const rel = ((i - activeIndex) % total + total) % total;
      const short = rel > total / 2 ? rel - total : rel;
      el.style.transform = `rotateY(${i * step}deg) translateZ(${this.radius}px)`;
      el.classList.toggle("ativo", short === 0);
      el.classList.toggle("vizinho", Math.abs(short) === 1);
      el.setAttribute("aria-hidden", short === 0 ? "false" : "true");
    });

    this.dotEls.forEach((d, i) => d.classList.toggle("ativo", i === activeIndex));

    if (this.onChange) this.onChange(this.autores[activeIndex], activeIndex);
  }
}
