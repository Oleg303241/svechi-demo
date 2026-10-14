// Хранилище магазина: настройки, товары, заказы и корзина.
// Стартовые товары и настройки берутся из config.js — у каждого магазина свои, остальной код общий.
// В демо всё лежит в памяти этого браузера (localStorage), поэтому заказы видны только на этом устройстве.
// В рабочей версии эти же функции будут обращаться к серверу в России — витрина и панель продавца не изменятся.
var Store = (function () {
  var KEY = SITE.key + '-v1';
  var CART_KEY = SITE.key + '-cart';
  var DEFAULTS = SITE.defaults;

  // Способы получения. Цену, описание и включение каждого продавец меняет в панели.
  var METHODS = [
    { id: 'courier', name: 'Курьер по городу', short: 'Курьер', needsAddress: true },
    { id: 'pickup', name: 'Самовывоз', short: 'Самовывоз', needsAddress: false },
    { id: 'russia', name: 'Доставка по России', short: 'По России', needsAddress: true }
  ];

  function clone(x) { return JSON.parse(JSON.stringify(x)); }

  function read(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; }
  }

  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
  }

  function mergeSettings(base, saved) {
    var out = Object.assign({}, base, saved || {});
    out.delivery = {};
    Object.keys(base.delivery).forEach(function (k) {
      var own = saved && saved.delivery && saved.delivery[k];
      out.delivery[k] = Object.assign({}, base.delivery[k], own || {});
    });
    return out;
  }

  function load() {
    var base = clone(DEFAULTS);
    var saved = read(KEY);
    if (!saved || !Array.isArray(saved.products)) return base;
    base.nextOrderNo = saved.nextOrderNo || base.nextOrderNo;
    base.settings = mergeSettings(base.settings, saved.settings);
    base.products = saved.products;
    base.orders = Array.isArray(saved.orders) ? saved.orders : [];
    return base;
  }

  var state = load();
  var warned = false;

  function persist() {
    if (write(KEY, state)) return true;
    if (!warned) {
      warned = true;
      U.toast('Браузер не даёт сохранять данные: демо работает, пока открыта вкладка');
    }
    return false;
  }

  return {
    KEY: KEY,
    settings: function () { return state.settings; },
    products: function () { return state.products; },
    product: function (id) {
      for (var i = 0; i < state.products.length; i++) if (state.products[i].id === id) return state.products[i];
      return null;
    },
    orders: function () { return state.orders; },

    // Категории в том порядке, в каком они впервые встречаются в каталоге.
    categories: function () {
      var seen = {}, out = [];
      state.products.forEach(function (p) {
        var c = (p.category || '').trim();
        if (c && !seen[c]) { seen[c] = true; out.push(c); }
      });
      return out;
    },

    // Способы получения вместе с настройками продавца; all = true — включая выключенные.
    methods: function (all) {
      return METHODS.filter(function (m) { return all || state.settings.delivery[m.id].on; })
        .map(function (m) { return Object.assign({}, m, state.settings.delivery[m.id]); });
    },

    saveSettings: function (patch) {
      Object.assign(state.settings, patch);
      return persist();
    },

    saveProducts: function (list) {
      state.products = list;
      return persist();
    },

    createOrder: function (data) {
      var order = Object.assign({ id: state.nextOrderNo, createdAt: new Date().toISOString(), seen: false }, data);
      state.nextOrderNo += 1;
      state.orders.unshift(order);
      persist();
      return order;
    },

    markSeen: function (id) {
      state.orders.forEach(function (o) { if (o.id === id) o.seen = true; });
      persist();
    },

    getCart: function () {
      var c = read(CART_KEY);
      return c && typeof c === 'object' ? c : {};
    },

    setCart: function (cart) { write(CART_KEY, cart); },

    // Перечитать данные, если их изменили в соседней вкладке.
    reload: function () { state = load(); },

    reset: function () {
      state = clone(DEFAULTS);
      persist();
      write(CART_KEY, {});
    }
  };
})();
