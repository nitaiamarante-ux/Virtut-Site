/* Página do vale-presente da Cláudia (26/10/2026). Gera o vale pela API, desenha o cartão com vale_b.js. */
(function () {
  'use strict';
  var TESTE = /[?&]teste=1\b/.test(location.search);
  var cfg = window.VT_CONFIG || {};
  var API = ((cfg.medicao && cfg.medicao.endpoint) || '').replace(/\/event$/, '');
  var CHAVE_PIN = 'vt_vale_pin';
  var pin = '';
  var ultimo = null; // { dados, link, legenda, blob }

  function $(id) { return document.getElementById(id); }
  function guardar(k, v) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  function lerGuardado(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function mostra(el, txt) { el.textContent = txt; el.style.display = 'block'; }
  function esconde() { for (var i = 0; i < arguments.length; i++) { arguments[i].style.display = 'none'; arguments[i].textContent = ''; } }

  /* ---------- API ---------- */
  var FALSA = [
    { codigo: 'VT-TEST-00', tipo: 'personalizado', valor_centavos: 20000, para: 'Maria (teste)', de: '', validade: '2027-04-26', status: 'ativo', emitido_em: '2026-10-26T10:00:00-03:00' },
    { codigo: 'VT-TEST-01', tipo: 'coringa', valor_centavos: null, para: '', de: '', validade: '', status: 'estoque', emitido_em: '2026-10-25T10:00:00-03:00' },
    { codigo: 'VT-TEST-02', tipo: 'personalizado', valor_centavos: 15050, para: 'Ana Paula (teste)', de: 'João', validade: '2026-09-01', status: 'vencido', emitido_em: '2026-03-01T10:00:00-03:00' },
    { codigo: 'VT-TEST-03', tipo: 'coringa', valor_centavos: null, para: '', de: '', validade: '', status: 'cancelado', emitido_em: '2026-02-01T10:00:00-03:00' }
  ];
  function chamar(metodo, caminho, corpo) {
    if (TESTE) return chamarFalso(metodo, caminho, corpo);
    var opts = { method: metodo, headers: { 'X-Vale-Pin': pin } };
    if (corpo) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(corpo); }
    return fetch(API + caminho, opts).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) { return { status: r.status, corpo: j }; });
    }).catch(function () { return { status: 0, corpo: {} }; });
  }
  function chamarFalso(metodo, caminho, corpo) {
    return new Promise(function (ok) {
      setTimeout(function () {
        if (caminho === '/vt/vales') return ok({ status: 200, corpo: { total: FALSA.length, vales: FALSA } });
        if (caminho === '/vt/vale' && metodo === 'POST')
          return ok({ status: 201, corpo: { codigo: 'VT-TEST-99', tipo: 'personalizado', valor_centavos: corpo.valor_centavos, para: corpo.para, de: corpo.de, mensagem: corpo.mensagem, validade: '2027-04-26', status: 'ativo' } });
        if (/\/vender$/.test(caminho)) return ok({ status: 200, corpo: { codigo: caminho.split('/')[3], valor_centavos: corpo.valor_centavos, validade: '2027-04-26', status: 'ativo' } });
        ok({ status: 404, corpo: {} });
      }, 250);
    });
  }
  function mensagemErro(r, padrao) {
    if (r.status === 0) return 'Sem internet agora. Veja o sinal do celular e tente de novo.';
    if (r.status === 429) return 'Muitas tentativas. Espere 1 hora ou fale com quem cuida do site.';
    if (r.status === 401) return 'Senha errada. Confira os 6 números e tente de novo.';
    return (r.corpo && r.corpo.error) || padrao;
  }

  /* ---------- formatos ---------- */
  function paraCentavos(txt) {
    var s = String(txt || '').replace(/[^\d,]/g, '');
    if (!s) return null;
    var partes = s.split(',');
    var reais = parseInt(partes[0] || '0', 10);
    var cent = partes[1] ? parseInt((partes[1] + '00').slice(0, 2), 10) : 0;
    var total = reais * 100 + cent;
    return total > 0 && total <= 1000000 ? total : null;
  }
  function brl(c) { // R$ 600 · R$ 150,50
    var v = (c / 100).toFixed(2).replace('.', ',');
    var p = v.split(','); p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return 'R$ ' + (p[1] === '00' ? p[0] : p[0] + ',' + p[1]);
  }
  function dataBr(iso) { return iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4) : ''; }
  var SIT = { ativo: 'ativo', vencido: 'vencido', estoque: 'em estoque', cancelado: 'cancelado', usado: 'já usado' };

  /* horário do perfil (dados.json do site), mesmo formato de horario_txt() do gerar.py */
  var DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  function horarioTxt(h) {
    function fmt(f) { return f.map(function (x) { return parseInt(x[0].slice(0, 2), 10) + 'h às ' + parseInt(x[1].slice(0, 2), 10) + 'h'; }); }
    var sem = [], i, iguais = true, partes = [];
    for (i = 1; i <= 5; i++) { var f = h[String(i)] && h[String(i)].length ? fmt(h[String(i)])[0] : null; sem.push(f); }
    sem.forEach(function (x) { if (x !== sem[0]) iguais = false; });
    if (iguais && sem[0]) partes.push('Segunda a sexta, ' + sem[0]);
    else for (i = 1; i <= 5; i++) if (sem[i - 1]) partes.push(DIAS[i] + ', ' + sem[i - 1]);
    if (h['6'] && h['6'].length) partes.push('sábado, ' + fmt(h['6'])[0]);
    return partes.join(' · ');
  }
  var horarioPromessa = null;
  function carregarHorario() {
    if (!horarioPromessa) horarioPromessa = fetch('../dados.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (d) { return horarioTxt(d.horario); });
    return horarioPromessa;
  }

  /* ---------- telas ---------- */
  var TELAS = ['pin', 'fazer', 'coringa', 'lista'];
  function ir(nome) {
    TELAS.forEach(function (t) { $('tela-' + t).classList.toggle('oculto', t !== nome); });
    var logada = nome !== 'pin';
    $('topo').classList.toggle('oculto', !logada);
    $('sair').classList.toggle('oculto', !logada);
    $('aba-fazer').setAttribute('aria-current', String(nome === 'fazer' || nome === 'coringa'));
    $('aba-lista').setAttribute('aria-current', String(nome === 'lista'));
    window.scrollTo(0, 0);
  }

  /* ---------- PIN ---------- */
  function entrar(pinDigitado, lembrar, automatico) {
    pin = pinDigitado;
    $('entrar').disabled = true;
    return chamar('GET', '/vt/vales').then(function (r) {
      $('entrar').disabled = false;
      if (r.status === 200) {
        if (lembrar) guardar(CHAVE_PIN, pin);
        listaCache = r.corpo.vales || [];
        ir('fazer');
        return;
      }
      pin = '';
      if (r.status === 401) guardar(CHAVE_PIN, null);
      if (!automatico || r.status !== 0) mostra($('erro-pin'), mensagemErro(r, 'Não deu certo. Tente de novo.'));
    });
  }
  $('form-pin').addEventListener('submit', function (e) {
    e.preventDefault(); esconde($('erro-pin'));
    var v = $('pin').value.replace(/\D/g, '');
    if (v.length !== 6) { mostra($('erro-pin'), 'A senha tem 6 números.'); return; }
    entrar(v, $('lembrar').checked, false);
  });
  $('esquecer').addEventListener('click', function () {
    guardar(CHAVE_PIN, null); pin = ''; $('pin').value = ''; ir('pin');
  });

  /* ---------- fazer o vale ---------- */
  var listaCache = [];
  $('aba-fazer').addEventListener('click', function () { ir('fazer'); });
  $('aba-lista').addEventListener('click', function () { carregarLista(); ir('lista'); });
  function recursos() {
    var r = ValeB.recursosPadrao('../assets/');
    r.logoPreto = '../assets/img/virtut-logo-preto.svg';
    r.logoBranco = '../assets/img/virtut-logo-branco.svg';
    return r;
  }
  $('form-vale').addEventListener('submit', function (e) {
    e.preventDefault(); esconde($('erro-fazer'));
    var c = paraCentavos($('valor').value);
    if (!c) { mostra($('erro-fazer'), 'Digite o valor do vale em reais, só números. Por exemplo: 200.'); $('valor').focus(); return; }
    var corpo = { valor_centavos: c, para: $('para').value.trim(), de: $('de').value.trim(), mensagem: $('frase').value.trim() };
    var b = $('fazer'); b.disabled = true; b.textContent = 'Fazendo o vale...';
    chamar('POST', '/vt/vale', corpo).then(function (r) {
      if (r.status !== 201 && r.status !== 200) {
        b.disabled = false; b.textContent = 'Fazer o vale';
        if (r.status === 401) { guardar(CHAVE_PIN, null); ir('pin'); mostra($('erro-pin'), mensagemErro(r)); return; }
        mostra($('erro-fazer'), mensagemErro(r, 'Não consegui fazer o vale. Tente de novo.')); return;
      }
      return mostrarCartao(r.corpo).then(function () { b.disabled = false; b.textContent = 'Fazer o vale'; });
    });
  });
  function mostrarCartao(v) {
    return carregarHorario().then(function (horario) {
      var dados = {
        valor_txt: v.valor_centavos ? brl(v.valor_centavos) : '', para: v.para || '', de: v.de || '', mensagem: v.mensagem || '',
        codigo: v.codigo, validade_frase: 'Válido até ' + dataBr(v.validade), horario: horario
      };
      var canvas = $('canvas');
      return ValeB.desenharValeB(canvas, dados, recursos()).then(function () {
        var link = ValeB.linkWhats(dados.codigo, dados.para);
        ultimo = { dados: dados, link: link, legenda: ValeB.legendaWhatsApp(dados, link), blob: null };
        $('codigo-grande').textContent = dados.codigo;
        esconde($('ok-resultado'), $('erro-resultado'));
        $('bloco-form').classList.add('oculto'); $('bloco-resultado').classList.remove('oculto');
        window.scrollTo(0, 0);
        canvas.toBlob(function (bl) { ultimo.blob = bl; }, 'image/png');
      });
    }).catch(function () {
      $('bloco-form').classList.remove('oculto');
      mostra($('erro-fazer'), 'O vale foi criado (código ' + v.codigo + '), mas não consegui desenhar a imagem. Veja o código em "Vales feitos" e tente de novo.');
    });
  }
  function obterBlob() {
    if (ultimo.blob) return Promise.resolve(ultimo.blob);
    return new Promise(function (ok) { $('canvas').toBlob(function (b) { ultimo.blob = b; ok(b); }, 'image/png'); });
  }
  function nomeArquivo() { return 'vale-virtut-' + ultimo.dados.codigo + '.png'; }
  function baixar() {
    return obterBlob().then(function (b) {
      var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = nomeArquivo();
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
    });
  }
  function copiarTexto() {
    var t = ultimo.legenda;
    function antigo() {
      var ta = document.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); var ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
      ta.remove(); return ok;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t).then(function () { return true; }, function () { return antigo(); });
    return Promise.resolve(antigo());
  }
  $('mandar').addEventListener('click', function () {
    esconde($('ok-resultado'), $('erro-resultado'));
    obterBlob().then(function (b) {
      var arq = new File([b], nomeArquivo(), { type: 'image/png' });
      var pacote = { files: [arq], text: ultimo.legenda };
      if (navigator.canShare && navigator.canShare(pacote) && navigator.share) {
        return navigator.share(pacote).catch(function (err) {
          if (err && err.name === 'AbortError') return;
          mostra($('erro-resultado'), 'Este celular não abriu o envio. Use os botões abaixo: baixe a imagem e copie o texto.');
        });
      }
      mostra($('erro-resultado'), 'Este celular não manda a imagem direto. Use os botões abaixo: baixe a imagem, copie o texto e mande os dois no WhatsApp.');
    });
  });
  $('baixar').addEventListener('click', function () { baixar().then(function () { mostra($('ok-resultado'), 'Imagem baixada. Procure na galeria ou em Downloads.'); }); });
  $('copiar').addEventListener('click', function () {
    copiarTexto().then(function (ok) { if (ok) mostra($('ok-resultado'), 'Texto copiado. Cole na conversa do WhatsApp junto com a imagem.'); else mostra($('erro-resultado'), 'Não consegui copiar. Segure o dedo no texto e copie à mão: ' + ultimo.legenda); });
  });
  $('outro').addEventListener('click', function () {
    ['valor', 'para', 'de', 'frase'].forEach(function (id) { $(id).value = ''; });
    $('bloco-resultado').classList.add('oculto'); $('bloco-form').classList.remove('oculto'); window.scrollTo(0, 0);
  });

  /* ---------- coringa ---------- */
  $('ir-coringa').addEventListener('click', function () {
    esconde($('erro-coringa'), $('ok-coringa'));
    chamar('GET', '/vt/vales').then(function (r) {
      if (r.status !== 200) { mostra($('erro-fazer'), mensagemErro(r, 'Não consegui ver os coringas agora.')); return; }
      listaCache = r.corpo.vales || [];
      var sel = $('cod-coringa'); sel.textContent = '';
      var estoque = listaCache.filter(function (v) { return v.status === 'estoque'; });
      estoque.forEach(function (v) { var o = document.createElement('option'); o.value = v.codigo; o.textContent = v.codigo; sel.appendChild(o); });
      if (!estoque.length) { var o = document.createElement('option'); o.value = ''; o.textContent = 'Nenhum coringa em estoque'; sel.appendChild(o); }
      $('valor-coringa').value = '';
      ir('coringa');
    });
  });
  $('voltar-coringa').addEventListener('click', function () { ir('fazer'); });
  $('form-coringa').addEventListener('submit', function (e) {
    e.preventDefault(); esconde($('erro-coringa'), $('ok-coringa'));
    var cod = $('cod-coringa').value, c = paraCentavos($('valor-coringa').value);
    if (!cod) { mostra($('erro-coringa'), 'Não tem coringa em estoque.'); return; }
    if (!c) { mostra($('erro-coringa'), 'Digite o valor em reais, só números. Por exemplo: 200.'); return; }
    var b = $('confirmar-coringa'); b.disabled = true;
    chamar('POST', '/vt/vale/' + encodeURIComponent(cod) + '/vender', { valor_centavos: c }).then(function (r) {
      b.disabled = false;
      if (r.status !== 200) { mostra($('erro-coringa'), mensagemErro(r, 'Não consegui registrar. Tente de novo.')); return; }
      mostra($('ok-coringa'), 'Registrado: ' + cod + ', ' + brl(c) + ', válido até ' + dataBr(r.corpo.validade) + '.');
      var op = $('cod-coringa').querySelector('option[value="' + cod + '"]'); if (op) op.remove();
      $('valor-coringa').value = '';
    });
  });

  /* ---------- lista ---------- */
  function carregarLista() {
    esconde($('erro-lista'));
    chamar('GET', '/vt/vales').then(function (r) {
      if (r.status !== 200) { mostra($('erro-lista'), mensagemErro(r, 'Não consegui carregar a lista.')); return; }
      listaCache = (r.corpo.vales || []).slice().sort(function (a, b) { return (b.emitido_em || '').localeCompare(a.emitido_em || ''); });
      desenharLista();
    });
  }
  function desenharLista() {
    var box = $('lista'); box.textContent = '';
    $('resumo-lista').textContent = listaCache.length ? listaCache.length + ' vales, o mais recente em cima.' : 'Ainda não tem nenhum vale.';
    listaCache.forEach(function (v) {
      var d = document.createElement('div'); d.className = 'item';
      var topo = document.createElement('div'); topo.className = 'linha1';
      var cod = document.createElement('span'); cod.className = 'cod'; cod.textContent = v.codigo;
      var val = document.createElement('span'); val.className = 'valor'; val.textContent = v.valor_centavos ? brl(v.valor_centavos) : 'sem valor';
      topo.appendChild(cod); topo.appendChild(val);
      var base = document.createElement('div'); base.className = 'linha2';
      var sit = document.createElement('span'); sit.className = 'sit ' + v.status; sit.textContent = SIT[v.status] || v.status;
      base.appendChild(sit);
      var resto = [];
      if (v.para) resto.push('para ' + v.para);
      if (v.validade && v.status !== 'estoque') resto.push('válido até ' + dataBr(v.validade));
      base.appendChild(document.createTextNode(resto.join(' · ')));
      d.appendChild(topo); d.appendChild(base); box.appendChild(d);
    });
  }

  /* ---------- início ---------- */
  if (TESTE) $('faixa-teste').classList.remove('oculto');
  if (!API && !TESTE) mostra($('erro-pin'), 'A página não está configurada. Fale com quem cuida do site.');
  var salvo = lerGuardado(CHAVE_PIN);
  if (salvo && /^\d{6}$/.test(salvo) && (API || TESTE)) entrar(salvo, true, true);
})();
