
(function () {
  "use strict";
  var corpo = document.body;

  var ticking = false;
  function aplica() {
    ticking = false;
    var y = window.pageYOffset || document.documentElement.scrollTop || 0;
    corpo.classList.toggle("rolado", y > 24);
  }
  window.addEventListener("scroll", function () {
    if (!ticking) { ticking = true; window.requestAnimationFrame(aplica); }
  }, { passive: true });
  aplica();

  var cab = document.querySelector(".dir-topo");
  function mede() {
    if (!cab || corpo.classList.contains("rolado")) return;
    document.documentElement.style.setProperty("--topo-h", cab.offsetHeight + "px");
  }
  window.addEventListener("resize", mede);
  window.addEventListener("load", mede);
  if (window.ResizeObserver && cab) new ResizeObserver(mede).observe(cab);
  mede();

  var fades = document.querySelectorAll("[data-fade]");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("vista"); io.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    Array.prototype.forEach.call(fades, function (f) { io.observe(f); });
  } else {
    Array.prototype.forEach.call(fades, function (f) { f.classList.add("vista"); });
  }

  var st = document.querySelector(".dir-faixa [data-aberta]");
  function parte() {
    if (!st || st.children.length) return;
    var t = st.textContent || "";
    var i = t.search(/[,.]\s/);
    if (i < 1) return;
    var a = t.slice(0, i), b = t.slice(i + 1).trim();
    st.textContent = "";
    var s1 = document.createElement("span"); s1.className = "s1"; s1.textContent = a;
    var s2 = document.createElement("span"); s2.className = "s2"; s2.textContent = b;
    st.appendChild(s1); st.appendChild(s2);
  }
  if (st) {
    new MutationObserver(parte).observe(st, { childList: true });
    parte();
  }

  var topo = document.querySelector(".dir-topo");
  var botao = document.querySelector("button[data-menu]");
  function fecha() {
    if (!topo || !botao) return;
    topo.classList.remove("menu-aberto");
    botao.setAttribute("aria-expanded", "false");
  }
  Array.prototype.forEach.call(document.querySelectorAll("[data-fechar]"), function (b) {
    b.addEventListener("click", fecha);
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") fecha(); });
  Array.prototype.forEach.call(document.querySelectorAll(".dir-painel a"), function (a) {
    a.addEventListener("click", fecha);
  });
})();
