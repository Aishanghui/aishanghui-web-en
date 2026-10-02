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
  formEndpoint: "https://formsubmit.co/ajax/19325116173@163.com",
  payment: {
    alipay: "19325116173",  // 支付宝收款账号（手机号/邮箱）
    alipayName: "AiShangHui", // 支付宝实名
    bankName: "",      // 开户行（如：中国工商银行）
    bankCard: "",      // 银行卡号
    bankHolder: "",    // 户名
    qrImage: ""        // 收款码图片 URL
  }
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
var VIEWS = ["home", "about", "ppt", "miniapp", "web", "reception", "wholesale", "contact", "cart"];

function currentViewFromHash() {
  var h = location.hash.replace(/^#\/?/, "");
  var m = h.match(/^wholesale\/(\d+)$/);
  if (m) { currentCatIdx = parseInt(m[1], 10) || 0; return "cat"; }
  var p = h.match(/^product\/(\d+)\/(\d+)$/);
  if (p) { currentCatIdx = parseInt(p[1], 10) || 0; currentItemIdx = parseInt(p[2], 10) || 0; return "product"; }
  return VIEWS.indexOf(h) >= 0 ? h : "home";
}

var currentCatIdx = 0;
var currentItemIdx = 0;
var view = currentViewFromHash();

/* ---------- 商品数据覆盖（本地管理编辑，localStorage 持久化） ---------- */
var PRODUCT_OVERRIDES_KEY = "ASH_PRODUCT_OVERRIDES";
var isAdmin = (function () {
  try { return new URLSearchParams(location.search).get("admin") === "1"; } catch (e) { return false; }
})();
function loadOverrides() {
  try { return JSON.parse(localStorage.getItem(PRODUCT_OVERRIDES_KEY) || "{}"); } catch (e) { return {}; }
}
function saveOverrides(o) {
  try { localStorage.setItem(PRODUCT_OVERRIDES_KEY, JSON.stringify(o)); return true; } catch (e) { return false; }
}

/* ---------- 购物车（localStorage 持久化） ---------- */
var CART_KEY = "ASH_CART";
function loadCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY) || "[]"); } catch (e) { return []; }
}
function saveCart(c) {
  try { localStorage.setItem(CART_KEY, JSON.stringify(c)); return true; } catch (e) { return false; }
}
function cartIndexOf(cart, it) {
  for (var i = 0; i < cart.length; i++) {
    if (cart[i].catIdx === it.catIdx && cart[i].itemIdx === it.itemIdx) return i;
  }
  return -1;
}
function addToCart(catIdx, itemIdx, qty) {
  var cart = loadCart();
  var idx = -1;
  for (var i = 0; i < cart.length; i++) {
    if (cart[i].catIdx === catIdx && cart[i].itemIdx === itemIdx) { idx = i; break; }
  }
  if (idx >= 0) { cart[idx].qty += qty; }
  else { cart.push({ catIdx: catIdx, itemIdx: itemIdx, qty: qty }); }
  saveCart(cart);
}
function cartCount() {
  var cart = loadCart(); var n = 0;
  cart.forEach(function (it) { n += it.qty; });
  return n;
}
function setCartQty(it, delta) {
  var cart = loadCart();
  var idx = cartIndexOf(cart, it);
  if (idx < 0) return;
  cart[idx].qty += delta;
  if (cart[idx].qty < 1) cart.splice(idx, 1);
  saveCart(cart);
  render();
}
function removeCartItem(it) {
  var cart = loadCart();
  var idx = cartIndexOf(cart, it);
  if (idx >= 0) cart.splice(idx, 1);
  saveCart(cart);
  render();
}

function toast(msg) {
  var n = document.getElementById("ash-toast");
  if (!n) {
    n = el("div", { id: "ash-toast", class: "toast" });
    document.body.appendChild(n);
  }
  n.textContent = msg;
  n.classList.add("show");
  clearTimeout(n._t);
  n._t = setTimeout(function () { n.classList.remove("show"); }, 1600);
}

