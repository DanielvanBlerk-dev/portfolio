/* dkvb.dev mailing-list pop-up
   Shown once to first-time visitors. Adopts each page's --accent colour.
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
.ml-root{position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;padding:1rem;opacity:0;visibility:hidden;transition:opacity .35s ease,visibility .35s}\
.ml-root.ml-open{opacity:1;visibility:visible}\
.ml-backdrop{position:absolute;inset:0;background:rgba(5,5,10,.72);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}\
.ml-card{--a:var(--accent,#00e5a0);position:relative;display:grid;grid-template-columns:5fr 6fr;width:min(860px,100%);max-height:calc(100vh - 2rem);overflow:auto;background:#0e0e16;border:1px solid color-mix(in srgb,var(--a) 35%,#2a2a3a);border-radius:20px;box-shadow:0 0 0 1px rgba(255,255,255,.03),0 30px 90px rgba(0,0,0,.65),0 0 80px color-mix(in srgb,var(--a) 18%,transparent);transform:translateY(24px) scale(.96);transition:transform .45s cubic-bezier(.2,.9,.3,1.2);color:var(--text,#e8e8f0)}\
.ml-open .ml-card{transform:none}\
.ml-visual{position:relative;overflow:hidden;min-height:420px;padding:2rem;display:flex;flex-direction:column;justify-content:flex-end;background:radial-gradient(120% 90% at 0% 0%,color-mix(in srgb,var(--a) 45%,transparent),transparent 60%),radial-gradient(90% 80% at 100% 100%,color-mix(in srgb,var(--accent2,#7b5ea7) 55%,transparent),transparent 60%),#0a0a12}\
.ml-visual::before{content:"";position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.05) 1px,transparent 1px);background-size:28px 28px;-webkit-mask-image:radial-gradient(circle at 30% 30%,#000,transparent 75%);mask-image:radial-gradient(circle at 30% 30%,#000,transparent 75%)}\
.ml-orb{position:absolute;top:12%;left:50%;width:150px;height:150px;margin-left:-75px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff,var(--a) 35%,transparent 72%);filter:blur(1px);opacity:.9;animation:ml-float 6s ease-in-out infinite}\
.ml-orb::after{content:"";position:absolute;inset:-26px;border-radius:50%;border:1px solid color-mix(in srgb,var(--a) 50%,transparent);animation:ml-ring 3.2s ease-out infinite}\
.ml-term{position:relative;font-family:var(--mono,"DM Mono",monospace);font-size:.74rem;line-height:1.75;color:rgba(232,232,240,.75);background:rgba(8,8,14,.7);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:.9rem 1rem}\
.ml-term b{color:var(--a);font-weight:500}\
.ml-caret{display:inline-block;width:7px;height:.95em;margin-left:2px;vertical-align:-2px;background:var(--a);animation:ml-blink 1s steps(1) infinite}\
.ml-body{padding:2.6rem 2.4rem 2.2rem;display:flex;flex-direction:column;justify-content:center}\
.ml-eyebrow{font-family:var(--mono,"DM Mono",monospace);font-size:.7rem;letter-spacing:.16em;text-transform:uppercase;color:var(--a);margin-bottom:.9rem}\
.ml-title{font-family:var(--heading,"Syne",sans-serif);font-weight:800;font-size:clamp(1.7rem,3.4vw,2.35rem);line-height:1.08;letter-spacing:-.02em;margin:0 0 .9rem}\
.ml-title span{color:var(--a)}\
.ml-sub{font-size:.95rem;line-height:1.6;color:var(--muted,#8a8aa0);margin:0 0 1.3rem}\
.ml-list{list-style:none;margin:0 0 1.5rem;padding:0;display:grid;gap:.6rem}\
.ml-list li{display:flex;gap:.7rem;align-items:flex-start;font-size:.88rem;line-height:1.45}\
.ml-list li::before{content:"";flex:0 0 18px;height:18px;margin-top:1px;border-radius:50%;background:color-mix(in srgb,var(--a) 22%,transparent) url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 16 16\'%3E%3Cpath d=\'M4 8.4l2.6 2.6L12 5.6\' fill=\'none\' stroke=\'%23fff\' stroke-width=\'1.8\' stroke-linecap=\'round\' stroke-linejoin=\'round\'/%3E%3C/svg%3E") center/12px no-repeat}\
.ml-root .ml-form{display:flex;flex-direction:row;align-items:stretch;gap:.5rem;margin:0;max-width:none}\
.ml-root .ml-input{width:auto;flex:1;min-width:0;margin:0;background:#08080e;border:1px solid #2a2a3a;border-radius:10px;padding:.95rem 1rem;color:inherit;font:inherit;font-size:.92rem;outline:none;transition:border-color .2s,box-shadow .2s}\
.ml-input::placeholder{color:#7a7a90}\
.ml-input:focus{border-color:var(--a);box-shadow:0 0 0 3px color-mix(in srgb,var(--a) 22%,transparent)}\
.ml-root .ml-btn{width:auto;margin:0;flex:0 0 auto;white-space:nowrap;border:0;border-radius:10px;padding:.95rem 1.3rem;background:var(--a);color:#07070c;font-family:var(--mono,"DM Mono",monospace);font-weight:500;font-size:.78rem;letter-spacing:.07em;text-transform:uppercase;cursor:pointer;transition:transform .2s,box-shadow .2s,filter .2s}\
.ml-btn:hover{transform:translateY(-2px);box-shadow:0 10px 30px color-mix(in srgb,var(--a) 40%,transparent);filter:brightness(1.1)}\
.ml-btn:disabled{opacity:.6;cursor:wait;transform:none;box-shadow:none}\
.ml-fine{margin:.85rem 0 0;font-family:var(--mono,"DM Mono",monospace);font-size:.7rem;line-height:1.5;color:#8e8ea4}\n.ml-fine a{color:var(--a);text-decoration:underline}\
.ml-err{min-height:1.1em;margin:.55rem 0 0;font-size:.78rem;color:#ff7a7a}\
.ml-hp{position:absolute!important;left:-9999px;opacity:0;pointer-events:none}\
.ml-close{position:absolute;top:.8rem;right:.8rem;z-index:2;width:36px;height:36px;border-radius:50%;border:1px solid rgba(255,255,255,.12);background:rgba(10,10,16,.6);color:#c8c8d8;font-size:1.15rem;line-height:1;cursor:pointer;transition:background .2s,color .2s,transform .2s}\
.ml-close:hover{background:var(--a);color:#07070c;transform:rotate(90deg)}\
.ml-skip{align-self:flex-start;margin-top:.9rem;background:none;border:0;padding:0;color:#8e8ea4;font:inherit;font-size:.75rem;cursor:pointer;text-decoration:underline;text-underline-offset:3px}\
.ml-skip:hover{color:#c8c8d8}\
.ml-done{display:none;text-align:left}\
.ml-card.ml-ok .ml-pre{display:none}\
.ml-card.ml-ok .ml-done{display:block;animation:ml-pop .5s cubic-bezier(.2,.9,.3,1.3)}\
.ml-tick{width:58px;height:58px;border-radius:50%;margin-bottom:1.2rem;display:grid;place-items:center;font-size:1.7rem;color:#07070c;background:var(--a);box-shadow:0 0 0 8px color-mix(in srgb,var(--a) 18%,transparent)}\
.ml-confetti{position:absolute;top:0;width:8px;height:12px;border-radius:2px;pointer-events:none;animation:ml-fall 1.6s ease-in forwards}\
@keyframes ml-float{50%{transform:translateY(-14px)}}\
@keyframes ml-ring{0%{transform:scale(.8);opacity:.9}100%{transform:scale(1.5);opacity:0}}\
@keyframes ml-blink{50%{opacity:0}}\
@keyframes ml-pop{from{opacity:0;transform:scale(.92)}to{opacity:1;transform:none}}\
@keyframes ml-fall{to{transform:translate(var(--dx),420px) rotate(var(--r));opacity:0}}\
@media(max-width:720px){\
.ml-root{align-items:flex-end;padding:0}\
.ml-card{grid-template-columns:1fr;width:100%;border-radius:20px 20px 0 0;max-height:92vh}\
.ml-visual{display:none}\
.ml-body{padding:2.2rem 1.4rem 1.6rem}\
.ml-root .ml-form{flex-direction:column}\
}\
@media(prefers-reduced-motion:reduce){.ml-root,.ml-card,.ml-orb,.ml-orb::after,.ml-caret,.ml-confetti{animation:none!important;transition:none!important}}';

  var html = '\
<div class="ml-backdrop" data-ml-close></div>\
<div class="ml-card" role="dialog" aria-modal="true" aria-labelledby="ml-title" aria-describedby="ml-sub">\
<button class="ml-close" type="button" aria-label="Close" data-ml-close>&times;</button>\
<div class="ml-visual" aria-hidden="true">\
<div class="ml-orb"></div>\
<div class="ml-term"><b>$</b> subscribe --to dkvb.dev<br><b>&gt;</b> build notes, straight to you<br><b>&gt;</b> ready<span class="ml-caret"></span></div>\
</div>\
<div class="ml-body">\
<div class="ml-pre">\
<div class="ml-eyebrow">// the build notes</div>\
<h2 class="ml-title" id="ml-title">Get the stuff I learn <span>before everyone else.</span></h2>\
<p class="ml-sub" id="ml-sub">Short, no-fluff emails from a working Android &amp; full stack developer &mdash; straight from real client builds.</p>\
<ul class="ml-list">\
<li>First look at new projects and behind-the-scenes case studies</li>\
<li>Practical Android, web and Firebase tips you can use the same day</li>\
<li>Early notice when I open up freelance slots</li>\
</ul>\
<form class="ml-form" novalidate>\
<input class="ml-hp" type="text" name="_gotcha" tabindex="-1" autocomplete="off" aria-hidden="true">\
<input class="ml-input" type="email" name="email" placeholder="you@email.com" autocomplete="email" required aria-label="Email address">\
<button class="ml-btn" type="submit">Count me in &rarr;</button>\
</form>\
<p class="ml-err" role="alert" aria-live="polite"></p>\
<p class="ml-fine">No spam, ever. Unsubscribe any time. By joining you agree to receive emails from dkvb.dev and to the <a href="privacy.html">Privacy Policy</a>.</p>\
<button class="ml-skip" type="button" data-ml-close>No thanks, maybe later</button>\
</div>\
<div class="ml-done" role="status" aria-live="polite">\
<div class="ml-tick">&#10003;</div>\
<h2 class="ml-title">You&rsquo;re <span>in.</span></h2>\
<p class="ml-sub">Welcome aboard. The first build notes will land in your inbox soon &mdash; thanks for being early.</p>\
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
        confetti();
        root.querySelector('.ml-done .ml-btn').focus();
      })
      .catch(function () {
        err.textContent = 'Something went wrong — please try again, or email dkvb.dev@gmail.com.';
        btn.disabled = false;
        btn.innerHTML = 'Count me in &rarr;';
      });
  }

  function confetti() {
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var colours = ['var(--accent,#00e5a0)', 'var(--accent2,#7b5ea7)', 'var(--accent3,#ff6b35)', '#fff'];
    for (var i = 0; i < 36; i++) {
      var c = document.createElement('i');
      c.className = 'ml-confetti';
      c.style.left = (10 + Math.random() * 80) + '%';
      c.style.background = colours[i % colours.length];
      c.style.setProperty('--dx', (Math.random() * 160 - 80) + 'px');
      c.style.setProperty('--r', (Math.random() * 720 - 360) + 'deg');
      c.style.animationDelay = (Math.random() * 0.25) + 's';
      card.appendChild(c);
    }
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
