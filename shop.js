/* =====================================================
RUNWORLD SHOP — SHOP.JS
Vitrine, filtros, carrinho local e links externos.
Não depende da API do Mercado Livre.
Mantém a integração com abrirTela / voltarParaMapa.
===================================================== */

(() => {
'use strict';

const CART_KEY = 'runworld-shop-carrinho-v1';
const SHOP_ID = 'telaShop';

const ALLOWED_HOSTS = [
'mercadolivre.com.br',
'amazon.com.br',
'magazineluiza.com.br',
'netshoes.com.br',
'decathlon.com.br',
'centauro.com.br'
];

const products = [
{
id: 'rw-001',
name: 'Tênis para corrida',
category: 'calcados',
categoryLabel: 'Calçados',
description: 'Encontre opções para seus treinos e corridas.',
price: 0,
image: '',
seller: 'Mercado Livre',
url: 'https://lista.mercadolivre.com.br/tenis-corrida'
},
{
id: 'rw-002',
name: 'Relógio esportivo',
category: 'tecnologia',
categoryLabel: 'Tecnologia',
description: 'Relógios e pulseiras para acompanhar atividades.',
price: 0,
image: '',
seller: 'Mercado Livre',
url: 'https://lista.mercadolivre.com.br/relogio-esportivo'
},
{
id: 'rw-003',
name: 'Garrafa para hidratação',
category: 'acessorios',
categoryLabel: 'Acessórios',
description: 'Garrafas e squeezes para levar nos treinos.',
price: 0,
image: '',
seller: 'Mercado Livre',
url: 'https://lista.mercadolivre.com.br/garrafa-esportiva'
},
{
id: 'rw-004',
name: 'Mochila esportiva',
category: 'acessorios',
categoryLabel: 'Acessórios',
description: 'Mochilas para caminhada, corrida e uso diário.',
price: 0,
image: '',
seller: 'Mercado Livre',
url: 'https://lista.mercadolivre.com.br/mochila-esportiva'
},
{
id: 'rw-005',
name: 'Fone para treinos',
category: 'tecnologia',
categoryLabel: 'Tecnologia',
description: 'Veja opções de fones para ouvir música.',
price: 0,
image: '',
seller: 'Amazon Brasil',
url: 'https://www.amazon.com.br/s?k=fone+esportivo'
},
{
id: 'rw-006',
name: 'Camiseta esportiva',
category: 'roupas',
categoryLabel: 'Roupas',
description: 'Camisetas para acompanhar seus treinos.',
price: 0,
image: '',
seller: 'Decathlon',
url: 'https://www.decathlon.com.br/search?query=camiseta%20corrida'
},
{
id: 'rw-007',
name: 'Meias para corrida',
category: 'roupas',
categoryLabel: 'Roupas',
description: 'Opções de meias para atividades físicas.',
price: 0,
image: '',
seller: 'Mercado Livre',
url: 'https://lista.mercadolivre.com.br/meia-corrida'
},
{
id: 'rw-008',
name: 'Acessórios de segurança',
category: 'acessorios',
categoryLabel: 'Acessórios',
description: 'Luzes e itens refletivos para melhorar a visibilidade.',
price: 0,
image: '',
seller: 'Mercado Livre',
url: 'https://lista.mercadolivre.com.br/luz-refletiva-corrida'
}
];

let activeCategory = 'todos';
let searchText = '';
let currentView = 'products';
let previousScreen = null;

function escapeHtml(value) {
return String(value == null ? '' : value).replace(
/[&<>"']/g,
char => ({
'&': '&',
'<': '<',
'>': '>',
'"': '"',
"'": '''
})[char]
);
}

function money(value) {
return Number(value || 0).toLocaleString('pt-BR', {
style: 'currency',
currency: 'BRL'
});
}

function validSellerUrl(rawUrl) {
try {
const url = new URL(rawUrl);

  if (url.protocol !== 'https:') return null;

  const host = url.hostname.toLowerCase();
  const allowed = ALLOWED_HOSTS.some(
    domain => host === domain || host.endsWith('.' + domain)
  );

  return allowed ? url.href : null;
} catch (_) {
  return null;
}

}

function safeReadCart() {
try {
const parsed = JSON.parse(
localStorage.getItem(CART_KEY) || '[]'
);

  if (!Array.isArray(parsed)) return [];

  return parsed
    .filter(item =>
      item &&
      typeof item.id === 'string' &&
      Number.isFinite(Number(item.qty)) &&
      Number(item.qty) > 0 &&
      products.some(product => product.id === item.id)
    )
    .map(item => ({
      id: item.id,
      qty: Math.max(1, Math.floor(Number(item.qty)))
    }));
} catch (_) {
  return [];
}

}

function getCart() {
return safeReadCart();
}

function saveCart(cart) {
try {
localStorage.setItem(CART_KEY, JSON.stringify(cart));
} catch (_) {
// A loja continua disponível mesmo sem armazenamento local.
}

updateCartBadge();

}

function cartCount() {
return getCart().reduce((sum, item) => sum + item.qty, 0);
}

function ensureScreen() {
let screen = document.getElementById(SHOP_ID);

if (screen) return screen;

screen = document.createElement('section');
screen.id = SHOP_ID;
screen.className = 'tela tela-interna rw-shop';
screen.setAttribute('aria-label', 'RunWorld Shop');
screen.hidden = true;

document.body.appendChild(screen);

return screen;

}

function installShopShortcuts() {
const actions = document.querySelector('.topo-acoes');

if (
  actions &&
  !document.getElementById('abrirRunWorldShop')
) {
  const button = document.createElement('button');

  button.id = 'abrirRunWorldShop';
  button.type = 'button';
  button.className = 'icone-btn rw-shop-shortcut';
  button.setAttribute('aria-label', 'Abrir RunWorld Shop');
  button.innerHTML = '<i data-lucide="shopping-cart"></i>';

  const profile = document.getElementById('abrirPerfil');

  actions.insertBefore(button, profile || null);
}

const menu = document.getElementById('menuFlutuante');

if (
  menu &&
  !document.getElementById('abrirShopMenu')
) {
  const button = document.createElement('button');

  button.id = 'abrirShopMenu';
  button.type = 'button';
  button.className = 'item-menu rw-shop-menu-shortcut';
  button.innerHTML =
    '<i data-lucide="shopping-cart"></i>' +
    '<span><b>RunWorld Shop</b>' +
    '<small>Equipamentos e acessórios</small></span>';

  const settings = document.getElementById(
    'abrirConfiguracoes'
  );

  menu.insertBefore(button, settings || null);
}

refreshIcons();

}

function refreshIcons() {
if (
window.lucide &&
typeof window.lucide.createIcons === 'function'
) {
window.lucide.createIcons();
}
}

function updateCartBadge() {
const count = cartCount();

document.querySelectorAll(
  '[data-rw-shop-cart-count], .rw-shop-cart-count'
).forEach(element => {
  element.textContent = String(count);
  element.hidden = count === 0;
});

}

function categoryButtons() {
const categories = [
['todos', 'Todos'],
['calcados', 'Calçados'],
['roupas', 'Roupas'],
['acessorios', 'Acessórios'],
['tecnologia', 'Tecnologia']
];

return categories.map(([id, label]) => `
  <button
    type="button"
    class="rw-shop-filter ${activeCategory === id ? 'active' : ''}"
    data-category="${id}"
    aria-pressed="${activeCategory === id}"
  >${label}</button>
`).join('');

}

function filteredProducts() {
const query = searchText.trim().toLocaleLowerCase('pt-BR');

return products.filter(product => {
  const categoryMatch =
    activeCategory === 'todos' ||
    product.category === activeCategory;

  const content = (
    product.name + ' ' +
    product.description + ' ' +
    product.categoryLabel + ' ' +
    product.seller
  ).toLocaleLowerCase('pt-BR');

  return categoryMatch && (!query || content.includes(query));
});

}

function productCard(product) {
const safeUrl = validSellerUrl(product.url);

const image = product.image
  ? `
    <img
      class="rw-shop-product-image"
      src="${escapeHtml(product.image)}"
      alt="${escapeHtml(product.name)}"
      loading="lazy"
      onerror="this.hidden=true;this.nextElementSibling.hidden=false"
    >
    <div class="rw-shop-product-placeholder" hidden aria-hidden="true">
      <span>🏃</span>
    </div>
  `
  : `
    <div class="rw-shop-product-placeholder" aria-hidden="true">
      <span>🏃</span>
    </div>
  `;

return `
  <article class="rw-shop-card">
    <div class="rw-shop-product-media">
      ${image}
      <span class="rw-shop-product-tag">
        ${escapeHtml(product.categoryLabel)}
      </span>
    </div>

    <div class="rw-shop-card-body">
      <h3>${escapeHtml(product.name)}</h3>
      <p>${escapeHtml(product.description)}</p>

      <div class="rw-shop-price">
        ${product.price > 0
          ? money(product.price)
          : 'Confira o preço na loja'}
      </div>

      <small class="rw-shop-seller">
        Loja: ${escapeHtml(product.seller)}
      </small>

      <div class="rw-shop-card-actions">
        <button
          type="button"
          class="rw-shop-button rw-shop-button-secondary"
          data-add-cart="${escapeHtml(product.id)}"
        >Adicionar ao carrinho</button>

        ${safeUrl
          ? `<button type="button" class="rw-shop-button" data-buy-now="${escapeHtml(product.id)}">Ver na loja</button>`
          : '<span class="rw-shop-link-unavailable">Link indisponível</span>'}
      </div>
    </div>
  </article>
`;

}

function rememberCurrentScreen() {
const screen = document.getElementById(SHOP_ID);

if (screen && !screen.hidden) return;

const candidates = document.querySelectorAll(
  '.tela:not([hidden]), [data-tela]:not([hidden])'
);

for (const candidate of candidates) {
  if (candidate.id !== SHOP_ID) {
    previousScreen = candidate;
  }
}

}

function showShopScreen() {
const screen = ensureScreen();
screen.hidden = false;

if (typeof window.abrirTela === 'function') {
  try {
    window.abrirTela(SHOP_ID);
  } catch (_) {
    screen.hidden = false;
  }
}

}

function renderProducts() {
rememberCurrentScreen();

const screen = ensureScreen();
currentView = 'products';

screen.innerHTML = `
  <div class="rw-shop-shell">
    <header class="rw-shop-header">
      <button
        type="button"
        class="rw-shop-back"
        data-shop-back
        aria-label="Voltar ao mapa"
      >‹ <span>Voltar</span></button>

      <div>
        <p class="rw-shop-eyebrow">EXPLORE • CORRA • CONQUISTE</p>
        <h1>RunWorld <span>Shop</span></h1>
        <p class="rw-shop-subtitle">
          Equipamentos e acessórios para acompanhar seu movimento.
        </p>
      </div>

      <button
        type="button"
        class="rw-shop-cart-button"
        data-open-cart
        aria-label="Abrir carrinho"
      >
        <i data-lucide="shopping-cart"></i>
        <span class="rw-shop-cart-count">${cartCount()}</span>
      </button>
    </header>

    <label class="rw-shop-search">
      <span aria-hidden="true">⌕</span>
      <input
        type="search"
        data-shop-search
        value="${escapeHtml(searchText)}"
        placeholder="Buscar produtos..."
        aria-label="Buscar produtos"
      >
    </label>

    <nav class="rw-shop-filters" aria-label="Categorias">
      ${categoryButtons()}
    </nav>

    <div class="rw-shop-section-heading">
      <div>
        <h2>Vitrine</h2>
        <p>Escolha um item para ver opções na loja parceira.</p>
      </div>
      <span class="rw-shop-result-count">
        ${filteredProducts().length} itens
      </span>
    </div>

    <div class="rw-shop-grid" data-shop-grid>
      ${filteredProducts().map(productCard).join('') ||
        '<div class="rw-shop-empty"><strong>Nenhum produto encontrado</strong><p>Tente outro nome ou categoria.</p></div>'}
    </div>

    <p class="rw-shop-disclaimer">
      Os preços e a disponibilidade são definidos pelas lojas parceiras.
      A compra é concluída no site do vendedor.
    </p>

    <div
      class="rw-shop-feedback"
      data-shop-feedback
      role="status"
      aria-live="polite"
    ></div>
  </div>
`;

showShopScreen();
updateCartBadge();
refreshIcons();

}

function renderCart() {
const screen = ensureScreen();
currentView = 'cart';

const cart = getCart();

const lines = cart.map(item => {
  const product = products.find(entry => entry.id === item.id);

  if (!product) return '';

  return `
    <article class="rw-shop-cart-item">
      <div class="rw-shop-cart-item-info">
        <h3>${escapeHtml(product.name)}</h3>
        <p>
          ${product.price > 0
            ? money(product.price)
            : 'Preço no site do vendedor'}
        </p>

        <div class="rw-shop-quantity">
          <button
            type="button"
            data-qty-minus="${product.id}"
            aria-label="Diminuir quantidade"
          >−</button>
          <span>${item.qty}</span>
          <button
            type="button"
            data-qty-plus="${product.id}"
            aria-label="Aumentar quantidade"
          >+</button>
        </div>
      </div>

      <button
        type="button"
        class="rw-shop-remove"
        data-remove-item="${product.id}"
      >Remover</button>
    </article>
  `;
}).join('');

const pricedTotal = cart.reduce((sum, item) => {
  const product = products.find(entry => entry.id === item.id);

  return sum +
    (product && product.price > 0
      ? product.price * item.qty
      : 0);
}, 0);

screen.innerHTML = `
  <div class="rw-shop-shell">
    <header class="rw-shop-header">
      <button
        type="button"
        class="rw-shop-back"
        data-shop-back
      >‹ <span>Voltar</span></button>

      <div>
        <p class="rw-shop-eyebrow">RUNWORLD SHOP</p>
        <h1>Seu carrinho</h1>
      </div>

      <span class="rw-shop-cart-count">${cartCount()}</span>
    </header>

    <div class="rw-shop-cart-list">
      ${lines ||
        '<div class="rw-shop-empty"><strong>Seu carrinho está vazio</strong><p>Adicione produtos da vitrine para encontrá-los aqui.</p><button type="button" class="rw-shop-button" data-show-products>Ver produtos</button></div>'}
    </div>

    ${cart.length ? `
      <div class="rw-shop-cart-summary">
        <div>
          <span>Subtotal dos itens com preço definido</span>
          <strong>${money(pricedTotal)}</strong>
        </div>

        <p>
          O carrinho é uma lista de produtos do RunWorld.
          Os pagamentos são feitos diretamente nas lojas parceiras.
        </p>

        <button
          type="button"
          class="rw-shop-button"
          data-buy-cart
        >Ver produto na loja</button>

        <button
          type="button"
          class="rw-shop-button rw-shop-button-secondary"
          data-show-products
        >Continuar comprando</button>
      </div>
    ` : ''}

    <div
      class="rw-shop-feedback"
      data-shop-feedback
      role="status"
      aria-live="polite"
    ></div>
  </div>
`;

showShopScreen();
updateCartBadge();
refreshIcons();

}

function feedback(message) {
const node = ensureScreen().querySelector('[data-shop-feedback]');

if (node) node.textContent = message;

}

function addToCart(id) {
if (!products.some(product => product.id === id)) return;

const cart = getCart();
const found = cart.find(item => item.id === id);

if (found) {
  found.qty += 1;
} else {
  cart.push({ id, qty: 1 });
}

saveCart(cart);
feedback('Produto adicionado ao carrinho.');

const count = ensureScreen().querySelector(
  '.rw-shop-cart-count'
);

if (count) count.textContent = String(cartCount());

}

function changeQuantity(id, amount) {
const cart = getCart();
const item = cart.find(entry => entry.id === id);

if (!item) return;

item.qty += amount;

saveCart(cart.filter(entry => entry.qty > 0));
renderCart();

}

function removeItem(id) {
saveCart(getCart().filter(item => item.id !== id));
renderCart();
}

function openSeller(product) {
const url = product && validSellerUrl(product.url);

if (!url) {
  feedback('O link desta loja não está disponível.');
  return;
}

const opened = window.open(
  url,
  '_blank',
  'noopener,noreferrer'
);

if (!opened) {
  // Alternativa para navegadores que bloqueiam novas abas.
  window.location.href = url;
}

}

function buyCart() {
const cart = getCart();

const product = cart
  .map(item => products.find(entry => entry.id === item.id))
  .find(entry => entry && validSellerUrl(entry.url));

if (!product) {
  feedback('Adicione um produto para continuar.');
  return;
}

openSeller(product);

}

function goBack() {
const screen = ensureScreen();
screen.hidden = true;

if (typeof window.voltarParaMapa === 'function') {
  try {
    window.voltarParaMapa();
    return;
  } catch (_) {
    // Usa a alternativa abaixo.
  }
}

if (previousScreen) {
  previousScreen.hidden = false;
  return;
}

const mapScreen =
  document.getElementById('telaMapa') ||
  document.getElementById('mapa') ||
  document.querySelector('[data-tela="mapa"]');

if (mapScreen) {
  mapScreen.hidden = false;
}

}

function handleClick(event) {
const target = event.target.closest('button');

if (!target) return;

if (
  target.id === 'abrirShopMenu' ||
  target.id === 'abrirRunWorldShop' ||
  target.hasAttribute('data-open-shop')
) {
  renderProducts();
  return;
}

if (target.hasAttribute('data-category')) {
  activeCategory = target.getAttribute('data-category') || 'todos';
  renderProducts();
  return;
}

if (target.hasAttribute('data-add-cart')) {
  addToCart(target.getAttribute('data-add-cart'));
  return;
}

if (target.hasAttribute('data-buy-now')) {
  const product = products.find(
    item => item.id === target.getAttribute('data-buy-now')
  );

  openSeller(product);
  return;
}

if (target.hasAttribute('data-open-cart')) {
  renderCart();
  return;
}

if (target.hasAttribute('data-shop-back')) {
  if (currentView === 'cart') {
    renderProducts();
  } else {
    goBack();
  }

  return;
}

if (target.hasAttribute('data-show-products')) {
  renderProducts();
  return;
}

if (target.hasAttribute('data-qty-plus')) {
  changeQuantity(target.getAttribute('data-qty-plus'), 1);
  return;
}

if (target.hasAttribute('data-qty-minus')) {
  changeQuantity(target.getAttribute('data-qty-minus'), -1);
  return;
}

if (target.hasAttribute('data-remove-item')) {
  removeItem(target.getAttribute('data-remove-item'));
  return;
}

if (target.hasAttribute('data-buy-cart')) {
  buyCart();
}

}

function handleInput(event) {
if (!event.target.matches('[data-shop-search]')) return;

searchText = event.target.value || '';

const grid = ensureScreen().querySelector('[data-shop-grid]');
const count = ensureScreen().querySelector('.rw-shop-result-count');
const result = filteredProducts();

if (grid) {
  grid.innerHTML = result.map(productCard).join('') ||
    '<div class="rw-shop-empty"><strong>Nenhum produto encontrado</strong><p>Tente outro nome ou categoria.</p></div>';
}

if (count) {
  count.textContent = `${result.length} itens`;
}

}

document.addEventListener('click', handleClick);
document.addEventListener('input', handleInput);

if (document.readyState === 'loading') {
document.addEventListener(
'DOMContentLoaded',
installShopShortcuts,
{ once: true }
);

document.addEventListener(
  'DOMContentLoaded',
  updateCartBadge,
  { once: true }
);

} else {
installShopShortcuts();
updateCartBadge();
}

window.abrirRunWorldShop = renderProducts;
window.abrirCarrinhoRunWorldShop = renderCart;
window.atualizarContadorRunWorldShop = updateCartBadge;
})();