function fileToDataUrl(file, cb) {
  var img = new Image();
  var url = URL.createObjectURL(file);
  img.onload = function () {
    URL.revokeObjectURL(url);
    var max = 1280;
    var w = img.width, h = img.height;
    var k = Math.min(1, max / Math.max(w, h));
    w = Math.round(w * k); h = Math.round(h * k);
    var cv = document.createElement("canvas");
    cv.width = w; cv.height = h;
    cv.getContext("2d").drawImage(img, 0, 0, w, h);
    cb(cv.toDataURL("image/jpeg", 0.82));
  };
  img.onerror = function () { URL.revokeObjectURL(url); cb(""); };
  img.src = url;
}

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

function showCategory(idx) {
  currentCatIdx = idx;
  view = "cat";
  var h = "#wholesale/" + idx;
  try { history.pushState(null, "", h); } catch (e) { location.hash = h; }
  render();
}

function showProduct(catIdx, itemIdx) {
  currentCatIdx = catIdx;
  currentItemIdx = itemIdx;
  view = "product";
  var h = "#product/" + catIdx + "/" + itemIdx;
  try { history.pushState(null, "", h); } catch (e) { location.hash = h; }
  render();
}

function showCart() {
  view = "cart";
  try { history.pushState(null, "", "#cart"); } catch (e) { location.hash = "#cart"; }
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
  var inner = el("div", { class: "header-inner" }, logo, nav, buildLangSwitcher(), buildCartButton(), menuBtn);
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

  var catsData = getCatsData().cats;

  var grid = el("div", { class: "wholesale-cat-grid" });
  catsData.forEach(function (cat, catIdx) {
    var card = el("a", { class: "wholesale-cat-card", href: "#wholesale/" + catIdx });
    card.appendChild(el("div", { class: "wholesale-cat-icon" }, cat.icon || "🛍️"));
    card.appendChild(el("div", { class: "wholesale-cat-name" }, cat.name || ""));
    var count = (cat.items && cat.items.length) || 0;
    card.appendChild(el("div", { class: "wholesale-cat-count" }, count + (currentLang === "zh" ? " 件商品" : " items")));
    card.addEventListener("click", function (e) { e.preventDefault(); showCategory(catIdx); });
    grid.appendChild(card);
  });
  c.appendChild(grid);

  if (t.wholesale.note) c.appendChild(el("p", { class: "wholesale-note" }, t.wholesale.note));
  var cta = el("a", { class: "btn btn-primary", href: "#contact" }, t.wholesale.cta);
  cta.addEventListener("click", function (e) { e.preventDefault(); showView("contact"); });
  c.appendChild(el("div", { class: "center" }, cta));
  return section("wholesale", "wholesale", c);
}

function productShown(it, ov) {
  var name = ov.name || it.name;
  var price = ov.price || it.price;
  var sku = ov.sku || it.sku || "";
  var white = ov.white || it.white || "";
  var video = ov.video || it.video || "";
  var usage = ov.usage || it.usage || "";
  var images = [];
  if (ov.image) images = String(ov.image).split(",");
  else if (it.images && it.images.length) images = it.images;
  else if (it.image) images = [it.image];
  images = images.map(function (s) { return String(s).trim(); }).filter(Boolean);
  return { name: name, price: price, images: images, sku: sku, white: white, video: video, usage: usage };
}

