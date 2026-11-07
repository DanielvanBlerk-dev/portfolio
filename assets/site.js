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
      '<div class="cc-actions">' +
      '<button type="button" class="cc-accept">Accept</button>' +
      '<button type="button" class="cc-essential">Essential only</button>' +
      '</div>';
    banner.querySelector('.cc-accept').addEventListener('click', function () { decide('all'); });
    banner.querySelector('.cc-essential').addEventListener('click', function () { decide('essential'); });
    document.body.appendChild(banner);
  }
  function showBanner(focus) {
    if (!banner) buildBanner();
    banner.hidden = false;
    if (focus === true) banner.querySelector('.cc-accept').focus({ preventScroll: true });
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
    document.querySelectorAll('.service-card[onclick]').forEach(function (card) {
      var title = card.querySelector('h3, .service-title, .service-name');
      card.setAttribute('tabindex', '0');
      card.setAttribute('role', 'link');
      if (title) card.setAttribute('aria-label', title.textContent.trim() + ' — learn more');
      activateOnKey(card);
    });
    document.querySelectorAll('.project-card').forEach(function (card) {
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

    var opener = null;
    new MutationObserver(function () {
      var open = bg.classList.contains('open');
      bg.setAttribute('aria-hidden', open ? 'false' : 'true');
      if (open) {
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
