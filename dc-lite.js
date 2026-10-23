/*
 * dc-lite.js — runtime mínimo para as telas .dc.html do mockup QA Autônomo.
 *
 * Lê o próprio arquivo da página, interpreta o template dentro de <x-dc>
 * (holes {{ caminho }}, <sc-for>, <sc-if>, <helmet>) e renderiza com React.
 * A lógica de cada tela fica em <script type="text/x-dc" data-dc-script>,
 * numa classe `Component extends DCLogic` cujo renderVals() alimenta o template.
 *
 * Requer React 18 e ReactDOM 18 (UMD) carregados antes deste arquivo.
 * As páginas precisam ser servidas por HTTP (GitHub Pages ou um servidor local),
 * porque o runtime busca o código-fonte da própria página com fetch().
 */
(function () {
  'use strict';

  var hide = document.createElement('style');
  hide.textContent = 'x-dc{display:none!important}';
  document.head.appendChild(hide);

  var h = React.createElement;
  var VOID = { area: 1, base: 1, br: 1, col: 1, embed: 1, hr: 1, img: 1, input: 1, link: 1, meta: 1, source: 1, track: 1, wbr: 1 };
  var ATTR = { 'class': 'className', 'for': 'htmlFor', maxlength: 'maxLength', inputmode: 'inputMode', autocomplete: 'autoComplete', readonly: 'readOnly', tabindex: 'tabIndex', colspan: 'colSpan', rowspan: 'rowSpan' };
  var HOLE = /\{\{\s*([^}]*?)\s*\}\}/g;
  var WHOLE = /^\{\{\s*([^}]*?)\s*\}\}$/;

  var decoder = document.createElement('textarea');
  function decode(s) {
    if (s.indexOf('&') < 0) return s;
    decoder.innerHTML = s;
    return decoder.value;
  }

  // Tokenizador simples: o template é HTML bem formado (elementos fechados, atributos entre aspas).
  function parse(src) {
    var root = { tag: '#root', attrs: {}, children: [] };
    var stack = [root];
    var i = 0, n = src.length;
    while (i < n) {
      var lt = src.indexOf('<', i);
      if (lt < 0) lt = n;
      if (lt > i) stack[stack.length - 1].children.push({ text: decode(src.slice(i, lt)) });
      if (lt >= n) break;
      if (src.startsWith('<!--', lt)) {
        var ce = src.indexOf('-->', lt);
        i = ce < 0 ? n : ce + 3;
        continue;
      }
      if (src[lt + 1] === '/') {
        var gt = src.indexOf('>', lt);
        var closing = src.slice(lt + 2, gt).trim();
        for (var k = stack.length - 1; k > 0; k--) {
          if (stack[k].tag === closing) { stack.length = k; break; }
        }
        i = gt + 1;
        continue;
      }
      var j = lt + 1;
      while (j < n && /[^\s/>]/.test(src[j])) j++;
      var tag = src.slice(lt + 1, j);
      var attrs = {};
      var selfClose = false;
      while (j < n) {
        while (j < n && /\s/.test(src[j])) j++;
        if (src[j] === '>') { j++; break; }
        if (src[j] === '/' && src[j + 1] === '>') { j += 2; selfClose = true; break; }
        var a = j;
        while (j < n && /[^\s=/>]/.test(src[j])) j++;
        var name = src.slice(a, j);
        var value = '';
        while (j < n && /\s/.test(src[j])) j++;
        if (src[j] === '=') {
          j++;
          while (j < n && /\s/.test(src[j])) j++;
          var q = src[j];
          if (q === '"' || q === "'") {
            var end = src.indexOf(q, j + 1);
            value = src.slice(j + 1, end);
            j = end + 1;
          } else {
            var b = j;
            while (j < n && /[^\s>]/.test(src[j])) j++;
            value = src.slice(b, j);
          }
        }
        if (name) attrs[name] = decode(value);
        else j++;
      }
      var node = { tag: tag, attrs: attrs, children: [] };
      stack[stack.length - 1].children.push(node);
      if (!selfClose && !VOID[tag.toLowerCase()]) stack.push(node);
      i = j;
    }
    return root.children;
  }

  function lookup(path, scope) {
    if (path === 'true') return true;
    if (path === 'false') return false;
    if (path === 'null') return null;
    if (/^-?\d+(\.\d+)?$/.test(path)) return Number(path);
    if (/^(['"]).*\1$/.test(path)) return path.slice(1, -1);
    var parts = path.split('.');
    var v = scope;
    for (var p = 0; p < parts.length; p++) {
      if (v == null) return undefined;
      v = v[parts[p]];
    }
    return v;
  }

  function interp(s, scope) {
    var m = WHOLE.exec(s);
    if (m) return lookup(m[1], scope);
    return s.replace(HOLE, function (_, p) {
      var v = lookup(p, scope);
      return v == null ? '' : String(v);
    });
  }

  function camel(s) {
    return s.replace(/-([a-z])/g, function (_, c) { return c.toUpperCase(); });
  }

  function styleObject(str) {
    var out = {};
    String(str).split(';').forEach(function (decl) {
      var k = decl.indexOf(':');
      if (k < 0) return;
      var prop = decl.slice(0, k).trim();
      if (!prop) return;
      out[prop.indexOf('--') === 0 ? prop : camel(prop)] = decl.slice(k + 1).trim();
    });
    return out;
  }

  function renderList(list, scope) {
    var out = [];
    for (var i = 0; i < list.length; i++) {
      var r = renderNode(list[i], scope);
      if (r !== null && r !== undefined) out.push(r);
    }
    return out;
  }

  function el(type, props, children) {
    return h.apply(null, [type, props].concat(children));
  }

  function renderNode(nd, scope) {
    if (nd.text !== undefined) {
      if (/^\s*$/.test(nd.text)) return nd.text.indexOf('\n') >= 0 ? null : nd.text;
      return interp(nd.text, scope);
    }
    var t = nd.tag;
    if (t === 'helmet') return null;
    if (t === 'sc-if') {
      return interp(nd.attrs.value || '', scope) ? el(React.Fragment, null, renderList(nd.children, scope)) : null;
    }
    if (t === 'sc-for') {
      var items = interp(nd.attrs.list || '', scope) || [];
      var as = nd.attrs.as || 'item';
      return items.map(function (item, idx) {
        var s = Object.create(scope);
        s[as] = item;
        s.$index = idx;
        return el(React.Fragment, { key: idx }, renderList(nd.children, s));
      });
    }
    var props = {};
    for (var an in nd.attrs) {
      if (an.indexOf('hint-') === 0) continue;
      var val = interp(nd.attrs[an], scope);
      var key = ATTR[an] || (/^(aria-|data-|--)/.test(an) ? an : camel(an));
      if (key === 'style' && typeof val === 'string') val = styleObject(val);
      props[key] = val;
    }
    if (VOID[t.toLowerCase()]) return h(t, props);
    return el(t, props, renderList(nd.children, scope));
  }

  var TEMPLATE = [];

  class DCLogic extends React.Component {
    render() {
      var vals = this.renderVals ? this.renderVals() : {};
      return el(React.Fragment, null, renderList(TEMPLATE, vals));
    }
  }
  window.DCLogic = DCLogic;

  function boot() {
    var script = document.querySelector('script[data-dc-script]');
    fetch(location.href.split('#')[0], { cache: 'no-cache' })
      .then(function (r) { return r.text(); })
      .then(function (src) {
        var body = /<x-dc>([\s\S]*)<\/x-dc>/.exec(src)[1];
        var helmet = /<helmet>([\s\S]*?)<\/helmet>/.exec(body);
        if (helmet) {
          document.head.insertAdjacentHTML('beforeend', helmet[1]);
          body = body.replace(helmet[0], '');
        }
        TEMPLATE = parse(body);
        var Component = new Function('DCLogic', 'React', script.textContent + '\n;return Component;')(DCLogic, React);
        document.querySelectorAll('x-dc').forEach(function (n) { n.remove(); });
        var mount = document.createElement('div');
        mount.id = 'dc-root';
        document.body.appendChild(mount);
        ReactDOM.createRoot(mount).render(h(Component));
      })
      .catch(function (err) {
        document.body.insertAdjacentHTML('beforeend', '<p style="font-family:sans-serif;padding:24px">Não foi possível carregar esta tela. Abra o mockup por um servidor HTTP (por exemplo, GitHub Pages). Detalhe: ' + String(err) + '</p>');
      });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