function buildGallery(it, cat) {
  var imgs = (it.images && it.images.length) ? it.images : [];
  var wrap = el("div", { class: "product-gallery" });
  if (!imgs.length) {
    wrap.appendChild(el("div", { class: "gallery-slide gallery-placeholder" }, cat.icon || "🛍️"));
    return wrap;
  }
  var track = el("div", { class: "gallery-track" });
  imgs.forEach(function (src, i) {
    var slide = el("div", { class: "gallery-slide" });
    slide.appendChild(el("img", { class: "gallery-img", src: src, alt: it.name || "product", loading: i === 0 ? "eager" : "lazy" }));
    track.appendChild(slide);
  });
  wrap.appendChild(track);
  if (imgs.length > 1) {
    var prev = el("button", { class: "gallery-arrow prev", type: "button", "aria-label": "‹" }, "‹");
    var next = el("button", { class: "gallery-arrow next", type: "button", "aria-label": "›" }, "›");
    prev.addEventListener("click", function (e) { e.stopPropagation(); track.scrollBy({ left: -(track.clientWidth || 1), behavior: "smooth" }); });
    next.addEventListener("click", function (e) { e.stopPropagation(); track.scrollBy({ left: (track.clientWidth || 1), behavior: "smooth" }); });
    wrap.appendChild(prev); wrap.appendChild(next);
  }
  return wrap;
}

function buildCategory(idx, t) {
  var c = container();
  var data = getCatsData();
  var cat = data.cats[idx];
  if (!cat) {
    c.appendChild(el("p", {}, currentLang === "zh" ? "类目不存在" : "Category not found"));
    return section("cat", "wholesale", c);
  }

  var catName = (cat.icon ? cat.icon + " " : "") + (cat.name || "");
  c.appendChild(sectionHead({ title: catName }, null));

  var overrides = loadOverrides();
  var list = el("div", { class: "wholesale-cat-products" });
  (cat.items || []).forEach(function (it, itemIdx) {
    var key = data.lang + ":" + idx + ":" + itemIdx;
    var ov = overrides[key] || {};
    if (isAdmin) {
      list.appendChild(buildAdminRow(key, it, ov, cat));
      return;
    }
    var shown = productShown(it, ov);
    var card = el("div", { class: "wholesale-product-card product-click" });
    card.appendChild(buildGallery(shown, cat));
    var body = el("div", { class: "wholesale-product-body" });
    body.appendChild(el("div", { class: "wholesale-product-name" }, shown.name));
    body.appendChild(el("div", { class: "wholesale-product-price" }, shown.price));
    card.appendChild(body);
    card.addEventListener("click", function () { showProduct(idx, itemIdx); });
    list.appendChild(card);
  });
  c.appendChild(list);
  return section("cat", "wholesale", c);
}

