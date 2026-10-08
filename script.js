(function () {
  var root = document.documentElement;
  var hero = document.getElementById('home');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Portrait ----------
     To use your own photo: export a PNG with a transparent background
     (head and shoulders, roughly 3:4), save it next to this file and set
     AVATAR_SRC = 'me.png'. The outline effect follows its shape automatically. */
  var AVATAR_SRC = 'me.png';

  var TORSO = 'M30 860C30 705 165 616 236 588H364C435 616 570 705 570 860Z';
  var NECK  = 'M246 460H354L360 592C332 618 268 618 240 592Z';
  var HAIR  = 'M186 335C170 215 250 178 306 178C384 178 432 226 414 337C402 292 372 262 302 260C238 262 204 292 186 335Z';
  var HEAD  = '<ellipse cx="300" cy="345" rx="108" ry="132"/>';
  var EARS  = '<ellipse cx="193" cy="362" rx="14" ry="28"/><ellipse cx="407" cy="362" rx="14" ry="28"/>';

  var svgShown =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 860">' +
    '<defs>' +
      '<linearGradient id="t" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#34322e"/><stop offset="1" stop-color="#121110"/></linearGradient>' +
      '<linearGradient id="n" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a2721"/><stop offset="1" stop-color="#655c4b"/></linearGradient>' +
      '<radialGradient id="s" cx=".36" cy=".3" r=".9"><stop offset="0" stop-color="#b4a68b"/><stop offset=".5" stop-color="#7e725e"/><stop offset="1" stop-color="#37322a"/></radialGradient>' +
      '<linearGradient id="h" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2d2a26"/><stop offset="1" stop-color="#0c0b0a"/></linearGradient>' +
    '</defs>' +
    '<path d="' + TORSO + '" fill="url(#t)"/>' +
    '<path d="M30 860C30 705 165 616 236 588H364C435 616 570 705 570 860" fill="none" stroke="#4a4740" stroke-width="3"/>' +
    '<path d="' + NECK + '" fill="url(#n)"/>' +
    '<g fill="#5d5443">' + EARS + '</g>' +
    '<g fill="url(#s)">' + HEAD + '</g>' +
    '<path d="' + HAIR + '" fill="url(#h)"/>' +
    '</svg>';

  var svgMask =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 860"><g fill="#000">' +
    '<path d="' + TORSO + '"/><path d="' + NECK + '"/>' + EARS + HEAD + '<path d="' + HAIR + '"/></g></svg>';

  function dataUri(s) { return 'url("data:image/svg+xml,' + encodeURIComponent(s) + '")'; }
  if (AVATAR_SRC) {
    root.style.setProperty('--avatar', 'url("' + AVATAR_SRC + '")');
    root.style.setProperty('--avatar-mask', 'url("' + AVATAR_SRC + '")');
  } else {
    root.style.setProperty('--avatar', dataUri(svgShown));
    root.style.setProperty('--avatar-mask', dataUri(svgMask));
  }

  /* ---------- Split the name into letters (two copies: solid + outline) ---------- */
  var fillEl = document.getElementById('nameFill');
  var outEl = document.getElementById('nameOutline');
  var words = fillEl.textContent.trim().split(/\s+/);

  function build(el) {
    el.textContent = '';
    var i = 0;
    words.forEach(function (w) {
      var ws = document.createElement('span');
      ws.className = 'word';
      Array.from(w).forEach(function (c) {
        var s = document.createElement('span');
        s.className = 'ch';
        s.style.setProperty('--i', i++);
        s.textContent = c;
        ws.appendChild(s);
      });
      el.appendChild(ws);
    });
  }
  build(fillEl);
  build(outEl);

  /* ---------- Fit the name to the screen ---------- */
  function fit() {
    hero.style.setProperty('--fs', '100px');
    var w = fillEl.getBoundingClientRect().width;
    if (!w) return;
    var stacked = getComputedStyle(fillEl.querySelector('.word')).display === 'block';
    var target = hero.clientWidth * (stacked ? 0.9 : 0.94);
    var fs = 100 * target / w;
    var cap = hero.clientHeight * (stacked ? 0.3 : 0.46);
    hero.style.setProperty('--fs', Math.min(fs, cap).toFixed(1) + 'px');
  }
  fit();
  var raf;
  window.addEventListener('resize', function () { cancelAnimationFrame(raf); raf = requestAnimationFrame(fit); });

  /* ---------- Start the entrance once the display font is ready ---------- */
  var started = false;
  function start() {
    if (started) return;
    started = true;
    fit();
    root.classList.add('ready');
  }
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { setTimeout(start, 60); });
  }
  setTimeout(start, 1800);

  /* ---------- Gentle parallax on the lettering (mouse only) ---------- */
  if (!reduce && window.matchMedia('(pointer: fine)').matches) {
    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect();
      hero.style.setProperty('--px', (((e.clientX - r.left) / r.width) - 0.5) * 26);
      hero.style.setProperty('--py', (((e.clientY - r.top) / r.height) - 0.5) * 26);
    });
    hero.addEventListener('pointerleave', function () {
      hero.style.setProperty('--px', 0);
      hero.style.setProperty('--py', 0);
    });
  }

  /* ---------- Mobile menu ---------- */
  var drawer = document.getElementById('drawer');
  var menuBtn = document.querySelector('.bar__menu');
  function setMenu(open) {
    drawer.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', open);
    menuBtn.textContent = open ? 'Close' : 'Menu';
    if (open) { drawer.removeAttribute('inert'); } else { drawer.setAttribute('inert', ''); }
    document.body.style.overflow = open ? 'hidden' : '';
  }
  menuBtn.addEventListener('click', function () { setMenu(!drawer.classList.contains('open')); });
  drawer.addEventListener('click', function (e) { if (e.target.tagName === 'A') setMenu(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
  window.addEventListener('resize', function () { if (window.innerWidth > 720) setMenu(false); });

  /* ---------- Current section in the nav ---------- */
  var links = document.querySelectorAll('.bar__nav a');
  if ('IntersectionObserver' in window) {
    var navIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (a) {
          a.setAttribute('aria-current', a.getAttribute('href') === '#' + en.target.id ? 'true' : 'false');
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    document.querySelectorAll('main section[id]').forEach(function (s) { navIO.observe(s); });

    /* ---------- Skill words fill as they scroll into view ---------- */
    var skillIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); skillIO.unobserve(en.target); }
      });
    }, { threshold: 0.6 });
    document.querySelectorAll('.skill').forEach(function (s) { skillIO.observe(s); });
  } else {
    document.querySelectorAll('.skill').forEach(function (s) { s.classList.add('in'); });
  }

  /* ---------- Copy email ---------- */
  var toast = document.getElementById('toast');
  var t;
  document.getElementById('copy').addEventListener('click', function () {
    var addr = document.getElementById('mail').textContent.trim();
    function say(msg) {
      toast.textContent = msg;
      toast.classList.add('show');
      clearTimeout(t);
      t = setTimeout(function () { toast.classList.remove('show'); }, 2000);
    }
    try {
      navigator.clipboard.writeText(addr).then(function () { say('Email copied'); }, function () { say('Copy failed. Select the address instead.'); });
    } catch (err) { say('Copy failed. Select the address instead.'); }
  });
})();