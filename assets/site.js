/* dkvb.dev shared behaviour: cookie/storage consent + keyboard and screen-reader support. */
(function () {
  'use strict';

  /* ── Consent ───────────────────────────────────────────────────────────
     The site sets no cookies and runs no analytics or advertising trackers.
     The only optional browser storage is the mailing-list pop-up remembering
     that you closed it or signed up. "Essential only" keeps that memory for
     the current tab session only. Your choice itself is stored as essential. */
  var KEY = 'dkvb-consent';
  var VERSION = 1;
  var listeners = [];

  function readChoice() {
    try {
      var c = JSON.parse(localStorage.getItem(KEY));
      return c && c.v === VERSION ? c.pref : null;
    } catch (e) { return null; }
  }

  var choice = readChoice();

  window.dkvbConsent = {
    get: function () { return choice; },                       // 'all' | 'essential' | null
    onDecided: function (cb) { if (choice) cb(choice); else listeners.push(cb); },
    open: function () { showBanner(true); }
  };

  function decide(pref) {
    choice = pref;
    try { localStorage.setItem(KEY, JSON.stringify({ v: VERSION, pref: pref, t: new Date().toISOString() })); } catch (e) {}
    if (pref === 'essential') {
      try { localStorage.removeItem('dkvb-ml'); } catch (e) {}
    }
    hideBanner();
    var l = listeners; listeners = [];
    l.forEach(function (cb) { cb(pref); });
  }

  var banner;
  function buildBanner() {
    banner = document.createElement('section');
    banner.className = 'cc-banner';
    banner.setAttribute('role', 'region');
    banner.setAttribute('aria-label', 'Cookie and storage preferences');
    banner.hidden = true;
    banner.innerHTML =
      '<h2>Your privacy choices</h2>' +
      '<p>This site uses no tracking or advertising cookies. With your OK, it saves a small note in your browser so the ' +
      'mailing-list pop-up doesn’t keep reappearing. <a href="cookies.html">Cookie Policy</a></p>' +
      '<p class="cc-status" aria-live="polite"></p>' +
      '<div class="cc-actions">' +
      '<button type="button" class="cc-accept">Accept</button>' +
      '<button type="button" class="cc-essential">Essential only</button>' +
      '</div>';
    banner.querySelector('.cc-accept').addEventListener('click', function () { decide('all'); });
    banner.querySelector('.cc-essential').addEventListener('click', function () { decide('essential'); });
    document.body.appendChild(banner);
  }
  // fromSettings: opened by a "Cookie settings" button, so show the current choice,
  // draw attention to the banner (it may already be open) and move focus into it.
  function showBanner(fromSettings) {
    if (!banner) buildBanner();
    var accept = banner.querySelector('.cc-accept');
    var essential = banner.querySelector('.cc-essential');
    var status = banner.querySelector('.cc-status');
    accept.setAttribute('aria-pressed', choice === 'all' ? 'true' : 'false');
    essential.setAttribute('aria-pressed', choice === 'essential' ? 'true' : 'false');
    status.textContent = choice
      ? 'Current choice: ' + (choice === 'all' ? 'Accept' : 'Essential only') + '. Pick again to change it.'
      : '';
    banner.hidden = false;
    if (fromSettings === true) {
      banner.classList.remove('cc-attn');
      void banner.offsetWidth; // restart the animation if the banner was already showing
      banner.classList.add('cc-attn');
      (choice === 'essential' ? essential : accept).focus({ preventScroll: true });
    }
  }
  function hideBanner() { if (banner) banner.hidden = true; }

  /* ── Keyboard access for clickable cards ─────────────────────────────── */
  function activateOnKey(el) {
    el.addEventListener('keydown', function (e) {
      if (e.target !== el) return;
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); }
    });
  }

  function enhanceCards() {
    // Service cards are real links now; only the project rows need help.
    document.querySelectorAll('.project-card').forEach(function (card) {
      if (card.tagName === 'BUTTON') return;
      var title = card.dataset.title || (card.querySelector('h3, .project-title, .project-name') || {}).textContent || 'project';
      card.setAttribute('tabindex', '0');
      card.setAttribute('role', 'button');
      card.setAttribute('aria-haspopup', 'dialog');
      card.setAttribute('aria-label', 'View project details: ' + String(title).trim());
      activateOnKey(card);
    });
  }

  /* ── Project viewer as an accessible dialog ──────────────────────────── */
  function enhanceModal() {
    var bg = document.getElementById('modalBg');
    if (!bg) return;
    var dialog = bg.querySelector('.modal');
    var closeBtn = document.getElementById('modalClose');
    var title = document.getElementById('modalTitle');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    if (title) dialog.setAttribute('aria-labelledby', 'modalTitle');
    else dialog.setAttribute('aria-label', 'Project details');
    if (closeBtn) closeBtn.setAttribute('aria-label', 'Close project details');
    bg.setAttribute('aria-hidden', 'true');

    // Screenshot strip: Back and Next show only when there is more to see, and grey out at each end.
    var track = document.getElementById('modalScreenshotTrack');
    var back = document.getElementById('modalScrollLeft');
    var next = document.getElementById('modalScrollRight');
    var hint = bg.querySelector('.modal-screenshot-hint');
    function syncStrip() {
      if (!track || !back || !next) return;
      var more = track.scrollWidth > track.clientWidth + 2;
      [back, next, hint].forEach(function (el) { if (el) el.hidden = !more; });
      back.disabled = !more || track.scrollLeft <= 2;
      next.disabled = !more || track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
    }
    // Back and Next step one screenshot at a time. They run before the page's own handlers and replace them,
    // because a fixed-distance smooth scroll is unreliable against the strip's snap points.
    function step(dir) {
      var items = Array.prototype.slice.call(track.querySelectorAll('.modal-screenshot'));
      var x = track.scrollLeft, max = track.scrollWidth - track.clientWidth, target;
      var lefts = items.map(function (el) { return el.offsetLeft - track.offsetLeft; });
      if (dir > 0) {
        target = lefts.filter(function (l) { return l > x + 4; })[0];
        if (target === undefined || target > max) target = max;
      } else {
        var before = lefts.filter(function (l) { return l < x - 4; });
        target = before.length ? before[before.length - 1] : 0;
      }
      var smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      track.scrollTo({ left: target, behavior: smooth ? 'smooth' : 'auto' });
      setTimeout(function () { if (Math.abs(track.scrollLeft - x) < 1 && Math.abs(target - x) >= 1) track.scrollLeft = target; syncStrip(); }, 450);
    }
    [[back, -1], [next, 1]].forEach(function (pair) {
      if (!pair[0] || !track) return;
      pair[0].addEventListener('click', function (e) { e.stopImmediatePropagation(); step(pair[1]); }, true);
    });

    if (track) {
      track.addEventListener('scroll', syncStrip, { passive: true });
      track.addEventListener('load', syncStrip, true);
      window.addEventListener('resize', syncStrip);
      new MutationObserver(syncStrip).observe(track, { childList: true });
    }

    var opener = null;
    new MutationObserver(function () {
      var open = bg.classList.contains('open');
      bg.setAttribute('aria-hidden', open ? 'false' : 'true');
      if (open) {
        if (track) track.scrollLeft = 0;
        setTimeout(syncStrip, 60);
        opener = document.activeElement;
        setTimeout(function () { if (closeBtn) closeBtn.focus(); }, 50);
      } else if (opener && opener.focus) {
        opener.focus();
        opener = null;
      }
    }).observe(bg, { attributes: true, attributeFilter: ['class'] });

    document.addEventListener('keydown', function (e) {
      if (!bg.classList.contains('open')) return;
      if (e.key === 'Escape') { bg.classList.remove('open'); return; }
      if (e.key !== 'Tab') return;
      var f = Array.prototype.filter.call(
        dialog.querySelectorAll('a[href], button, [tabindex]:not([tabindex="-1"])'),
        function (n) { return n.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  function init() {
    enhanceCards();
    enhanceModal();
    document.querySelectorAll('[data-cookie-settings]').forEach(function (b) {
      b.addEventListener('click', function () { showBanner(true); });
    });
    if (!choice) showBanner();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
