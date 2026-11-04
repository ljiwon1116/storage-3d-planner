// 화면 단위: cm (줄자로 잰 숫자 그대로). 앱 안 계산은 그대로 mm.
// - Units.cm(mm)    : 800 → "80", 805 → "80.5"
// - Units.len(mm)   : 800 → "80 cm"
// - data-unit="mm" 인 입력칸은 화면에는 cm로 보이고, 코드에서 .value 로 읽고 쓰면 mm 숫자예요.
//   (type="text" + inputmode="decimal" 로 바꿔서 안드로이드·아이폰 모두 '.' 있는 숫자 키패드가 떠요)
(function () {
  const desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');

  function cm(mm) {
    const n = Number(mm);
    if (!isFinite(n)) return '';
    const v = Math.round(n) / 10;
    return Number.isInteger(v) ? String(v) : v.toFixed(1);
  }
  function len(mm) {
    return `${cm(mm)} cm`;
  }
  function dims(w, d, h) {
    return `${cm(w)} × ${cm(d)} × ${cm(h)} cm`;
  }

  function toMmString(raw) {
    const s = String(raw == null ? '' : raw).replace(',', '.').replace(/[^0-9.\-]/g, '').trim();
    if (s === '' || s === '.' || s === '-') return '';
    const n = parseFloat(s);
    return isNaN(n) ? '' : String(Math.round(n * 10));
  }

  function cmify(inp) {
    if (!inp || inp.__cmUnit) return;
    inp.__cmUnit = true;
    const mmNow = desc.get.call(inp);
    inp.type = 'text';
    inp.setAttribute('inputmode', 'decimal');
    inp.setAttribute('autocomplete', 'off');
    inp.setAttribute('enterkeyhint', 'done');
    Object.defineProperty(inp, 'value', {
      configurable: true,
      get() { return toMmString(desc.get.call(this)); },
      set(v) {
        if (v === '' || v == null) { desc.set.call(this, ''); return; }
        desc.set.call(this, cm(v));
      }
    });
    if (mmNow !== '') inp.value = mmNow;
    const ph = inp.getAttribute('placeholder');
    if (ph && /\d/.test(ph)) inp.setAttribute('placeholder', ph.replace(/\d+(\.\d+)?/g, (n) => cm(n)));
    // 숫자와 점만 입력되게 (붙여넣기 포함)
    inp.addEventListener('input', () => {
      const raw = desc.get.call(inp);
      const clean = raw.replace(',', '.').replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
      if (clean !== raw) desc.set.call(inp, clean);
    }, true);
  }

  function scan(root) {
    if (!root || !root.querySelectorAll) return;
    if (root.matches && root.matches('input[data-unit="mm"]')) cmify(root);
    root.querySelectorAll('input[data-unit="mm"]').forEach(cmify);
  }

  window.Units = { cm, len, dims, cmify, scan };

  const start = () => {
    scan(document.body);
    new MutationObserver((list) => {
      list.forEach((m) => m.addedNodes.forEach((n) => { if (n.nodeType === 1) scan(n); }));
    }).observe(document.body, { childList: true, subtree: true });
  };
  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start);
})();
