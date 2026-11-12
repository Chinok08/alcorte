// Página de inicio de Al Corte: carrusel 3D, número que cuenta, teléfono que flota,
// secciones que aparecen y corazones al donar. Con "Reducir movimiento" todo queda quieto.
(() => {
  "use strict";
  const reducir = matchMedia("(prefers-reduced-motion: reduce)");
  const quieto = () => reducir.matches;

  /* ---------- Barra con borde al bajar ---------- */
  const barra = document.querySelector(".barra");
  const marcarBarra = () => barra && barra.classList.toggle("con-borde", scrollY > 8);
  addEventListener("scroll", marcarBarra, { passive: true });
  marcarBarra();

  /* ---------- Donaciones ----------
     La sección y el enlace "Apoya" solo aparecen cuando las tres ligas de
     Mercado Pago están puestas. Con ?vista-previa se ven para revisarlas. */
  const ligas = [...document.querySelectorAll("[data-liga]")];
  const ligasListas = ligas.length > 0 && ligas.every(a => /^https:\/\//.test(a.getAttribute("href") || ""));
  if (ligasListas || new URLSearchParams(location.search).has("vista-previa")) {
    document.querySelectorAll("[data-solo-con-ligas]").forEach(el => { el.hidden = false; });
  }
  ligas.forEach(a => a.addEventListener("click", e => {
    if (!ligasListas) e.preventDefault();
    if (quieto()) return;
    for (let k = 0; k < 3; k++) {
      const c = document.createElement("span");
      c.className = "chispa";
      c.textContent = "♥";
      c.setAttribute("aria-hidden", "true");
      c.style.setProperty("--dx", (k - 1) * 22 + "px");
      c.style.animationDelay = k * 90 + "ms";
      a.appendChild(c);
      setTimeout(() => c.remove(), 1300);
    }
  }));

  /* ---------- Número que cuenta ---------- */
  function contar(el, duracion, retraso) {
    const fin = Number(el.dataset.contar);
    const signo = el.dataset.signo || "";
    const conCentavos = el.hasAttribute("data-centavos");
    const pintar = v => {
      el.textContent = signo + "$" + Math.round(v).toLocaleString("es-MX");
      if (conCentavos) {
        const c = document.createElement("span");
        c.className = "centavos";
        c.textContent = ".00";
        el.appendChild(c);
      }
    };
    if (quieto()) { pintar(fin); return; }
    pintar(0);
    const t0 = performance.now() + retraso;
    const paso = t => {
      const p = Math.min(Math.max((t - t0) / duracion, 0), 1);
      pintar(fin * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
  }
  const cuenta = document.querySelector(".cuenta");
  const arrancarCuenta = () => {
    cuenta.querySelectorAll(".termino [data-contar]").forEach(el => contar(el, 1200, 0));
    cuenta.querySelectorAll(".resultado [data-contar]").forEach(el => contar(el, 1500, 450));
  };

  /* ---------- Secciones que aparecen ---------- */
  const revelables = document.querySelectorAll(".revelar");
  const alAparecer = el => { if (el === cuenta) arrancarCuenta(); };
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(entradas => {
      entradas.forEach(en => {
        if (!en.isIntersecting) return;
        en.target.classList.add("visible");
        io.unobserve(en.target);
        alAparecer(en.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -5% 0px" });
    revelables.forEach(el => io.observe(el));
  } else {
    revelables.forEach(el => el.classList.add("visible"));
  }

  /* ---------- Teléfono que se inclina ---------- */
  const tel = document.getElementById("telefono");
  const inclinar = (rx, ry) => { tel.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`; };
  const limitar = v => Math.max(-1, Math.min(1, v));
  if (tel && matchMedia("(hover: hover) and (pointer: fine)").matches) {
    let pendiente = false, rx = 0, ry = 0;
    addEventListener("pointermove", e => {
      if (quieto()) return;
      const r = tel.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;
      ry = limitar((e.clientX - (r.left + r.width / 2)) / (innerWidth / 2)) * 14;
      rx = limitar((e.clientY - (r.top + r.height / 2)) / (innerHeight / 2)) * -10;
      if (pendiente) return;
      pendiente = true;
      requestAnimationFrame(() => { inclinar(rx, ry); pendiente = false; });
    }, { passive: true });
    document.documentElement.addEventListener("pointerleave", () => { tel.style.transform = ""; });
  } else if (tel && "DeviceOrientationEvent" in window && typeof DeviceOrientationEvent.requestPermission !== "function") {
    // Android: sigue el giro del teléfono. En iPhone esto pide permiso, así que ahí solo flota.
    addEventListener("deviceorientation", e => {
      if (quieto() || e.gamma == null || e.beta == null) return;
      inclinar(limitar((e.beta - 45) / 30) * -8, limitar(e.gamma / 30) * 10);
    }, { passive: true });
  }

  /* ---------- Carrusel 3D ---------- */
  const carrusel = document.getElementById("carrusel");
  if (!carrusel) return;
  const tomas = [...carrusel.querySelectorAll(".toma")];
  const n = tomas.length;
  const leyenda = document.getElementById("leyenda");
  const tituloLeyenda = leyenda.querySelector("b");
  const detalleLeyenda = leyenda.querySelector("span");
  const puntos = document.getElementById("puntos");
  let actual = 0, temporizador = null, visible = false, encima = false, enfocado = false, timerLeyenda = null;

  tomas.forEach((t, i) => {
    t.setAttribute("role", "group");
    t.setAttribute("aria-roledescription", "captura");
    t.setAttribute("aria-label", `${i + 1} de ${n}: ${t.dataset.titulo}`);
  });
  const botones = tomas.map((t, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.setAttribute("aria-label", `Ver captura ${i + 1} de ${n}: ${t.dataset.titulo}`);
    b.addEventListener("click", () => { ir(i); manual(); });
    puntos.appendChild(b);
    return b;
  });

  function cambiarLeyenda(titulo, detalle) {
    if (tituloLeyenda.textContent === titulo) return;
    const poner = () => {
      tituloLeyenda.textContent = titulo;
      detalleLeyenda.textContent = detalle;
      leyenda.classList.remove("cambiando");
    };
    clearTimeout(timerLeyenda);
    if (quieto()) { poner(); return; }
    leyenda.classList.add("cambiando");
    timerLeyenda = setTimeout(poner, 200);
  }

  function pintar() {
    tomas.forEach((t, i) => {
      let o = i - actual;
      if (o > n / 2) o -= n;
      if (o < -n / 2) o += n;
      const a = Math.abs(o);
      t.style.transform = `translateX(${o * 62}%) translateZ(${-a * 40}px) rotateY(${-o * 28}deg) scale(${1 - Math.min(a, 3) * 0.13})`;
      t.style.zIndex = String(20 - a);
      t.style.opacity = a > 2 ? "0" : String(1 - a * 0.18);
      t.style.filter = a ? `brightness(${1 - a * 0.07}) saturate(${1 - a * 0.15})` : "none";
      t.style.pointerEvents = a > 2 ? "none" : "";
      t.classList.toggle("actual", a === 0);
      t.setAttribute("aria-hidden", a === 0 ? "false" : "true");
    });
    botones.forEach((b, i) => b.setAttribute("aria-current", i === actual ? "true" : "false"));
    cambiarLeyenda(tomas[actual].dataset.titulo, tomas[actual].dataset.detalle);
  }
  const ir = i => { actual = ((i % n) + n) % n; pintar(); };

  // Avanza sola mientras se ve, sin el mouse encima y sin foco dentro.
  const puedeAvanzar = () => visible && !encima && !enfocado && !document.hidden && !quieto();
  function reiniciar() {
    clearInterval(temporizador);
    temporizador = setInterval(() => { if (puedeAvanzar()) ir(actual + 1); }, 3400);
  }
  // Cuando alguien lo mueve, la leyenda se anuncia a lectores de pantalla.
  function manual() { leyenda.setAttribute("aria-live", "polite"); reiniciar(); }

  document.getElementById("anterior").addEventListener("click", () => { ir(actual - 1); manual(); });
  document.getElementById("siguiente").addEventListener("click", () => { ir(actual + 1); manual(); });
  carrusel.addEventListener("keydown", e => {
    if (e.key === "ArrowLeft") { ir(actual - 1); manual(); e.preventDefault(); }
    if (e.key === "ArrowRight") { ir(actual + 1); manual(); e.preventDefault(); }
  });
  carrusel.addEventListener("mouseenter", () => { encima = true; });
  carrusel.addEventListener("mouseleave", () => { encima = false; });
  carrusel.addEventListener("focusin", () => { enfocado = true; });
  carrusel.addEventListener("focusout", () => { enfocado = false; });
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([en]) => { visible = en.isIntersecting; }, { threshold: 0.4 }).observe(carrusel);
  } else {
    visible = true;
  }

  // Arrastrar con el dedo o el mouse; un arrastre largo salta varias capturas.
  let x0 = null, y0 = 0, movido = false, puntero = null;
  carrusel.addEventListener("pointerdown", e => {
    if (e.button !== 0) return;
    x0 = e.clientX; y0 = e.clientY; movido = false; puntero = e.pointerId;
  });
  carrusel.addEventListener("pointermove", e => {
    if (x0 === null || e.pointerId !== puntero || movido) return;
    const dx = e.clientX - x0;
    if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(e.clientY - y0)) {
      movido = true;
      carrusel.classList.add("arrastrando");
      try { carrusel.setPointerCapture(puntero); } catch (_) { /* sin captura no pasa nada */ }
    }
  });
  carrusel.addEventListener("pointerup", e => {
    if (x0 === null) return;
    const dx = e.clientX - x0;
    if (movido && Math.abs(dx) > 40) {
      const ancho = tomas[0].getBoundingClientRect().width || 200;
      const pasos = Math.max(1, Math.round(Math.abs(dx) / (ancho * 0.6)));
      ir(actual + (dx < 0 ? pasos : -pasos));
      manual();
    }
    x0 = null;
    carrusel.classList.remove("arrastrando");
    setTimeout(() => { movido = false; }, 0);
  });
  carrusel.addEventListener("pointercancel", () => { x0 = null; movido = false; carrusel.classList.remove("arrastrando"); });

  // Tocar una captura de un lado la trae al centro.
  tomas.forEach((t, i) => t.addEventListener("click", () => {
    if (movido || i === actual) return;
    ir(i); manual();
  }));

  // Trackpad: deslizar de lado con dos dedos.
  let acumulado = 0, ultimoSalto = 0;
  carrusel.addEventListener("wheel", e => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    e.preventDefault();
    acumulado += e.deltaX;
    const ahora = performance.now();
    if (Math.abs(acumulado) > 60 && ahora - ultimoSalto > 450) {
      ir(actual + (acumulado > 0 ? 1 : -1));
      manual();
      acumulado = 0;
      ultimoSalto = ahora;
    }
  }, { passive: false });

  pintar();
  reiniciar();
})();
