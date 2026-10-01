/* ============================================================
   个人网站 · 主逻辑
   - 多语言渲染与切换（自动识别浏览器语言）
   - 接待专区智能回复（本地关键词匹配，无需后端）
   - 单页滚动导航
   ============================================================ */

/* ---------- 可配置项：品牌与联系方式（上线前请在此替换） ---------- */
var SITE_CONFIG = {
  wechat: "wxid_bzgv0cn5l16922",
  email: "19325116173@163.com",
  phone: "+86 193 2511 6173",
  formEndpoint: ""
};

/* ---------- 工具函数 ---------- */
function el(tag, attrs) {
  var node = document.createElement(tag);
  attrs = attrs || {};
  var children = Array.prototype.slice.call(arguments, 2);
  Object.keys(attrs).forEach(function (k) {
    if (k === "class") node.className = attrs[k];
    else if (k === "html") node.innerHTML = attrs[k];
    else if (k === "text") node.textContent = attrs[k];
    else node.setAttribute(k, attrs[k]);
  });
  children.forEach(function (c) {
    if (c == null) return;
    if (typeof c === "string") node.appendChild(document.createTextNode(c));
    else node.appendChild(c);
  });
  return node;
}

/* ---------- 语言检测 ---------- */
function detectLang() {
  var p = new URLSearchParams(location.search).get("lang");
  if (p && window.I18N[p]) return p;
  if (window.SITE_DEFAULT_LANG && window.I18N[window.SITE_DEFAULT_LANG]) return window.SITE_DEFAULT_LANG;
  var s = null;
  try { s = localStorage.getItem("lang"); } catch (e) {}
  if (s && window.I18N[s]) return s;
  var b = (navigator.language || "en").toLowerCase();
  if (window.I18N[b]) return b;
  var two = b.split("-")[0];
  if (window.I18N[two]) return two;
  return two === "zh" ? "zh" : "en";
}

var currentLang = detectLang();
var VIEWS = ["home", "about", "ppt", "miniapp", "web", "reception", "wholesale", "contact"];

function currentViewFromHash() {
  var h = location.hash.replace(/^#\/?/, "");
  return VIEWS.indexOf(h) >= 0 ? h : "home";
}

var view = currentViewFromHash();

/* ---------- 导航平滑滚动 ---------- */
function scrollToId(id) {
  var n = document.getElementById(id);
  if (n) n.scrollIntoView({ behavior: "smooth", block: "start" });
}

function showView(id) {
  if (VIEWS.indexOf(id) < 0) id = "home";
  view = id;
  if (location.hash !== "#" + id) {
    try { history.pushState(null, "", "#" + id); } catch (e) { location.hash = "#" + id; }
  }
  render();
}

window.addEventListener("popstate", function () {
  view = currentViewFromHash();
  render();
});

/* ---------- 语言切换下拉 ---------- */
function buildLangSwitcher() {
  var t = window.I18N[currentLang];
  var btn = el("button", { class: "lang-btn", type: "button" });
  btn.appendChild(el("span", { class: "lang-flag" }, t.flag));
  btn.appendChild(el("span", { class: "lang-name" }, t.name));
  btn.appendChild(el("span", { class: "caret" }, "▾"));

  var menu = el("div", { class: "lang-menu" });
  Object.keys(window.I18N).forEach(function (code) {
    var L = window.I18N[code];
    var item = el("button", { class: "lang-item" + (code === currentLang ? " active" : ""), type: "button" });
    item.appendChild(el("span", { class: "lang-flag" }, L.flag));
    item.appendChild(el("span", {}, L.name));
    item.addEventListener("click", function () { setLang(code); });
    menu.appendChild(item);
  });

  var wrap = el("div", { class: "lang-wrap" }, btn, menu);
  btn.addEventListener("click", function (e) {
    e.stopPropagation();
    wrap.classList.toggle("open");
  });
  document.addEventListener("click", function () { wrap.classList.remove("open"); });
  return wrap;
}

function setLang(code) {
  currentLang = code;
  try { localStorage.setItem("lang", code); } catch (e) {}
  var url = new URL(location.href);
  url.searchParams.set("lang", code);
  history.replaceState(null, "", url.toString());
  render();
}

/* ---------- 聊天机器人 ---------- */
function botReply(text) {
  var t = window.I18N[currentLang];
  var q = (text || "").toLowerCase();
  for (var i = 0; i < t.reception.bot.length; i++) {
    var item = t.reception.bot[i];
    for (var j = 0; j < item.q.length; j++) {
      if (q.indexOf(item.q[j].toLowerCase()) !== -1) return item.a;
    }
  }
  return t.reception.fallback;
}

function buildChat(t) {
  var wrap = el("div", { class: "chat" });
  var log = el("div", { class: "chat-log" });
  var inputRow = el("div", { class: "chat-input-row" });
  var input = el("input", { class: "chat-input", type: "text", placeholder: t.reception.placeholder });
  var send = el("button", { class: "chat-send", type: "button" }, "➤");

  function addBubble(text, who) {
    log.appendChild(el("div", { class: "bubble " + who, text: text }));
    log.scrollTop = log.scrollHeight;
  }

  function respond(text) {
    addBubble(text, "user");
    setTimeout(function () { addBubble(botReply(text), "bot"); }, 350);
  }

  send.addEventListener("click", function () {
    var v = input.value.trim();
    if (!v) return;
    input.value = "";
    respond(v);
  });
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter") { send.click(); }
  });

  addBubble(t.reception.greeting, "bot");

  var quick = el("div", { class: "chat-quick" });
  t.reception.quick.forEach(function (qText) {
    var qb = el("button", { class: "chip", type: "button" }, qText);
    qb.addEventListener("click", function () { respond(qText); });
    quick.appendChild(qb);
  });

  inputRow.appendChild(input);
  inputRow.appendChild(send);
  wrap.appendChild(log);
  wrap.appendChild(quick);
  wrap.appendChild(inputRow);
  return wrap;
}