function buildAdminRow(key, it, ov, cat) {
  var row = el("div", { class: "wholesale-product admin" });
  var name = ov.name || it.name;
  var price = ov.price || it.price;
  var imgStr = (it.images && it.images.length) ? it.images.join(", ") : (it.image || "");
  var image = ov.image || imgStr;
  var sku = ov.sku || it.sku || "";
  var white = ov.white || it.white || "";
  var video = ov.video || it.video || "";
  var usage = ov.usage || it.usage || "";
  var prev = el("img", { class: "admin-preview", alt: "预览" });
  var imgIn = el("input", { class: "admin-field admin-img", type: "text", value: image || "", placeholder: "图片URL（可填网址，或点右侧选择图片上传）" });
  var fileIn = el("input", { class: "admin-field admin-file", type: "file", accept: "image/*", title: "选择图片上传" });
  var nameIn = el("input", { class: "admin-field admin-name", type: "text", value: name, placeholder: "名称" });
  var priceIn = el("input", { class: "admin-field admin-price", type: "text", value: price, placeholder: "价格" });
  var skuIn = el("input", { class: "admin-field admin-sku", type: "text", value: sku, placeholder: "SKU" });
  var whiteIn = el("input", { class: "admin-field admin-white", type: "text", value: white, placeholder: "白底图URL" });
  var videoIn = el("input", { class: "admin-field admin-video", type: "text", value: video, placeholder: "视频URL" });
  var usageIn = el("textarea", { class: "admin-field admin-usage", rows: "2", placeholder: "使用说明" }, usage || "");
  var save = el("button", { class: "btn btn-primary admin-save", type: "button" }, "保存");
  var del = el("button", { class: "btn admin-del", type: "button" }, "还原");

  function updatePreview() {
    var v = String(imgIn.value || "").split(",")[0].trim();
    if (v) { prev.src = v; prev.style.display = "block"; }
    else { prev.removeAttribute("src"); prev.style.display = "none"; }
  }
  updatePreview();
  imgIn.addEventListener("input", updatePreview);
  fileIn.addEventListener("change", function () {
    var f = fileIn.files && fileIn.files[0];
    if (!f) return;
    fileToDataUrl(f, function (d) {
      if (d) { imgIn.value = d; updatePreview(); }
    });
  });

  save.addEventListener("click", function () {
    var o = loadOverrides();
    o[key] = {
      name: nameIn.value.trim(),
      price: priceIn.value.trim(),
      image: imgIn.value.trim(),
      sku: skuIn.value.trim(),
      white: whiteIn.value.trim(),
      video: videoIn.value.trim(),
      usage: usageIn.value.trim()
    };
    if (saveOverrides(o)) { toast("已保存"); render(); }
    else { toast("保存失败：图片过大，请压缩后重试或改用图片网址"); }
  });
  del.addEventListener("click", function () {
    var o = loadOverrides();
    delete o[key];
    saveOverrides(o);
    toast("已还原");
    render();
  });
  row.appendChild(prev);
  row.appendChild(imgIn);
  row.appendChild(fileIn);
  row.appendChild(nameIn);
  row.appendChild(priceIn);
  row.appendChild(skuIn);
  row.appendChild(whiteIn);
  row.appendChild(videoIn);
  row.appendChild(usageIn);
  row.appendChild(save);
  row.appendChild(del);
  return row;
}

function productLabels() {
  if (currentLang === "zh") {
    return {
      stock: "现货在售",
      self: "爱商汇自营商品",
      contact: "联系采购 / 洽谈",
      category: "类目",
      close: "关闭",
      sku: "SKU",
      white: "白底图",
      video: "商品视频",
      usage: "使用说明",
      buyNow: "立即购买",
      addToCart: "加入购物车",
      added: "已加入购物车",
      cartTitle: "购物车",
      cartSub: "确认商品与数量，填写收货信息后提交订单",
      cartEmpty: "购物车还是空的，去商品批发逛逛吧。",
      unitPrice: "单价",
      total: "合计",
      recvName: "收货人姓名",
      recvPhone: "联系电话",
      recvAddr: "收货地址",
      recvNote: "备注（选填）",
      submitOrder: "提交订单",
      copyDropship: "复制代发信息",
      copied: "已复制，可粘贴给代发平台下单",
      orderSent: "订单已生成，请通过邮件完成下单，我们会尽快与您联系。",
      fillRequired: "请填写收货人、电话和地址。",
      continueShopping: "去逛逛",
      remove: "移除"
    };
  }
  return {
    stock: "In Stock",
    self: "AiShangHui self-operated product",
    contact: "Contact Us",
    category: "Category",
    close: "Close",
    sku: "SKU",
    white: "White Background Image",
    video: "Product Video",
    usage: "Instructions",
    buyNow: "Buy Now",
    addToCart: "Add to Cart",
    added: "Added to cart",
    cartTitle: "Cart",
    cartSub: "Review items and enter shipping info to place your order.",
    cartEmpty: "Your cart is empty. Browse the wholesale market.",
    unitPrice: "Unit price",
    total: "Total",
    recvName: "Recipient name",
    recvPhone: "Phone",
    recvAddr: "Shipping address",
    recvNote: "Note (optional)",
    submitOrder: "Place Order",
    copyDropship: "Copy Dropship Info",
    copied: "Copied. Paste it to your dropship platform to fulfill.",
    orderSent: "Order created. Please complete via email; we will contact you shortly.",
    fillRequired: "Please fill in name, phone and address.",
    continueShopping: "Continue shopping",
    remove: "Remove"
  };
}

