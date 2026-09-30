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
  phone: "+86 193 2511 6173"
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
  var s = null;
  try { s = localStorage.getItem("lang"); } catch (e) {}
  if (s && window.I18N[s]) return s;
  if (window.SITE_DEFAULT_LANG && window.I18N[window.SITE_DEFAULT_LANG]) return window.SITE_DEFAULT_LANG;
  var b = (navigator.language || "en").toLowerCase();
  if (window.I18N[b]) return b;
  var two = b.split("-")[0];
  if (window.I18N[two]) return two;
  return two === "zh" ? "zh" : "en";
}

var currentLang = detectLang();

/* ---------- 导航平滑滚动 ---------- */
function scrollToId(id) {
  var n = document.getElementById(id);
  if (n) n.scrollIntoView({ behavior: "smooth", block: "start" });
}

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
  logo.appendChild(el("span", { class: "logo-mark" }, "ASH"));
  logo.appendChild(el("span", { class: "logo-text" }, t.brand));

  var nav = el("nav", { class: "nav" });
  var links = [
    [t.nav.home, "top"],
    [t.nav.services, "services"],
    [t.nav.ppt, "ppt"],
    [t.nav.miniapp, "miniapp"],
    [t.nav.web, "web"],
    [t.nav.reception, "reception"],
    [t.nav.wholesale, "wholesale"],
    [t.nav.contact, "contact"]
  ];
  links.forEach(function (pair) {
    var a = el("a", { class: "nav-link", href: "#" + pair[1] }, pair[0]);
    a.addEventListener("click", function (e) { e.preventDefault(); scrollToId(pair[1]); });
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
  var btns = el("div", { class: "hero-btns" });
  var b1 = el("a", { class: "btn btn-primary", href: "#contact" }, t.hero.cta1);
  var b2 = el("a", { class: "btn btn-ghost", href: "#services" }, t.hero.cta2);
  b1.addEventListener("click", function (e) { e.preventDefault(); scrollToId("contact"); });
  b2.addEventListener("click", function (e) { e.preventDefault(); scrollToId("services"); });
  btns.appendChild(b1); btns.appendChild(b2);
  inner.appendChild(btns);
  c.appendChild(inner);
  return section("top", "hero", c);
}

function buildServices(t) {
  var c = container();
  c.appendChild(sectionHead(t.services, null));
  var grid = el("div", { class: "cards" });
  t.services.items.forEach(function (it) {
    var card = el("div", { class: "card" });
    card.appendChild(el("div", { class: "card-icon" }, it.icon));
    card.appendChild(el("h3", { class: "card-title" }, it.title));
    card.appendChild(el("p", { class: "card-desc" }, it.desc));
    grid.appendChild(card);
  });
  c.appendChild(grid);
  return section("services", "", c);
}

function buildDetail(id, t) {
  var c = container();
  var grid = el("div", { class: "detail-grid" });
  var info = el("div", { class: "detail-info" });
  info.appendChild(el("span", { class: "badge" }, t.title));
  info.appendChild(el("h2", { class: "section-title" }, t.tagline));

  info.appendChild(el("h4", { class: "detail-sub" }, t.processTitle));
  var steps = el("ol", { class: "steps" });
  t.process.forEach(function (s) { steps.appendChild(el("li", {}, s)); });
  info.appendChild(steps);

  info.appendChild(el("h4", { class: "detail-sub" }, t.deliverTitle));
  info.appendChild(el("p", { class: "detail-deliver" }, t.deliver));

  var side = el("div", { class: "detail-side" });
  var list = el("ul", { class: "check-list" });
  t.items.forEach(function (it) { list.appendChild(el("li", {}, "✓ " + it)); });
  side.appendChild(list);

  grid.appendChild(info);
  grid.appendChild(side);
  c.appendChild(grid);
  return section(id, "detail", c);
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
  var grid = el("div", { class: "wholesale-grid" });
  t.wholesale.categories.forEach(function (cat) {
    grid.appendChild(el("div", { class: "wholesale-item" }, cat));
  });
  c.appendChild(grid);
  c.appendChild(el("p", { class: "wholesale-note" }, t.wholesale.note));
  var cta = el("a", { class: "btn btn-primary", href: "#contact" }, t.wholesale.cta);
  cta.addEventListener("click", function (e) { e.preventDefault(); scrollToId("contact"); });
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
  form.appendChild(el("input", { class: "field", type: "text", placeholder: t.contact.form.name }));
  form.appendChild(el("input", { class: "field", type: "text", placeholder: t.contact.form.contact }));
  form.appendChild(el("textarea", { class: "field", rows: "4", placeholder: t.contact.form.message }));
  var status = el("div", { class: "form-status" });
  var submit = el("button", { class: "btn btn-primary", type: "submit" }, t.contact.form.send);
  form.appendChild(submit);
  form.appendChild(status);
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    status.textContent = t.contact.form.success;
    status.classList.add("show");
    form.reset();
    setTimeout(function () { status.classList.remove("show"); }, 4000);
  });

  grid.appendChild(info);
  grid.appendChild(form);
  c.appendChild(grid);
  return section("contact", "contact", c);
}

function buildFooter(t) {
  return el("footer", { class: "footer" }, el("div", { class: "container" }, t.footer.copyright));
}

/* ---------- 主渲染 ---------- */
function render() {
  var t = window.I18N[currentLang];
  document.documentElement.lang = currentLang;
  document.documentElement.dir = t.dir;
  document.title = t.brand + " · " + t.hero.badge;

  var app = document.getElementById("app");
  app.innerHTML = "";
  app.appendChild(buildHeader(t));
  app.appendChild(buildHero(t));
  app.appendChild(buildServices(t));
  app.appendChild(buildDetail("ppt", t.ppt));
  app.appendChild(buildDetail("miniapp", t.miniapp));
  app.appendChild(buildDetail("web", t.web));
  app.appendChild(buildReception(t));
  app.appendChild(buildWholesale(t));
  app.appendChild(buildContact(t));
  app.appendChild(buildFooter(t));
}

document.addEventListener("DOMContentLoaded", render);