/* ---------- 区块构建 ---------- */
function section(id, cls, inner) {
  return el("section", { id: id, class: "section " + cls }, inner);
}

function container() {
  return el("div", { class: "container" });
}

function sectionHead(t, badgeText) {
  var head = el("div", { class: "section-head" });
  if (badgeText) head.appendChild(el("span", { class: "badge" }, badgeText));
  head.appendChild(el("h2", { class: "section-title" }, t.title));
  if (t.subtitle) head.appendChild(el("p", { class: "section-sub" }, t.subtitle));
  return head;
}

function buildHeader(t) {
  var logo = el("a", { class: "logo", href: "#top" });
  logo.addEventListener("click", function (e) { e.preventDefault(); showView("home"); });
  logo.appendChild(el("span", { class: "logo-mark" }, "ASH"));
  logo.appendChild(el("span", { class: "logo-text" }, t.brand));

  var nav = el("nav", { class: "nav" });
  var links = [
    [t.nav.home, "home"],
    [t.nav.about, "about"],
    [t.nav.contact, "contact"]
  ];
  links.forEach(function (pair) {
    var a = el("a", { class: "nav-link", href: "#" + pair[1] }, pair[0]);
    a.addEventListener("click", function (e) { e.preventDefault(); showView(pair[1]); });
    nav.appendChild(a);
  });

  var menuBtn = el("button", { class: "menu-btn", type: "button" }, "☰");
  menuBtn.addEventListener("click", function () {
    nav.classList.toggle("show");
  });

  var header = el("header", { class: "header" });
  var inner = el("div", { class: "header-inner" }, logo, nav, buildLangSwitcher(), menuBtn);
  header.appendChild(inner);
  return header;
}

function buildHero(t) {
  var c = container();
  var inner = el("div", { class: "hero-inner" });
  inner.appendChild(el("span", { class: "hero-badge" }, t.hero.badge));
  inner.appendChild(el("h1", { class: "hero-title" }, t.hero.title));
  inner.appendChild(el("p", { class: "hero-sub" }, t.hero.subtitle));
  c.appendChild(inner);
  return section("top", "hero", c);
}

