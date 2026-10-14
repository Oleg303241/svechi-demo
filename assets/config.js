// Настройки этого магазина: название, тексты, доставка и стартовый каталог.
// Остальной код (витрина, корзина, панель продавца) общий для всех магазинов.
var SITE = {
  key: 'teply-svet-demo',
  titleSuffix: 'свечи ручной работы',
  giftWrap: true,
  commentHint: 'Например: текст для открытки или удобное время звонка',
  logo: '<svg viewBox="0 0 32 32" width="34" height="34" aria-hidden="true"><circle cx="16" cy="16" r="16" fill="#8b4a2b"/><path d="M16 6c3 4 6 6.5 6 10.5a6 6 0 0 1-12 0c0-2.6 1.6-4.4 3-5.6.3 2 1.2 3 2.3 3.4C14.8 11 15 8.5 16 6z" fill="#f6d7a7"/></svg>',

  defaults: {
    nextOrderNo: 1001,
    settings: {
      shopName: 'Тёплый свет',
      tagline: 'Свечи ручной работы из соевого воска',
      lead: 'Отливаем небольшими партиями и бережно упаковываем. Привезём по городу, отдадим в мастерской или отправим в любой город России.',
      phone: '+7 (900) 000-00-00',
      email: 'zakaz@example.ru',
      freeDeliveryFrom: 3500,
      minOrder: 0,
      giftWrapPrice: 150,
      giftWrapNote: 'Крафт-коробка, лента и открытка — текст напишите в комментарии',
      adminPassword: '1234',
      delivery: {
        courier: { on: true, price: 350, note: 'На следующий день, с 10:00 до 21:00' },
        pickup: { on: true, price: 0, note: 'Мастерская на ул. Примерной, 5. Пн–Сб 11:00–20:00' },
        russia: { on: true, price: 390, note: 'СДЭК или Почта России, 2–7 дней, в защитной упаковке' }
      }
    },
    products: [
      { id: 'c1', name: 'Лаванда и мёд', note: '200 мл, соевый воск, около 40 часов горения', category: 'Ароматические', price: 890, oldPrice: 0, unit: 'шт', img: 'img/c1.jpg', inStock: true },
      { id: 'c2', name: 'Бергамот и сандал', note: '200 мл в керамике, около 40 часов горения', category: 'Ароматические', price: 990, oldPrice: 0, unit: 'шт', img: 'img/c2.jpg', inStock: true },
      { id: 'c3', name: 'Хвоя и мандарин', note: '250 мл, зимний аромат, около 45 часов горения', category: 'Ароматические', price: 950, oldPrice: 0, unit: 'шт', img: 'img/c3.jpg', inStock: true },
      { id: 'c4', name: 'Кофе и ваниль', note: '120 мл в бетонной чаше', category: 'Ароматические', price: 690, oldPrice: 0, unit: 'шт', img: 'img/c4.jpg', inStock: true },
      { id: 'c5', name: 'Инжир и кедр', note: '300 мл, деревянный фитиль потрескивает, как камин', category: 'Ароматические', price: 1290, oldPrice: 1490, unit: 'шт', img: 'img/c5.jpg', inStock: true },
      { id: 'c6', name: 'Набор «Уютный вечер»', note: 'Три свечи по 100 мл в подарочной коробке', category: 'Наборы', price: 1990, oldPrice: 2370, unit: 'шт', img: 'img/c6.jpg', inStock: true },
      { id: 'c7', name: 'Подарочный набор «С теплом»', note: 'Свеча 200 мл, спички, сушёный апельсин, крафт-упаковка', category: 'Наборы', price: 1490, oldPrice: 0, unit: 'шт', img: 'img/c7.jpg', inStock: true },
      { id: 'c8', name: 'Свеча-столбик', note: '7×10 см, без аромата, около 30 часов горения', category: 'Декор', price: 490, oldPrice: 0, unit: 'шт', img: 'img/c8.jpg', inStock: true },
      { id: 'c9', name: 'Фигурная свеча «Пузырьки»', note: '6×6 см, персиковый цвет', category: 'Декор', price: 450, oldPrice: 0, unit: 'шт', img: 'img/c9.jpg', inStock: true },
      { id: 'c10', name: 'Витые свечи, 2 шт', note: 'Шалфейный цвет, высота 25 см', category: 'Декор', price: 590, oldPrice: 0, unit: 'шт', img: 'img/c10.jpg', inStock: false }
    ],
    orders: []
  }
};
