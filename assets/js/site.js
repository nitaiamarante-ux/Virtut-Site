
(function (root) {
  "use strict";

  function sanitiza(v) {
    return String(v || "").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 40);
  }

  function param(search, nome) {
    var s = String(search || "").replace(/^\?/, "");
    if (!s) return null;
    var partes = s.split("&");
    for (var i = 0; i < partes.length; i++) {
      var kv = partes[i].split("=");
      var k;
      try { k = decodeURIComponent(kv[0]); } catch (e) { k = kv[0]; }
      if (k === nome) {
        var v = kv.slice(1).join("=");
        try { v = decodeURIComponent(v.replace(/\+/g, " ")); } catch (e) {}
        return v;
      }
    }
    return null;
  }

  function hostDe(url) {
    if (!url) return "";
    var m = String(url).match(/^[a-z][a-z0-9+.-]*:\/\/([^\/?#:]+)/i);
    return m ? m[1].toLowerCase() : "";
  }

  function origemDe(o) {
    o = o || {};
    var src = param(o.search, "src");
    if (src !== null && src !== "") {
      var s = sanitiza(src);
      if (s) return s;
    }
    if (o.guardada) return o.guardada;

    var utm = param(o.search, "utm_source");
    if (utm) {
      var u = String(utm).toLowerCase();
      if (u === "chatgpt.com" || u.indexOf("chatgpt") === 0) return "ia-chatgpt";
      if (u.indexOf("perplexity") === 0) return "ia-perplexity";
      if (u.indexOf("copilot") === 0) return "ia-copilot";
      if (u.indexOf("gemini") === 0) return "ia-gemini";
      var su = sanitiza(u);
      if (su) return su;
    }

    var h = hostDe(o.referrer);
    if (h) {
      var meu = String(o.host || "").toLowerCase();
      if (meu && h === meu) {  }
      else {
        var eh = function (d) { return h === d || h.slice(-(d.length + 1)) === "." + d; };
        if (eh("gemini.google.com")) return "ia-gemini";
        if (eh("chatgpt.com") || eh("chat.openai.com")) return "ia-chatgpt";
        if (eh("perplexity.ai")) return "ia-perplexity";
        if (eh("copilot.microsoft.com")) return "ia-copilot";
        if (h.indexOf("google.") !== -1) return "busca-google";
        if (h.indexOf("bing.") !== -1) return "busca-bing";
        if (eh("instagram.com")) return "instagram";
      }
    }
    return "direto";
  }

  function marcaOrigem(src) {
    src = String(src || "");
    if (src === "gbp") return " (vi no Google)";
    if (src.indexOf("anuncio-") === 0) return " (vi no anúncio)";
    if (src === "instagram") return " (vi no Instagram)";
    return "";
  }

  function linkWhatsApp(numero, mensagem, src) {
    return "https://wa.me/" + numero + "?text=" + encodeURIComponent(String(mensagem) + marcaOrigem(src));
  }

  function mensagemAviso(peca, tamanho, ocasiao) {
    peca = String(peca || "").trim();
    tamanho = String(tamanho || "").trim();
    ocasiao = String(ocasiao || "").trim();
    if (!peca) return null;
    var t = "Olá Cláudia, procuro " + peca;
    if (tamanho) t += ", tamanho " + tamanho;
    if (ocasiao) t += ", para " + ocasiao;
    return t + ". Me avisa quando chegar?";
  }

  var HORARIO_PADRAO = {
    0: [],
    1: [["09:00", "19:00"]], 2: [["09:00", "19:00"]], 3: [["09:00", "19:00"]],
    4: [["09:00", "19:00"]], 5: [["09:00", "19:00"]],
    6: [["09:00", "14:00"]]
  };
  var DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

  function minDe(hhmm) { var p = hhmm.split(":"); return (+p[0]) * 60 + (+p[1]); }
  function fmtHora(hhmm) {
    var p = hhmm.split(":"), h = +p[0], m = +p[1];
    return m === 0 ? h + "h" : h + "h" + (m < 10 ? "0" + m : m);
  }
  function somaDia(data, n) {
    var p = data.split("-");
    var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + n));
    return d.toISOString().slice(0, 10);
  }
  function faixasDoDia(data, dow, horario, especiais) {
    var esp = (especiais || []).filter(function (e) { return e.data === data; })[0];
    if (esp) {
      if (esp.fechado) return { faixas: [], feriado: true };
      if (esp.abre && esp.fecha) return { faixas: [[esp.abre, esp.fecha]], feriado: false };
    }
    return { faixas: (horario && horario[dow]) || [], feriado: false };
  }

  function estadoLoja(agora, horario, especiais) {
    horario = horario || HORARIO_PADRAO;
    var hoje = faixasDoDia(agora.data, agora.diaSemana, horario, especiais);
    for (var i = 0; i < hoje.faixas.length; i++) {
      var a = minDe(hoje.faixas[i][0]), f = minDe(hoje.faixas[i][1]);
      if (agora.minutos >= a && agora.minutos < f) {
        return { aberta: true, texto: "Aberta agora, fecha às " + fmtHora(hoje.faixas[i][1]) };
      }
    }
    for (var j = 0; j < hoje.faixas.length; j++) {
      if (agora.minutos < minDe(hoje.faixas[j][0])) {
        return { aberta: false, texto: "Fechada agora. Abre hoje às " + fmtHora(hoje.faixas[j][0]) };
      }
    }
    for (var n = 1; n <= 14; n++) {
      var data = somaDia(agora.data, n);
      var dow = (agora.diaSemana + n) % 7;
      var d = faixasDoDia(data, dow, horario, especiais);
      if (d.faixas.length) {
        var quando = n === 1 ? "amanhã" : DIAS[dow];
        var pre = hoje.feriado ? "Fechada hoje (feriado)." : "Fechada agora.";
        return { aberta: false, texto: pre + " Abre " + quando + " às " + fmtHora(d.faixas[0][0]) };
      }
    }
    return { aberta: false, texto: hoje.feriado ? "Fechada hoje (feriado)." : "Fechada agora." };
  }

  function agoraSP(d) {
    d = d || new Date();
    var partes = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23", weekday: "short"
    }).formatToParts(d);
    var o = {};
    partes.forEach(function (p) { o[p.type] = p.value; });
    var mapa = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return {
      data: o.year + "-" + o.month + "-" + o.day,
      diaSemana: mapa[o.weekday],
      minutos: (+o.hour) * 60 + (+o.minute)
    };
  }

  function raizDe(hostname, pathname) {
    if (/github\.io$/i.test(hostname || "")) {
      var seg = String(pathname || "/").split("/").filter(Boolean)[0];
      return seg ? "/" + seg + "/" : "/";
    }
    return "/";
  }

  function pctRolagem(y, vh, h) {
    y = +y || 0; vh = +vh || 0; h = +h || 0;
    if (h <= 0) return 0;
    return Math.max(0, Math.min(100, Math.round((y + vh) / h * 100)));
  }
  function marcosAlcancados(pct, jaEnviados) {
    var out = [];
    [50, 90].forEach(function (m) {
      if (pct >= m && (jaEnviados || []).indexOf(String(m)) === -1) out.push(String(m));
    });
    return out;
  }
  function blocoVisto(ratio, interAltura, vh) {
    return (+ratio >= 0.5) || (+vh > 0 && +interAltura >= 0.5 * +vh);
  }

  var puras = {
    pctRolagem: pctRolagem, marcosAlcancados: marcosAlcancados, blocoVisto: blocoVisto,
    origemDe: origemDe, marcaOrigem: marcaOrigem, linkWhatsApp: linkWhatsApp,
    estadoLoja: estadoLoja, mensagemAviso: mensagemAviso, raizDe: raizDe,
    agoraSP: agoraSP, HORARIO_PADRAO: HORARIO_PADRAO, sanitiza: sanitiza
  };

  if (typeof module !== "undefined" && module.exports) { module.exports = puras; }
  if (typeof document === "undefined") return;

  var CFG = root.VT_CONFIG || { whatsapp: "5531992944070", medicao: { ligada: false }, homologacao: true };
  var VT = root.VT = {};
  VT.raiz = function () { return raizDe(location.hostname, location.pathname); };
  for (var k in puras) VT[k] = puras[k];

  function guardado(chave, storage) {
    try { return root[storage].getItem(chave); } catch (e) { return null; }
  }
  function guarda(chave, valor, storage) {
    try { root[storage].setItem(chave, valor); } catch (e) {}
  }

  var SRC = origemDe({
    search: location.search, referrer: document.referrer, host: location.hostname,
    guardada: guardado("vt_src", "sessionStorage")
  });
  guarda("vt_src", SRC, "sessionStorage");
  VT.src = function () { return SRC; };

  function vid() {
    var v = guardado("vt_vid", "localStorage");
    if (v) return v;
    v = Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    guarda("vt_vid", v, "localStorage");
    return v;
  }

  function track(tipo, extra) {
    try {
      var m = CFG.medicao;
      if (!m || m.ligada !== true) return;
      if (guardado("vt_dono", "localStorage") === "1") return;
      var pagina = (document.body && document.body.dataset && document.body.dataset.pagina) || "";
      var p = {
        tipo: tipo, posicao: pagina + "|" + SRC, site: "virtut",
        pagina: pagina, src: SRC, vid: vid(), teste: CFG.homologacao === true
      };
      if (extra && typeof extra === "object") for (var e in extra) if (!(e in p)) p[e] = extra[e];
      var corpo = JSON.stringify(p);
      var ok = false;
      if (navigator.sendBeacon) {
        ok = navigator.sendBeacon(m.endpoint, new Blob([corpo], { type: "text/plain" }));
      }
      if (!ok && root.fetch) {
        root.fetch(m.endpoint, {
          method: "POST", body: corpo, keepalive: true,
          headers: { "Content-Type": "text/plain" }
        }).catch(function () {});
      }
    } catch (e) {}
  }
  VT.track = track;


  function iniciar() {
    var raiz = VT.raiz();

    Array.prototype.forEach.call(document.querySelectorAll("[data-raiz-href]"), function (el) {
      el.setAttribute("href", raiz + el.getAttribute("data-raiz-href"));
    });

    Array.prototype.forEach.call(document.querySelectorAll("a[data-wa]"), function (a) {
      a.setAttribute("href", linkWhatsApp(CFG.whatsapp, a.getAttribute("data-wa"), SRC));
      a.addEventListener("click", function () { track(a.getAttribute("data-evento") || "vt_whatsapp"); });
    });
    [["a[data-rota]", "vt_rota"], ["a[data-instagram]", "vt_instagram"], ["a[data-avaliar]", "vt_avaliar"]]
      .forEach(function (par) {
        Array.prototype.forEach.call(document.querySelectorAll(par[0]), function (a) {
          a.addEventListener("click", function () { track(par[1]); });
        });
      });

    Array.prototype.forEach.call(document.querySelectorAll("form[data-aviso]"), function (f) {
      f.addEventListener("submit", function (ev) {
        ev.preventDefault();
        var v = function (n) { return f.elements[n] ? f.elements[n].value : ""; };
        var msg = mensagemAviso(v("peca"), v("tamanho"), v("ocasiao"));
        if (!msg) {
          if (f.elements.peca && f.elements.peca.focus) f.elements.peca.focus();
          return;
        }
        track("vt_aviso");
        location.href = linkWhatsApp(CFG.whatsapp, msg, SRC);
      });
    });

    var alvos = document.querySelectorAll("[data-aberta]");
    if (alvos.length) {
      var aplica = function (horario, especiais) {
        var est = estadoLoja(agoraSP(), horario, especiais);
        Array.prototype.forEach.call(alvos, function (el) {
          el.textContent = est.texto;
          el.classList.remove("is-aberta", "is-fechada");
          el.classList.add(est.aberta ? "is-aberta" : "is-fechada");
        });
      };
      aplica(HORARIO_PADRAO, []);
      if (root.fetch) {
        root.fetch(raiz + "dados.json", { cache: "no-cache" })
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (d) { if (d && d.horario) aplica(d.horario, d.especiais || []); })
          .catch(function () {});
      }
    }

    Array.prototype.forEach.call(document.querySelectorAll("button[data-menu]"), function (b) {
      b.addEventListener("click", function () {
        var aberto = b.getAttribute("aria-expanded") === "true";
        b.setAttribute("aria-expanded", aberto ? "false" : "true");
        var h = b.closest("header");
        if (h) h.classList.toggle("menu-aberto", !aberto);
      });
    });

    Array.prototype.forEach.call(document.querySelectorAll("[data-video-src]"), function (el) {
      el.addEventListener("click", function () {
        if (el.getAttribute("data-carregado")) return;
        el.setAttribute("data-carregado", "1");
        var ifr = document.createElement("iframe");
        ifr.src = el.getAttribute("data-video-src");
        ifr.setAttribute("allow", "autoplay; encrypted-media; picture-in-picture; fullscreen");
        ifr.setAttribute("allowfullscreen", "");
        ifr.setAttribute("title", el.getAttribute("data-video-titulo") || "Vídeo");
        ifr.style.cssText = "width:100%;height:100%;border:0;aspect-ratio:16/9";
        while (el.firstChild) el.removeChild(el.firstChild);
        el.appendChild(ifr);
      });
    });

    track("vt_visita");

    var enviados = [];
    var rolando = false;
    var aoRolar = function () {
      if (rolando) return;
      rolando = true;
      var quadro = root.requestAnimationFrame || function (f) { return setTimeout(f, 100); };
      quadro(function () {
        rolando = false;
        var de = document.documentElement;
        var pct = pctRolagem(root.pageYOffset || de.scrollTop || 0, root.innerHeight || de.clientHeight || 0,
          Math.max(de.scrollHeight || 0, document.body ? document.body.scrollHeight : 0));
        marcosAlcancados(pct, enviados).forEach(function (m) {
          enviados.push(m);
          track("vt_rolagem", { marco: m });
        });
        if (enviados.length >= 2) root.removeEventListener("scroll", aoRolar);
      });
    };
    root.addEventListener("scroll", aoRolar, { passive: true });

    if (root.IntersectionObserver) {
      var secoes = document.querySelectorAll("main section[id]");
      if (secoes.length) {
        var vistos = {};
        var limiares = [];
        for (var q = 0; q <= 20; q++) limiares.push(q / 20);
        var obs = new root.IntersectionObserver(function (entradas) {
          entradas.forEach(function (en) {
            var id = en.target.id;
            if (!id || vistos[id]) return;
            if (blocoVisto(en.intersectionRatio, en.intersectionRect ? en.intersectionRect.height : 0, root.innerHeight || 0)) {
              vistos[id] = true;
              obs.unobserve(en.target);
              track("vt_bloco", { bloco: sanitiza(id) });
            }
          });
        }, { threshold: limiares });
        Array.prototype.forEach.call(secoes, function (el) { obs.observe(el); });
      }
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})(typeof window !== "undefined" ? window : globalThis);


(function () {
  if (typeof document === "undefined") return;
  var b = document.body, cab = document.querySelector("header.topo");
  if (!b || !b.classList.contains("topo-unico") || !cab) return;
  function mede() { if (!b.classList.contains("rolado")) document.documentElement.style.setProperty("--topo-unico-h", cab.offsetHeight + "px"); }
  function rola() { var y = window.scrollY || 0; if (y > 160) b.classList.add("rolado"); else if (y < 6) b.classList.remove("rolado"); }
  rola(); mede();
  window.addEventListener("scroll", rola, { passive: true });
  window.addEventListener("resize", mede);
  window.addEventListener("load", mede);
})();