function buildServices(t) {
  var c = container();
  c.appendChild(sectionHead(t.services, null));
  var grid = el("div", { class: "cards" });
  var targets = ["ppt", "miniapp", "web", "wholesale", "reception"];
  t.services.items.forEach(function (it, i) {
    var card = el("a", { class: "card card-link", href: "#" + targets[i] });
    card.appendChild(el("div", { class: "card-icon" }, it.icon));
    card.appendChild(el("h3", { class: "card-title" }, it.title));
    card.appendChild(el("p", { class: "card-desc" }, it.desc));
    card.appendChild(el("span", { class: "card-more" }, (t.services.more || "→")));
    card.addEventListener("click", function (e) { e.preventDefault(); showView(targets[i]); });
    grid.appendChild(card);
  });
  c.appendChild(grid);
  return section("services", "", c);
}

function buildAbout(t) {
  var c = container();
  c.appendChild(sectionHead(t.about, null));

  var split = el("div", { class: "about-split" });

  var introCol = el("div", { class: "about-col" });
  introCol.appendChild(el("h3", { class: "about-h3" }, t.about.title));
  t.about.intro.forEach(function (p) { introCol.appendChild(el("p", {}, p)); });
  split.appendChild(introCol);

  var scopeCol = el("div", { class: "about-col" });
  scopeCol.appendChild(el("h3", { class: "about-h3" }, t.about.scopeTitle));
  var scopeList = el("ul", { class: "about-list" });
  t.about.scope.forEach(function (s) { scopeList.appendChild(el("li", {}, s)); });
  scopeCol.appendChild(scopeList);
  split.appendChild(scopeCol);

  c.appendChild(split);

  var sw = el("div", { class: "about-block" });
  sw.appendChild(el("h3", { class: "about-h3" }, t.about.strengthsTitle));
  var grid = el("div", { class: "strength-grid" });
  t.about.strengths.forEach(function (s) {
    var card = el("div", { class: "strength-card" });
    card.appendChild(el("h4", {}, s.title));
    card.appendChild(el("p", {}, s.desc));
    grid.appendChild(card);
  });
  sw.appendChild(grid);
  c.appendChild(sw);

  return section("about", "about", c);
}

function buildDetail(id, t) {
  var c = container();
  c.appendChild(el("h2", { class: "section-title" }, t.title));
  if (t.desc) c.appendChild(el("p", { class: "detail-desc" }, t.desc));

  var body = el("div", { class: "detail-body" });

  var list = el("ul", { class: "check-list" });
  t.items.forEach(function (it) { list.appendChild(el("li", {}, "✓ " + it)); });
  body.appendChild(list);

  if (t.advantages && t.advantages.length) {
    body.appendChild(el("h4", { class: "detail-sub" }, t.advantagesTitle));
    var ag = el("div", { class: "strength-grid" });
    t.advantages.forEach(function (a) {
      var card = el("div", { class: "strength-card" });
      card.appendChild(el("h4", {}, a.title));
      card.appendChild(el("p", {}, a.desc));
      ag.appendChild(card);
    });
    body.appendChild(ag);
  }

  body.appendChild(el("h4", { class: "detail-sub" }, t.processTitle));
  var steps = el("ol", { class: "steps" });
  t.process.forEach(function (s) { steps.appendChild(el("li", {}, s)); });
  body.appendChild(steps);

  body.appendChild(el("h4", { class: "detail-sub" }, t.deliverTitle));
  body.appendChild(el("p", { class: "detail-deliver" }, t.deliver));

  if (t.scope && t.scope.length) {
    body.appendChild(el("h4", { class: "detail-sub" }, t.scopeTitle));
    var sc = el("div", { class: "scope-grid" });
    t.scope.forEach(function (tier) {
      var card = el("div", { class: "scope-card" });
      card.appendChild(el("div", { class: "scope-name" }, tier.name));
      if (tier.price) card.appendChild(el("div", { class: "scope-price" }, tier.price));
      var ul = el("ul", { class: "scope-list" });
      tier.features.forEach(function (f) { ul.appendChild(el("li", {}, f)); });
      card.appendChild(ul);
      sc.appendChild(card);
    });
    body.appendChild(sc);
    if (t.scopeNote) body.appendChild(el("p", { class: "scope-note" }, t.scopeNote));
  }

  c.appendChild(body);
  return section(id, "detail-page", c);
}