function parsePrice(s) {
  var m = String(s).match(/^\s*([^\d\s]*)\s*([\d]+(?:\.[\d]+)?)/);
  if (!m) return { cur: "", num: 0 };
  return { cur: m[1], num: parseFloat(m[2]) };
}

var PRICE_TIERS = [
  { q: 1, rate: 1, off: "" },
  { q: 2, rate: 0.9, off: "-10%" },
  { q: 3, rate: 0.85, off: "-15%" },
  { q: 4, rate: 0.8, off: "-20%" },
  { q: 100, rate: 0.6, off: "-40%" }
];

function tierRate(qty) {
  var rate = 1;
  for (var i = 0; i < PRICE_TIERS.length; i++) {
    if (qty >= PRICE_TIERS[i].q) rate = PRICE_TIERS[i].rate;
  }
  return rate;
}

function buildPriceTiers(priceStr) {
  var p = parsePrice(priceStr);
  var zh = currentLang === "zh";
  var box = el("div", { class: "price-tiers" });
  PRICE_TIERS.forEach(function (r) {
    var qty;
    if (r.q === 1) qty = zh ? "1件" : "1 pc";
    else if (r.q === 2) qty = zh ? "2件" : "2 pcs";
    else if (r.q === 3) qty = zh ? "3件" : "3 pcs";
    else if (r.q === 4) qty = zh ? "4件及以上" : "4+ pcs";
    else qty = zh ? "100件以上" : "100+ pcs";
    var row = el("div", { class: "price-tier-row" });
    row.appendChild(el("span", { class: "price-tier-qty" }, qty));
    if (r.off) row.appendChild(el("span", { class: "price-tier-off" }, r.off));
    var v = Math.round(p.num * r.rate * 100) / 100;
    row.appendChild(el("span", { class: "price-tier-price" }, p.cur + String(v)));
    box.appendChild(row);
  });
  return box;
}

function getCatsData() {
  var pl = window.PRODUCTS || {};
  var lang = (currentLang === "zh" && pl.zh) ? "zh" : "en";
  var cats = (pl[lang] && pl[lang].categories) ? pl[lang].categories : (pl.en && pl.en.categories);
  if (!cats || !cats.length || typeof cats[0] === "string") cats = (pl.en && pl.en.categories);
  return { lang: lang, cats: cats || [] };
}

function buildProductPage(catIdx, itemIdx) {
  var c = container();
  var data = getCatsData();
  var cat = data.cats[catIdx];
  var L = productLabels();
  if (!cat || !cat.items || !cat.items[itemIdx]) {
    c.appendChild(el("p", {}, currentLang === "zh" ? "商品不存在" : "Product not found"));
    return section("product", "detail-page", c);
  }
  var key = data.lang + ":" + catIdx + ":" + itemIdx;
  var ov = loadOverrides()[key] || {};
  var shown = productShown(cat.items[itemIdx], ov);

  var layout = el("div", { class: "product-detail-grid" });

  var left = el("div", { class: "product-detail-left" });
  left.appendChild(buildGallery(shown, cat));

  var right = el("div", { class: "product-detail-right" });
  right.appendChild(el("span", { class: "product-modal-stock" }, L.stock));
  right.appendChild(el("h1", { class: "product-detail-name" }, shown.name));
  if (shown.sku) right.appendChild(el("div", { class: "product-modal-sku" }, L.sku + "：" + shown.sku));
  right.appendChild(el("div", { class: "product-detail-price" }, shown.price));
  right.appendChild(el("div", { class: "product-modal-self" }, L.self));
  right.appendChild(buildPriceTiers(shown.price));

  var actions = el("div", { class: "product-detail-actions" });
  var buy = el("button", { class: "btn btn-primary", type: "button" }, L.buyNow);
  buy.addEventListener("click", function () { addToCart(catIdx, itemIdx, 1); showCart(); });
  var add = el("button", { class: "btn btn-ghost", type: "button" }, L.addToCart);
  add.addEventListener("click", function () { addToCart(catIdx, itemIdx, 1); toast(L.added); updateCartBadge(); });
  actions.appendChild(buy);
  actions.appendChild(add);
  right.appendChild(actions);

  if (shown.white) {
    right.appendChild(el("div", { class: "product-modal-block-label" }, L.white));
    right.appendChild(el("img", { class: "product-modal-white", src: shown.white, alt: L.white }));
  }
  if (shown.video) {
    right.appendChild(el("div", { class: "product-modal-block-label" }, L.video));
    right.appendChild(el("video", { class: "product-modal-video", controls: "controls", src: shown.video }));
  }
  if (shown.usage) {
    right.appendChild(el("div", { class: "product-modal-block-label" }, L.usage));
    right.appendChild(el("div", { class: "product-modal-usage" }, shown.usage));
  }

  layout.appendChild(left);
  layout.appendChild(right);
  c.appendChild(layout);
  return section("product", "detail-page", c);
}

