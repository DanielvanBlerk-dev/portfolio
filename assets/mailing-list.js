/* dkvb.dev mailing-list pop-up
   Shown once to first-time visitors, styled from the site's Lumen tokens.
   Preview any time with  ?mailinglist=1  on any page URL. */
(function () {
  'use strict';

  var ENDPOINT = 'https://formspree.io/f/mkoyqapk'; // swap for a dedicated Formspree form ID to separate list signups from contact messages
  var KEY = 'dkvb-ml';                // localStorage: { s: subscribed, d: dismissed-at }
  var SNOOZE_DAYS = 30;               // how long a dismissal is respected
  var DELAY_MS = 7000;                // time-on-page trigger
  var SCROLL_TRIGGER = 0.35;          // scroll-depth trigger

  var forced = /[?&]mailinglist=1\b/.test(location.search);

  // Persistent memory only with consent (see assets/site.js); otherwise this tab session only.
  function store() {
    var c = window.dkvbConsent && window.dkvbConsent.get();
    try { return c === 'all' ? localStorage : sessionStorage; } catch (e) { return null; }
  }
  function read() {
    try { return JSON.parse(store().getItem(KEY)) || {}; } catch (e) { return {}; }
  }
  function write(v) {
    try { store().setItem(KEY, JSON.stringify(v)); } catch (e) {}
  }

  var css = '\
.ml-root{position:fixed;inset:0;z-index:var(--z-modal);display:flex;align-items:center;justify-content:center;padding:var(--space-md);opacity:0;visibility:hidden;transition:opacity var(--dur-long) var(--ease-out),visibility 0s linear var(--dur-long)}\
.ml-root.ml-open{opacity:1;visibility:visible;transition:opacity var(--dur-long) var(--ease-out),visibility 0s}\
.ml-backdrop{position:absolute;inset:0;background:color-mix(in oklab,var(--color-paper) 84%,transparent)}\
.ml-card{position:relative;display:grid;grid-template-columns:minmax(0,5fr) minmax(0,6fr);width:min(860px,100%);max-height:calc(100dvh - var(--space-xl));overflow:auto;background:var(--color-paper-2);border:var(--rule-hair) solid var(--color-rule-2);border-radius:var(--radius-card);box-shadow:var(--shadow-card);color:var(--color-ink);transform:translateY(8px);transition:transform var(--dur-long) var(--ease-out)}\
.ml-open .ml-card{transform:none}\
.ml-visual{position:relative;display:flex;flex-direction:column;justify-content:flex-end;gap:var(--space-md);padding:var(--space-xl);border-right:var(--rule-hair) solid var(--color-rule);background-color:var(--color-paper)}\
.ml-issue{display:grid;gap:var(--space-xs);margin:0;padding:0;list-style:none}\
.ml-issue li{padding:var(--space-sm) var(--space-md);border:var(--rule-hair) solid var(--color-rule-2);border-radius:calc(var(--radius-card) - 2px);background:var(--color-paper-2);font:400 var(--text-sm)/1.4 var(--font-body);color:var(--color-ink-2)}\
.ml-issue li b{display:block;font-weight:400;color:var(--color-ink)}\
.ml-visual p{font-size:var(--text-sm);color:var(--color-muted)}\
.ml-body{padding:var(--space-xl);display:flex;flex-direction:column;justify-content:center}\
.ml-title{font-family:var(--font-display);font-weight:400;font-size:var(--text-3xl);line-height:1;letter-spacing:var(--tracking-display);margin:0 0 var(--space-md)}\
.ml-sub{line-height:1.55;color:var(--color-ink-2);margin:0 0 var(--space-lg)}\
.ml-list{list-style:none;margin:0 0 var(--space-lg);padding:0;display:grid;gap:0}\
.ml-list li{padding:var(--space-xs) 0;border-top:var(--rule-hair) solid var(--color-rule);font-size:var(--text-sm);line-height:1.45;color:var(--color-ink-2)}\
.ml-root .ml-form{display:flex;flex-direction:row;align-items:stretch;gap:var(--space-xs);margin:0;max-width:none}\
.ml-root .ml-input{width:auto;flex:1;min-width:0;min-height:48px;margin:0;background:var(--color-paper);border:var(--rule-hair) solid var(--color-rule-2);border-radius:var(--radius-pill);padding:0 var(--space-md);color:var(--color-ink);font:inherit;outline:2px solid transparent;outline-offset:2px}\
.ml-input::placeholder{color:var(--color-muted)}\
.ml-input:hover{border-color:var(--color-muted)}\
.ml-input:focus-visible{outline-color:var(--color-focus)}\
.ml-root .ml-btn{width:auto;min-height:48px;margin:0;flex:0 0 auto;white-space:nowrap;border:0;border-radius:var(--radius-pill);padding:0 var(--space-lg);background:var(--color-accent);color:var(--color-accent-ink);font:500 var(--text-md)/1 var(--font-body);cursor:pointer;transition:background-color var(--dur-short) var(--ease-out),transform var(--dur-micro) var(--ease-out)}\
.ml-btn:hover{background:var(--color-ink)}\
.ml-btn:active{transform:translateY(1px)}\
.ml-btn:focus-visible{outline:2px solid var(--color-focus);outline-offset:3px}\
.ml-btn:disabled{opacity:.55;cursor:not-allowed;transform:none}\
.ml-fine{margin:var(--space-sm) 0 0;font-size:var(--text-sm);line-height:1.5;color:var(--color-muted)}\
.ml-fine a{color:var(--color-ink);text-decoration-color:var(--color-accent)}\
.ml-err{min-height:1lh;margin:var(--space-xs) 0 0;font-size:var(--text-sm);color:var(--color-error)}\
.ml-hp{position:absolute!important;left:-9999px;opacity:0;pointer-events:none}\
.ml-close{position:absolute;top:var(--space-sm);right:var(--space-sm);z-index:var(--z-raised);min-height:44px;padding:0 var(--space-md);border:0;border-radius:var(--radius-pill);background:var(--color-paper);color:var(--color-ink);box-shadow:inset 0 0 0 var(--rule-hair) var(--color-rule-2);font:400 var(--text-sm)/1 var(--font-body);cursor:pointer;transition:background-color var(--dur-short) var(--ease-out)}\
.ml-close:hover{background:var(--color-paper-3)}\
.ml-close:active{transform:translateY(1px)}\
.ml-close:focus-visible{outline:2px solid var(--color-focus);outline-offset:2px}\
.ml-skip{align-self:flex-start;min-height:44px;margin-top:var(--space-xs);background:none;border:0;padding:0;color:var(--color-ink-2);font:inherit;font-size:var(--text-sm);cursor:pointer;text-decoration:underline;text-decoration-color:var(--color-rule-2);text-underline-offset:0.25em}\
.ml-skip:hover{color:var(--color-ink);text-decoration-color:var(--color-accent)}\
.ml-skip:active{color:var(--color-muted)}\
.ml-skip:focus-visible{outline:2px solid var(--color-focus);outline-offset:2px}\
.ml-done{display:none}\
.ml-card.ml-ok .ml-pre{display:none}\
.ml-card.ml-ok .ml-done{display:block}\
@media(max-width:45rem){\
.ml-root{align-items:flex-end;padding:0}\
.ml-card{grid-template-columns:minmax(0,1fr);width:100%;border-radius:var(--radius-card) var(--radius-card) 0 0;max-height:92dvh}\
.ml-visual{display:none}\
.ml-body{padding:var(--space-xl) var(--space-lg) var(--space-lg)}\
.ml-root .ml-form{flex-direction:column}\
}\
@media(prefers-reduced-motion:reduce){.ml-root,.ml-card{transition:none!important}.ml-card{transform:none}}';

  var html = '\
<div class="ml-backdrop" data-ml-close></div>\
<div class="ml-card" role="dialog" aria-modal="true" aria-labelledby="ml-title" aria-describedby="ml-sub">\
<button class="ml-close" type="button" aria-label="Close" data-ml-close>Close</button>\
<div class="ml-visual" aria-hidden="true">\
<ul class="ml-issue">\
<li><b>New projects</b>A first look, with the case notes</li>\
<li><b>Android, web, Firebase</b>Tips from real builds</li>\
<li><b>Freelance slots</b>Early notice when one opens</li>\
</ul>\
<p>What each email covers.</p>\
</div>\
<div class="ml-body">\
<div class="ml-pre">\
<h2 class="ml-title" id="ml-title">Build notes, by email</h2>\
<p class="ml-sub" id="ml-sub">Short emails from a working Android and full stack developer, straight from real client builds.</p>\
<ul class="ml-list">\
<li>First look at new projects and behind-the-scenes case studies</li>\
<li>Practical Android, web and Firebase tips you can use the same day</li>\
<li>Early notice when I open up freelance slots</li>\
</ul>\
<form class="ml-form" novalidate>\
<input class="ml-hp" type="text" name="_gotcha" tabindex="-1" autocomplete="off" aria-hidden="true">\
<input class="ml-input" type="email" name="email" placeholder="you@email.com" autocomplete="email" required aria-label="Email address">\
<button class="ml-btn" type="submit">Count me in</button>\
</form>\
<p class="ml-err" role="alert" aria-live="polite"></p>\
<p class="ml-fine">No spam, ever. Unsubscribe any time. By joining you agree to receive emails from dkvb.dev and to the <a href="privacy.html">Privacy Policy</a>.</p>\
<button class="ml-skip" type="button" data-ml-close>No thanks, maybe later</button>\
</div>\
<div class="ml-done" role="status" aria-live="polite">\
<h2 class="ml-title">You&rsquo;re on the list</h2>\
<p class="ml-sub">Welcome aboard. The first build notes will land in your inbox soon. Thanks for being early.</p>\
<button class="ml-btn" type="button" data-ml-close>Back to the site</button>\
</div>\
</div>\
</div>';

  var root, card, lastFocus, shown = false;

  function build() {
    var st = document.createElement('style');
    st.textContent = css;
    document.head.appendChild(st);
    root = document.createElement('div');
    root.className = 'ml-root';
    root.innerHTML = html;
    document.body.appendChild(root);
    card = root.querySelector('.ml-card');

    root.addEventListener('click', function (e) {
      if (e.target.closest('[data-ml-close]')) close();
    });
    root.querySelector('form').addEventListener('submit', submit);
    document.addEventListener('keydown', keys);
  }

  function open() {
    if (shown) return;
    shown = true;
    build();
    lastFocus = document.activeElement;
    void root.offsetWidth; // commit the hidden state so the open transition plays
    root.classList.add('ml-open');
    var input = root.querySelector('.ml-input');
    setTimeout(function () { input.focus({ preventScroll: true }); }, 450);
  }

  function close() {
    if (!root) return;
    root.classList.remove('ml-open');
    document.removeEventListener('keydown', keys);
    if (!read().s) write({ d: Date.now() });
    setTimeout(function () { if (root) { root.remove(); root = null; } }, 400);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function keys(e) {
    if (e.key === 'Escape') { close(); return; }
    if (e.key !== 'Tab') return;
    var f = card.querySelectorAll('button, input:not(.ml-hp)');
    f = Array.prototype.filter.call(f, function (n) { return n.offsetParent !== null; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function submit(e) {
    e.preventDefault();
    var form = e.target;
    var email = form.email.value.trim();
    var err = root.querySelector('.ml-err');
    var btn = form.querySelector('.ml-btn');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      err.textContent = 'Please enter a valid email address.';
      form.email.focus();
      return;
    }
    err.textContent = '';
    btn.disabled = true;
    btn.textContent = 'Joining…';
    var data = new FormData();
    data.append('email', email);
    data.append('_gotcha', form._gotcha.value);
    data.append('form_type', 'mailing-list');
    data.append('_subject', 'New mailing list signup');
    fetch(ENDPOINT, { method: 'POST', headers: { Accept: 'application/json' }, body: data })
      .then(function (res) {
        if (!res.ok) throw new Error('bad status');
        write({ s: 1 });
        card.classList.add('ml-ok');
        root.querySelector('.ml-done .ml-btn').focus();
      })
      .catch(function () {
        err.textContent = 'Something went wrong — please try again, or email dkvb.dev@gmail.com.';
        btn.disabled = false;
        btn.textContent = 'Count me in';
      });
  }

  /* Triggers: whichever comes first — time on page, scroll depth, or (desktop) exit intent. */
  function arm() {
    if (forced) { open(); return; }
    var state = read();
    if (state.s) return;
    if (state.d && Date.now() - state.d < SNOOZE_DAYS * 864e5) return;
    var fired = false;
    function go() {
      if (fired) return;
      fired = true;
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('mouseout', onOut);
      open();
    }
    function onScroll() {
      var h = document.documentElement.scrollHeight - innerHeight;
      if (h > 0 && scrollY / h > SCROLL_TRIGGER) go();
    }
    function onOut(e) { if (!e.relatedTarget && e.clientY <= 0) go(); }
    setTimeout(go, DELAY_MS);
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('mouseout', onOut);
  }

  // Wait for the cookie banner to be answered so the two never stack.
  function start() {
    if (forced || !window.dkvbConsent) arm();
    else window.dkvbConsent.onDecided(function () { arm(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