function buildReception(t) {
  var c = container();
  c.appendChild(sectionHead(t.reception, null));
  var grid = el("div", { class: "reception-grid" });
  var chat = buildChat(t);
  grid.appendChild(chat);
  c.appendChild(grid);
  return section("reception", "reception", c);
}

function buildWholesale(t) {
  var c = container();
  c.appendChild(sectionHead(t.wholesale, null));

  var cats = el("div", { class: "wholesale-cats" });
  var catsData = (window.PRODUCTS && window.PRODUCTS[currentLang] && window.PRODUCTS[currentLang].categories)
    ? window.PRODUCTS[currentLang].categories : t.wholesale.categories;
  catsData.forEach(function (cat) {
    var details = el("details", { class: "wholesale-cat" });
    details.appendChild(el("summary", {}, (cat.icon ? cat.icon + " " : "") + (cat.name || "")));
    if (cat.items && cat.items.length) {
      var list = el("div", { class: "wholesale-products" });
      cat.items.forEach(function (it) {
        var card = el("div", { class: "wholesale-product" });
        card.appendChild(el("div", { class: "wholesale-product-name" }, it.name));
        card.appendChild(el("div", { class: "wholesale-product-price" }, it.price));
        list.appendChild(card);
      });
      details.appendChild(list);
    }
    cats.appendChild(details);
  });
  c.appendChild(cats);

  if (t.wholesale.note) c.appendChild(el("p", { class: "wholesale-note" }, t.wholesale.note));
  var cta = el("a", { class: "btn btn-primary", href: "#contact" }, t.wholesale.cta);
  cta.addEventListener("click", function (e) { e.preventDefault(); showView("contact"); });
  c.appendChild(el("div", { class: "center" }, cta));
  return section("wholesale", "wholesale", c);
}

function buildContact(t) {
  var c = container();
  c.appendChild(sectionHead(t.contact, null));
  var grid = el("div", { class: "contact-grid" });

  var info = el("div", { class: "contact-info" });
  function row(icon, label, value) {
    var r = el("div", { class: "contact-row" });
    r.appendChild(el("span", { class: "contact-icon" }, icon));
    var box = el("div", {});
    box.appendChild(el("div", { class: "contact-label" }, label));
    box.appendChild(el("div", { class: "contact-value" }, value));
    r.appendChild(box);
    return r;
  }
  var contacts = [
    ["💬", t.contact.wechat, SITE_CONFIG.wechat],
    ["✉️", t.contact.email, SITE_CONFIG.email],
    ["📞", t.contact.phone, SITE_CONFIG.phone]
  ];
  contacts.forEach(function (r) {
    if (r[2]) info.appendChild(row(r[0], r[1], r[2]));
  });
  info.appendChild(row("🕒", t.contact.hours, t.contact.hoursVal));

  var form = el("form", { class: "contact-form" });
  var nameInput = el("input", { class: "field", type: "text", name: "name", placeholder: t.contact.form.name });
  var contactInput = el("input", { class: "field", type: "text", name: "contact", placeholder: t.contact.form.contact });
  var msgInput = el("textarea", { class: "field", name: "message", rows: "4", placeholder: t.contact.form.message });
  form.appendChild(nameInput);
  form.appendChild(contactInput);
  form.appendChild(msgInput);
  var status = el("div", { class: "form-status" });
  var submit = el("button", { class: "btn btn-primary", type: "submit" }, t.contact.form.send);
  form.appendChild(submit);
  form.appendChild(status);
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var name = nameInput.value.trim();
    var contact = contactInput.value.trim();
    var message = msgInput.value.trim();
    if (!message) {
      status.textContent = currentLang === "zh" ? "请填写留言内容。" : "Please write a message.";
      status.classList.add("show");
      return;
    }
    status.textContent = currentLang === "zh" ? "发送中…" : "Sending…";
    status.classList.add("show");
    if (SITE_CONFIG.formEndpoint) {
      fetch(SITE_CONFIG.formEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({ name: name, contact: contact, message: message, lang: currentLang })
      }).then(function (r) {
        if (r.ok) {
          status.textContent = t.contact.form.success;
          form.reset();
        } else {
          status.textContent = currentLang === "zh" ? "发送失败，请直接邮件联系我们。" : "Send failed, please email us directly.";
        }
      }).catch(function () {
        status.textContent = currentLang === "zh" ? "发送失败，请直接邮件联系我们。" : "Send failed, please email us directly.";
      });
      return;
    }
    var subject = (currentLang === "zh" ? "官网咨询" : "Website inquiry") + (name ? " - " + name : "");
    var body = "Name: " + name + "\nContact: " + contact + "\n\n" + message;
    location.href = "mailto:" + SITE_CONFIG.email + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
    status.textContent = t.contact.form.success;
    form.reset();
  });

  grid.appendChild(info);
  grid.appendChild(form);
  c.appendChild(grid);
  return section("contact", "contact", c);
}

