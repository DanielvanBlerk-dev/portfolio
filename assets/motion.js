/* dkvb.dev shared behaviour for the Lumen redesign: header retract, menu, diagram loops. */
document.documentElement.classList.add('js');

(function () {
  'use strict';

  function init() {
    /* The banner line slides away on scroll down and returns on scroll up. */
    var header = document.querySelector('.site-header');
    if (header) {
      var last = window.scrollY, ticking = false;
      window.addEventListener('scroll', function () {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(function () {
          var y = window.scrollY;
          if (y > 80 && y > last) header.classList.add('is-retracted');
          else if (y < last || y <= 80) header.classList.remove('is-retracted');
          last = y;
          ticking = false;
        });
      }, { passive: true });
    }

    /* Menu on service and legal pages (the home page keeps its own handler). */
    var toggle = document.getElementById('siteNavToggle');
    var menu = document.getElementById('siteNavMenu');
    if (toggle && menu) {
      toggle.addEventListener('click', function () {
        var open = menu.classList.toggle('open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        toggle.textContent = open ? 'Close' : 'Menu';
      });
      menu.querySelectorAll('a').forEach(function (a) {
        a.addEventListener('click', function () {
          menu.classList.remove('open');
          toggle.setAttribute('aria-expanded', 'false');
          toggle.textContent = 'Menu';
        });
      });
    }

    /* Diagram loops: run only while on screen, pause on hover, focus or request. */
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.querySelectorAll('[data-loop]').forEach(function (el) {
      var btn = el.querySelector('[data-loop-toggle]');
      var s = { seen: false, hover: false, focus: false, held: reduced };
      function sync() {
        var run = s.seen && !s.hover && !s.focus && !s.held;
        el.classList.toggle('is-running', run);
        if (btn) {
          btn.textContent = s.held ? 'Play' : 'Pause';
          btn.setAttribute('aria-pressed', s.held ? 'true' : 'false');
          btn.disabled = reduced;
        }
      }
      if (btn) btn.addEventListener('click', function () { s.held = !s.held; sync(); });
      el.addEventListener('pointerenter', function () { s.hover = true; sync(); });
      el.addEventListener('pointerleave', function () { s.hover = false; sync(); });
      el.addEventListener('focusin', function (e) { if (e.target !== btn) { s.focus = true; sync(); } });
      el.addEventListener('focusout', function () { s.focus = false; sync(); });
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) { s.seen = entries[0].isIntersecting; sync(); }).observe(el);
      } else { s.seen = true; }
      sync();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
