// Панель продавца: заказы, товары и настройки. Вход по паролю.
var Admin = (function () {
  var root = document.getElementById('view-admin');
  var esc = U.esc, money = U.money;
  var AUTH_KEY = SITE.key + '-admin';
  var memoryAuth = false;
  var tab = 'orders';
  var openId = null;

  function priceText(n) { return n > 0 ? money(n) : 'бесплатно'; }

  function authed() {
    if (memoryAuth) return true;
    try { return sessionStorage.getItem(AUTH_KEY) === '1'; } catch (e) { return false; }
  }

  function setAuthed(on) {
    memoryAuth = on;
    try {
      if (on) sessionStorage.setItem(AUTH_KEY, '1');
      else sessionStorage.removeItem(AUTH_KEY);
    } catch (e) { /* хватит памяти вкладки */ }
  }

  function newCount() {
    return Store.orders().filter(function (o) { return !o.seen; }).length;
  }

  function updateTitle() {
    var n = newCount();
    document.title = (n ? '(' + n + ') ' : '') + 'Панель продавца — ' + Store.settings().shopName;
  }

  /* ---------- Вход ---------- */

  function loginHtml() {
    return '<div class="login"><form class="login-card" data-form="login" novalidate>' +
      SITE.logo +
      '<h1>Панель продавца</h1>' +
      '<p class="muted">Здесь приходят заказы, а вы меняете цены, наличие и условия доставки.</p>' +
      '<label class="field" data-field="password"><span>Пароль</span>' +
      '<input type="password" name="password" autocomplete="current-password"><em class="err"></em></label>' +
      '<button type="submit" class="btn btn-primary btn-block">Войти</button>' +
      '<p class="demo-hint">В демо пароль: 1234</p>' +
      '<a class="back-link" href="#">← Вернуться в магазин</a>' +
      '</form></div>';
  }

  /* ---------- Каркас панели ---------- */

  function panelHtml() {
    return '<header class="admin-head"><div class="wrap admin-head-in">' +
      '<div class="admin-brand">' + SITE.logo + '<div><span class="admin-kicker">Панель продавца</span><b>' + esc(Store.settings().shopName) + '</b></div></div>' +
      '<nav class="admin-nav"><a class="btn btn-on-dark" href="#" target="_blank">Открыть магазин</a>' +
      '<button type="button" class="btn btn-on-dark" data-a="logout">Выйти</button></nav>' +
      '</div></header>' +
      '<div class="wrap admin-wrap"><div class="tabs" id="admin-tabs" role="tablist"></div><div id="admin-content"></div></div>';
  }

  function renderTabs() {
    var el = document.getElementById('admin-tabs');
    if (!el) return;
    var n = newCount();
    var tabs = [['orders', 'Заказы' + (n ? ' <span class="badge">' + n + '</span>' : '')], ['products', 'Товары'], ['settings', 'Настройки']];
    el.innerHTML = tabs.map(function (t) {
      return '<button type="button" role="tab" class="tab' + (tab === t[0] ? ' is-active' : '') + '" aria-selected="' + (tab === t[0]) + '" data-a="tab" data-tab="' + t[0] + '">' + t[1] + '</button>';
    }).join('');
  }

  function renderContent() {
    var el = document.getElementById('admin-content');
    if (!el) return;
    if (tab === 'orders') el.innerHTML = ordersHtml();
    else if (tab === 'products') el.innerHTML = productsHtml();
    else el.innerHTML = settingsHtml();
  }

  function render() {
    if (!authed()) {
      root.innerHTML = loginHtml();
      document.title = 'Вход — панель продавца';
      var input = root.querySelector('input');
      if (input) input.focus();
      return;
    }
    root.innerHTML = panelHtml();
    renderTabs();
    renderContent();
    updateTitle();
  }

  /* ---------- Заказы ---------- */

  function ordersHtml() {
    var orders = Store.orders();
    if (!orders.length) {
      return '<div class="empty"><h3>Заказов пока нет</h3>' +
        '<p>Откройте <a href="#" target="_blank">магазин в соседней вкладке</a> и оформите тестовый заказ. ' +
        'Он появится здесь сразу, со звуковым сигналом.</p></div>';
    }
    return '<p class="muted list-note">Новые заказы сверху. Нажмите на заказ, чтобы увидеть подробности и письмо, которое приходит на почту.</p>' +
      orders.map(orderHtml).join('');
  }

  function shortMethod(o) {
    var list = Store.methods(true);
    for (var i = 0; i < list.length; i++) if (list[i].id === o.delivery.id) return list[i].short;
    return o.delivery.name;
  }

  function orderHtml(o) {
    var open = openId === o.id;
    var what = o.items.map(function (i) { return i.name + ' ' + U.qty(i.qty, i.unit || 'шт'); }).join(', ');
    return '<article class="order' + (o.seen ? '' : ' is-new') + (open ? ' is-open' : '') + '">' +
      '<button type="button" class="order-head" data-a="toggle-order" data-id="' + o.id + '" aria-expanded="' + open + '">' +
      '<span class="order-top"><b class="order-no">№ ' + o.id + '</b>' + (o.seen ? '' : '<span class="badge-new">новый</span>') +
      '<span class="order-method">' + esc(shortMethod(o)) + '</span>' +
      '<span class="order-when">' + U.dateTime(o.createdAt) + '</span></span>' +
      '<span class="order-who">' + esc(o.customer.name) + ' · ' + esc(o.customer.phone) + '</span>' +
      '<span class="order-what">' + esc(what) + '</span>' +
      '<b class="order-total">' + money(o.total) + '</b>' +
      '</button>' +
      (open ? orderDetailsHtml(o) : '') +
      '</article>';
  }

  function orderDetailsHtml(o) {
    var c = o.customer;
    return '<div class="order-details">' +
      '<div class="order-actions">' +
      '<a class="btn btn-primary" href="tel:+' + U.phoneDigits(c.phone) + '">Позвонить</a>' +
      (c.address ? '<a class="btn btn-ghost" href="https://yandex.ru/maps/?text=' + encodeURIComponent(c.address) + '" target="_blank" rel="noopener">Адрес на карте</a>' : '') +
      '</div>' +
      '<dl class="kv"><dt>Получение</dt><dd>' + esc(o.delivery.name) + (o.delivery.note ? ': ' + esc(o.delivery.note) : '') + '</dd>' +
      (c.address ? '<dt>Адрес</dt><dd>' + esc(c.address) + '</dd>' : '') +
      (c.time ? '<dt>Когда удобно</dt><dd>' + esc(c.time) + '</dd>' : '') +
      (o.gift ? '<dt>Упаковка</dt><dd>Упаковать в подарок</dd>' : '') +
      (c.comment ? '<dt>Комментарий</dt><dd>' + esc(c.comment) + '</dd>' : '') + '</dl>' +
      '<table class="items"><thead><tr><th>Товар</th><th>Кол-во</th><th>Сумма</th></tr></thead><tbody>' +
      o.items.map(function (i) {
        return '<tr><td>' + esc(i.name) + '<small>' + money(i.price) + (i.unit && i.unit !== 'шт' ? ' за ' + esc(i.unit) : '') + '</small></td>' +
          '<td>' + U.qty(i.qty, esc(i.unit || 'шт')) + '</td><td>' + money(i.sum) + '</td></tr>';
      }).join('') +
      '</tbody><tfoot>' +
      (o.gift ? '<tr><td colspan="2">Подарочная упаковка</td><td>' + money(o.gift) + '</td></tr>' : '') +
      '<tr><td colspan="2">' + esc(o.delivery.name) + '</td><td>' + priceText(o.delivery.price) + '</td></tr>' +
      '<tr class="tt"><td colspan="2">Итого к оплате</td><td>' + money(o.total) + '</td></tr>' +
      '</tfoot></table>' +
      '<details class="mail"><summary>Письмо, которое пришло на ' + esc(o.notifyEmail) + '</summary>' + emailHtml(o) + '</details>' +
      '</div>';
  }

  function emailHtml(o) {
    var c = o.customer;
    var when = new Date(o.createdAt).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
    return '<div class="mail-box">' +
      '<div class="mail-meta">' +
      '<div><span>От:</span> Сайт «' + esc(Store.settings().shopName) + '»</div>' +
      '<div><span>Кому:</span> ' + esc(o.notifyEmail) + '</div>' +
      '<div><span>Тема:</span> Новый заказ № ' + o.id + ' на ' + money(o.total) + '</div>' +
      '</div>' +
      '<div class="mail-body">' +
      '<p><b>Новый заказ № ' + o.id + '</b><br>' + esc(when) + '</p>' +
      '<p>Покупатель: ' + esc(c.name) + '<br>Телефон: ' + esc(c.phone) +
      '<br>Получение: ' + esc(o.delivery.name) + (o.delivery.note ? ' (' + esc(o.delivery.note) + ')' : '') +
      (c.address ? '<br>Адрес: ' + esc(c.address) : '') +
      (c.time ? '<br>Когда удобно: ' + esc(c.time) : '') +
      (o.gift ? '<br>Упаковать в подарок: да' : '') +
      (c.comment ? '<br>Комментарий: ' + esc(c.comment) : '') + '</p>' +
      '<p>' + o.items.map(function (i) {
        return esc(i.name) + ' — ' + U.qty(i.qty, esc(i.unit || 'шт')) + ' × ' + money(i.price) + ' = ' + money(i.sum);
      }).join('<br>') + '</p>' +
      '<p>' + (o.gift ? 'Подарочная упаковка: ' + money(o.gift) + '<br>' : '') +
      'Доставка: ' + priceText(o.delivery.price) + '<br><b>Итого к оплате при получении: ' + money(o.total) + '</b></p>' +
      '</div></div>';
  }

  /* ---------- Товары ---------- */

  function productsHtml() {
    return '<div class="toolbar"><p class="muted">Изменения сохраняются сразу и видны покупателям.</p>' +
      '<button type="button" class="btn btn-primary" data-a="add-product">+ Добавить товар</button></div>' +
      '<datalist id="cat-list">' + Store.categories().map(function (c) { return '<option value="' + esc(c) + '">'; }).join('') + '</datalist>' +
      '<div class="plist">' + Store.products().map(prowHtml).join('') + '</div>';
  }

  function prowHtml(p) {
    return '<div class="prow' + (p.inStock ? '' : ' is-out') + '" data-id="' + esc(p.id) + '">' +
      '<label class="pimg" title="Сменить фото"><img src="' + esc(p.img || U.PLACEHOLDER) + '" alt="">' +
      '<input type="file" accept="image/*" data-f="img"><span>Сменить фото</span></label>' +
      '<div class="pfields">' +
      '<label class="field"><span>Название</span><input data-f="name" value="' + esc(p.name) + '" maxlength="70"></label>' +
      '<label class="field"><span>Описание</span><input data-f="note" value="' + esc(p.note || '') + '" maxlength="90" placeholder="Коротко: для какой модели, что в комплекте"></label>' +
      '<label class="field"><span>Категория</span><input data-f="category" list="cat-list" value="' + esc(p.category || '') + '" maxlength="30" placeholder="Например: ' + esc(Store.categories()[0] || 'Новинки') + '"></label>' +
      '<div class="prow-line">' +
      '<label class="field field-sm"><span>Цена, ₽</span><input data-f="price" type="number" min="1" max="1000000" step="1" inputmode="numeric" value="' + p.price + '"></label>' +
      '<label class="field field-sm"><span>Старая цена</span><input data-f="oldPrice" type="number" min="0" max="1000000" step="1" inputmode="numeric" value="' + (p.oldPrice || '') + '" placeholder="нет"></label>' +
      '<label class="field field-sm"><span>За</span><select data-f="unit">' +
      ['шт', 'кг'].map(function (u) { return '<option' + (u === (p.unit || 'шт') ? ' selected' : '') + '>' + u + '</option>'; }).join('') +
      '</select></label>' +
      '<label class="switch"><input type="checkbox" data-f="inStock"' + (p.inStock ? ' checked' : '') + '>' +
      '<span class="switch-ui" aria-hidden="true"></span><span>В наличии</span></label>' +
      '<button type="button" class="btn btn-ghost btn-danger" data-a="delete-product" data-id="' + esc(p.id) + '">Удалить</button>' +
      '</div></div></div>';
  }

  function onProductChange(el) {
    var row = el.closest('.prow');
    if (!row) return;
    var list = Store.products();
    var p = null;
    for (var i = 0; i < list.length; i++) if (list[i].id === row.getAttribute('data-id')) p = list[i];
    if (!p) return;
    var f = el.getAttribute('data-f');

    if (f === 'img') {
      var file = el.files && el.files[0];
      if (!file) return;
      U.resizeImage(file, 640).then(function (url) {
        var old = p.img;
        p.img = url;
        if (Store.saveProducts(list)) {
          row.querySelector('.pimg img').src = url;
          U.toast('Фото обновлено');
        } else {
          p.img = old;
          U.toast('Фото слишком большое для демо-версии');
        }
      }, function () { U.toast('Не получилось открыть это фото'); });
      return;
    }

    var hint = 'Сохранено';
    if (f === 'name') {
      var name = el.value.trim();
      if (!name) { el.value = p.name; U.toast('Название не может быть пустым'); return; }
      p.name = name;
    } else if (f === 'note') {
      p.note = el.value.trim();
    } else if (f === 'category') {
      p.category = el.value.trim();
    } else if (f === 'price') {
      var price = Math.round(Number(el.value));
      if (!(price > 0)) { el.value = p.price; U.toast('Укажите цену больше нуля'); return; }
      p.price = price;
      el.value = price;
      if (p.oldPrice && p.oldPrice <= price) hint = 'Сохранено. Старая цена не больше новой — скидка не показывается';
    } else if (f === 'oldPrice') {
      var old = el.value === '' ? 0 : Math.round(Number(el.value));
      if (!(old >= 0)) { el.value = p.oldPrice || ''; U.toast('Укажите число или оставьте поле пустым'); return; }
      p.oldPrice = old;
      el.value = old || '';
      if (old && old <= p.price) hint = 'Сохранено. Скидка видна, только если старая цена больше новой';
    } else if (f === 'unit') {
      p.unit = el.value;
      p.step = p.unit === 'кг' ? 0.5 : 1;
      p.min = 1;
    } else if (f === 'inStock') {
      p.inStock = el.checked;
      row.className = 'prow' + (p.inStock ? '' : ' is-out');
    }
    if (Store.saveProducts(list)) U.toast(hint);
  }

  function addProduct() {
    var list = Store.products();
    list.unshift({ id: 'p' + Date.now(), name: 'Новый товар', note: '', category: '', price: 1000, oldPrice: 0, unit: 'шт', step: 1, min: 1, img: '', inStock: false });
    Store.saveProducts(list);
    renderContent();
    var input = root.querySelector('.prow input[data-f="name"]');
    if (input) { input.focus(); input.select(); }
    U.toast('Заполните товар, добавьте фото и включите «В наличии»');
  }

  function deleteProduct(id) {
    var p = Store.product(id);
    if (!p || !window.confirm('Удалить «' + p.name + '»? Покупатели перестанут его видеть.')) return;
    Store.saveProducts(Store.products().filter(function (x) { return x.id !== id; }));
    renderContent();
    U.toast('Товар удалён');
  }

  /* ---------- Настройки ---------- */

  function settingsFields() {
    var list = [
      ['shopName', 'Название магазина', 'text'],
      ['tagline', 'Заголовок на главной', 'text'],
      ['phone', 'Телефон для покупателей', 'tel'],
      ['email', 'Почта, куда приходят заказы', 'email'],
      ['freeDeliveryFrom', 'Бесплатная доставка от, ₽ (0 — нет)', 'number'],
      ['minOrder', 'Минимальная сумма заказа, ₽ (0 — нет)', 'number']
    ];
    if (SITE.giftWrap) list.push(['giftWrapPrice', 'Подарочная упаковка, ₽ (0 — не предлагать)', 'number']);
    list.push(['adminPassword', 'Пароль от этой панели', 'text']);
    return list;
  }

  function settingsHtml() {
    var s = Store.settings();
    return '<form class="settings" data-form="settings" novalidate>' +
      '<h3 class="settings-title">Магазин</h3><div class="settings-grid">' +
      settingsFields().map(function (f) {
        return '<label class="field" data-field="' + f[0] + '"><span>' + f[1] + '</span>' +
          '<input name="' + f[0] + '" type="' + f[2] + '"' + (f[2] === 'number' ? ' min="0" step="1" inputmode="numeric"' : '') +
          ' value="' + esc(s[f[0]]) + '"><em class="err"></em></label>';
      }).join('') +
      '<label class="field field-wide"><span>Текст под заголовком</span>' +
      '<textarea name="lead" rows="2" maxlength="220">' + esc(s.lead) + '</textarea></label>' +
      (SITE.giftWrap ? '<label class="field field-wide"><span>Что входит в подарочную упаковку</span>' +
        '<input name="giftWrapNote" maxlength="90" value="' + esc(s.giftWrapNote || '') + '"></label>' : '') +
      '</div>' +
      '<h3 class="settings-title">Способы получения</h3>' +
      '<div class="dlist" data-field="delivery">' +
      Store.methods(true).map(function (m) {
        return '<div class="drow">' +
          '<label class="switch"><input type="checkbox" name="d-on-' + m.id + '"' + (m.on ? ' checked' : '') + '>' +
          '<span class="switch-ui" aria-hidden="true"></span><span>' + esc(m.name) + '</span></label>' +
          '<label class="field field-sm"><span>Цена, ₽</span><input name="d-price-' + m.id + '" type="number" min="0" step="1" inputmode="numeric" value="' + m.price + '"></label>' +
          '<label class="field drow-note"><span>' + (m.id === 'pickup' ? 'Адрес и часы работы' : 'Сроки и условия') + '</span>' +
          '<input name="d-note-' + m.id + '" maxlength="120" value="' + esc(m.note || '') + '"></label>' +
          '</div>';
      }).join('') +
      '<em class="err"></em></div>' +
      '<button type="submit" class="btn btn-primary">Сохранить настройки</button></form>' +
      '<div class="danger-zone"><div><h3>Демо-данные</h3><p class="muted">Вернуть исходные товары, цены и настройки и удалить тестовые заказы.</p></div>' +
      '<button type="button" class="btn btn-ghost btn-danger" data-a="reset">Сбросить демо</button></div>';
  }

  function saveSettings(form) {
    var get = function (n) { var el = form.elements.namedItem(n); return el ? el.value.trim() : ''; };
    var patch = {}, errs = {};
    settingsFields().forEach(function (f) {
      var v = get(f[0]);
      if (f[2] === 'number') {
        var n = Math.round(Number(v));
        if (v === '' || !(n >= 0)) errs[f[0]] = 'Нужно число, 0 или больше';
        else patch[f[0]] = n;
      } else if (!v) {
        errs[f[0]] = 'Заполните поле';
      } else {
        patch[f[0]] = v;
      }
    });
    if (patch.phone) patch.phone = U.formatPhone(patch.phone) || patch.phone;
    if (patch.adminPassword && patch.adminPassword.length < 4) errs.adminPassword = 'Не короче 4 символов';
    patch.lead = get('lead');
    if (SITE.giftWrap) patch.giftWrapNote = get('giftWrapNote');

    var delivery = {}, anyOn = false;
    Store.methods(true).forEach(function (m) {
      var price = Math.round(Number(get('d-price-' + m.id)));
      var on = form.elements.namedItem('d-on-' + m.id).checked;
      if (on) anyOn = true;
      if (!(price >= 0)) { errs.delivery = 'Цена доставки — число, 0 или больше'; price = m.price; }
      delivery[m.id] = { on: on, price: price, note: get('d-note-' + m.id) };
    });
    if (!anyOn) errs.delivery = 'Включите хотя бы один способ получения — иначе покупатель не сможет оформить заказ';
    patch.delivery = delivery;

    var fields = form.querySelectorAll('[data-field]');
    for (var i = 0; i < fields.length; i++) {
      var key = fields[i].getAttribute('data-field');
      fields[i].className = fields[i].className.replace(/\s*invalid/g, '') + (errs[key] ? ' invalid' : '');
      var err = fields[i].querySelector('.err');
      if (err) err.textContent = errs[key] || '';
    }
    if (Object.keys(errs).length) {
      var bad = form.querySelector('.invalid');
      if (bad) bad.scrollIntoView({ block: 'center' });
      return;
    }

    Store.saveSettings(patch);
    App.bindSettings();
    render();
    U.toast('Настройки сохранены');
  }

  /* ---------- События ---------- */

  root.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('[data-a]') : null;
    if (!btn) return;
    var a = btn.getAttribute('data-a');
    if (a === 'tab') {
      tab = btn.getAttribute('data-tab');
      renderTabs();
      renderContent();
    } else if (a === 'toggle-order') {
      var id = Number(btn.getAttribute('data-id'));
      openId = openId === id ? null : id;
      Store.markSeen(id);
      renderTabs();
      renderContent();
      updateTitle();
    } else if (a === 'add-product') {
      addProduct();
    } else if (a === 'delete-product') {
      deleteProduct(btn.getAttribute('data-id'));
    } else if (a === 'logout') {
      setAuthed(false);
      location.hash = '';
    } else if (a === 'reset') {
      if (!window.confirm('Сбросить демо? Тестовые заказы удалятся, товары, цены и настройки вернутся к исходным.')) return;
      Store.reset();
      openId = null;
      App.bindSettings();
      render();
      U.toast('Демо сброшено');
    }
  });

  root.addEventListener('change', function (e) {
    if (e.target.getAttribute('data-f')) onProductChange(e.target);
  });

  root.addEventListener('submit', function (e) {
    var form = e.target;
    var kind = form.getAttribute('data-form');
    if (!kind) return;
    e.preventDefault();
    if (kind === 'login') {
      var input = form.elements.namedItem('password');
      if (input.value === String(Store.settings().adminPassword)) {
        U.unlockAudio();
        setAuthed(true);
        render();
      } else {
        var field = form.querySelector('[data-field="password"]');
        field.className = 'field invalid';
        field.querySelector('.err').textContent = 'Неверный пароль';
        input.select();
      }
    } else if (kind === 'settings') {
      saveSettings(form);
    }
  });

  return {
    render: render,
    authed: authed,
    // Данные поменялись в соседней вкладке: например, покупатель только что оформил заказ.
    onExternalChange: function (ordersBefore) {
      if (!authed() || root.hidden) return;
      var added = Store.orders().length - ordersBefore;
      if (added > 0) {
        U.beep();
        U.toast('Новый заказ № ' + Store.orders()[0].id);
      }
      renderTabs();
      if (tab === 'orders') renderContent();
      updateTitle();
    }
  };
})();