function buildFooter(t) {
  return el("footer", { class: "footer" }, el("div", { class: "container" }, t.footer.copyright));
}

function buildModule(id, t) {
  var wrap = el("div", {});
  if (id === "about") wrap.appendChild(buildAbout(t));
  else if (id === "ppt" || id === "miniapp" || id === "web") wrap.appendChild(buildDetail(id, t[id]));
  else if (id === "reception") wrap.appendChild(buildReception(t));
  else if (id === "wholesale") wrap.appendChild(buildWholesale(t));
  else if (id === "contact") wrap.appendChild(buildContact(t));
  return wrap;
}

/* ---------- 主渲染 ---------- */
function render() {
  var t = window.I18N[currentLang];
  var en = window.I18N.en;

  // 新增字段回退到英文，保证未翻译语言不缺失关键板块
  if (currentLang !== "en") {
    if (!t.back) t.back = en.back;
    if (!t.less) t.less = en.less;
    if (t.nav && !t.nav.about) t.nav.about = en.nav.about;
    if (t.services && !t.services.more) t.services.more = en.services.more;
    if (!t.about) t.about = en.about;
    ["ppt", "miniapp", "web"].forEach(function (k) {
      if (!t[k] || !en[k]) return;
      if (!t[k].desc) t[k].desc = en[k].desc;
      if (!t[k].scopeTitle) t[k].scopeTitle = en[k].scopeTitle;
      if (!t[k].scope) t[k].scope = en[k].scope;
      if (!t[k].scopeNote) t[k].scopeNote = en[k].scopeNote;
      if (!t[k].advantagesTitle) t[k].advantagesTitle = en[k].advantagesTitle;
      if (!t[k].advantages) t[k].advantages = en[k].advantages;
    });
    if (t.wholesale && en.wholesale) {
      if (!t.wholesale.categories || (t.wholesale.categories.length && typeof t.wholesale.categories[0] === "string")) {
        t.wholesale.categories = en.wholesale.categories;
      }
      if (!t.wholesale.note) t.wholesale.note = en.wholesale.note;
      delete t.wholesale.subtitle;
    }
  }

  document.documentElement.lang = currentLang;
  document.documentElement.dir = t.dir;
  document.title = t.brand + " · " + t.hero.badge;

  var app = document.getElementById("app");
  app.innerHTML = "";
  app.appendChild(buildHeader(t));
  if (view === "home") {
    app.appendChild(buildHero(t));
    app.appendChild(buildServices(t));
  } else {
    app.appendChild(buildModule(view, t));
  }
  app.appendChild(buildFooter(t));
  window.scrollTo(0, 0);
}

document.addEventListener("DOMContentLoaded", render);