function buildCartPage() {
  var c = container();
  var L = productLabels();
  var zh = currentLang === "zh";
  var cart = loadCart();
  var data = getCatsData();

  c.appendChild(el("h2", { class: "section-title" }, L.cartTitle));
  c.appendChild(el("p", { class: "section-sub" }, L.cartSub));

  if (!cart.length) {
    var empty = el("div", { class: "cart-empty" });
    empty.appendChild(el("p", {}, L.cartEmpty));
    var link = el("a", { class: "btn btn-primary", href: "#wholesale" }, L.continueShopping);
    link.addEventListener("click", function (e) { e.preventDefault(); showView("wholesale"); });
    empty.appendChild(link);
    c.appendChild(empty);
    return section("cart", "cart-page", c);
  }

  var overrides = loadOverrides();
  var list = el("div", { class: "cart-list" });
  var total = 0, cur = "";

  cart.forEach(function (it) {
    var cat = data.cats[it.catIdx];
    var item = cat && cat.items && cat.items[it.itemIdx];
    if (!item) return;
    var key = data.lang + ":" + it.catIdx + ":" + it.itemIdx;
    var shown = productShown(item, overrides[key] || {});
    var p = parsePrice(shown.price);
    cur = cur || p.cur;
    var rate = tierRate(it.qty);
    var unit = Math.round(p.num * rate * 100) / 100;
    var line = Math.round(unit * it.qty * 100) / 100;
    total += line;

    var row = el("div", { class: "cart-row" });
    if (shown.images && shown.images[0]) {
      row.appendChild(el("img", { class: "cart-thumb", src: shown.images[0], alt: shown.name }));
    } else {
      row.appendChild(el("div", { class: "cart-thumb cart-thumb-ph" }, cat.icon || "🛍️"));
    }

    var info = el("div", { class: "cart-info" });
    info.appendChild(el("div", { class: "cart-name" }, shown.name));
    if (shown.sku) info.appendChild(el("div", { class: "cart-sku" }, L.sku + "：" + shown.sku));
    var unitTxt = L.unitPrice + "：" + p.cur + String(unit) + (rate < 1 ? (zh ? "（批发价）" : " (bulk)") : "");
    info.appendChild(el("div", { class: "cart-unit" }, unitTxt));
    row.appendChild(info);

    var qty = el("div", { class: "cart-qty" });
    var minus = el("button", { class: "qty-btn", type: "button" }, "−");
    var num = el("span", { class: "qty-num" }, String(it.qty));
    var plus = el("button", { class: "qty-btn", type: "button" }, "+");
    minus.addEventListener("click", function () { setCartQty(it, -1); });
    plus.addEventListener("click", function () { setCartQty(it, 1); });
    qty.appendChild(minus); qty.appendChild(num); qty.appendChild(plus);
    row.appendChild(qty);

    row.appendChild(el("div", { class: "cart-subtotal" }, p.cur + String(line)));

    var rm = el("button", { class: "cart-remove", type: "button", "aria-label": L.remove }, "✕");
    rm.addEventListener("click", function () { removeCartItem(it); });
    row.appendChild(rm);

    list.appendChild(row);
  });
  c.appendChild(list);

  var summary = el("div", { class: "cart-summary" });
  summary.appendChild(el("div", { class: "cart-total" }, L.total + "：" + cur + String(Math.round(total * 100) / 100)));
  c.appendChild(summary);

  var form = el("form", { class: "cart-checkout" });
  var nameIn = el("input", { class: "field", type: "text", placeholder: L.recvName });
  var phoneIn = el("input", { class: "field", type: "text", placeholder: L.recvPhone });
  var addrIn = el("textarea", { class: "field", rows: "2", placeholder: L.recvAddr });
  var noteIn = el("textarea", { class: "field", rows: "2", placeholder: L.recvNote });
  form.appendChild(nameIn);
  form.appendChild(phoneIn);
  form.appendChild(addrIn);
  form.appendChild(noteIn);

  function orderText() {
    var lines = [];
    lines.push(zh ? "【爱商汇订单】" : "[AiShangHui Order]");
    cart.forEach(function (it) {
      var cat = data.cats[it.catIdx];
      var item = cat && cat.items && cat.items[it.itemIdx];
      if (!item) return;
      var key = data.lang + ":" + it.catIdx + ":" + it.itemIdx;
      var shown = productShown(item, overrides[key] || {});
      var p = parsePrice(shown.price);
      var rate = tierRate(it.qty);
      var unit = Math.round(p.num * rate * 100) / 100;
      var line = Math.round(unit * it.qty * 100) / 100;
      lines.push((shown.sku || shown.name) + " × " + it.qty + " = " + p.cur + line);
      if (item.link) lines.push((zh ? "1688采购链接：" : "1688 source: ") + item.link);
    });
    lines.push("");
    lines.push((zh ? "收货人：" : "Name: ") + nameIn.value.trim());
    lines.push((zh ? "电话：" : "Phone: ") + phoneIn.value.trim());
    lines.push((zh ? "地址：" : "Address: ") + addrIn.value.trim());
    if (noteIn.value.trim()) lines.push((zh ? "备注：" : "Note: ") + noteIn.value.trim());
    return lines.join("\n");
  }

  var status = el("div", { class: "form-status" });
  var submit = el("button", { class: "btn btn-primary", type: "submit" }, L.submitOrder);
  var copyBtn = el("button", { class: "btn btn-ghost", type: "button" }, L.copyDropship);
  form.appendChild(submit);
  form.appendChild(copyBtn);
  form.appendChild(status);

  copyBtn.addEventListener("click", function () {
    var text = orderText();
    function fallback() { window.prompt(L.copyDropship, text); toast(L.copied); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast(L.copied); }, fallback);
    } else { fallback(); }
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!nameIn.value.trim() || !phoneIn.value.trim() || !addrIn.value.trim()) {
      status.textContent = L.fillRequired;
      status.classList.add("show");
      return;
    }
    var body = orderText();
    if (SITE_CONFIG.formEndpoint) {
      status.textContent = currentLang === "zh" ? "提交中…" : "Submitting…";
      status.classList.add("show");
      fetch(SITE_CONFIG.formEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({
          _subject: (zh ? "爱商汇订单" : "AiShangHui Order") + " - " + nameIn.value.trim(),
          _template: "table",
          name: nameIn.value.trim(),
          phone: phoneIn.value.trim(),
          address: addrIn.value.trim(),
          note: noteIn.value.trim(),
          order: body,
          lang: currentLang
        })
      }).then(function (r) {
        if (r.ok) { status.textContent = L.orderSent; }
        else { status.textContent = currentLang === "zh" ? "提交失败，请直接邮件下单。" : "Submit failed, please email us directly."; }
      }).catch(function () {
        status.textContent = currentLang === "zh" ? "提交失败，请直接邮件下单。" : "Submit failed, please email us directly.";
      });
      return;
    }
    var subject = (zh ? "爱商汇订单 - " : "AiShangHui Order - ") + nameIn.value.trim();
    location.href = "mailto:" + SITE_CONFIG.email + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
    status.textContent = L.orderSent;
    status.classList.add("show");
  });

  c.appendChild(form);
  return section("cart", "cart-page", c);
}

