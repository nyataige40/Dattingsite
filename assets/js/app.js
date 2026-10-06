/* ==========================================================================
   Dattingsite — Core runtime
   LocalStorage store, session guards, navbar, theme, toasts, modals
   ========================================================================== */
(function (global) {
  'use strict';

  var DATA = global.DS_DATA;
  var KEY = 'dattingsite_v1';
  var listeners = [];

  /* ----------------------------------------------------------------------
     Persistence
     ---------------------------------------------------------------------- */
  var DEFAULT_STATE = {
    users: [],
    session: null,
    profile: null,
    wallet: { balance: DATA.STARTING_BALANCE, currency: 'USD' },
    unlocked: [],
    transactions: [],
    messages: {},
    notifications: [],
    subscription: null,
    boosts: [],
    superLikesSent: [],
    superLikesReceived: [],
    admin: null
  };

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function read() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return deepClone(DEFAULT_STATE);
      var parsed = JSON.parse(raw);
      var base = deepClone(DEFAULT_STATE);
      Object.keys(base).forEach(function (k) {
        if (parsed[k] === undefined || parsed[k] === null) parsed[k] = base[k];
      });
      return parsed;
    } catch (err) {
      return deepClone(DEFAULT_STATE);
    }
  }

  var state = read();

  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (err) {
      console.warn('[store] persist failed', err);
    }
    listeners.forEach(function (fn) { fn(state); });
  }

  function onChange(fn) { listeners.push(fn); }

  /* ----------------------------------------------------------------------
     Auth
     ---------------------------------------------------------------------- */
  var DEMO_EMAIL = 'demo@premium.com';
  var DEMO_PASSWORD = 'password123';

  function seedDemoUser() {
    if (state.users.some(function (u) { return u.email === DEMO_EMAIL; })) return;
    state.users.push({
      id: 'u_demo',
      name: 'Alex Morgan',
      email: DEMO_EMAIL,
      password: hash(DEMO_PASSWORD),
      provider: 'email',
      isAdmin: true,
      createdAt: Date.now()
    });
    persist();
  }

  function hash(str) {
    var h = 5381;
    for (var i = 0; i < str.length; i++) {
      h = ((h << 5) + h) + str.charCodeAt(i);
      h = h & h;
    }
    return String(h >>> 0);
  }

  function registerUser(data) {
    var email = String(data.email || '').trim().toLowerCase();
    var name = String(data.name || '').trim();
    var password = String(data.password || '');

    if (!name) return { ok: false, error: 'Please enter your full name.' };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: 'Please enter a valid email address.' };
    if (password.length < 8) return { ok: false, error: 'Password must be at least 8 characters.' };
    if (state.users.some(function (u) { return u.email === email; })) {
      return { ok: false, error: 'An account with this email already exists.' };
    }

    var user = {
      id: 'u_' + Date.now(),
      name: name,
      email: email,
      password: hash(password),
      provider: 'email',
      createdAt: Date.now()
    };
    state.users.push(user);
    persist();
    return { ok: true, user: publicUser(user) };
  }

  function loginUser(email, password) {
    var key = String(email || '').trim().toLowerCase();
    var user = null;
    for (var i = 0; i < state.users.length; i++) {
      if (state.users[i].email === key) { user = state.users[i]; break; }
    }
    if (!user) return { ok: false, error: 'No account found for that email.' };
    if (user.password !== hash(String(password || ''))) {
      // Accounts seeded before hashing stored the password in plain text.
      // Accept that once, then upgrade the stored value to a hash.
      if (user.password === String(password || '')) {
        user.password = hash(String(password || ''));
        persist();
      } else {
        return { ok: false, error: 'That password is not correct.' };
      }
    }
    startSession(user);
    return { ok: true, user: publicUser(user) };
  }

  function socialLogin(provider) {
    var seeds = {
      google:   { name: 'Google Member',   email: 'google@premium.com' },
      facebook: { name: 'Facebook Member', email: 'facebook@premium.com' }
    };
    var seed = seeds[provider] || seeds.google;
    var email = seed.email;
    var user = null;
    for (var i = 0; i < state.users.length; i++) {
      if (state.users[i].email === email) { user = state.users[i]; break; }
    }
    if (!user) {
      user = {
        id: 'u_' + provider + '_' + Date.now(),
        name: seed.name,
        email: email,
        password: null,
        provider: provider,
        createdAt: Date.now()
      };
      state.users.push(user);
    }
    startSession(user);
    persist();
    return { ok: true, user: publicUser(user) };
  }

  function publicUser(user) {
    return { id: user.id, name: user.name, email: user.email, provider: user.provider, isAdmin: !!user.isAdmin };
  }

  function startSession(user) {
    state.session = publicUser(user);
    persist();
  }

  function logout() {
    state.session = null;
    state.profile = null;
    persist();
  }

  function isAuthed() { return !!state.session; }
  function currentUser() { return state.session; }
  function currentProfile() { return state.profile; }

  function requireAuth(needsProfile) {
    if (!isAuthed()) {
      location.href = 'login.html';
      return false;
    }
    if (needsProfile && !state.profile) {
      location.href = 'onboarding.html';
      return false;
    }
    return true;
  }

  function redirectIfAuthed() {
    if (isAuthed()) {
      location.href = state.profile ? 'dashboard.html' : 'onboarding.html';
      return true;
    }
    return false;
  }

  /* ----------------------------------------------------------------------
     Profile / onboarding
     ---------------------------------------------------------------------- */
  var INTERESTS = [
    'Hiking', 'Travel', 'Cooking', 'Reading', 'Music', 'Art', 'Sports',
    'Photography', 'Food', 'Yoga', 'Dancing', 'Movies', 'Gaming',
    'Technology', 'Wine', 'Fitness', 'Books', 'Coffee', 'Nature', 'Design',
    'Volunteering', 'Meditation', 'Surfing', 'Baking'
  ];

  function saveProfile(data) {
    state.profile = {
      name: state.session ? state.session.name : 'You',
      gender: data.gender,
      age: parseInt(data.age, 10),
      city: (data.city || '').trim(),
      bio: (data.bio || '').trim(),
      photo: data.photo || 'https://i.pravatar.cc/400?img=12',
      interests: data.interests || [],
      createdAt: state.profile ? state.profile.createdAt : Date.now()
    };
    persist();
    return state.profile;
  }

  function updateProfile(patch) {
    if (!state.profile) return null;
    Object.keys(patch).forEach(function (k) { state.profile[k] = patch[k]; });
    persist();
    return state.profile;
  }

  function profileCompletion() {
    var p = state.profile;
    if (!p) return 0;
    var checks = [
      !!p.gender,
      !!p.age,
      !!p.city,
      !!p.photo,
      !!(p.bio && p.bio.length > 24),
      !!(p.interests && p.interests.length >= 3)
    ];
    var done = checks.filter(Boolean).length;
    return Math.round((done / checks.length) * 100);
  }

  /* ----------------------------------------------------------------------
     Wallet, unlocks, transactions
     ---------------------------------------------------------------------- */
  function walletBalance() {
    return (state.wallet && state.wallet.balance) || 0;
  }

  function isUnlocked(partnerId) {
    return state.unlocked.indexOf(partnerId) !== -1;
  }

  function addTransaction(tx) {
    var record = Object.assign({
      id: 'tx_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      at: Date.now(),
      ref: 'DS-' + Math.random().toString(36).slice(2, 8).toUpperCase(),
      status: 'completed',
      method: 'wallet',
      currency: 'USD'
    }, tx);
    state.transactions.unshift(record);
    persist();
    return record;
  }

  /**
   * Unlock a partner with the chosen payment method.
   * Wallet requires sufficient balance; gateways simulate an async gateway.
   */
  function unlockPartner(partnerId, method, onStage) {
    return new Promise(function (resolve, reject) {
      var partner = DATA.partnerById(partnerId);
      if (!partner) return reject(new Error('Partner not found.'));
      if (isUnlocked(partnerId)) return reject(new Error('This partner is already unlocked.'));

      var price = DATA.priceFor(partner.tier);

      if (method === 'wallet') {
        if (onStage) onStage('checking');
        setTimeout(function () {
          if (walletBalance() < price) {
            reject(new Error('Insufficient wallet balance. Add funds or choose another payment method.'));
            return;
          }
          state.wallet.balance = Math.round((walletBalance() - price) * 100) / 100;
          commitUnlock(partner, price, 'wallet');
          if (onStage) onStage('done');
          resolve({ ok: true, price: price, balance: state.wallet.balance, method: 'wallet' });
        }, 850);
        return;
      }

      if (method === 'stripe' || method === 'paypal') {
        if (onStage) onStage('gateway');
        setTimeout(function () {
          var label = method === 'stripe' ? 'Stripe' : 'PayPal';
          commitUnlock(partner, price, method);
          if (onStage) onStage('done');
          resolve({ ok: true, price: price, balance: walletBalance(), method: method, label: label });
        }, 1700);
        return;
      }

      reject(new Error('Unsupported payment method.'));
    });
  }

  function commitUnlock(partner, price, method) {
    state.unlocked.push(partner.id);
    addTransaction({
      partnerId: partner.id,
      partnerName: partner.name,
      tier: partner.tier,
      amount: price,
      method: method,
      photo: partner.photo
    });
  }

  function addFunds(amount, method) {
    var value = parseFloat(amount);
    if (!value || value <= 0) return Promise.reject(new Error('Enter a valid amount.'));
    if (value > 500) return Promise.reject(new Error('Maximum top-up is $500.00.'));
    return new Promise(function (resolve, reject) {
      setTimeout(function () {
        state.wallet.balance = Math.round((walletBalance() + value) * 100) / 100;
        if (method && method !== 'wallet') {
          addTransaction({ partnerId: null, partnerName: 'Wallet top-up', tier: null, amount: value, method: method });
        }
        persist();
        resolve({ ok: true, balance: state.wallet.balance });
      }, 1400);
    });
  }

  /* ----------------------------------------------------------------------
     Messages
     ---------------------------------------------------------------------- */
  function getMessages(partnerId) {
    return state.messages[partnerId] || [];
  }

  function addMessage(partnerId, msg) {
    if (!state.messages[partnerId]) state.messages[partnerId] = [];
    state.messages[partnerId].push({
      id: 'm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      at: Date.now(),
      from: msg.from,
      content: msg.content,
      isBot: !!msg.isBot
    });
    persist();
    return state.messages[partnerId][state.messages[partnerId].length - 1];
  }

  function resetChat(partnerId) {
    if (state.messages[partnerId]) {
      state.messages[partnerId] = [];
      persist();
    }
  }

  function chatPartners() {
    return state.unlocked
      .map(function (id) { return DATA.partnerById(id); })
      .filter(Boolean);
  }

  function lastMessageOf(partnerId) {
    var list = getMessages(partnerId);
    return list.length ? list[list.length - 1] : null;
  }

  function unreadCount(partnerId) {
    var list = getMessages(partnerId);
    if (!list.length) return 0;
    var last = list[list.length - 1];
    return last.isBot ? 1 : 0;
  }

  /* ----------------------------------------------------------------------
     Notifications (interest alerts)
     ---------------------------------------------------------------------- */
  function pushNotifications(list) {
    list.forEach(function (n) { state.notifications.unshift(n); });
    state.notifications = state.notifications.slice(0, 40);
    persist();
  }

  function unreadNotifications() {
    return state.notifications.filter(function (n) { return !n.read; });
  }

  function markNotificationsRead() {
    state.notifications.forEach(function (n) { n.read = true; });
    persist();
  }

  function hasSeenInterest() { return !!state.notifications.length; }

  /* ----------------------------------------------------------------------
     Formatting helpers
     ---------------------------------------------------------------------- */
  function money(value) {
    return '$' + Number(value || 0).toFixed(2);
  }

  function timeAgo(ts) {
    var diff = Date.now() - ts;
    var min = Math.floor(diff / 60000);
    if (min < 1) return 'now';
    if (min < 60) return min + 'm ago';
    var hr = Math.floor(min / 60);
    if (hr < 24) return hr + 'h ago';
    var d = new Date(ts);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  /* Countdown label for a future timestamp; timeAgo() would report "now". */
  function timeUntil(ts) {
    var diff = ts - Date.now();
    if (diff <= 0) return 'ended';
    var min = Math.floor(diff / 60000);
    if (min < 1) return 'under a minute';
    if (min < 60) return 'in ' + min + 'm';
    var hr = Math.floor(min / 60);
    if (hr < 24) return 'in ' + hr + 'h';
    var d = Math.floor(hr / 24);
    return 'in ' + d + 'd';
  }

  function clockTime(ts) {
    return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  function dayLabel(ts) {
    var d = new Date(ts);
    var today = new Date();
    var isToday = d.toDateString() === today.toDateString();
    var yest = new Date(today.getTime() - 86400000);
    if (isToday) return 'Today';
    if (d.toDateString() === yest.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* Short alias used inside the modal template literals */
  function esc(str) { return escapeHtml(str); }

  function partnerImage(partner, size) {
    var url = partner.photo;
    if (url.indexOf('pravatar.cc') !== -1) {
      url = url.replace(/\d+(?=\?img=)/, size || 600);
    }
    return url;
  }

  function initials(name) {
    return String(name || '?').trim().charAt(0).toUpperCase();
  }

  function tierClass(tier) {
    return 'badge badge-' + String(tier || 'standard').toLowerCase();
  }

  /* ----------------------------------------------------------------------
     Toasts
     ---------------------------------------------------------------------- */
  function toastStack() {
    var stack = document.querySelector('.toast-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.className = 'toast-stack';
      document.body.appendChild(stack);
    }
    return stack;
  }

  function toast(title, text, type, ttl) {
    var kind = type || 'info';
    var icon = kind === 'success' ? '\u2714' : kind === 'error' ? '\u26A0' : '\u2139';
    var el = document.createElement('div');
    el.className = 'toast toast-' + kind;
    el.setAttribute('role', 'status');
    el.innerHTML =
      '<span class="toast-icon">' + icon + '</span>' +
      '<div><div class="toast-title">' + escapeHtml(title) + '</div>' +
      (text ? '<div class="toast-text">' + escapeHtml(text) + '</div>' : '') + '</div>';
    toastStack().appendChild(el);

    setTimeout(function () {
      el.classList.add('is-out');
      setTimeout(function () { el.remove(); }, 300);
    }, ttl || 3800);
  }

  /* ----------------------------------------------------------------------
     Modal
     ---------------------------------------------------------------------- */
  var openModal = null;

  function modal(html, opts) {
    closeModal();
    var config = opts || {};
    var backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = '<div class="modal' + (config.xwide ? ' modal-xwide' : (config.wide ? ' modal-wide' : '')) + '" role="dialog" aria-modal="true">' + html + '</div>';

    backdrop.addEventListener('mousedown', function (e) {
      if (e.target === backdrop && config.dismissible !== false) closeModal();
    });

    document.body.appendChild(backdrop);
    document.body.style.overflow = 'hidden';
    openModal = backdrop;

    var focusTarget = backdrop.querySelector('[data-autofocus]') || backdrop.querySelector('.btn-primary');
    if (focusTarget) setTimeout(function () { focusTarget.focus(); }, 90);

    if (config.onMount) config.onMount(backdrop);
    return backdrop;
  }

  function closeModal() {
    if (!openModal) return;
    openModal.remove();
    openModal = null;
    document.body.style.overflow = '';
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeModal();
  });

  /* ----------------------------------------------------------------------
     Theme
     ---------------------------------------------------------------------- */
  var THEME_KEY = 'dattingsite_theme';

  function applyTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch (err) {}
  }

  function initTheme() {
    var saved = null;
    try { saved = localStorage.getItem(THEME_KEY); } catch (err) {}
    if (!saved) {
      saved = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    applyTheme(saved);
    return saved;
  }

  function toggleTheme() {
    var next = document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    return next;
  }

  /* ----------------------------------------------------------------------
     Navbar rendering (injected on every authenticated page)
     ---------------------------------------------------------------------- */
  function navLinks(active) {
    var links = [
      { href: 'dashboard.html',    label: 'Discover',  icon: '\u2764' },
      { href: 'catalogue.html',    label: 'Catalogue', icon: '\u25CE' },
      { href: 'chat.html',         label: 'Chat',      icon: '\u2709' },
      { href: 'transactions.html', label: 'Billing',   icon: '\u25A6' },
      { href: 'profile.html',      label: 'Profile',   icon: '\u25CF' }
    ];
    if (isAdmin()) links.push({ href: 'admin.html', label: 'Admin', icon: '\u2699' });
    return links.map(function (l) {
      var on = l.href === active;
      return '<a class="nav-link' + (on ? ' is-active' : '') + '" href="' + l.href + '">' +
        '<span aria-hidden="true">' + l.icon + '</span>' + l.label + '</a>';
    }).join('');
  }

  function renderNavbar(active) {
    var mount = document.querySelector('[data-navbar]');
    if (!mount) return;

    var user = currentUser();
    var profile = currentProfile();
    var photo = (profile && profile.photo) || 'https://i.pravatar.cc/100?img=12';
    var unread = unreadNotifications().length;

    mount.className = 'nav';
    mount.innerHTML =
      '<div class="container nav-inner">' +
        '<a class="brand" href="dashboard.html">' +
          '<span class="brand-mark">D</span>' +
          '<span class="brand-name">Dattingsite</span>' +
        '</a>' +

        '<nav class="nav-links" id="navLinks">' + navLinks(active) + '</nav>' +

        '<div class="nav-right">' +
          '<button class="theme-toggle" id="themeToggle" type="button" aria-label="Toggle colour theme">' +
            '<span class="theme-knob"></span>' +
          '</button>' +

          '<button class="plan-chip" id="planChip" type="button" title="Change subscription plan">' +
            '<span aria-hidden="true">&#11088;</span>' +
            '<span id="planLabel">' + currentPlan().label + '</span>' +
          '</button>' +

          '<div class="wallet-chip" title="Wallet balance">' +
            '<span aria-hidden="true">\uD83D\uDCB0</span>' +
            '<span class="wallet-amount" id="walletAmount">' + money(walletBalance()) + '</span>' +
          '</div>' +

          '<button class="btn-icon bell" id="bellBtn" type="button" aria-label="Notifications">' +
            '<i class="fa-solid fa-bell" aria-hidden="true"></i>' +
            (unread ? '<span class="bell-count" id="bellCount">' + (unread > 9 ? '9+' : unread) + '</span>' : '') +
          '</button>' +

          '<div class="user-menu">' +
            '<button class="user-btn" id="userBtn" type="button" aria-haspopup="true" aria-expanded="false">' +
              '<img class="avatar avatar-xs" src="' + escapeHtml(photo) + '" alt="" />' +
              '<span class="user-name">' + escapeHtml(user ? user.name : 'Account') + '</span>' +
              '<i class="fa-solid fa-chevron-down" aria-hidden="true"></i>' +
            '</button>' +
            '<div class="dropdown" id="userDropdown">' +
              '<div class="dropdown-head">' +
                '<div class="strong">' + escapeHtml(user ? user.name : '') + '</div>' +
                '<div class="tiny muted">' + escapeHtml(user ? user.email : '') + '</div>' +
              '</div>' +
              '<div class="dropdown-sep"></div>' +
              '<a class="dropdown-item" href="profile.html"><span aria-hidden="true">\u25CF</span> My profile</a>' +
              '<a class="dropdown-item" href="transactions.html"><span aria-hidden="true">\u25A6</span> Billing history</a>' +
              '<button class="dropdown-item" id="topUpBtn" type="button"><span aria-hidden="true">\u002B</span> Add wallet funds</button>' +
              '<div class="dropdown-sep"></div>' +
              '<button class="dropdown-item danger" id="logoutBtn" type="button"><span aria-hidden="true">\u2192</span> Sign out</button>' +
            '</div>' +
          '</div>' +

          '<button class="nav-toggle" id="navToggle" type="button" aria-label="Menu">' +
            '<i class="fa-solid fa-bars" aria-hidden="true"></i>' +
          '</button>' +
        '</div>' +
      '</div>';

    wireNavbar();
  }

  function wireNavbar() {
    var themeBtn = document.getElementById('themeToggle');
    if (themeBtn) themeBtn.addEventListener('click', function () {
      var mode = toggleTheme();
      toast(mode === 'dark' ? 'Dark mode on' : 'Light mode on', null, 'info', 2000);
    });

    var planBtn = document.getElementById('planChip');
    if (planBtn) planBtn.addEventListener('click', function () { openUpgradeModal(); });

    var navToggle = document.getElementById('navToggle');
    var navLinksEl = document.getElementById('navLinks');
    if (navToggle && navLinksEl) {
      navToggle.addEventListener('click', function () {
        navLinksEl.classList.toggle('is-open');
      });
    }

    var userBtn = document.getElementById('userBtn');
    var dropdown = document.getElementById('userDropdown');
    if (userBtn && dropdown) {
      userBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        var open = dropdown.classList.toggle('is-open');
        userBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      document.addEventListener('click', function () {
        dropdown.classList.remove('is-open');
        userBtn.setAttribute('aria-expanded', 'false');
      });
    }

    var logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function () {
        closeDropdown();
        logout();
        toast('Signed out', 'See you soon.', 'info', 2000);
        setTimeout(function () { location.href = 'login.html'; }, 500);
      });
    }

    var topUpBtn = document.getElementById('topUpBtn');
    if (topUpBtn) {
      topUpBtn.addEventListener('click', function () {
        closeDropdown();
        openTopUp();
      });
    }

    var bellBtn = document.getElementById('bellBtn');
    if (bellBtn) bellBtn.addEventListener('click', openNotifications);
  }

  function closeDropdown() {
    var dropdown = document.getElementById('userDropdown');
    if (dropdown) dropdown.classList.remove('is-open');
  }

  /* Refresh wallet + bell badges after mutations */
  function refreshChrome() {
    var amount = document.getElementById('walletAmount');
    if (amount) {
      amount.textContent = money(walletBalance());
      amount.classList.remove('is-flash');
      void amount.offsetWidth;
      amount.classList.add('is-flash');
    }
    var bell = document.getElementById('bellBtn');
    if (bell) {
      var count = unreadNotifications().length;
      var existing = document.getElementById('bellCount');
      if (count) {
        if (!existing) {
          var span = document.createElement('span');
          span.className = 'bell-count';
          span.id = 'bellCount';
          bell.appendChild(span);
          existing = span;
        }
        existing.textContent = count > 9 ? '9+' : String(count);
      } else if (existing) {
        existing.remove();
      }
    }
    var planLabel = document.getElementById('planLabel');
    if (planLabel) {
      planLabel.textContent = currentPlan().label;
    }
  }

  /* ----------------------------------------------------------------------
     Top-up modal
     ---------------------------------------------------------------------- */
  function openTopUp() {
    var presets = [10, 25, 50, 100];

    modal(
      '<div class="modal-head">' +
        '<h3>Add wallet funds</h3>' +
        '<p class="small" style="color:rgba(255,255,255,.85);margin-top:4px">Top up instantly to unlock more partners.</p>' +
        '<button class="modal-close" type="button" data-close aria-label="Close"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>' +
      '</div>' +
      '<div class="modal-body">' +
        '<div class="stack gap-2">' +
          presets.map(function (v) {
            return '<button class="social-btn" type="button" data-amount="' + v + '">' + money(v) + '</button>';
          }).join('') +
        '</div>' +
        '<div class="field mt-6">' +
          '<label class="label" for="topupCustom">Custom amount</label>' +
          '<input class="input" id="topupCustom" type="number" min="1" max="500" step="1" placeholder="e.g. 20" data-autofocus />' +
          '<span class="hint">Maximum $500.00 per top-up.</span>' +
        '</div>' +
        '<div class="field mt-4">' +
          '<label class="label">Payment method</label>' +
          '<div class="pay-grid" id="topUpPay">' +
            '<div class="pay-card is-active" data-method="stripe" tabindex="0">' +
              '<div class="pay-logo" style="color:#635bff;font-weight:800;font-size:.8rem">stripe</div>' +
              '<div class="pay-title">Card</div>' +
            '</div>' +
            '<div class="pay-card" data-method="paypal" tabindex="0">' +
              '<div class="pay-logo" style="color:#003087;font-weight:800;font-size:.78rem">PayPal</div>' +
              '<div class="pay-title">PayPal</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div id="topUpStatus" class="mt-4"></div>' +
        '<button class="btn btn-primary btn-block mt-6" id="topUpConfirm" type="button">Add funds</button>' +
      '</div>',
      {
        onMount: function (root) {
          var chosen = null;
          var amountInput = root.querySelector('#topupCustom');

          root.querySelectorAll('[data-close]').forEach(function (b) {
            b.addEventListener('click', closeModal);
          });

          function pickMethod(method) {
            chosen = method;
            root.querySelectorAll('#topUpPay .pay-card').forEach(function (c) {
              c.classList.toggle('is-active', c.getAttribute('data-method') === method);
            });
          }

          root.querySelectorAll('#topUpPay .pay-card').forEach(function (card) {
            card.addEventListener('click', function () { pickMethod(card.getAttribute('data-method')); });
            card.addEventListener('keydown', function (e) {
              if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pickMethod(card.getAttribute('data-method')); }
            });
          });
          pickMethod('stripe');

          root.querySelectorAll('[data-amount]').forEach(function (btn) {
            btn.addEventListener('click', function () {
              amountInput.value = btn.getAttribute('data-amount');
              amountInput.focus();
            });
          });

          root.querySelector('#topUpConfirm').addEventListener('click', function () {
            var value = parseFloat(amountInput.value);
            var status = root.querySelector('#topUpStatus');
            if (!value || value <= 0) {
              status.innerHTML = '<div class="alert alert-danger"><span>\u26A0</span><span>Enter a valid amount to add funds.</span></div>';
              return;
            }
            status.innerHTML =
              '<div class="processing">' +
                '<div class="spinner-ring spinner-ring-indigo"></div>' +
                '<div class="strong">Contacting payment gateway\u2026</div>' +
                '<div class="small muted">Please do not close this window.</div>' +
              '</div>';
            addFunds(value, chosen).then(function (res) {
              closeModal();
              refreshChrome();
              toast('Funds added', 'Your new balance is ' + money(res.balance) + '.', 'success');
            }).catch(function (err) {
              status.innerHTML = '<div class="alert alert-danger"><span>\u26A0</span><span>' + escapeHtml(err.message) + '</span></div>';
            });
          });
        }
      }
    );
  }

  /* ----------------------------------------------------------------------
     Interest notification panel
     ---------------------------------------------------------------------- */
  function openNotifications() {
    var list = unreadNotifications();
    var body;
    if (!list.length) {
      body =
        '<div class="empty" style="padding:var(--s-12) var(--s-6)">' +
          '<div class="empty-icon">\uD83D\uDD14</div>' +
          '<div class="empty-title">You are all caught up</div>' +
          '<div class="empty-text">New interest alerts will appear here as members discover your profile.</div>' +
        '</div>';
    } else {
      body = '<div class="notif-list">' + list.slice(0, 6).map(function (n) {
        return '<div class="notif-item">' +
          '<div class="avatar-wrap pulse-ring">' +
            '<img class="avatar avatar-sm" src="' + escapeHtml(n.photo) + '" alt="" />' +
          '</div>' +
          '<div class="notif-item-body">' +
            '<div class="notif-item-name">' + escapeHtml(n.name) + ' ' + tierClass(n.tier) + '</div>' +
            '<div class="notif-item-text">' + escapeHtml(n.text.replace(n.name + ' ', '')) + '</div>' +
            '<div class="notif-item-time">' + timeAgo(n.at) + '</div>' +
          '</div>' +
        '</div>';
      }).join('') + '</div>';
    }

    modal(
      '<div class="modal-head">' +
        '<h3>Interest alerts</h3>' +
        '<p class="small" style="color:rgba(255,255,255,.85);margin-top:4px">' +
          (list.length ? list.length + ' member' + (list.length === 1 ? '' : 's') + ' are interested in you' : 'No new alerts') +
        '</p>' +
        '<button class="modal-close" type="button" data-close aria-label="Close"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>' +
      '</div>' +
      body +
      (list.length ? '<div class="notif-foot"><button class="btn btn-primary" id="notifGo" type="button">View my matches</button></div>' : ''),
      {
        onMount: function (root) {
          root.querySelectorAll('[data-close]').forEach(function (b) {
            b.addEventListener('click', function () {
              markNotificationsRead();
              refreshChrome();
              closeModal();
            });
          });
          var go = root.querySelector('#notifGo');
          if (go) {
            go.addEventListener('click', function () {
              markNotificationsRead();
              refreshChrome();
              location.href = 'catalogue.html';
            });
          }
        }
      }
    );
  }

  /* ----------------------------------------------------------------------
     Scroll reveal + boot
     ---------------------------------------------------------------------- */
  function initReveal() {
    var nodes = document.querySelectorAll('.reveal');
    if (!nodes.length) return;
    if (!('IntersectionObserver' in window)) {
      nodes.forEach(function (n) { n.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var delay = parseInt(entry.target.getAttribute('data-delay') || '0', 10);
          setTimeout(function () { entry.target.classList.add('is-in'); }, delay);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    nodes.forEach(function (n) { io.observe(n); });
  }

  function initYear() {
    var el = document.getElementById('year');
    if (el) el.textContent = new Date().getFullYear();
  }

  function boot(activeNav) {
    initTheme();
    initReveal();
    initYear();
    if (activeNav) {
      seedDemoUser();
      renderNavbar(activeNav);
    }
  }

  /* ----------------------------------------------------------------------
     Layer 4: subscriptions, boosts and super likes
     ---------------------------------------------------------------------- */
  function currentPlan() {
    var sub = state.subscription;
    var plan = (sub && DATA.PLANS[sub.plan]) || DATA.PLANS.free;
    var active = !!sub && sub.status === 'active';
    return {
      id: plan.id,
      label: plan.label,
      price: plan.price,
      note: plan.note,
      perks: plan.perks,
      status: active ? 'active' : (sub ? sub.status : 'none'),
      renewsAt: active ? sub.renewsAt : null,
      startedAt: sub ? sub.startedAt : null
    };
  }

  function planOrders() {
    var orders = ['plus', 'gold'];
    var current = currentPlan().id;
    if (current === 'plus') orders = ['gold', 'plus'];
    if (current === 'gold') orders = ['plus', 'gold'];
    return orders;
  }

  function addMonthsTs(ts, months) {
    var d = new Date(ts);
    d.setMonth(d.getMonth() + months);
    return d.getTime();
  }

  /**
   * Change plan. Wallet funding is validated and debited before the stored plan
   * is replaced, so a rejected payment can never downgrade a paying member.
   */
  function changePlan(planId, method) {
    return new Promise(function (resolve, reject) {
      var plan = DATA.PLANS[planId];
      if (!plan) return reject(new Error('Unknown plan.'));

      if (planId === 'free') {
        state.subscription = { plan: 'free', price: 0, status: 'cancelled', startedAt: Date.now(), renewsAt: null };
        persist();
        return resolve({ ok: true, plan: 'free', price: 0, message: 'Switched to the Free plan.' });
      }

      if (currentPlan().id === planId && currentPlan().status === 'active') {
        return resolve({ ok: true, plan: planId, price: 0, message: 'You are already on ' + plan.label + '.' });
      }

      if (method === 'wallet') {
        if (walletBalance() < plan.price) {
          return reject(new Error('Insufficient wallet balance. ' + plan.label + ' costs ' + money(plan.price) + '.'));
        }
      }

      setTimeout(function () {
        if (method === 'wallet') {
          state.wallet.balance = round2(walletBalance() - plan.price);
          addTransaction({
            partnerId: null,
            partnerName: plan.label + ' subscription',
            tier: null,
            amount: plan.price,
            method: 'wallet',
            description: plan.label + ' subscription'
          });
        }

        var now = Date.now();
        state.subscription = {
          plan: planId,
          price: plan.price,
          status: 'active',
          startedAt: now,
          renewsAt: addMonthsTs(now, 1),
          method: method || 'stripe'
        };
        persist();

        resolve({
          ok: true,
          plan: planId,
          price: plan.price,
          balance: state.wallet.balance,
          message: 'Subscribed to ' + plan.label + '. Renews next month.'
        });
      }, method === 'wallet' ? 850 : 1500);
    });
  }

  function cancelPlan() {
    return new Promise(function (resolve, reject) {
      if (!state.subscription || state.subscription.status !== 'active') {
        return reject(new Error('No active subscription to cancel.'));
      }
      setTimeout(function () {
        state.subscription.status = 'cancelled';
        persist();
        resolve({ ok: true, message: 'Subscription cancelled. You keep access until the period ends.' });
      }, 700);
    });
  }

  function round2(n) { return Math.round(n * 100) / 100; }

  var activeBoosts = function () {
    var now = Date.now();
    return (state.boosts || []).filter(function (b) { return b.status === 'active' && b.endsAt > now; });
  };

  function startBoost(type) {
    return new Promise(function (resolve, reject) {
      var def = DATA.BOOSTS[type];
      if (!def) return reject(new Error('Unknown boost type.'));

      var planId = currentPlan().id;
      var kind = type === 'turbo' ? 'turbo' : 'spotlight';
      var allowance = DATA.planAllowance(planId, kind);

      var monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      // Count from full history, not the active list, so a boost that already
      // expired this month still consumes the monthly allowance.
      var used = (state.boosts || []).filter(function (b) {
        return b.startedAt >= monthStart.getTime() && b.type === type;
      }).length;

      var allowanceLeft = allowance === Infinity ? Infinity : Math.max(0, allowance - used);
      var charge = allowanceLeft > 0 ? 0 : def.price;

      if (charge > 0 && walletBalance() < charge) {
        return reject(new Error('Insufficient wallet balance. ' + def.label + ' costs ' + money(def.price) + '.'));
      }

      setTimeout(function () {
        if (charge > 0) {
          state.wallet.balance = round2(walletBalance() - charge);
          addTransaction({
            partnerId: null,
            partnerName: def.label + ' boost',
            tier: null,
            amount: charge,
            method: 'wallet',
            description: def.label + ' boost'
          });
        }

        var now = Date.now();
        state.boosts.unshift({
          id: 'b_' + now + '_' + Math.random().toString(36).slice(2, 6),
          type: type,
          label: def.label,
          cost: charge,
          multiplier: def.multiplier,
          startedAt: now,
          endsAt: now + def.hours * 3600000,
          status: 'active'
        });
        persist();

        resolve({
          ok: true,
          type: type,
          label: def.label,
          charged: charge,
          coveredByPlan: charge === 0,
          multiplier: def.multiplier,
          endsAt: now + def.hours * 3600000,
          message: charge === 0
            ? def.label + ' boost active, included with your plan.'
            : def.label + ' boost active for ' + def.hours + 'h.'
        });
      }, 900);
    });
  }

  function sendSuperLike(partnerId, message) {
    return new Promise(function (resolve, reject) {
      var partner = DATA.partnerById(partnerId);
      if (!partner) return reject(new Error('Partner not found.'));

      var existing = (state.superLikesSent || []).filter(function (s) { return s.partnerId === partnerId; });
      if (existing.length) {
        return resolve({ ok: true, duplicate: true, message: 'You already Super Liked ' + partner.name + '.' });
      }

      var planId = currentPlan().id;
      var allowance = DATA.planAllowance(planId, 'superlike');
      var sent = (state.superLikesSent || []).length;
      var charge = (allowance === Infinity || sent < allowance) ? 0 : DATA.SUPER_LIKE_COST;

      if (charge > 0 && walletBalance() < charge) {
        return reject(new Error('Insufficient wallet balance. Super Like costs ' + money(DATA.SUPER_LIKE_COST) + '.'));
      }

      setTimeout(function () {
        if (charge > 0) {
          state.wallet.balance = round2(walletBalance() - charge);
          addTransaction({
            partnerId: null,
            partnerName: 'Super Like',
            tier: null,
            amount: charge,
            method: 'wallet',
            description: 'Super Like'
          });
        }

        state.superLikesSent.unshift({
          id: 'sl_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
          partnerId: partnerId,
          name: partner.name,
          photo: partner.photo,
          tier: partner.tier,
          cost: charge,
          message: message || null,
          at: Date.now()
        });

        // Bot partners react with a Super Like back so the feature reads
        // as two-way once the partner is unlocked.
        var me = state.profile;
        if (partner.isBot && (me.gender === 'Man' ? partner.gender === 'Woman' : partner.gender === 'Man')) {
          var alreadyBack = (state.superLikesReceived || []).some(function (s) { return s.partnerId === partnerId; });
          if (!alreadyBack) {
            state.superLikesReceived.unshift({
              id: 'slr_' + Date.now(),
              partnerId: partnerId,
              name: partner.name,
              photo: partner.photo,
              tier: partner.tier,
              message: DATA.pick([
                'That profile caught my eye. Fancy a conversation?',
                'You made me smile. Tell me something interesting.',
                'I liked what I saw. What is your ideal weekend?'
              ]),
              at: Date.now() + 1500
            });
          }
        }

        persist();
        resolve({
          ok: true,
          charged: charge,
          coveredByPlan: charge === 0,
          message: charge === 0
            ? 'Super Liked ' + partner.name + '. Included with your plan.'
            : 'Super Liked ' + partner.name + '.'
        });
      }, 850);
    });
  }

  function pricingFor(planId) {
    planId = planId || currentPlan().id;
    return {
      plans: Object.keys(DATA.PLANS).map(function (id) {
        var p = DATA.PLANS[id];
        return { id: p.id, label: p.label, price: p.price, note: p.note, perks: p.perks, popular: !!p.popular };
      }),
      boosts: Object.keys(DATA.BOOSTS).map(function (id) {
        var b = DATA.BOOSTS[id];
        return {
          id: b.id, label: b.label, price: b.price, hours: b.hours, multiplier: b.multiplier, note: b.note,
          included: DATA.planAllowance(planId, id === 'turbo' ? 'turbo' : 'spotlight') > 0
        };
      }),
      superLike: { cost: DATA.SUPER_LIKE_COST, included: DATA.planAllowance(planId, 'superlike') > 0 }
    };
  }

  /* ----------------------------------------------------------------------
     Layer 4: admin console data
     ---------------------------------------------------------------------- */
  function isAdmin() { return !!(state.session && state.session.isAdmin); }

  function adminGuard() {
    if (!isAuthed()) { location.href = 'login.html'; return false; }
    if (!isAdmin()) {
      toast('Admins only', 'That console is restricted to platform staff.', 'error');
      return false;
    }
    return true;
  }

  function seedAdminData() {
    if (!state.admin) {
      state.admin = deepClone(DATA.ADMIN_SEED);
      persist();
    }
    return state.admin;
  }

  function adminAnalytics() {
    var txs = state.transactions;
    var unlocks = txs.filter(function (t) { return t.partnerId; });
    var subs = txs.filter(function (t) { return /subscription/i.test(t.description || ''); });
    var boosts = txs.filter(function (t) { return /boost/i.test(t.description || ''); });
    var superLikes = txs.filter(function (t) { return /super like/i.test(t.description || ''); });

    var sum = function (list) {
      return Math.round(list.reduce(function (s, t) { return s + (t.amount || 0); }, 0) * 100) / 100;
    };

    var admins = adminGuard();

    // Admin views the whole platform, not just this member's ledger.
    var ledger = admins ? txs.concat(PLATFORM_LEDGER) : txs;
    var unlocksAll = ledger.filter(function (t) { return t.partnerId; });
    var subsAll = ledger.filter(function (t) { return /subscription/i.test(t.description || ''); });
    var plan = currentPlan();

    var revenueByTier = {};
    unlocksAll.forEach(function (t) {
      var key = t.tier || 'Standard';
      revenueByTier[key] = round2((revenueByTier[key] || 0) + (t.amount || 0));
    });

    var revenueByMethod = {};
    ledger.forEach(function (t) {
      var key = t.method || 'wallet';
      revenueByMethod[key] = round2((revenueByMethod[key] || 0) + (t.amount || 0));
    });

    var reports = (seedAdminData().reports || []);
    var tickets = (seedAdminData().tickets || []);

    var countBy = function (list, key) {
      return list.reduce(function (acc, item) { acc[item[key]] = (acc[item[key]] || 0) + 1; return acc; }, {});
    };

    return {
      overview: {
        members: admins ? 2 + (state.unlocked.length || 0) : 1,
        partners: DATA.PARTNERS.length,
        unlocks: unlocksAll.length,
        transactions: ledger.length,
        grossRevenue: sum(ledger),
        unlockRevenue: sum(unlocksAll),
        subscriptionRevenue: sum(subsAll),
        boostRevenue: sum(boosts),
        superLikeRevenue: sum(superLikes),
        activeSubscriptions: plan.status === 'active' ? 1 : 0,
        mrr: plan.status === 'active' ? plan.price : 0,
        planLabel: plan.label,
        activeBoosts: activeBoosts().length,
        superLikes: (state.superLikesSent || []).length,
        walletBalance: walletBalance(),
        pendingReports: countBy(reports, 'status').pending || 0,
        openTickets: countBy(tickets, 'status').open || 0
      },
      revenueByTier: revenueByTier,
      revenueByMethod: revenueByMethod,
      // 14-day shape so the dashboard charts have something to draw
      revenueSeries: buildSeries(ledger, 14, function (t) { return t.amount || 0; }),
      signupSeries: buildSeries(ledger, 14, function () { return 1; }),
      reports: reports,
      tickets: tickets,
      audit: seedAdminData().audit || []
    };
  }

  function buildSeries(txs, days, valueOf) {
    var out = [];
    var now = Date.now();
    for (var i = days - 1; i >= 0; i--) {
      var dayStart = now - i * 86400000;
      var d = new Date(dayStart);
      var key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      var total = 0;
      txs.forEach(function (t) {
        var td = new Date(t.at);
        var tKey = td.getFullYear() + '-' + String(td.getMonth() + 1).padStart(2, '0') + '-' + String(td.getDate()).padStart(2, '0');
        if (tKey === key) total += valueOf(t);
      });
      out.push({ day: key, label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), value: round2(total) });
    }
    return out;
  }

  // Background platform activity so the admin console is not empty on a
  // fresh browser profile. Only admins ever read this.
  var PLATFORM_LEDGER = [
    { id: 'pl1', at: Date.now() - 3600000, amount: 29.99, method: 'stripe', tier: 'Premium', partnerId: 'p02', description: 'Profile unlock', status: 'completed', ref: 'DS-PLT001' },
    { id: 'pl2', at: Date.now() - 7200000, amount: 9.99, method: 'wallet', tier: 'Standard', partnerId: 'p05', description: 'Profile unlock', status: 'completed', ref: 'DS-PLT002' },
    { id: 'pl3', at: Date.now() - 10800000, amount: 14.99, method: 'stripe', tier: null, partnerId: null, description: 'Plus subscription', status: 'completed', ref: 'DS-PLT003' },
    { id: 'pl4', at: Date.now() - 18000000, amount: 99.99, method: 'paypal', tier: 'Elite', partnerId: 'p03', description: 'Profile unlock', status: 'completed', ref: 'DS-PLT004' },
    { id: 'pl5', at: Date.now() - 26000000, amount: 34.99, method: 'stripe', tier: null, partnerId: null, description: 'Gold subscription', status: 'completed', ref: 'DS-PLT005' },
    { id: 'pl6', at: Date.now() - 40000000, amount: 4.99, method: 'wallet', tier: null, partnerId: null, description: 'Spotlight boost', status: 'completed', ref: 'DS-PLT006' },
    { id: 'pl7', at: Date.now() - 60000000, amount: 7.99, method: 'stripe', tier: null, partnerId: null, description: 'Super Like', status: 'completed', ref: 'DS-PLT007' },
    { id: 'pl8', at: Date.now() - 86400000, amount: 29.99, method: 'wallet', tier: 'Premium', partnerId: 'p04', description: 'Profile unlock', status: 'completed', ref: 'DS-PLT008' }
  ];

  function resolveReport(id, status, note) {
    var list = seedAdminData().reports;
    var row = list.filter(function (r) { return r.id === id; })[0];
    if (!row) return Promise.reject(new Error('Report not found.'));
    var allowed = ['pending', 'reviewing', 'resolved', 'dismissed', 'actioned'];
    if (allowed.indexOf(status) === -1) return Promise.reject(new Error('Invalid report status.'));

    return new Promise(function (resolve) {
      setTimeout(function () {
        row.status = status;
        row.note = note || row.note;
        row.reviewedAt = Date.now();
        seedAdminData().audit.unshift({
          action: 'report.' + status,
          entity: 'Report ' + id,
          by: (currentUser() || {}).name || 'Admin',
          at: Date.now(),
          note: note || ''
        });
        persist();
        resolve({ ok: true, message: 'Report marked ' + status + '.' });
      }, 500);
    });
  }

  function setTicketStatus(id, status) {
    var list = seedAdminData().tickets;
    var row = list.filter(function (t) { return t.id === id; })[0];
    if (!row) return Promise.reject(new Error('Ticket not found.'));
    var allowed = ['open', 'pending', 'resolved', 'closed'];
    if (allowed.indexOf(status) === -1) return Promise.reject(new Error('Invalid ticket status.'));

    return new Promise(function (resolve) {
      setTimeout(function () {
        row.status = status;
        seedAdminData().audit.unshift({
          action: 'ticket.' + status,
          entity: 'Ticket ' + id,
          by: (currentUser() || {}).name || 'Admin',
          at: Date.now()
        });
        persist();
        resolve({ ok: true, message: 'Ticket marked ' + status + '.' });
      }, 450);
    });
  }

  function createTicket(category, subject, body, priority) {
    return new Promise(function (resolve) {
      setTimeout(function () {
        var ticket = {
          id: 't_' + Date.now().toString(36),
          category: category || 'General',
          subject: subject,
          body: body,
          priority: priority || 'normal',
          status: 'open',
          user: (currentUser() || {}).name || 'You',
          email: (currentUser() || {}).email || '',
          at: Date.now()
        };
        seedAdminData().tickets.unshift(ticket);
        persist();
        resolve(ticket);
      }, 600);
    });
  }

  function openUpgradeModal(currentPlanId) {
    var pricing = pricingFor(currentPlanId || currentPlan().id);
    var method = 'wallet';
    var chosen = pricing.plans.filter(function (p) { return p.id !== 'free'; })[0];

    modal(
      '<div class="modal-head">' +
        '<div class="modal-hero">' +
          '<div class="modal-hero-icon">&#11088;</div>' +
          '<div>' +
            '<h3>Choose your plan</h3>' +
            '<p class="small" style="color:rgba(255,255,255,.86);margin-top:3px">Cancel any time. Boosts and Super Likes reset monthly.</p>' +
          '</div>' +
        '</div>' +
        '<button class="modal-close" type="button" data-close aria-label="Close"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>' +
      '</div>' +
      '<div class="modal-body">' +
        '<div class="plan-grid" id="planGrid">' +
          pricing.plans.map(function (p) {
            return '<button class="plan-card' + (p.popular ? ' is-popular' : '') + (chosen && chosen.id === p.id ? ' is-active' : '') + '" type="button" data-plan="' + p.id + '"' + (p.id === 'free' ? ' disabled' : '') + '>' +
              (p.popular ? '<span class="tier-flag">Most popular</span>' : '') +
              '<span class="plan-label">' + p.label + '</span>' +
              '<span class="plan-price">' + (p.price ? '<sup>$</sup>' + p.price.toFixed(2) : 'Free') + (p.price ? '<em>/mo</em>' : '') + '</span>' +
              '<span class="plan-note">' + p.note + '</span>' +
              '<ul class="tier-feats">' +
                p.perks.map(function (perk) { return '<li><span class="tick">&#10003;</span><span class="tiny">' + esc(perk) + '</span></li>'; }).join('') +
              '</ul>' +
            '</button>';
          }).join('') +
        '</div>' +

        '<div class="field mt-6">' +
          '<label class="label">How would you like to pay?</label>' +
          '<div class="pay-grid" id="payGrid2">' +
            '<div class="pay-card is-active" data-method="wallet" tabindex="0">' +
              '<div class="pay-logo" style="font-size:1.3rem">&#128176;</div>' +
              '<div class="pay-title">Wallet</div>' +
              '<div class="pay-sub" id="walletSub2">' + money(walletBalance()) + '</div>' +
            '</div>' +
            '<div class="pay-card" data-method="stripe" tabindex="0">' +
              '<div class="pay-logo" style="color:#635bff;font-weight:800;font-size:.8rem">stripe</div>' +
              '<div class="pay-title">Card</div>' +
              '<div class="pay-sub">Stripe</div>' +
            '</div>' +
            '<div class="pay-card" data-method="paypal" tabindex="0">' +
              '<div class="pay-logo" style="color:#003087;font-weight:800;font-size:.78rem">PayPal</div>' +
              '<div class="pay-title">PayPal</div>' +
              '<div class="pay-sub">Recurring</div>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div id="upgradeStatus" class="mt-4"></div>' +
        '<button class="btn btn-primary btn-block btn-lg mt-6" type="button" id="confirmUpgrade">Confirm upgrade</button>' +
        '<p class="center tiny muted mt-4">Renews monthly until cancelled. Sandbox only, no real charge is made.</p>' +
      '</div>',
      {
        xwide: true,
        onMount: function (root) {
          var status = root.querySelector('#upgradeStatus');
          var confirm = root.querySelector('#confirmUpgrade');

          function syncLabel() {
            var plan = DATA.PLANS[chosen.id];
            confirm.textContent = chosen.id === 'free'
              ? 'Switch to Free'
              : 'Upgrade to ' + plan.label + ' \u00B7 ' + money(plan.price);
          }

          function refresh() {
            root.querySelectorAll('#planGrid .plan-card').forEach(function (c) {
              c.classList.toggle('is-active', c.getAttribute('data-plan') === chosen.id);
            });
            var plan = DATA.PLANS[chosen.id];
            if (method === 'wallet' && plan.price > walletBalance()) {
              status.innerHTML =
                '<div class="alert alert-warn"><span>&#9888;</span><span>' +
                'Your wallet has ' + money(walletBalance()) + ' but ' + plan.label + ' costs ' + money(plan.price) + '. ' +
                'Top up or choose a card.</span></div>';
            } else {
              status.innerHTML = '';
            }
            syncLabel();
          }

          root.querySelectorAll('[data-close]').forEach(function (b) {
            b.addEventListener('click', closeModal);
          });

          root.querySelectorAll('#planGrid .plan-card:not([disabled])').forEach(function (card) {
            card.addEventListener('click', function () {
              chosen = DATA.PLANS[card.getAttribute('data-plan')];
              refresh();
            });
          });

          root.querySelectorAll('#payGrid2 .pay-card').forEach(function (c) {
            c.addEventListener('click', function () {
              method = c.getAttribute('data-method');
              root.querySelectorAll('#payGrid2 .pay-card').forEach(function (x) {
                x.classList.toggle('is-active', x === c);
              });
              refresh();
            });
          });

          refresh();

          confirm.addEventListener('click', function () {
            confirm.disabled = true;
            confirm.innerHTML = '<span class="spinner"></span> Processing\u2026';
            status.innerHTML =
              '<div class="processing" style="padding:var(--s-6) 0">' +
                '<div class="spinner-ring"></div>' +
                '<div class="strong small">' +
                  (method === 'wallet' ? 'Checking wallet balance\u2026' : 'Opening secure checkout\u2026') +
                '</div>' +
                (method === 'wallet' ? '' : '<div class="tiny muted">Sandbox \u00B7 no real charge is made</div>') +
              '</div>';

            changePlan(chosen.id, method).then(function (res) {
              closeModal();
              refreshChrome();
              toast('Plan updated', res.message, 'success');
              document.dispatchEvent(new CustomEvent('ds:plan-changed'));
            }).catch(function (err) {
              confirm.disabled = false;
              refresh();
              status.innerHTML = '<div class="alert alert-danger"><span>&#9888;</span><span>' + esc(err.message) + '</span></div>';
            });
          });
        }
      }
    );
  }

  global.App = {
    // store
    state: function () { return state; },
    persist: persist,
    onChange: onChange,
    reset: function () {
      state = deepClone(DEFAULT_STATE);
      persist();
    },
    // auth
    register: registerUser,
    login: loginUser,
    socialLogin: socialLogin,
    logout: logout,
    isAuthed: isAuthed,
    user: currentUser,
    profile: currentProfile,
    requireAuth: requireAuth,
    redirectIfAuthed: redirectIfAuthed,
    hash: hash,
    // profile
    INTERESTS: INTERESTS,
    saveProfile: saveProfile,
    updateProfile: updateProfile,
    completion: profileCompletion,
    // money
    balance: walletBalance,
    isUnlocked: isUnlocked,
    unlock: unlockPartner,
    addFunds: addFunds,
    transactions: function () { return state.transactions; },
    // monetization
    currentPlan: currentPlan,
    planOrders: planOrders,
    changePlan: changePlan,
    cancelPlan: cancelPlan,
    activeBoosts: activeBoosts,
    startBoost: startBoost,
    sendSuperLike: sendSuperLike,
    pricing: pricingFor,
    openUpgradeModal: openUpgradeModal,
    // admin
    isAdmin: isAdmin,
    adminGuard: adminGuard,
    adminAnalytics: adminAnalytics,
    resolveReport: resolveReport,
    setTicketStatus: setTicketStatus,
    createTicket: createTicket,
    // chat
    messages: getMessages,
    send: addMessage,
    resetChat: resetChat,
    chatPartners: chatPartners,
    lastMessage: lastMessageOf,
    unread: unreadCount,
    // notifications
    notify: pushNotifications,
    unreadNotifications: unreadNotifications,
    markRead: markNotificationsRead,
    sawInterest: hasSeenInterest,
    openNotifications: openNotifications,
    // ui
    toast: toast,
    modal: modal,
    closeModal: closeModal,
    openTopUp: openTopUp,
    theme: toggleTheme,
    refreshChrome: refreshChrome,
    // format
    money: money,
    timeAgo: timeAgo,
    timeUntil: timeUntil,
    clock: clockTime,
    dayLabel: dayLabel,
    esc: escapeHtml,
    img: partnerImage,
    initials: initials,
    tierClass: tierClass,
    // data
    data: DATA,
    boot: boot
  };
})(window);
