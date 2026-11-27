(function () {
  'use strict';
  var C = window.CONFIG;
  var $ = function (id) { return document.getElementById(id); };
  var reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- утилиты ----------
  function fill(tpl) { return String(tpl).replace(/\{name\}/g, C.name); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function hash(s) { var h = 0; for (var i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) | 0; } return String(h); }
  var STORE_KEY = 'valentine:' + hash(JSON.stringify(C.steps) + C.date.start + C.name);
  function load() { try { return JSON.parse(localStorage.getItem(STORE_KEY)) || null; } catch (e) { return null; } }
  function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify({ at: state.at, answers: state.answers })); } catch (e) {} }
  function clearSave() { try { localStorage.removeItem(STORE_KEY); } catch (e) {} }
  function vibrate(p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) {} }

  function parseStart() {
    var m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(C.date.start);
    return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  }
  var start = parseStart();
  var end = new Date(start.getTime() + (C.date.durationMinutes || 120) * 60000);
  function dayText() { return new Intl.DateTimeFormat('ru', { weekday: 'long', day: 'numeric', month: 'long' }).format(start); }
  function timeText() { return pad(start.getHours()) + ':' + pad(start.getMinutes()); }
  function floating(d) { return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + 'T' + pad(d.getHours()) + pad(d.getMinutes()) + '00'; }

  function setPhoto(img, src, fallback) {
    img.onerror = function () {
      img.onerror = function () { img.hidden = true; };
      if (fallback) img.src = fallback; else img.hidden = true;
    };
    img.onload = function () { img.hidden = false; };
    img.src = src;
  }

  // ---------- фоновые сердечки ----------
  (function () {
    var box = document.querySelector('.bg-hearts');
    var em = ['💗', '💖', '💕', '🌸'];
    for (var i = 0; i < 14; i++) {
      var s = document.createElement('span');
      s.textContent = em[i % em.length];
      s.style.left = (Math.random() * 100) + '%';
      s.style.fontSize = (16 + Math.random() * 22) + 'px';
      s.style.animationDuration = (12 + Math.random() * 14) + 's';
      s.style.animationDelay = (-Math.random() * 20) + 's';
      box.appendChild(s);
    }
  })();

  // ---------- конфетти ----------
  var confetti = (function () {
    var cv = $('confetti'), ctx = cv.getContext('2d'), parts = [], running = false;
    function size() { cv.width = innerWidth; cv.height = innerHeight; }
    addEventListener('resize', size); size();
    function frame() {
      ctx.clearRect(0, 0, cv.width, cv.height);
      parts.forEach(function (p) {
        p.vy += 0.12; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.life--;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.globalAlpha = Math.max(0, Math.min(1, p.life / 40));
        ctx.font = p.s + 'px serif'; ctx.fillText(p.e, 0, 0); ctx.restore();
      });
      parts = parts.filter(function (p) { return p.life > 0 && p.y < cv.height + 40; });
      if (parts.length) requestAnimationFrame(frame); else { running = false; ctx.clearRect(0, 0, cv.width, cv.height); }
    }
    return function (n) {
      if (reduceMotion) return;
      var em = ['❤️', '💖', '💕', '💗', '🌸', '✨'];
      for (var i = 0; i < (n || 70); i++) {
        parts.push({ x: cv.width / 2, y: cv.height * 0.6, vx: (Math.random() - .5) * 12, vy: -Math.random() * 13 - 4,
          r: 0, vr: (Math.random() - .5) * .3, s: 18 + Math.random() * 20, e: em[i % em.length], life: 90 + Math.random() * 60 });
      }
      if (!running) { running = true; requestAnimationFrame(frame); }
    };
  })();

  // ---------- состояние и экраны ----------
  var flow = [{ t: 'question' }, { t: 'celebrate' }];
  C.steps.forEach(function (s, i) { flow.push({ t: 'step', i: i }); });
  flow.push({ t: 'date' }, { t: 'ticket' });
  var totalSteps = C.steps.length + 1; // шаги + дата

  var saved = load();
  var state = { at: 0, answers: (saved && saved.answers) || {} };

  function show(at) {
    state.at = at; save();
    var f = flow[at];
    Array.prototype.forEach.call(document.querySelectorAll('.screen'), function (s) { s.classList.remove('active'); });
    $('screen-' + f.t).classList.add('active');
    var bar = $('topbar');
    bar.hidden = (f.t === 'question' || f.t === 'celebrate');
    var n = f.t === 'step' ? f.i + 1 : f.t === 'date' ? totalSteps : totalSteps;
    $('progress-bar').style.width = (f.t === 'ticket' ? 100 : (n - 1) / totalSteps * 100 + 100 / totalSteps * 0.5) + '%';
    $('progress-label').textContent = f.t === 'ticket' ? 'Готово 💕' : 'Шаг ' + n + ' из ' + totalSteps;
    if (f.t === 'step') renderStep(f.i);
    if (f.t === 'date') renderDate();
    if (f.t === 'ticket') renderTicket();
    window.scrollTo(0, 0);
  }
  function next() { if (state.at < flow.length - 1) show(state.at + 1); }
  function back() {
    var to = state.at - 1;
    if (flow[to] && flow[to].t === 'question') to = 1;
    if (to >= 1) show(to);
  }
  $('back').addEventListener('click', back);

  // ---------- 1. вопрос + убегающая «Нет» ----------
  $('question-text').textContent = fill(C.question);
  setPhoto($('photo-question'), C.photos.question, C.photos.fallbackQuestion);
  setPhoto($('photo-yes'), C.photos.yes, C.photos.fallbackYes);
  $('yes-title').textContent = fill(C.yesTitle);
  $('yes-text').textContent = fill(C.yesText);

  var yes = $('yes-btn'), no = $('no-btn'), slot = $('no-slot');
  var noIdx = 0, yesBase = 0, yesScale = 1, noFixed = false, lastDodge = 0;
  var MAX_SCALE = 2.0;

  function viewport() {
    var v = window.visualViewport;
    return { w: v ? v.width : innerWidth, h: v ? v.height : innerHeight, x: v ? v.offsetLeft : 0, y: v ? v.offsetTop : 0 };
  }
  function overlap(a, b, gap) {
    return !(a.right + gap < b.left || a.left - gap > b.right || a.bottom + gap < b.top || a.top - gap > b.bottom);
  }
  function moveNo() {
    if (!noFixed) {
      var r = no.getBoundingClientRect();
      slot.style.width = r.width + 'px'; slot.style.height = r.height + 'px';
      no.classList.add('runaway'); no.style.left = r.left + 'px'; no.style.top = r.top + 'px';
      noFixed = true;
    }
    var vp = viewport(), m = 12;
    var w = no.offsetWidth, h = no.offsetHeight;
    var yr = yes.getBoundingClientRect();
    var maxX = Math.max(m, vp.w - w - m), maxY = Math.max(m, vp.h - h - m);
    var x, y, ok = false;
    for (var i = 0; i < 40 && !ok; i++) {
      x = vp.x + m + Math.random() * (maxX - m);
      y = vp.y + m + Math.random() * (maxY - m);
      ok = !overlap({ left: x, top: y, right: x + w, bottom: y + h }, yr, 30);
    }
    if (!ok) { x = vp.x + m; y = vp.y + maxY; } // запасной угол
    no.style.left = x + 'px'; no.style.top = y + 'px';
  }
  function dodge() {
    var now = Date.now();
    if (now - lastDodge < 250) return; // pointerenter+pointerdown не считаем дважды
    lastDodge = now;
    no.textContent = C.noMessages[noIdx % C.noMessages.length]; noIdx++;
    if (!yesBase) yesBase = parseFloat(getComputedStyle(yes).fontSize);
    if (yesScale < MAX_SCALE) {
      yesScale = Math.min(MAX_SCALE, yesScale * 1.25);
      yes.style.fontSize = (yesBase * yesScale) + 'px';
    }
    vibrate(15);
    // сначала дать «Да» вырасти, затем искать место
    requestAnimationFrame(function () { setTimeout(moveNo, 30); });
  }
  no.addEventListener('pointerdown', function (e) { e.preventDefault(); dodge(); });
  no.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') dodge(); });
  no.addEventListener('click', function (e) { e.preventDefault(); dodge(); }); // клавиатура
  addEventListener('resize', function () { if (noFixed) moveNo(); });

  yes.addEventListener('click', function () { confetti(110); vibrate([30, 40, 30]); show(1); setTimeout(function () { confetti(60); }, 350); });
  $('go-btn').addEventListener('click', next);

  // ---------- 3. шаги выбора ----------
  var wheelStep = 0;
  function renderStep(i) {
    var step = C.steps[i];
    $('step-title').textContent = step.title;
    var box = $('options'); box.textContent = '';
    var cur = state.answers[step.id];
    step.options.forEach(function (o, idx) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'option' + (cur === idx ? ' selected' : '');
      var e = document.createElement('span'); e.className = 'emoji'; e.textContent = o.emoji;
      var l = document.createElement('span'); l.textContent = o.label;
      b.appendChild(e); b.appendChild(l);
      b.addEventListener('click', function () { choose(i, idx); });
      box.appendChild(b);
    });
    $('reaction').textContent = cur !== undefined ? step.options[cur].reaction : '';
    $('random-btn').hidden = !step.allowRandom;
    $('next-btn').disabled = cur === undefined;
    wheelStep = i;
  }
  function choose(i, idx) {
    var step = C.steps[i];
    state.answers[step.id] = idx; save();
    Array.prototype.forEach.call($('options').children, function (el, k) { el.classList.toggle('selected', k === idx); });
    $('reaction').textContent = step.options[idx].reaction;
    $('next-btn').disabled = false;
    try { $('next-btn').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' }); } catch (e) {}
    vibrate(10); confetti(14);
  }
  $('next-btn').addEventListener('click', next);

  // ---------- колесо фортуны ----------
  var wheel = $('wheel'), wctx = wheel.getContext('2d'), rot = 0, spinning = false;
  var COLORS = ['#ff9eb1', '#ffd6dd', '#ffb3c1', '#ffe5ea'];
  function drawWheel() {
    var opts = C.steps[wheelStep].options, n = opts.length, seg = Math.PI * 2 / n, R = wheel.width / 2;
    wctx.clearRect(0, 0, wheel.width, wheel.height);
    wctx.save(); wctx.translate(R, R); wctx.rotate(rot);
    for (var i = 0; i < n; i++) {
      var a0 = -Math.PI / 2 + i * seg;
      wctx.beginPath(); wctx.moveTo(0, 0); wctx.arc(0, 0, R - 6, a0, a0 + seg); wctx.closePath();
      wctx.fillStyle = COLORS[i % COLORS.length]; wctx.fill();
      wctx.lineWidth = 3; wctx.strokeStyle = '#fff'; wctx.stroke();
      wctx.save(); wctx.rotate(a0 + seg / 2); wctx.textAlign = 'right'; wctx.textBaseline = 'middle';
      wctx.fillStyle = '#4a2030'; wctx.font = '800 38px Nunito, system-ui, sans-serif';
      wctx.fillText(opts[i].emoji, R - 28, 0);
      wctx.font = '800 26px Nunito, system-ui, sans-serif';
      var lbl = opts[i].label.length > 11 ? opts[i].label.slice(0, 10) + '…' : opts[i].label;
      wctx.fillText(lbl, R - 84, 0);
      wctx.restore();
    }
    wctx.restore();
  }
  $('random-btn').addEventListener('click', function () { rot = 0; $('wheel-modal').hidden = false; $('spin-btn').disabled = false; drawWheel(); });
  $('wheel-close').addEventListener('click', function () { if (!spinning) $('wheel-modal').hidden = true; });
  $('spin-btn').addEventListener('click', function () {
    if (spinning) return;
    var step = C.steps[wheelStep], n = step.options.length, seg = Math.PI * 2 / n;
    var target = Math.floor(Math.random() * n);
    var jitter = (Math.random() - .5) * seg * .7;
    var finalRot = (Math.PI * 2 * (5 + Math.floor(Math.random() * 3))) + ((Math.PI * 2 - (target + .5) * seg + jitter) % (Math.PI * 2));
    var from = rot % (Math.PI * 2), dur = reduceMotion ? 300 : 3400, t0 = performance.now();
    spinning = true; $('spin-btn').disabled = true;
    (function tick(now) {
      var p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      rot = from + (finalRot - from) * e; drawWheel();
      if (p < 1) return requestAnimationFrame(tick);
      spinning = false;
      choose(wheelStep, target); confetti(40);
      setTimeout(function () { $('wheel-modal').hidden = true; }, 900);
    })(t0);
  });

  // ---------- 4. дата ----------
  function renderDate() {
    $('date-day').textContent = dayText();
    $('date-time').textContent = timeText();
    $('date-note').textContent = C.date.note || '';
  }
  $('date-ok').addEventListener('click', function () { confetti(80); vibrate([30, 40, 30]); next(); });

  // ---------- 5. билет и отправка ----------
  function choicesLines() {
    return C.steps.map(function (s) {
      var a = state.answers[s.id]; if (a === undefined) return null;
      var o = s.options[a]; return (s.short || s.title) + ': ' + o.emoji + ' ' + o.label;
    }).filter(Boolean);
  }
  function messageText() {
    return C.messageTemplate.replace(/\{name\}/g, C.name)
      .replace(/\{date\}/g, dayText() + ', ' + timeText())
      .replace(/\{choices\}/g, choicesLines().join('\n'));
  }
  function row(dl, k, v) {
    var dt = document.createElement('dt'), dd = document.createElement('dd');
    dt.textContent = k; dd.textContent = v; dl.appendChild(dt); dl.appendChild(dd);
  }
  function renderTicket() {
    var dl = $('ticket-list'); dl.textContent = '';
    row(dl, 'Когда', dayText() + ', ' + timeText());
    C.steps.forEach(function (s) {
      var a = state.answers[s.id]; if (a === undefined) return;
      row(dl, s.short || s.title, s.options[a].emoji + ' ' + s.options[a].label);
    });
    row(dl, 'Место', C.placeText);
    if (C.date.note) row(dl, 'P.S.', C.date.note);

    var text = messageText(), enc = encodeURIComponent(text);
    var site = location.href.split('#')[0];
    $('send-tg').href = 'https://t.me/share/url?url=' + encodeURIComponent(site) + '&text=' + enc;
    var wa = (C.contact.whatsapp || '').replace(/\D/g, '');
    $('send-wa').hidden = !wa;
    if (wa) $('send-wa').href = 'https://wa.me/' + wa + '?text=' + enc;
    $('send-hint').textContent = C.contact.telegram
      ? 'Отправь мне итог: в Telegram выбери чат с @' + C.contact.telegram + ' и нажми «отправить».'
      : 'Отправь мне итог — в Telegram просто выбери чат со мной.';
    $('cal-google').href = 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent('Свидание 💕') +
      '&dates=' + floating(start) + '/' + floating(end) + '&details=' + encodeURIComponent(choicesLines().join('\n')) +
      '&location=' + encodeURIComponent('Сюрприз');
    $('copy-area').value = text; $('copy-area').hidden = true;
  }
  $('copy-btn').addEventListener('click', function () {
    var area = $('copy-area'), text = area.value, btn = $('copy-btn');
    function done() { btn.textContent = 'Скопировано ✅'; setTimeout(function () { btn.textContent = 'Скопировать текст 📋'; }, 2000); }
    function fallback() {
      area.hidden = false; area.focus(); area.select(); area.setSelectionRange(0, text.length);
      var ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
      if (ok) { area.hidden = true; done(); } // иначе оставляем текст на виду — можно выделить вручную
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback);
    else fallback();
  });
  function icsEscape(s) { return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }
  $('cal-ics').addEventListener('click', function () {
    var now = new Date();
    var stamp = now.getUTCFullYear() + pad(now.getUTCMonth() + 1) + pad(now.getUTCDate()) + 'T' + pad(now.getUTCHours()) + pad(now.getUTCMinutes()) + pad(now.getUTCSeconds()) + 'Z';
    var lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Valentine//RU', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
      'UID:' + hash(C.date.start + C.name) + '-' + stamp + '@valentine', 'DTSTAMP:' + stamp,
      'DTSTART:' + floating(start), 'DTEND:' + floating(end),
      'SUMMARY:' + icsEscape('Свидание 💕'), 'DESCRIPTION:' + icsEscape(choicesLines().join('\n')),
      'LOCATION:' + icsEscape('Сюрприз'), 'END:VEVENT', 'END:VCALENDAR'];
    var blob = new Blob([lines.join('\r\n') + '\r\n'], { type: 'text/calendar;charset=utf-8' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'date.ics';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
  });
  $('restart-btn').addEventListener('click', function () { state.answers = {}; clearSave(); show(2); });

  // ---------- старт ----------
  show(state.at);
})();