function buildCartButton() {
  var L = productLabels();
  var a = el("a", { class: "cart-link", href: "#cart", "aria-label": L.cartTitle });
  a.appendChild(el("span", { class: "cart-icon" }, "🛒"));
  var n = cartCount();
  if (n > 0) a.appendChild(el("span", { class: "cart-badge" }, String(n)));
  a.addEventListener("click", function (e) { e.preventDefault(); showCart(); });
  return a;
}

function updateCartBadge() {
  var link = document.querySelector(".cart-link");
  if (!link) return;
  var badge = link.querySelector(".cart-badge");
  var n = cartCount();
  if (n > 0) {
    if (!badge) { badge = el("span", { class: "cart-badge" }, String(n)); link.appendChild(badge); }
    else badge.textContent = String(n);
  } else if (badge) { badge.remove(); }
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

  var pay = SITE_CONFIG.payment || {};
  var payRows = [];
  if (pay.qrImage) payRows.push({ icon: "📱", label: t.contact.payQr, qr: pay.qrImage });
  if (pay.alipay) payRows.push({ icon: "💚", label: t.contact.payAlipay, value: pay.alipay + (pay.alipayName ? "（" + pay.alipayName + "）" : "") });
  if (pay.bankCard) {
    var bankVal = pay.bankCard;
    if (pay.bankName) bankVal = pay.bankName + " · " + bankVal;
    if (pay.bankHolder) bankVal += "（" + pay.bankHolder + "）";
    payRows.push({ icon: "🏦", label: t.contact.payBank, value: bankVal });
  }
  if (payRows.length) {
    info.appendChild(el("h3", { class: "pay-title" }, t.contact.payTitle));
    payRows.forEach(function (pr) {
      if (pr.qr) {
        info.appendChild(el("img", { class: "pay-qr", src: pr.qr, alt: t.contact.payQr }));
        return;
      }
      info.appendChild(row(pr.icon, pr.label, pr.value));
    });
  }

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
  var foot = el("footer", { class: "footer" });
  var c = el("div", { class: "container" });
  c.appendChild(el("div", {}, t.footer.copyright));
  var adm = el("a", { class: "admin-link", href: "#" }, isAdmin ? "退出管理" : "管理");
  adm.addEventListener("click", function (e) {
    e.preventDefault();
    var url = new URL(location.href);
    if (isAdmin) url.searchParams.delete("admin");
    else url.searchParams.set("admin", "1");
    location.href = url.toString();
  });
  c.appendChild(adm);
  foot.appendChild(c);
  return foot;
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
    ["payTitle", "payAlipay", "payAlipayName", "payBank", "payBankName", "payBankCard", "payBankHolder", "payQr"].forEach(function (k) {
      if (t.contact && !t.contact[k]) t.contact[k] = (en.contact && en.contact[k]) || "";
    });
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
  } else if (view === "cat") {
    app.appendChild(buildCategory(currentCatIdx, t));
  } else if (view === "product") {
    app.appendChild(buildProductPage(currentCatIdx, currentItemIdx));
  } else if (view === "cart") {
    app.appendChild(buildCartPage());
  } else {
    app.appendChild(buildModule(view, t));
  }
  app.appendChild(buildFooter(t));
  window.scrollTo(0, 0);
}

document.addEventListener("DOMContentLoaded", render);
