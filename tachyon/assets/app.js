(function () {
  var TEXT = {
    en: {
      more: function (n) { return '+ ' + n + ' more'; },
      sheets: function (n) { return n + (n === 1 ? ' sheet' : ' sheets') + ' checked. The teacher looks at <b>1 star</b>.'; },
      mailOld: 'Your wallet tries <b>all 12</b> envelopes. Only 2 are yours.',
      mailNew: 'Your <b>2 letters</b> were handed to you directly. Your wallet never opens the other 10.'
    },
    el: {
      more: function (n) { return '+ ' + n + ' ακόμα'; },
      sheets: function (n) { return n + (n === 1 ? ' φύλλο ελέγχθηκε' : ' φύλλα ελέγχθηκαν') + '. Η δασκάλα κοιτάζει <b>1 αστεράκι</b>.'; },
      mailOld: 'Το πορτοφόλι σου δοκιμάζει <b>και τους 12</b> φακέλους. Μόνο οι 2 είναι δικοί σου.',
      mailNew: 'Τα <b>2 γράμματά σου</b> σού δόθηκαν κατευθείαν. Το πορτοφόλι σου δεν ανοίγει ποτέ τους άλλους 10.'
    }
  };
  var t = TEXT[document.documentElement.lang] || TEXT.en;

  var sheets = document.getElementById('sheets');
  var slider = document.getElementById('sheetSlider');
  var countEl = document.getElementById('sheetCount');
  var sayEl = document.getElementById('sheetSay');
  var MAX_DRAWN = 60;
  function drawSheets(n) {
    if (!sheets) return;
    sheets.innerHTML = '';
    for (var i = 0; i < Math.min(n, MAX_DRAWN); i++) {
      var s = document.createElement('span');
      s.className = 'sheet';
      s.style.transform = 'rotate(' + (((i * 37) % 9) - 4) + 'deg)';
      sheets.appendChild(s);
    }
    if (n > MAX_DRAWN) {
      var m = document.createElement('span');
      m.className = 'more';
      m.textContent = t.more(n - MAX_DRAWN);
      sheets.appendChild(m);
    }
    if (countEl) countEl.textContent = n;
    if (sayEl) sayEl.innerHTML = t.sheets(n);
  }
  if (slider) {
    drawSheets(parseInt(slider.value, 10));
    slider.addEventListener('input', function () { drawSheets(parseInt(slider.value, 10)); });
  }

  var grid = document.getElementById('envelopes');
  var btnOld = document.getElementById('btnOld');
  var btnNew = document.getElementById('btnNew');
  var mailSay = document.getElementById('mailSay');
  var MINE = [3, 9];
  var envSVG = '<svg viewBox="0 0 60 42"><rect class="e-fill f-paper" x="3" y="3" width="54" height="36" rx="3"/>' +
    '<rect class="e-body s-thin" x="3" y="3" width="54" height="36" rx="3"/>' +
    '<path class="e-body s-thin" d="M3 6 L30 24 L57 6"/></svg>';
  var envs = [];
  if (grid) {
    for (var i = 0; i < 12; i++) {
      var d = document.createElement('div');
      d.className = 'env';
      d.innerHTML = envSVG + '<span class="mark"></span>';
      grid.appendChild(d);
      envs.push(d);
    }
  }
  function setMode(mode) {
    envs.forEach(function (e, i) {
      var mine = MINE.indexOf(i) !== -1;
      var mark = e.querySelector('.mark');
      e.className = 'env';
      if (mode === 'old') {
        e.classList.add(mine ? 'mine' : 'tried');
        mark.textContent = mine ? '★' : '?';
        mark.style.color = mine ? 'var(--blue)' : 'var(--red)';
      } else {
        e.classList.add(mine ? 'mine' : 'skip');
        mark.textContent = mine ? '★' : '';
        mark.style.color = 'var(--blue)';
      }
    });
    if (btnOld) btnOld.setAttribute('aria-pressed', mode === 'old' ? 'true' : 'false');
    if (btnNew) btnNew.setAttribute('aria-pressed', mode === 'new' ? 'true' : 'false');
    if (mailSay) mailSay.innerHTML = mode === 'old' ? t.mailOld : t.mailNew;
  }
  if (btnOld) btnOld.addEventListener('click', function () { setMode('old'); });
  if (btnNew) btnNew.addEventListener('click', function () { setMode('new'); });
  setMode('old');
})();
