
(function (root) {
  "use strict";

  function deveCarregar(o) {
    o = o || {};
    var id = String(o.id || "").trim();
    if (!id || !/^[A-Za-z0-9-]+$/.test(id)) return false;
    if (o.homologacao) return false;
    if (o.depuracao) return true;   // teste de instalação do próprio Google (endereço com gtm_debug)
    if (o.dono === "1" || o.dono === 1 || o.dono === true) return false;
    return String(o.src || "").indexOf("anuncio-") === 0;
  }

  function ehLinkWhatsApp(href) {
    href = String(href || "");
    return href.indexOf("wa.me/") !== -1 || href.indexOf("api.whatsapp.com") !== -1;
  }

  function ehContainer(id) { return String(id || "").indexOf("GTM-") === 0; }
  function urlEtiqueta(id) {
    id = String(id || "").trim();
    return "https://www.googletagmanager.com/" + (ehContainer(id) ? "gtm.js" : "gtag/js") + "?id=" + encodeURIComponent(id);
  }
  function destinoConversao(id, rotulo) {
    rotulo = String(rotulo || "").trim();
    if (!rotulo) return "";
    if (rotulo.indexOf("/") !== -1) return rotulo;
    return String(id || "").trim() + "/" + rotulo;
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { deveCarregar: deveCarregar, ehLinkWhatsApp: ehLinkWhatsApp, urlEtiqueta: urlEtiqueta, destinoConversao: destinoConversao, ehContainer: ehContainer };
  }
  if (typeof document === "undefined") return;

  function guardado(chave, storage) {
    try { return root[storage].getItem(chave); } catch (e) { return null; }
  }

  function origem() {
    try {
      if (root.VT && typeof root.VT.src === "function") return root.VT.src();
    } catch (e) {}
    try {
      var m = String(location.search || "").match(/[?&]src=([^&]*)/);
      if (m && m[1]) return decodeURIComponent(m[1]).toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 40);
    } catch (e) {}
    return guardado("vt_src", "sessionStorage") || "";
  }

  var CFG = root.VT_CONFIG || {};
  var A = CFG.anuncio || {};
  var id = String(A.id || "").trim();

  if (!deveCarregar({
    id: id, homologacao: CFG.homologacao === true,
    dono: guardado("vt_dono", "localStorage"), src: origem(),
    depuracao: /[?&]gtm_debug=/.test(String(location.search || ""))
  })) return;

  var s = document.createElement("script");
  s.async = true;
  s.src = urlEtiqueta(id);
  document.head.appendChild(s);

  root.dataLayer = root.dataLayer || [];
  function gtag() { root.dataLayer.push(arguments); }
  root.gtag = root.gtag || gtag;
  root.gtag("js", new Date());
  if (!ehContainer(id)) root.gtag("config", id);

  var destino = destinoConversao(id, A.rotulo_whatsapp);
  if (!destino) return;
  var enviada = false;
  document.addEventListener("click", function (ev) {
    if (enviada) return;
    try {
      var el = ev.target;
      while (el && el !== document) {
        if (el.tagName === "A" && ehLinkWhatsApp(el.getAttribute("href"))) {
          enviada = true;
          root.gtag("event", "conversion", { send_to: destino });
          return;
        }
        el = el.parentNode;
      }
    } catch (e) {}
  }, true);
})(typeof window !== "undefined" ? window : globalThis);
