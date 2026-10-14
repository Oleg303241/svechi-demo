// Витрина: категории, каталог, корзина и оформление заказа.
var Shop = (function () {
  var grid = document.getElementById('products');
  var filtersEl = document.getElementById('filters');
  var chips = document.getElementById('chips');
  var bar = document.getElementById('cart-bar');
  var drawer = document.getElementById('cart');
  var body = document.getElementById('cart-body');
  var esc = U.esc, money = U.money;

  var cart = Store.getCart(); // { id товара: количество }
  var drawerMode = 'closed';  // closed | order | success
  var filter = '';            // выбранная категория, '' — все
  var method = '';            // выбранный способ получения
  var gift = false;           // подарочная упаковка

  function stepOf(p) { return p.step || (p.unit === 'кг' ? 0.5 : 1); }
  function minOf(p) { return p.min || stepOf(p); }
  function round(n) { return Math.round(n * 10) / 10; }
  function priceText(n) { return n > 0 ? money(n) : 'бесплатно'; }
  function unitSuffix(unit) { return unit && unit !== 'шт' ? ' за ' + esc(unit) : ''; }
  function hasSale(p) { return p.oldPrice > p.price; }

  // Убираем из корзины то, что продавец удалил или снял с продажи.
  function cleanCart() {
    Object.keys(cart).forEach(function (id) {
      var p = Store.product(id);
      if (!p || !p.inStock) delete cart[id];
    });
  }

  function currentMethod() {
    var list = Store.methods();
    for (var i = 0; i < list.length; i++) if (list[i].id === method) return list[i];
    if (!list.length) return null;
    method = list[0].id;
    return list[0];
  }

  function totals() {
    var s = Store.settings();
    var items = [];
    Object.keys(cart).forEach(function (id) {
      var p = Store.product(id);
      if (!p || !p.inStock) return;
      items.push({ productId: id, name: p.name, unit: p.unit, price: p.price, qty: cart[id], sum: Math.round(p.price * cart[id]) });
    });
    var subtotal = items.reduce(function (a, i) { return a + i.sum; }, 0);
    var m = currentMethod();
    var freeByTotal = s.freeDeliveryFrom > 0 && subtotal >= s.freeDeliveryFrom;
    var delivery = m && m.price > 0 && !freeByTotal ? m.price : 0;
    var giftPrice = gift && s.giftWrapPrice > 0 ? s.giftWrapPrice : 0;
    return {
      items: items,
      count: items.length,
      subtotal: subtotal,
      method: m,
      delivery: delivery,
      gift: giftPrice,
      total: subtotal + delivery + giftPrice,
      belowMin: subtotal < s.minOrder
    };
  }

  function changeQty(id, dir) {
    var p = Store.product(id);
    if (!p || !p.inStock) return;
    var cur = cart[id] || 0;
    var next = dir > 0 ? (cur ? round(cur + stepOf(p)) : minOf(p)) : round(cur - stepOf(p));
    if (next > 999) next = 999;
    if (next < minOf(p)) delete cart[id];
    else cart[id] = next;
    Store.setCart(cart);
    update(id);
  }

  /* ---------- Каталог ---------- */

  function renderInfo() {
    var s = Store.settings();
    var list = [];
    Store.methods().forEach(function (m) {
      if (m.id === 'courier') list.push('Курьер по городу <b>' + priceText(m.price) + '</b>');
      if (m.id === 'pickup') list.push('Самовывоз <b>' + priceText(m.price) + '</b>');
      if (m.id === 'russia') list.push('Доставка по России <b>' + priceText(m.price) + '</b>');
    });
    if (s.freeDeliveryFrom > 0) list.push('Бесплатная доставка от <b>' + money(s.freeDeliveryFrom) + '</b>');
    if (s.minOrder > 0) list.push('Минимальный заказ <b>' + money(s.minOrder) + '</b>');
    list.push('Оплата <b>при получении</b>');
    chips.innerHTML = list.map(function (t) { return '<li>' + t + '</li>'; }).join('');
  }

  function renderFilters() {
    var cats = Store.categories();
    if (cats.length < 2) { filtersEl.innerHTML = ''; filter = ''; return; }
    if (filter && cats.indexOf(filter) < 0) filter = '';
    filtersEl.innerHTML = [''].concat(cats).map(function (c) {
      var on = c === filter;
      return '<button type="button" class="filter' + (on ? ' is-active' : '') + '" data-action="filter" data-cat="' + esc(c) + '" aria-pressed="' + on + '">' +
        (c ? esc(c) : 'Все') + '</button>';
    }).join('');
  }

  function stepperHtml(p, q, small) {
    return '<div class="stepper' + (small ? ' stepper-sm' : '') + '">' +
      '<button type="button" data-action="dec" data-id="' + esc(p.id) + '" aria-label="Меньше: ' + esc(p.name) + '">−</button>' +
      '<output>' + U.qty(q, esc(p.unit || 'шт')) + '</output>' +
      '<button type="button" data-action="inc" data-id="' + esc(p.id) + '" aria-label="Больше: ' + esc(p.name) + '">+</button>' +
      '</div>';
  }

  function ctrlHtml(p) {
    if (!p.inStock) return '<span class="soon">Скоро снова будет</span>';
    var q = cart[p.id];
    if (!q) return '<button type="button" class="btn btn-soft btn-block" data-action="add" data-id="' + esc(p.id) + '">В корзину</button>';
    return stepperHtml(p, q);
  }

  function cardHtml(p) {
    var tag = !p.inStock
      ? '<span class="tag tag-out">Нет в наличии</span>'
      : hasSale(p) ? '<span class="tag tag-sale">−' + Math.round((1 - p.price / p.oldPrice) * 100) + '%</span>' : '';
    return '<article class="card' + (p.inStock ? '' : ' is-out') + '" data-id="' + esc(p.id) + '">' +
      '<div class="card-img"><img src="' + esc(p.img || U.PLACEHOLDER) + '" alt="' + esc(p.name) + '" loading="lazy">' + tag + '</div>' +
      '<div class="card-body">' +
      (p.category ? '<span class="card-cat">' + esc(p.category) + '</span>' : '') +
      '<h3>' + esc(p.name) + '</h3>' +
      (p.note ? '<p class="note">' + esc(p.note) + '</p>' : '') +
      '<div class="card-foot">' +
      '<div class="price"><b>' + money(p.price) + '</b>' +
      (hasSale(p) ? '<s>' + money(p.oldPrice) + '</s>' : '') +
      (p.unit && p.unit !== 'шт' ? '<span>за ' + esc(p.unit) + '</span>' : '') + '</div>' +
      '<div class="card-ctrl">' + ctrlHtml(p) + '</div>' +
      '</div></div></article>';
  }

  function renderProducts() {
    var list = Store.products()
      .filter(function (p) { return !filter || (p.category || '').trim() === filter; })
      .sort(function (a, b) { return (b.inStock ? 1 : 0) - (a.inStock ? 1 : 0); });
    grid.innerHTML = list.length
      ? list.map(cardHtml).join('')
      : '<p class="muted">Скоро здесь появятся новые товары.</p>';
  }

  function renderBar() {
    var t = totals();
    var visible = t.count > 0 && drawerMode === 'closed';
    bar.className = 'cart-bar' + (visible ? ' is-visible' : '');
    bar.setAttribute('aria-hidden', visible ? 'false' : 'true');
    bar.innerHTML =
      '<div class="cart-bar-info"><span>' + t.count + ' ' + U.plural(t.count, 'товар', 'товара', 'товаров') + '</span>' +
      '<b>' + money(t.subtotal) + '</b></div>' +
      '<button type="button" class="btn btn-accent" data-action="open-cart"' + (visible ? '' : ' tabindex="-1"') + '>Оформить заказ</button>';
  }

  function update(id) {
    var ctrl = grid.querySelector('.card[data-id="' + id + '"] .card-ctrl');
    var p = Store.product(id);
    if (ctrl && p) ctrl.innerHTML = ctrlHtml(p);
    renderBar();
    if (drawerMode === 'order') renderCartLines();
  }

  /* ---------- Корзина и оформление ---------- */

  function openCart() {
    cleanCart();
    drawerMode = 'order';
    renderOrderForm();
    drawer.className = 'drawer is-open';
    drawer.setAttribute('aria-hidden', 'false');
    document.body.className += ' no-scroll';
    renderBar();
    setTimeout(function () { var c = drawer.querySelector('.icon-btn'); if (c) c.focus(); }, 60);
  }

  function closeCart() {
    if (drawerMode === 'closed') return;
    drawer.className = 'drawer';
    drawer.setAttribute('aria-hidden', 'true');
    document.body.className = document.body.className.replace(/\s*no-scroll/g, '');
    drawerMode = 'closed';
    renderBar();
  }

  function emptyHtml() {
    return '<div class="empty-cart"><p>В корзине пока пусто.</p>' +
      '<button type="button" class="btn btn-soft" data-action="close-cart">Перейти в каталог</button></div>';
  }

  function methodsHtml() {
    var cur = currentMethod();
    return Store.methods().map(function (m) {
      return '<label class="method"><input type="radio" name="method" value="' + m.id + '"' + (cur && cur.id === m.id ? ' checked' : '') + '>' +
        '<span class="method-body"><b>' + esc(m.name) + '</b>' + (m.note ? '<small>' + esc(m.note) + '</small>' : '') + '</span>' +
        '<span class="method-price">' + priceText(m.price) + '</span></label>';
    }).join('');
  }

  function renderOrderForm() {
    if (!totals().count) { body.innerHTML = emptyHtml(); return; }
    var s = Store.settings();
    body.innerHTML =
      '<div id="cart-items"></div>' +
      '<form id="order-form" class="order-form" novalidate>' +
      '<h3>Как получить заказ</h3>' +
      '<div class="methods" role="radiogroup" aria-label="Способ получения">' + methodsHtml() + '</div>' +
      (s.giftWrapPrice > 0
        ? '<label class="check gift"><input type="checkbox" name="gift"' + (gift ? ' checked' : '') + '>' +
          '<span><b>Упаковать в подарок</b> +' + money(s.giftWrapPrice) +
          (s.giftWrapNote ? '<small>' + esc(s.giftWrapNote) + '</small>' : '') + '</span></label>'
        : '') +
      '<div id="cart-summary" class="summary"></div>' +
      '<h3>Ваши данные</h3>' +
      '<label class="field" data-field="name"><span>Ваше имя</span>' +
      '<input name="name" autocomplete="name" maxlength="60"><em class="err"></em></label>' +
      '<label class="field" data-field="phone"><span>Телефон</span>' +
      '<input name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="+7 (___) ___-__-__"><em class="err"></em></label>' +
      '<label class="field" data-field="address" data-show="address"><span class="address-label">Адрес доставки</span>' +
      '<textarea name="address" rows="2" autocomplete="street-address" maxlength="300"></textarea><em class="err"></em></label>' +
      '<label class="field" data-show="time"><span>Когда удобно принять заказ</span><select name="time">' +
      '<option>Любое время с 10:00 до 21:00</option><option>Утром, 10:00–14:00</option>' +
      '<option>Днём, 14:00–18:00</option><option>Вечером, 18:00–21:00</option></select></label>' +
      '<p class="pickup-box" data-show="pickup"></p>' +
      '<label class="field"><span>Комментарий <i>— необязательно</i></span>' +
      '<textarea name="comment" rows="2" maxlength="300" placeholder="' + esc(SITE.commentHint || 'Например: позвоните за час до приезда') + '"></textarea></label>' +
      '<div class="field" data-field="consent"><label class="check"><input type="checkbox" name="consent">' +
      '<span>Согласен на обработку персональных данных по <a href="#policy" target="_blank">политике конфиденциальности</a></span></label>' +
      '<em class="err"></em></div>' +
      '<div id="cart-submit"></div>' +
      '<p class="pay-note">Оплата при получении — наличными или переводом. Мы позвоним, чтобы подтвердить заказ.</p>' +
      '</form>';
    applyMethodUI();
    renderCartLines();
  }

  function show(el, on) { if (el) el.hidden = !on; }

  // Поля формы зависят от способа получения: адрес нужен курьеру и для отправки, при самовывозе — нет.
  function applyMethodUI() {
    var form = document.getElementById('order-form');
    if (!form) return;
    var m = currentMethod();
    show(form.querySelector('[data-show="address"]'), m && m.needsAddress);
    show(form.querySelector('[data-show="time"]'), m && m.id === 'courier');
    var pick = form.querySelector('[data-show="pickup"]');
    show(pick, m && m.id === 'pickup');
    if (m && m.id === 'pickup') pick.innerHTML = 'Забрать заказ: <b>' + esc(m.note || 'адрес уточним по телефону') + '</b>. Мы позвоним, когда он будет готов.';
    var russia = m && m.id === 'russia';
    form.querySelector('.address-label').textContent = russia ? 'Город и адрес или пункт выдачи СДЭК' : 'Адрес доставки';
    form.elements.namedItem('address').placeholder = russia
      ? 'Например: Казань, ул. Баумана, 10, кв. 5 — или «ПВЗ СДЭК на ул. Пушкина»'
      : 'Улица, дом, подъезд, этаж, квартира';
  }

  function renderCartLines() {
    var items = document.getElementById('cart-items');
    if (!items) return;
    var t = totals();
    if (!t.count) { body.innerHTML = emptyHtml(); return; }
    var s = Store.settings();

    items.innerHTML = t.items.map(function (i) {
      var p = Store.product(i.productId);
      return '<div class="ci">' +
        '<img src="' + esc(p.img || U.PLACEHOLDER) + '" alt="">' +
        '<div class="ci-info"><b>' + esc(i.name) + '</b><span>' + money(i.price) + unitSuffix(i.unit) + '</span></div>' +
        '<div class="ci-side">' + stepperHtml(p, i.qty, true) + '<b class="ci-sum">' + money(i.sum) + '</b></div>' +
        '</div>';
    }).join('');

    // На карточках способов получения показываем, что доставка стала бесплатной из-за суммы заказа.
    var free = s.freeDeliveryFrom > 0 && t.subtotal >= s.freeDeliveryFrom;
    Store.methods().forEach(function (m) {
      var input = body.querySelector('input[name="method"][value="' + m.id + '"]');
      var el = input && input.parentNode.querySelector('.method-price');
      if (el) el.innerHTML = m.price > 0 && free ? '<s>' + money(m.price) + '</s> бесплатно' : priceText(m.price);
    });

    var left = s.freeDeliveryFrom - t.subtotal;
    document.getElementById('cart-summary').innerHTML =
      '<div class="sum-row"><span>Товары</span><span>' + money(t.subtotal) + '</span></div>' +
      (t.gift ? '<div class="sum-row"><span>Подарочная упаковка</span><span>' + money(t.gift) + '</span></div>' : '') +
      (t.method ? '<div class="sum-row"><span>' + esc(t.method.name) + '</span><span>' + priceText(t.delivery) + '</span></div>' : '') +
      (t.delivery && s.freeDeliveryFrom > 0 && left > 0 ? '<p class="hint">Добавьте ещё на ' + money(left) + ' — и доставка будет бесплатной</p>' : '') +
      '<div class="sum-row sum-total"><span>Итого</span><span>' + money(t.total) + '</span></div>' +
      (t.belowMin ? '<p class="warn">Минимальная сумма заказа — ' + money(s.minOrder) + '. Добавьте товаров ещё на ' + money(s.minOrder - t.subtotal) + '.</p>' : '');

    document.getElementById('cart-submit').innerHTML =
      '<button type="submit" class="btn btn-primary btn-block btn-lg"' + (t.belowMin || !t.method ? ' disabled' : '') + '>Заказать · ' + money(t.total) + '</button>';
  }

  function showErrors(form, errs) {
    var fields = form.querySelectorAll('[data-field]');
    for (var i = 0; i < fields.length; i++) {
      var key = fields[i].getAttribute('data-field');
      var msg = errs[key] || '';
      var err = fields[i].querySelector('.err');
      fields[i].className = fields[i].className.replace(/\s*invalid/g, '') + (msg ? ' invalid' : '');
      if (err) err.textContent = msg;
    }
  }

  function onSubmit(e) {
    if (!e.target || e.target.id !== 'order-form') return;
    e.preventDefault();
    var form = e.target;
    var t = totals();
    if (!t.count || t.belowMin || !t.method) return;
    var m = t.method;

    var f = function (n) { return form.elements.namedItem(n); };
    var v = {
      name: f('name').value.trim(),
      phone: f('phone').value,
      address: f('address').value.trim(),
      time: f('time').value,
      comment: f('comment').value.trim(),
      consent: f('consent').checked
    };

    var errs = {};
    if (v.name.length < 2) errs.name = 'Укажите, как к вам обращаться';
    if (U.phoneDigits(v.phone).length !== 11) errs.phone = 'Укажите номер полностью, 10 цифр после +7';
    if (m.needsAddress && v.address.length < 6) errs.address = m.id === 'russia' ? 'Укажите город и адрес или пункт выдачи' : 'Укажите улицу, дом и квартиру';
    if (!v.consent) errs.consent = 'Без согласия мы не сможем оформить заказ';
    showErrors(form, errs);

    var firstBad = form.querySelector('.invalid input, .invalid textarea');
    if (firstBad) { firstBad.focus(); return; }

    var order = Store.createOrder({
      customer: {
        name: v.name,
        phone: U.formatPhone(v.phone),
        address: m.needsAddress ? v.address : '',
        time: m.id === 'courier' ? v.time : '',
        comment: v.comment
      },
      delivery: { id: m.id, name: m.name, price: t.delivery, note: m.id === 'pickup' ? (m.note || '') : '' },
      gift: t.gift,
      items: t.items,
      subtotal: t.subtotal,
      total: t.total,
      notifyEmail: Store.settings().email
    });

    cart = {};
    gift = false;
    Store.setCart(cart);
    renderProducts();
    drawerMode = 'success';
    renderSuccess(order);
    renderBar();
  }

  function renderSuccess(o) {
    var phone = '<span class="nowrap">' + esc(o.customer.phone) + '</span>';
    var next = o.delivery.id === 'pickup'
      ? 'Мы позвоним на ' + phone + ', когда заказ будет готов. Забрать: ' + esc(o.delivery.note) + '.'
      : o.delivery.id === 'russia'
        ? 'Мы позвоним на ' + phone + ', чтобы подтвердить заказ, и отправим его. Номер для отслеживания сообщим после отправки.'
        : 'Мы позвоним на ' + phone + ', чтобы подтвердить заказ и время доставки.';
    body.innerHTML =
      '<div class="success">' +
      '<div class="success-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="34" height="34"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></div>' +
      '<h3>Заказ № ' + o.id + ' принят</h3>' +
      '<p>Спасибо, ' + esc(o.customer.name) + '! ' + next + '</p>' +
      '<div class="receipt">' +
      o.items.map(function (i) {
        return '<div class="sum-row"><span>' + esc(i.name) + ', ' + U.qty(i.qty, esc(i.unit || 'шт')) + '</span><span>' + money(i.sum) + '</span></div>';
      }).join('') +
      (o.gift ? '<div class="sum-row"><span>Подарочная упаковка</span><span>' + money(o.gift) + '</span></div>' : '') +
      '<div class="sum-row"><span>' + esc(o.delivery.name) + '</span><span>' + priceText(o.delivery.price) + '</span></div>' +
      '<div class="sum-row sum-total"><span>К оплате при получении</span><span>' + money(o.total) + '</span></div>' +
      '</div>' +
      '<button type="button" class="btn btn-primary btn-block" data-action="close-cart">Вернуться в магазин</button>' +
      '<p class="demo-hint">Демо: откройте <a href="#admin">панель продавца</a> — заказ уже там, вместе с письмом, которое пришло бы вам на почту.</p>' +
      '</div>';
    body.scrollTop = 0;
  }

  /* ---------- События ---------- */

  document.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('[data-action]') : null;
    if (!btn) return;
    var a = btn.getAttribute('data-action'), id = btn.getAttribute('data-id');
    if (a === 'add' || a === 'inc') changeQty(id, 1);
    else if (a === 'dec') changeQty(id, -1);
    else if (a === 'open-cart') openCart();
    else if (a === 'close-cart') closeCart();
    else if (a === 'filter') { filter = btn.getAttribute('data-cat'); renderFilters(); renderProducts(); }
    else if (a === 'scroll-products') document.getElementById('catalog').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  body.addEventListener('submit', onSubmit);

  function clearInvalid(el) {
    var field = el.closest ? el.closest('.invalid') : null;
    if (!field) return;
    field.className = field.className.replace(/\s*invalid/g, '');
    var err = field.querySelector('.err');
    if (err) err.textContent = '';
  }

  body.addEventListener('input', function (e) {
    if (e.target.name === 'phone') e.target.value = U.formatPhone(e.target.value);
    clearInvalid(e.target);
  });

  body.addEventListener('change', function (e) {
    var el = e.target;
    if (el.name === 'method') { method = el.value; applyMethodUI(); renderCartLines(); }
    else if (el.name === 'gift') { gift = el.checked; renderCartLines(); }
    else if (el.name === 'consent') clearInvalid(el);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeCart();
  });

  function renderAll() {
    cleanCart();
    renderInfo();
    renderFilters();
    renderProducts();
    renderBar();
  }

  return {
    render: renderAll,
    // Данные поменялись в соседней вкладке (например, продавец сменил цену).
    refresh: function () {
      cart = Store.getCart();
      renderAll();
      if (drawerMode === 'order') renderCartLines();
    },
    closeCart: closeCart
  };
})();
