/* Vale-presente Virtut, modelo B, em Canvas 2D (26/10/2026). FONTE UNICA do desenho.
 * Usado por tools/vale_presente/gerar.py (via render.html, Chrome headless) e pela pagina da Claudia (celular).
 * JS puro, sem dependencia. Script classico (nao modulo) pra abrir tambem por file://.
 * API: ValeB.desenharValeB(canvas, dados, recursos), ValeB.recursosPadrao(base), ValeB.legendaWhatsApp, ValeB.linkWhats
 * dados = {valor_txt, para, de, mensagem, codigo, validade_frase, horario}   (valor_txt vazio = coringa)
 */
(function (root) {
  'use strict';
  var W = 1080, H = 1350;
  var C = { vinho: '#924A55', esc: '#7A3B46', creme: '#FBF8F4', ouro: '#E0BF96', texto: '#343232',
            suave: '#5F5A59', bg: '#EEECED', areia: '#F3E8DA' };
  var TENOR = "'Tenor Sans'", WORK = "'Work Sans'";
  var WHATS = '5531992944070';
  var WA_PATH = 'M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7.5-.1 1.5-.6 1.7-1.2s.2-1.1.2-1.2-.2-.2-.4-.3z';
  var LOGO_R = 431.947 / 179.703;

  /* ---------- textos (iguais a gerar.py) ---------- */
  function pyQuote(s) { // urllib.parse.quote
    return encodeURIComponent(s).replace(/[!'()*]/g, function (c) { return '%' + c.charCodeAt(0).toString(16).toUpperCase(); });
  }
  function linkWhats(codigo, para) {
    var quem = para ? 'Sou a ' + para + ', ganhei' : 'Ganhei';
    var txt = 'Olá, Cláudia! ' + quem + ' o vale-presente ' + codigo + ' da Virtut e quero combinar minha visita.';
    return 'https://wa.me/' + WHATS + '?text=' + pyQuote(txt);
  }
  function legendaWhatsApp(d, link) {
    var para = d.para ? ' para ' + d.para : '';
    return 'Vale-presente da Virtut' + para + ' 🎁\n\n' +
      'Pra combinar sua visita ou marcar a consultoria de imagem com a Cláudia, é só tocar aqui:\n' + link + '\n';
  }
  function regrasTxt(d) {
    var valor = d.valor_txt ? ', ' + d.valor_txt : '';
    return 'Vale ' + d.codigo + valor + ', ' + d.validade_frase.toLowerCase() + '. Roupas, acessórios e consultoria de imagem. ' +
      'Passou do valor, paga a diferença; sobrou, vira crédito na loja. Não é trocado por dinheiro.';
  }

  /* ---------- recursos ---------- */
  var FAIXA_LATIN = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
  var FAIXA_EXT = 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF';
  function recursosPadrao(base) {
    base = base || '';
    return {
      fontes: [
        { familia: 'Tenor Sans', url: base + 'fontes/tenorsans-latin.woff2', peso: '400', faixa: FAIXA_LATIN },
        { familia: 'Tenor Sans', url: base + 'fontes/tenorsans-latin-ext.woff2', peso: '400', faixa: FAIXA_EXT },
        { familia: 'Work Sans', url: base + 'fontes/worksans-latin.woff2', peso: '100 900', faixa: FAIXA_LATIN },
        { familia: 'Work Sans', url: base + 'fontes/worksans-latin-ext.woff2', peso: '100 900', faixa: FAIXA_EXT }
      ],
      logoPreto: base + 'logos/virtut_logo_preto.svg',
      logoBranco: base + 'logos/virtut_logo_branco.svg'
    };
  }
  function carregarImg(url) {
    return new Promise(function (ok, erro) {
      var im = new Image();
      im.onload = function () { ok(im); };
      im.onerror = function () { erro(new Error('logo nao carregou: ' + url)); };
      im.src = url;
    });
  }
  async function carregarRecursos(r) {
    await Promise.all(r.fontes.map(async function (f) {
      var ff = new FontFace(f.familia, 'url(' + f.url + ')', { weight: f.peso, unicodeRange: f.faixa });
      await ff.load();
      document.fonts.add(ff);
    }));
    var logos = await Promise.all([carregarImg(r.logoPreto), carregarImg(r.logoBranco)]);
    return { preto: logos[0], branco: logos[1] };
  }

  /* ---------- helpers de texto ---------- */
  var cx; // contexto corrente
  function fnt(peso, tam, fam, italico) { return (italico ? 'italic ' : '') + peso + ' ' + tam + 'px ' + fam + ', sans-serif'; }
  function metr(font) {
    cx.font = font;
    var m = cx.measureText('Hgé'), tam = parseFloat(font.match(/([\d.]+)px/)[1]);
    var a = m.fontBoundingBoxAscent, d = m.fontBoundingBoxDescent;
    if (a === undefined) { a = tam * 0.95; d = tam * 0.25; }
    return { a: a, d: d, normal: a + d };
  }
  function larg(font, t, ls) {
    cx.font = font;
    if (!ls) return cx.measureText(t).width;
    var w = 0; for (var i = 0; i < t.length; i++) w += cx.measureText(t[i]).width + ls;
    return w; // como o CSS: espaco depois de cada letra, inclusive a ultima
  }
  function baseline(top, lh, font) { var m = metr(font); return top + ((lh || m.normal) - m.normal) / 2 + m.a; }
  function escreve(t, x, y, font, cor, ls) {
    cx.font = font; cx.fillStyle = cor; cx.textAlign = 'left'; cx.textBaseline = 'alphabetic';
    if (!ls) { cx.fillText(t, x, y); return; }
    for (var i = 0; i < t.length; i++) { cx.fillText(t[i], x, y); x += cx.measureText(t[i]).width + ls; }
  }
  // sequencia de trechos [{t,font,cor,ls}] centrada em xc
  function runsLargura(runs) { return runs.reduce(function (s, r) { return s + larg(r.font, r.t, r.ls); }, 0); }
  function runsCentro(runs, xc, y) {
    var x = xc - runsLargura(runs) / 2;
    runs.forEach(function (r) { escreve(r.t, x, y, r.font, r.cor, r.ls); x += larg(r.font, r.t, r.ls); });
  }
  function quebra(font, texto, maxW) {
    var pal = texto.split(/\s+/).filter(Boolean), linhas = [], at = '';
    pal.forEach(function (p) {
      var t = at ? at + ' ' + p : p;
      if (at && larg(font, t) > maxW) { linhas.push(at); at = p; } else at = t;
    });
    if (at) linhas.push(at);
    return linhas;
  }
  // bloco centrado de linhas; devolve altura
  function bloco(linhas, xc, top, lh, font, cor) {
    linhas.forEach(function (l, i) {
      var w = larg(font, l);
      escreve(l, xc - w / 2, baseline(top + i * lh, lh, font), font, cor);
    });
    return linhas.length * lh;
  }
  function rr(x, y, w, h, r) {
    cx.beginPath(); cx.moveTo(x + r, y); cx.lineTo(x + w - r, y); cx.arcTo(x + w, y, x + w, y + r, r);
    cx.lineTo(x + w, y + h - r); cx.arcTo(x + w, y + h, x + w - r, y + h, r); cx.lineTo(x + r, y + h);
    cx.arcTo(x, y + h, x, y + h - r, r); cx.lineTo(x, y + r); cx.arcTo(x, y, x + r, y, r); cx.closePath();
  }
  function sombra(cor, blur, dy) { cx.shadowColor = cor; cx.shadowBlur = blur; cx.shadowOffsetX = 0; cx.shadowOffsetY = dy; }
  function semSombra() { cx.shadowColor = 'rgba(0,0,0,0)'; cx.shadowBlur = 0; cx.shadowOffsetY = 0; }

  /* ---------- desenho ---------- */
  async function desenharValeB(canvas, d, recursos) {
    var img = await carregarRecursos(recursos);
    canvas.width = W; canvas.height = H;
    cx = canvas.getContext('2d');
    var XC = 540, CW = 718; // centro e largura util do cartao
    var coringa = !d.valor_txt;

    cx.fillStyle = C.bg; cx.fillRect(0, 0, W, H);

    // papel vinho girado -1,8 graus
    cx.save(); cx.translate(96 + 450, 44 + 635); cx.rotate(-1.8 * Math.PI / 180);
    sombra('rgba(52,50,50,.22)', 60, 30); cx.fillStyle = C.esc; rr(-450, -635, 900, 1270, 8); cx.fill(); cx.restore();
    semSombra();
    // cartao creme
    sombra('rgba(52,50,50,.16)', 26, 10); cx.fillStyle = C.creme; rr(90, 50, 900, 1250, 6); cx.fill(); semSombra();
    // moldura dupla
    cx.lineWidth = 1; cx.strokeStyle = C.ouro; cx.strokeRect(116.5, 76.5, 847, 1197);
    cx.strokeStyle = 'rgba(224,191,150,.6)'; cx.strokeRect(125.5, 85.5, 829, 1179);

    // logo
    var logoW = 160, logoH = logoW / LOGO_R, y = 137;
    cx.drawImage(img.preto, XC - logoW / 2, y, logoW, logoH); y += logoH;

    // Vale-presente (maior texto)
    y += 28; var fVp = fnt(400, 96, TENOR), lhVp = 96 * 1.02;
    var wVp = larg(fVp, 'Vale-presente');
    escreve('Vale-presente', XC - wVp / 2, baseline(y, lhVp, fVp), fVp, C.vinho); y += lhVp;

    // nome, encolhe ate caber (igual ao data-cabe)
    y += 12; var s = 40, nome = d.para ? 'para ' + d.para : 'um presente pra você';
    while (larg(fnt(400, s, TENOR), nome) > CW && s > 24) s -= 2;
    var fNome = fnt(400, s, TENOR), lhNome = s * 1.1, wN = larg(fNome, nome);
    escreve(nome, XC - wN / 2, baseline(y, lhNome, fNome), fNome, C.texto); y += lhNome;

    // mensagem
    y += 18; var fMsg = fnt(300, 25, WORK, true);
    var msg = d.mensagem ? '“' + d.mensagem + '”' : 'Para roupas, acessórios ou a consultoria de imagem, do jeito que você escolher.';
    y += bloco(quebra(fMsg, msg, 640), XC, y, 25 * 1.42, fMsg, C.suave);

    // de
    if (d.de) {
      y += 8; var fDe = fnt(400, 21, WORK), fDeB = fnt(500, 21, WORK), mDe = metr(fDe);
      runsCentro([{ t: 'com carinho, ', font: fDe, cor: C.suave }, { t: d.de, font: fDeB, cor: C.texto }], XC, y + mDe.a);
      y += mDe.normal;
    }

    // selo + codigo
    y += 40; var linhaTop = y, cy = linhaTop + 100;
    var fL = fnt(400, 14, WORK), lsL = 14 * 0.26, fC = fnt(600, 32, WORK), lsC = 32 * 0.07, fV = fnt(400, 18, WORK);
    var wBloco = Math.max(larg(fL, 'CÓDIGO', lsL), larg(fC, d.codigo, lsC), larg(fV, d.validade_frase));
    var mL = metr(fL), mC = metr(fC), mV = metr(fV);
    var hBloco = mL.normal + 6 + mC.normal + 16 + mV.normal;
    var xSelo = XC - (200 + 44 + wBloco) / 2 + 100, xBloco = xSelo + 100 + 44;
    var bTop = cy - hBloco / 2;
    escreve('CÓDIGO', xBloco, bTop + mL.a, fL, C.vinho, lsL);
    escreve(d.codigo, xBloco, bTop + mL.normal + 6 + mC.a, fC, C.texto, lsC);
    escreve(d.validade_frase, xBloco, bTop + mL.normal + 6 + mC.normal + 16 + mV.a, fV, C.suave);
    // selo
    cx.strokeStyle = C.ouro; cx.lineWidth = 1; cx.beginPath(); cx.arc(xSelo, cy, 107.5, 0, 7); cx.stroke();
    cx.fillStyle = C.vinho; cx.beginPath(); cx.arc(xSelo, cy, 100, 0, 7); cx.fill();
    if (coringa) {
      var lw = 138; cx.drawImage(img.branco, xSelo - lw / 2, cy - lw / LOGO_R / 2, lw, lw / LOGO_R);
    } else {
      var fS = fnt(400, 17, WORK), lsS = 17 * 0.22, fN = fnt(400, 62, TENOR), mS = metr(fS);
      var num = d.valor_txt.replace('R$ ', ''), hS = mS.normal * 2 + 62, t0 = cy - hS / 2;
      var w1 = larg(fS, 'VALOR', lsS), w2 = larg(fN, num), w3 = larg(fS, 'REAIS', lsS);
      escreve('VALOR', xSelo - w1 / 2, t0 + mS.a, fS, C.areia, lsS);
      escreve(num, xSelo - w2 / 2, baseline(t0 + mS.normal, 62, fN), fN, '#fff');
      escreve('REAIS', xSelo - w3 / 2, t0 + mS.normal + 62 + mS.a, fS, C.areia, lsS);
    }
    var linhaBottom = linhaTop + 200;

    // rodape, ancorado embaixo
    var fR = fnt(400, 14.5, WORK), lhR = 14.5 * 1.5, linhasR = quebra(fR, regrasTxt(d), CW);
    var regrasTop = 1225 - linhasR.length * lhR, waBottom = regrasTop - 15.5, waTop = waBottom - 62;
    var fP = fnt(400, 20, WORK), lhP = 20 * 1.45, pTop = waTop - 18 - 2 * lhP, h3Top = pTop - 6 - 36, peTop = h3Top - 24 - 1;

    // convite, no meio do espaco livre
    var fCv = fnt(400, 27, TENOR), lhCv = 27 * 1.35;
    var lCv = quebra(fCv, 'Um café com biscoito artesanal te espera, e a Cláudia ajuda a escolher, sem pressa.', 620);
    var cvTop = linhaBottom + (peTop - linhaBottom - lCv.length * lhCv) / 2;
    bloco(lCv, XC, cvTop, lhCv, fCv, C.esc);

    // bloco de uso
    cx.fillStyle = C.ouro; cx.fillRect(XC - CW / 2, peTop, CW, 1);
    var fH3 = fnt(400, 30, TENOR), w = larg(fH3, 'Use na Virtut, no Gutierrez');
    escreve('Use na Virtut, no Gutierrez', XC - w / 2, baseline(h3Top, 36, fH3), fH3, C.vinho);
    bloco(['R. General Andrade Neves, 267, Gutierrez, BH', d.horario], XC, pTop, lhP, fP, C.texto);

    // botao WhatsApp
    var fW = fnt(500, 24, WORK), fWB = fnt(600, 24, WORK), lsW = 24 * 0.02;
    var rW = [{ t: 'Chame a Cláudia no WhatsApp ', font: fW, cor: '#fff' }, { t: '(31) 99294-4070', font: fWB, cor: '#fff', ls: lsW }];
    var wt = runsLargura(rW), wBtn = 34 * 2 + 30 + 14 + wt, xBtn = XC - wBtn / 2;
    cx.fillStyle = C.vinho; rr(xBtn, waTop, wBtn, 62, 31); cx.fill();
    cx.save(); cx.translate(xBtn + 34, waTop + 16); cx.scale(30 / 24, 30 / 24); cx.fillStyle = '#fff'; cx.fill(new Path2D(WA_PATH)); cx.restore();
    var mW = metr(fW), xt = xBtn + 34 + 30 + 14, yt = waTop + 31 - mW.normal / 2 + mW.a;
    rW.forEach(function (r) { escreve(r.t, xt, yt, r.font, r.cor, r.ls); xt += larg(r.font, r.t, r.ls); });

    // regras
    bloco(linhasR, XC, regrasTop, lhR, fR, C.suave);
    return canvas;
  }

  var API = { desenharValeB: desenharValeB, recursosPadrao: recursosPadrao, legendaWhatsApp: legendaWhatsApp, linkWhats: linkWhats, regrasTxt: regrasTxt };
  root.ValeB = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
