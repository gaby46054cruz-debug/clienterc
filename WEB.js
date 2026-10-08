import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut 
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  runTransaction, 
  onSnapshot 
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

// Credenciales Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCSHWCKnfL531jGJJgG3lfvMUEnH58uX5A",
  authDomain: "tarjeta1-3d3f9.firebaseapp.com",
  projectId: "tarjeta1-3d3f9",
  storageBucket: "tarjeta1-3d3f9.firebasestorage.app",
  messagingSenderId: "46559227030",
  appId: "1:46559227030:web:79418d4bded76ad553a6b7",
  measurementId: "G-HNYPXSYCR1"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// CONSTANTE MINIMO DE COMPRA
const MINIMUM_ORDER_AMOUNT = 200000;

// ESTADO GLOBAL
let appSettings = {
  title: "NICO MOTOREPUESTOS",
  logoUrl: "https://via.placeholder.com/100",
  announcement: "¡Bienvenidos a nuestra tienda oficial!",
  whatsapp: "5493810000000",
  faqUrl: "https://wa.me/5493810000000"
};

let themeSettings = {
  bgColor: "#0a0e17",
  headerBg: "#121824",
  bottomNavBg: "#121824",
  textColor: "#f1f5f9",
  cardBg: "#121824",
  accentColor: "#06b6d4",
  bgImgUrl: ""
};

let sectionsData = [];
let productsData = [];
let promosData = [];
let customMenuButtons = [];
let cart = [];

let selectedProductForModal = null;
let activeSectionId = null;
let expandedInlineEditId = null;
let searchQuery = "";
let zoomScale = 1;

// REFERENCIAS DOM
const preloader = document.getElementById('app-preloader');
const btnAdminLock = document.getElementById('btn-admin-lock');
const btnAdminLogout = document.getElementById('btn-admin-logout');
const siteLogo = document.getElementById('site-logo');
const siteTitle = document.getElementById('site-title');
const siteAnnouncement = document.getElementById('site-announcement');

const promosSection = document.getElementById('promos-section');
const promosContainer = document.getElementById('promos-container');
const sectionsBar = document.getElementById('sections-bar');
const productsGrid = document.getElementById('products-grid');

const modalQuantity = document.getElementById('modal-quantity');
const modalCart = document.getElementById('modal-cart');
const modalAdminPanel = document.getElementById('modal-admin-panel');

const cartBadgeCount = document.getElementById('cart-badge-count');
const cartItemsList = document.getElementById('cart-items-list');
const cartTotalUnits = document.getElementById('cart-total-units');
const cartGrandTotal = document.getElementById('cart-grand-total');

// INICIALIZACIÓN
document.addEventListener('DOMContentLoaded', () => {
  injectGlobalStylesAndComponents();
  initListeners();
  setupUIEvents();
  setupFirebaseAuth();
});

// INYECCIÓN DE ESTILOS Y ESTRUCTURA
function injectGlobalStylesAndComponents() {
  // Modal de zoom para imágenes
  if (!document.getElementById('image-zoom-modal')) {
    const zoomModal = document.createElement('div');
    zoomModal.id = 'image-zoom-modal';
    zoomModal.className = 'custom-zoom-modal hidden';
    zoomModal.innerHTML = `
      <div class="zoom-overlay" onclick="closeZoomModal()"></div>
      <div class="zoom-content-wrapper">
        <button class="zoom-close-btn" onclick="closeZoomModal()">✕</button>
        <div class="zoom-img-container">
          <img id="zoom-modal-img" src="" alt="Vista previa" />
        </div>
        <div class="zoom-controls">
          <button onclick="changeZoom(-0.25)">➖</button>
          <button onclick="resetZoom()">Restablecer</button>
          <button onclick="changeZoom(0.25)">➕</button>
        </div>
      </div>
    `;
    document.body.appendChild(zoomModal);
  }

  // Hacer el logo principal ampliable
  if (siteLogo) {
    siteLogo.classList.add('clickable-img');
    siteLogo.title = "Haz clic para ampliar la imagen";
    siteLogo.onclick = () => {
      if (siteLogo.src) openZoomModal(siteLogo.src);
    };
  }

  // Buscador global arriba de la barra de secciones
  if (sectionsBar && !document.getElementById('global-search-container')) {
    const searchContainer = document.createElement('div');
    searchContainer.id = 'global-search-container';
    searchContainer.className = 'search-box-wrapper';
    searchContainer.innerHTML = `
      <div class="search-input-box">
        <span class="search-icon">🔍</span>
        <input type="text" id="global-search-input" placeholder="Buscar productos..." />
        <button id="clear-search-btn" class="hidden" onclick="clearSearch()">✕</button>
      </div>
    `;
    sectionsBar.parentNode.insertBefore(searchContainer, sectionsBar);

    document.getElementById('global-search-input').addEventListener('input', (e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      const clearBtn = document.getElementById('clear-search-btn');
      if (searchQuery.length > 0) {
        clearBtn.classList.remove('hidden');
      } else {
        clearBtn.classList.add('hidden');
      }
      renderProducts();
    });
  }

  // AJUSTAR BOTONES EN PANEL ADMIN: RE-ESTRUCTURAR TAB 3 (SECCIONES) Y CREAR TAB 6 (BOTONES MENÚ)
  const tabContainer = document.querySelector('.admin-tabs');
  if (tabContainer) {
    const tabs = tabContainer.querySelectorAll('.tab-btn');
    if (tabs.length >= 3) {
      tabs[2].textContent = '3. Secciones / Colecciones';
    }

    if (!document.getElementById('tab-btn-custom-menu')) {
      const menuTabBtn = document.createElement('button');
      menuTabBtn.id = 'tab-btn-custom-menu';
      menuTabBtn.className = 'tab-btn';
      menuTabBtn.dataset.tab = 'tab-custom-menu';
      menuTabBtn.textContent = '6. Menú Botones';
      tabContainer.appendChild(menuTabBtn);

      const menuTabContent = document.createElement('div');
      menuTabContent.id = 'tab-custom-menu';
      menuTabContent.className = 'tab-content';
      menuTabContent.innerHTML = `
        <h3>6. Crear Botones para el Menú Inferior</h3>
        <p style="font-size:0.85rem; color:#888; margin-bottom:0.8rem;">Crea botones independientes que redirigen a URLs personalizadas al abrir el menú.</p>
        <form id="form-admin-custom-menu" style="display:flex; flex-direction:column; gap:0.5rem; margin-bottom:1rem;">
          <input type="hidden" id="custom-menu-id">
          <label>Nombre del Botón:</label>
          <input type="text" id="custom-menu-label" placeholder="Ej: Ubicación / Instagram" required>
          <label>URL a donde direcciona:</label>
          <input type="url" id="custom-menu-url" placeholder="https://..." required>
          <button type="submit" class="btn-action-submit">Guardar Botón de Menú</button>
        </form>
        <div id="admin-custom-menu-list"></div>
      `;
      
      const dashboardView = document.getElementById('admin-dashboard-view');
      if (dashboardView) {
        dashboardView.appendChild(menuTabContent);
      }
    }
  }

  // Estilos CSS
  const style = document.createElement('style');
  style.id = 'custom-enhancements-css';
  style.textContent = `
    .custom-zoom-modal {
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      z-index: 99999; display: flex; align-items: center; justify-content: center;
      background: rgba(0,0,0,0.85); backdrop-filter: blur(5px); transition: opacity 0.3s;
    }
    .custom-zoom-modal.hidden { display: none !important; }
    .zoom-overlay { position: absolute; width: 100%; height: 100%; }
    .zoom-content-wrapper {
      position: relative; z-index: 2; max-width: 90vw; max-height: 85vh;
      display: flex; flex-direction: column; align-items: center;
    }
    .zoom-img-container {
      overflow: auto; max-width: 85vw; max-height: 70vh;
      display: flex; align-items: center; justify-content: center;
      border-radius: 12px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1);
    }
    .zoom-img-container img {
      max-width: 100%; max-height: 70vh; object-fit: contain; transition: transform 0.2s ease-out; cursor: zoom-in;
    }
    .zoom-close-btn {
      position: absolute; top: -40px; right: 0; background: #ef4444; color: #fff;
      border: none; width: 32px; height: 32px; border-radius: 50%; font-weight: bold; cursor: pointer;
    }
    .zoom-controls {
      display: flex; gap: 0.5rem; margin-top: 1rem; background: var(--theme-card-bg, #121824);
      padding: 0.4rem 0.8rem; border-radius: 20px; border: 1px solid rgba(255,255,255,0.1);
    }
    .zoom-controls button {
      background: rgba(255,255,255,0.1); color: #fff; border: none; padding: 0.3rem 0.8rem;
      border-radius: 12px; cursor: pointer; font-weight: 600;
    }
    .search-box-wrapper { margin: 0.8rem 0; width: 100%; }
    .search-input-box {
      display: flex; align-items: center; background: var(--theme-card-bg, #121824);
      border: 1px solid rgba(255,255,255,0.15); border-radius: 25px; padding: 0.4rem 0.8rem; gap: 0.5rem;
    }
    .search-input-box input {
      flex: 1; background: transparent; border: none; outline: none; color: var(--theme-text, #fff); font-size: 0.9rem;
    }
    #clear-search-btn { background: transparent; border: none; color: #888; cursor: pointer; font-size: 0.9rem; }
    .clickable-img { cursor: pointer; transition: opacity 0.2s, transform 0.2s; }
    .clickable-img:hover { opacity: 0.85; transform: scale(1.02); }
    
    .btn-choose-qty {
      width: 100%;
      padding: 0.65rem 1rem;
      border-radius: 20px;
      border: none;
      background: var(--theme-accent, #06b6d4);
      color: #fff;
      font-weight: 700;
      font-size: 0.95rem;
      cursor: pointer;
      transition: background 0.2s, transform 0.1s;
      box-shadow: 0 4px 10px rgba(6, 182, 212, 0.25);
    }
    .btn-choose-qty:hover { filter: brightness(1.1); }
    .btn-choose-qty:active { transform: scale(0.98); }
    .btn-choose-qty:disabled { background: #475569; cursor: not-allowed; box-shadow: none; }

    .qty-picker-styled {
      display: flex; align-items: center; justify-content: center; gap: 0.5rem; margin: 0.8rem 0;
    }
    .qty-picker-styled button {
      width: 38px; height: 38px; border-radius: 50%; border: none; background: var(--theme-accent, #06b6d4);
      color: #fff; font-size: 1.2rem; font-weight: bold; cursor: pointer; transition: transform 0.1s;
    }
    .qty-picker-styled button:active { transform: scale(0.9); }
    .qty-picker-styled input {
      width: 65px; height: 38px; text-align: center; font-size: 1.1rem; font-weight: bold;
      background: rgba(255,255,255,0.05); color: var(--theme-text, #fff); border: 1px solid var(--theme-accent, #06b6d4);
      border-radius: 8px; outline: none;
    }
    
    .cart-item-styled {
      display: flex; justify-content: space-between; align-items: center; padding: 0.8rem;
      background: rgba(255,255,255,0.03); border-radius: 8px; margin-bottom: 0.5rem; border: 1px solid rgba(255,255,255,0.05);
      gap: 0.8rem;
    }
    .cart-item-img {
      width: 50px; height: 50px; object-fit: cover; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1);
    }
    .cart-qty-btn {
      width: 28px; height: 28px; border-radius: 50%; border: none; background: var(--theme-accent, #06b6d4);
      color: #fff; font-size: 0.9rem; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center;
    }
    .cart-qty-btn:active { transform: scale(0.9); }
    .min-amount-warning {
      background: rgba(239, 68, 68, 0.15); border: 1px solid #ef4444; color: #f87171;
      padding: 0.75rem; border-radius: 8px; font-size: 0.88rem; text-align: center; margin-top: 1rem;
      font-weight: 600;
    }
    .btn-whatsapp-styled {
      width: 100%; padding: 0.8rem; border-radius: 25px; border: none; background: #25d366;
      color: #fff; font-weight: bold; font-size: 1rem; cursor: pointer; display: flex; align-items: center;
      justify-content: center; gap: 0.5rem; box-shadow: 0 4px 12px rgba(37, 211, 102, 0.3); transition: background 0.2s, opacity 0.2s;
    }
    .btn-whatsapp-styled:hover { background: #1ebc57; }
    .btn-whatsapp-styled:disabled { background: #475569; opacity: 0.6; cursor: not-allowed; box-shadow: none; }
    .search-badge-sec {
      display: inline-block; font-size: 0.7rem; padding: 0.15rem 0.4rem; border-radius: 4px;
      background: rgba(6, 182, 212, 0.15); color: var(--theme-accent, #06b6d4); margin-bottom: 0.3rem; font-weight: 600;
    }
  `;
  document.head.appendChild(style);
}

// FUNCIONES DE ZOOM Y BÚSQUEDA
window.openZoomModal = function(url) {
  if (!url) return;
  const modal = document.getElementById('image-zoom-modal');
  const img = document.getElementById('zoom-modal-img');
  img.src = url;
  zoomScale = 1;
  img.style.transform = `scale(${zoomScale})`;
  modal.classList.remove('hidden');
};

window.closeZoomModal = function() {
  const modal = document.getElementById('image-zoom-modal');
  modal.classList.add('hidden');
};

window.changeZoom = function(delta) {
  zoomScale = Math.min(Math.max(0.5, zoomScale + delta), 3);
  document.getElementById('zoom-modal-img').style.transform = `scale(${zoomScale})`;
};

window.resetZoom = function() {
  zoomScale = 1;
  document.getElementById('zoom-modal-img').style.transform = `scale(${zoomScale})`;
};

window.clearSearch = function() {
  searchQuery = "";
  const input = document.getElementById('global-search-input');
  if (input) input.value = "";
  document.getElementById('clear-search-btn').classList.add('hidden');
  renderProducts();
};

// 1. AUTENTICACIÓN
function setupFirebaseAuth() {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      document.getElementById('admin-login-view').classList.add('hidden');
      document.getElementById('admin-dashboard-view').classList.remove('hidden');
      btnAdminLogout.classList.remove('hidden');
      populateAdminFormsWithCurrentData();
      renderProducts();
    } else {
      document.getElementById('admin-login-view').classList.remove('hidden');
      document.getElementById('admin-dashboard-view').classList.add('hidden');
      btnAdminLogout.classList.add('hidden');
      expandedInlineEditId = null;
      renderProducts();
    }
  });
}

function populateAdminFormsWithCurrentData() {
  document.getElementById('adm-brand-title').value = appSettings.title || "";
  document.getElementById('adm-brand-logo-url').value = appSettings.logoUrl || "";
  document.getElementById('adm-brand-announcement').value = appSettings.announcement || "";
  document.getElementById('adm-brand-whatsapp').value = appSettings.whatsapp || "";
  document.getElementById('adm-brand-faq-url').value = appSettings.faqUrl || "";

  document.getElementById('theme-color-bg').value = themeSettings.bgColor || "#0a0e17";
  document.getElementById('theme-bg-img-url').value = themeSettings.bgImgUrl || "";
  document.getElementById('theme-color-header').value = themeSettings.headerBg || "#121824";
  document.getElementById('theme-color-bottom-nav').value = themeSettings.bottomNavBg || "#121824";
  document.getElementById('theme-color-text').value = themeSettings.textColor || "#f1f5f9";
  document.getElementById('theme-color-card-bg').value = themeSettings.cardBg || "#121824";
  document.getElementById('theme-color-accent').value = themeSettings.accentColor || "#06b6d4";
}

// 2. ESCUCHADORES FIRESTORE
function initListeners() {
  onSnapshot(doc(db, "repuestos_config_general", "brand"), (docSnap) => {
    if (docSnap.exists()) {
      appSettings = { ...appSettings, ...docSnap.data() };
      renderBrandAndTheme();
      if (auth.currentUser) populateAdminFormsWithCurrentData();
    }
  });

  onSnapshot(doc(db, "repuestos_config_general", "theme"), (docSnap) => {
    if (docSnap.exists()) {
      themeSettings = { ...themeSettings, ...docSnap.data() };
      applyThemeStyles();
      if (auth.currentUser) populateAdminFormsWithCurrentData();
    }
    if (preloader) preloader.classList.add('hidden');
  });

  // Secciones
  onSnapshot(collection(db, "repuestos_secciones"), (snapshot) => {
    sectionsData = [];
    snapshot.forEach(d => sectionsData.push({ id: d.id, ...d.data() }));
    sectionsData.sort((a, b) => Number(a.order) - Number(b.order));
    renderSections();
    renderAdminSectionsList();
    populateSectionDropdowns();
  });

  // Productos
  onSnapshot(collection(db, "repuestos_productos"), (snapshot) => {
    productsData = [];
    snapshot.forEach(d => productsData.push({ id: d.id, ...d.data() }));
    renderProducts();
    renderAdminProductsList();
  });

  // Promos
  onSnapshot(collection(db, "repuestos_promos"), (snapshot) => {
    promosData = [];
    snapshot.forEach(d => promosData.push({ id: d.id, ...d.data() }));
    renderPromos();
    renderAdminPromosList();
  });

  // Botones de Menú
  onSnapshot(collection(db, "repuestos_menu_botones"), (snapshot) => {
    customMenuButtons = [];
    snapshot.forEach(d => customMenuButtons.push({ id: d.id, ...d.data() }));
    renderAdminCustomMenuList();
  });
}

// 3. RENDERIZADO VISUAL
function renderBrandAndTheme() {
  siteTitle.textContent = appSettings.title;
  siteLogo.src = appSettings.logoUrl;
  
  if (siteAnnouncement) {
    siteAnnouncement.textContent = appSettings.announcement || "";
    // MODIFICACIÓN 2: Letra del mensaje/frase del logo en color negro
    siteAnnouncement.style.setProperty('color', '#000000', 'important');
  }

  document.getElementById('btn-bottom-faq').href = appSettings.faqUrl || "#";
  
  const creatorLink = document.getElementById('creator-wa-link');
  if (creatorLink) {
    creatorLink.href = `https://wa.me/${appSettings.whatsapp || '5493810000000'}`;
  }
}

function applyThemeStyles() {
  const root = document.documentElement;
  if (themeSettings.bgColor) root.style.setProperty('--theme-bg', themeSettings.bgColor);
  if (themeSettings.headerBg) root.style.setProperty('--theme-header-bg', themeSettings.headerBg);
  if (themeSettings.bottomNavBg) root.style.setProperty('--theme-bottom-nav-bg', themeSettings.bottomNavBg);
  if (themeSettings.textColor) root.style.setProperty('--theme-text', themeSettings.textColor);
  if (themeSettings.cardBg) root.style.setProperty('--theme-card-bg', themeSettings.cardBg);
  if (themeSettings.accentColor) root.style.setProperty('--theme-accent', themeSettings.accentColor);

  if (themeSettings.bgImgUrl) {
    document.body.style.backgroundImage = `url('${themeSettings.bgImgUrl}')`;
  } else {
    document.body.style.backgroundImage = 'none';
  }
}

function renderSections() {
  sectionsBar.innerHTML = '';
  if (sectionsData.length === 0) return;

  if (!activeSectionId && sectionsData.length > 0) {
    activeSectionId = sectionsData[0].id;
  }

  sectionsData.forEach(sec => {
    const chip = document.createElement('button');
    chip.className = `section-chip ${sec.id === activeSectionId && !searchQuery ? 'active' : ''}`;
    chip.textContent = sec.name;
    chip.onclick = () => {
      activeSectionId = sec.id;
      if (searchQuery) clearSearch();
      renderSections();
      renderProducts();
    };
    sectionsBar.appendChild(chip);
  });
}

function renderProducts() {
  productsGrid.innerHTML = '';
  const isLoggedIn = auth.currentUser !== null;

  let filtered = [];
  
  if (searchQuery && searchQuery.length > 0) {
    filtered = productsData.filter(p => {
      const titleMatch = (p.title || "").toLowerCase().includes(searchQuery);
      const codeMatch = (p.code || "").toLowerCase().includes(searchQuery);
      const descMatch = (p.desc || "").toLowerCase().includes(searchQuery);
      return titleMatch || codeMatch || descMatch;
    });
  } else {
    filtered = productsData.filter(p => p.sectionId === activeSectionId);
  }

  if (filtered.length === 0 && searchQuery) {
    productsGrid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:2rem; color:var(--theme-text);">No se encontraron productos con "${searchQuery}".</div>`;
    return;
  }

  filtered.forEach(p => {
    const stockNum = Number(p.stockCount) || 0;
    const isOutOfStock = p.stockStatus === 'out_of_stock' || stockNum <= 0;
    const isInlineEditing = expandedInlineEditId === p.id;
    const card = document.createElement('div');
    card.className = 'product-card';

    const secObj = sectionsData.find(s => s.id === p.sectionId);
    const sectionName = secObj ? secObj.name : "Sección Desconocida";

    let sectionOptions = sectionsData.map(s => 
      `<option value="${s.id}" ${s.id === p.sectionId ? 'selected' : ''}>${s.name}</option>`
    ).join('');

    // Toma el valor de precio único (compatibilidad con wholesalePrice / retailPrice)
    const displayPrice = p.wholesalePrice ? Number(p.wholesalePrice) : (p.retailPrice ? Number(p.retailPrice) : 0);

    card.innerHTML = `
      <div class="product-img-box">
        <img src="${p.imageUrl}" alt="${p.title}" loading="lazy" class="clickable-img" onclick="openZoomModal('${p.imageUrl}')" title="Haz clic para ampliar la imagen" />
        <span class="stock-tag ${isOutOfStock ? 'out_of_stock' : 'available'}">
          ${isOutOfStock ? 'Agotado' : 'Disponible'}
        </span>
      </div>
      <div class="product-details">
        <div>
          ${searchQuery ? `<span class="search-badge-sec">📍 ${sectionName}</span>` : ''}
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.2rem;">
            <span class="product-code">Cód: ${p.code}</span>
            <span style="font-size: 0.75rem; font-weight: 800; color: ${isOutOfStock ? 'var(--danger-color)' : 'var(--theme-accent)'};">
              Stock: ${stockNum} u.
            </span>
          </div>
          <h3 class="product-title">${p.title}</h3>
        </div>
        <div>
          <div class="price-display">
            <span class="wholesale-price" style="font-size: 1.15rem; font-weight: 800; color: var(--gold-accent);">
              $${displayPrice.toLocaleString()}
            </span>
            <span style="display:block; font-size:0.75rem; color:#888; font-weight:600; text-transform:uppercase;">
              Precio Mayorista
            </span>
          </div>

          <div class="card-action-row" style="margin-top:0.5rem;">
            <button class="btn-choose-qty" ${isOutOfStock ? 'disabled' : ''} onclick="openQuantityModal('${p.id}')">
              ${isOutOfStock ? 'Agotado' : 'Elegir Cantidad'}
            </button>
            ${isLoggedIn ? `<button class="btn-inline-edit" onclick="toggleInlineEdit('${p.id}')" title="Editar Producto">✏️</button>` : ''}
          </div>
        </div>
      </div>

      ${isLoggedIn && isInlineEditing ? `
        <div class="inline-edit-drawer">
          <label>Sección:</label>
          <select id="inline-sec-${p.id}">${sectionOptions}</select>

          <label>Título:</label>
          <input type="text" id="inline-title-${p.id}" value="${p.title}">

          <label>Cód:</label>
          <input type="text" id="inline-code-${p.id}" value="${p.code}">

          <label>URL Imagen:</label>
          <input type="url" id="inline-img-${p.id}" value="${p.imageUrl}">

          <label>Precio Mayorista ($):</label>
          <input type="number" step="0.01" id="inline-price-${p.id}" value="${displayPrice}">

          <label>Stock Cantidad:</label>
          <input type="number" id="inline-stock-${p.id}" value="${p.stockCount}">

          <label>Estado Stock:</label>
          <select id="inline-status-${p.id}">
            <option value="available" ${p.stockStatus === 'available' ? 'selected' : ''}>Disponible</option>
            <option value="out_of_stock" ${p.stockStatus === 'out_of_stock' ? 'selected' : ''}>Agotado</option>
          </select>

          <button class="btn-action-submit" onclick="saveInlineEdit('${p.id}')">Guardar Cambios</button>
          <button class="btn-danger-small" onclick="deleteProduct('${p.id}')">🗑️ Eliminar Producto</button>
        </div>
      ` : ''}
    `;
    productsGrid.appendChild(card);
  });
}

window.toggleInlineEdit = function(id) {
  expandedInlineEditId = expandedInlineEditId === id ? null : id;
  renderProducts();
};

window.saveInlineEdit = async function(id) {
  try {
    const valPrice = parseFloat(document.getElementById(`inline-price-${id}`).value) || 0;
    const payload = {
      sectionId: document.getElementById(`inline-sec-${id}`).value,
      title: document.getElementById(`inline-title-${id}`).value,
      code: document.getElementById(`inline-code-${id}`).value,
      imageUrl: document.getElementById(`inline-img-${id}`).value,
      retailPrice: valPrice,
      wholesalePrice: valPrice,
      wholesaleMin: 1,
      stockCount: parseInt(document.getElementById(`inline-stock-${id}`).value) || 0,
      stockStatus: document.getElementById(`inline-status-${id}`).value
    };

    await updateDoc(doc(db, "repuestos_productos", id), payload);
    expandedInlineEditId = null;
    alert("Producto actualizado perfectamente.");
  } catch (e) {
    alert("Error al actualizar: " + e.message);
  }
};

function renderPromos() {
  promosContainer.innerHTML = '';
  if (promosData.length === 0) {
    promosSection.classList.add('hidden');
    return;
  }

  promosSection.classList.remove('hidden');
  promosData.forEach(promo => {
    const images = promo.imageUrls ? promo.imageUrls.split(',').map(s => s.trim()) : [];
    const mainImg = images[0] || 'https://via.placeholder.com/300';

    const card = document.createElement('div');
    card.className = 'promo-card';
    card.innerHTML = `
      <img src="${mainImg}" alt="${promo.title}" class="clickable-img" onclick="openZoomModal('${mainImg}')" title="Haz clic para ampliar la imagen" style="width:100%; height:140px; object-fit:cover; border-radius:8px;">
      <h3 style="font-size:0.95rem; margin-top:0.3rem;">${promo.title}</h3>
      <p style="font-size:0.8rem; color:var(--theme-text); flex:1;">${promo.desc}</p>
      <div style="font-size:0.75rem; color:var(--gold-accent);">Validez: ${promo.expiry}</div>
      <div style="font-size:1.1rem; font-weight:800; margin:0.3rem 0;">$${Number(promo.price).toLocaleString()}</div>
      <button class="btn-choose-qty" onclick="addPromoToCart('${promo.id}')">Agregar Promo al Carrito</button>
    `;
    promosContainer.appendChild(card);
  });
}

// 4. CANTIDADES Y CARRITO (UN SOLO PRECIO MAYORISTA)
window.openQuantityModal = function(id) {
  selectedProductForModal = productsData.find(p => p.id === id);
  if (!selectedProductForModal) return;

  const maxStock = Number(selectedProductForModal.stockCount) || 0;
  const singlePrice = selectedProductForModal.wholesalePrice ? Number(selectedProductForModal.wholesalePrice) : Number(selectedProductForModal.retailPrice || 0);

  document.getElementById('qty-modal-title').textContent = selectedProductForModal.title;
  document.getElementById('qty-modal-desc').textContent = selectedProductForModal.desc || "";
  
  const retailPriceElem = document.getElementById('qty-modal-retail-price');
  if (retailPriceElem) {
    retailPriceElem.textContent = `$${singlePrice.toLocaleString()}`;
  }
  
  const wholesaleInfo = document.getElementById('qty-modal-wholesale-info');
  if (wholesaleInfo) {
    wholesaleInfo.textContent = `Precio Mayorista: $${singlePrice.toLocaleString()}`;
    wholesaleInfo.style.display = "block";
  }

  document.getElementById('qty-modal-max-stock-notice').textContent = `Stock disponible: ${maxStock} unidades.`;

  const input = document.getElementById('qty-modal-input');
  if (input && !input.parentElement.classList.contains('qty-picker-styled')) {
    const parent = input.parentElement;
    const decBtn = document.getElementById('btn-qty-dec');
    const incBtn = document.getElementById('btn-qty-inc');
    
    const styledWrapper = document.createElement('div');
    styledWrapper.className = 'qty-picker-styled';
    if (decBtn) styledWrapper.appendChild(decBtn);
    styledWrapper.appendChild(input);
    if (incBtn) styledWrapper.appendChild(incBtn);
    
    parent.appendChild(styledWrapper);
  }

  input.value = 1;
  input.max = maxStock;

  updateQuantityModalCalculation();
  modalQuantity.classList.remove('hidden');
};

function updateQuantityModalCalculation() {
  if (!selectedProductForModal) return;

  const input = document.getElementById('qty-modal-input');
  const maxStock = Number(selectedProductForModal.stockCount) || 0;
  let qty = parseInt(input.value) || 1;

  if (qty > maxStock) {
    alert(`⚠️ Cantidad no disponible. El stock máximo para este producto es de ${maxStock} unidades.`);
    qty = maxStock;
    input.value = maxStock;
  }

  const singlePrice = selectedProductForModal.wholesalePrice ? Number(selectedProductForModal.wholesalePrice) : Number(selectedProductForModal.retailPrice || 0);
  const total = qty * singlePrice;

  const badge = document.getElementById('qty-modal-status-badge');
  if (badge) {
    badge.textContent = `Precio Mayorista ($${singlePrice.toLocaleString()} c/u)`;
    badge.style.color = "var(--gold-accent)";
  }

  document.getElementById('qty-modal-total-price').textContent = `$${total.toLocaleString()}`;
}

function confirmAddToCart() {
  if (!selectedProductForModal) return;

  const maxStock = Number(selectedProductForModal.stockCount) || 0;
  let qty = parseInt(document.getElementById('qty-modal-input').value) || 1;
  
  if (qty > maxStock) {
    alert(`⚠️ No puedes agregar más de ${maxStock} unidades.`);
    qty = maxStock;
  }

  const singlePrice = selectedProductForModal.wholesalePrice ? Number(selectedProductForModal.wholesalePrice) : Number(selectedProductForModal.retailPrice || 0);

  const existingIndex = cart.findIndex(i => i.id === selectedProductForModal.id && !i.isPromo);

  if (existingIndex > -1) {
    const newQty = cart[existingIndex].qty + qty;
    if (newQty > maxStock) {
      alert(`⚠️ Ya tienes este producto en el carrito. Se ajustó al stock máximo de ${maxStock} unidades.`);
    }
    cart[existingIndex].qty = Math.min(newQty, maxStock);
  } else {
    cart.push({
      id: selectedProductForModal.id,
      code: selectedProductForModal.code,
      title: selectedProductForModal.title,
      imageUrl: selectedProductForModal.imageUrl || "https://via.placeholder.com/100",
      price: singlePrice,
      maxStock: maxStock,
      qty: qty,
      isPromo: false
    });
  }

  modalQuantity.classList.add('hidden');
  updateCartBadge();
}

window.addPromoToCart = function(promoId) {
  const promo = promosData.find(p => p.id === promoId);
  if (!promo) return;

  const images = promo.imageUrls ? promo.imageUrls.split(',').map(s => s.trim()) : [];

  cart.push({
    id: promo.id,
    code: "PROMO",
    title: promo.title,
    imageUrl: images[0] || "https://via.placeholder.com/100",
    price: Number(promo.price),
    qty: 1,
    isPromo: true
  });

  updateCartBadge();
  alert("¡Promo agregada al carrito!");
};

function updateCartBadge() {
  const totalUnits = cart.reduce((acc, item) => acc + item.qty, 0);
  cartBadgeCount.textContent = totalUnits;
}

// MODIFICACIÓN 1: BARRA PARA AGREGAR O MERMAR DIRECTAMENTE DESDE EL CARRITO EN TIEMPO REAL
window.changeCartItemQty = function(index, delta) {
  const item = cart[index];
  if (!item) return;

  const newQty = item.qty + delta;

  if (newQty <= 0) {
    cart.splice(index, 1);
  } else {
    if (!item.isPromo && item.maxStock && newQty > item.maxStock) {
      alert(`⚠️ El stock máximo disponible para este producto es de ${item.maxStock} unidades.`);
      return;
    }
    item.qty = newQty;
  }

  updateCartBadge();
  renderCartModal();
};

// RENDERIZAR CARRITO CON FOTOGRAFÍAS, BARRA DE CANTIDAD Y COMPROBACIÓN DE $200.000
function renderCartModal() {
  cartItemsList.innerHTML = '';
  let units = 0;
  let total = 0;

  cart.forEach((item, index) => {
    const subtotal = item.qty * item.price;
    units += item.qty;
    total += subtotal;

    const div = document.createElement('div');
    div.className = 'cart-item-styled';
    div.innerHTML = `
      <div style="display:flex; align-items:center; gap:0.6rem; flex:1;">
        <img src="${item.imageUrl}" alt="${item.title}" class="cart-item-img clickable-img" onclick="openZoomModal('${item.imageUrl}')" />
        <div>
          <strong style="color:var(--theme-text); display:block; font-size:0.9rem;">${item.title}</strong>
          <div style="font-size:0.78rem; color:rgba(255,255,255,0.6); margin-top:0.1rem;">Cód: ${item.code} | $${item.price.toLocaleString()} c/u</div>
        </div>
      </div>
      <div style="display:flex; align-items:center; gap:0.5rem;">
        <div style="display:flex; align-items:center; gap:0.3rem; background:rgba(255,255,255,0.05); padding:0.2rem 0.4rem; border-radius:15px; border:1px solid rgba(255,255,255,0.1);">
          <button class="cart-qty-btn" onclick="changeCartItemQty(${index}, -1)" title="Restar cantidad">➖</button>
          <span style="font-weight:bold; font-size:0.9rem; min-width:20px; text-align:center; color:var(--theme-text);">${item.qty}</span>
          <button class="cart-qty-btn" onclick="changeCartItemQty(${index}, 1)" title="Sumar cantidad">➕</button>
        </div>
        <span style="font-weight:700; color:var(--theme-accent); font-size:0.95rem; min-width:70px; text-align:right;">$${subtotal.toLocaleString()}</span>
        <button onclick="removeFromCart(${index})" style="background:rgba(239, 68, 68, 0.2); border:none; color:#ef4444; width:26px; height:26px; border-radius:50%; cursor:pointer; font-weight:bold;" title="Eliminar">✕</button>
      </div>
    `;
    cartItemsList.appendChild(div);
  });

  cartTotalUnits.textContent = units;
  cartGrandTotal.textContent = `$${total.toLocaleString()}`;

  // Eliminar cartel de aviso anterior si existía
  const existingWarning = document.getElementById('min-amount-warning-box');
  if (existingWarning) existingWarning.remove();

  const btnCheckout = document.getElementById('btn-checkout-whatsapp');
  
  if (total < MINIMUM_ORDER_AMOUNT) {
    const missingAmount = MINIMUM_ORDER_AMOUNT - total;
    
    const warningBox = document.createElement('div');
    warningBox.id = 'min-amount-warning-box';
    warningBox.className = 'min-amount-warning';
    warningBox.innerHTML = `
      ⚠️ La compra mínima es de $${MINIMUM_ORDER_AMOUNT.toLocaleString()} pesos.<br>
      Te faltan <strong>$${missingAmount.toLocaleString()}</strong> para poder realizar la compra.
    `;
    
    cartItemsList.parentNode.insertBefore(warningBox, cartItemsList.nextSibling);

    if (btnCheckout) {
      btnCheckout.className = 'btn-whatsapp-styled';
      btnCheckout.disabled = true;
      btnCheckout.innerHTML = `💬 Mínimo de Compra No Alcanzado`;
    }
  } else {
    if (btnCheckout) {
      btnCheckout.className = 'btn-whatsapp-styled';
      btnCheckout.disabled = false;
      btnCheckout.innerHTML = `💬 Realizar Pedido por WhatsApp`;
    }
  }
}

window.removeFromCart = function(index) {
  cart.splice(index, 1);
  updateCartBadge();
  renderCartModal();
};

async function checkoutWhatsapp() {
  if (cart.length === 0) return alert("El carrito está vacío.");

  let currentTotal = cart.reduce((acc, item) => acc + (item.qty * item.price), 0);
  if (currentTotal < MINIMUM_ORDER_AMOUNT) {
    const missing = MINIMUM_ORDER_AMOUNT - currentTotal;
    return alert(`⚠️ La compra mínima es de $${MINIMUM_ORDER_AMOUNT.toLocaleString()} pesos. Te faltan $${missing.toLocaleString()} para completar el pedido.`);
  }

  try {
    await runTransaction(db, async (transaction) => {
      for (const item of cart) {
        if (!item.isPromo) {
          const pRef = doc(db, "repuestos_productos", item.id);
          const pDoc = await transaction.get(pRef);

          if (pDoc.exists()) {
            const currentStock = Number(pDoc.data().stockCount) || 0;
            if (currentStock < item.qty) {
              throw new Error(`El producto ${item.title} solo tiene ${currentStock} u. en stock.`);
            }

            const newStock = Math.max(0, currentStock - item.qty);
            transaction.update(pRef, {
              stockCount: newStock,
              stockStatus: newStock <= 0 ? 'out_of_stock' : 'available'
            });
          }
        }
      }

      const transactionRef = doc(collection(db, "repuestos_transacciones"));
      transaction.set(transactionRef, {
        items: cart,
        date: new Date().toISOString()
      });
    });

    let msg = `Hola *${appSettings.title}*, quiero solicitar este pedido por mayor:\n\n`;
    let grandTotal = 0;

    cart.forEach(item => {
      const subtotal = item.qty * item.price;
      grandTotal += subtotal;

      msg += `• *Cód:* ${item.code} | ${item.title}\n  Cant: ${item.qty} u. | Precio Mayorista: $${item.price.toLocaleString()} | Subtotal: $${subtotal.toLocaleString()}\n\n`;
    });

    msg += `*Total Unidades:* ${cart.reduce((a, b) => a + b.qty, 0)}\n`;
    msg += `*MONTO TOTAL:* $${grandTotal.toLocaleString()}\n\n`;
    msg += `Aguardo confirmación para coordinar entrega.`;

    const url = `https://wa.me/${appSettings.whatsapp}?text=${encodeURIComponent(msg)}`;

    cart = [];
    updateCartBadge();
    modalCart.classList.add('hidden');
    window.open(url, '_blank');

  } catch (error) {
    alert("Error al procesar pedido: " + error.message);
  }
}

// 5. EVENTOS Y NAVEGACIÓN
function setupUIEvents() {
  btnAdminLock.addEventListener('click', () => {
    modalAdminPanel.classList.remove('hidden');
    if (auth.currentUser) populateAdminFormsWithCurrentData();
  });
  document.getElementById('btn-close-admin-panel').addEventListener('click', () => modalAdminPanel.classList.add('hidden'));

  const logoutAction = async () => {
    await signOut(auth);
    modalAdminPanel.classList.add('hidden');
    alert("Sesión de administrador cerrada.");
  };

  btnAdminLogout.addEventListener('click', logoutAction);
  document.getElementById('btn-logout-panel').addEventListener('click', logoutAction);

  // Cambio de Pestañas del Panel Admin
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('tab-btn')) {
      const tabBtns = document.querySelectorAll('.tab-btn');
      tabBtns.forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

      e.target.classList.add('active');
      const targetContent = document.getElementById(e.target.dataset.tab);
      if (targetContent) targetContent.classList.add('active');

      if (auth.currentUser) populateAdminFormsWithCurrentData();
    }
  });

  // Login
  document.getElementById('form-admin-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-user').value;
    const pass = document.getElementById('login-pass').value;

    try {
      await signInWithEmailAndPassword(auth, email, pass);
      populateAdminFormsWithCurrentData();
      alert("¡Sesión iniciada correctamente!");
    } catch (error) {
      alert("Error al ingresar: " + error.message);
    }
  });

  // Pestaña Marca
  document.getElementById('form-admin-brand').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      title: document.getElementById('adm-brand-title').value,
      logoUrl: document.getElementById('adm-brand-logo-url').value,
      announcement: document.getElementById('adm-brand-announcement').value,
      whatsapp: document.getElementById('adm-brand-whatsapp').value,
      faqUrl: document.getElementById('adm-brand-faq-url').value
    };

    await setDoc(doc(db, "repuestos_config_general", "brand"), payload, { merge: true });
    alert("Marca actualizada en la base de datos.");
  });

  // Pestaña Promos
  document.getElementById('form-admin-promo').addEventListener('submit', async (e) => {
    e.preventDefault();
    const editIdInput = document.getElementById('promo-id-edit');
    const editId = editIdInput ? editIdInput.value : "";

    const payload = {
      title: document.getElementById('promo-title').value,
      desc: document.getElementById('promo-desc').value,
      price: parseFloat(document.getElementById('promo-price').value),
      expiry: document.getElementById('promo-expiry').value,
      imageUrls: document.getElementById('promo-images-urls').value
    };

    if (editId) {
      await updateDoc(doc(db, "repuestos_promos", editId), payload);
      alert("Oferta/Aviso actualizado con éxito.");
    } else {
      await addDoc(collection(db, "repuestos_promos"), payload);
      alert("Oferta/Aviso agregado.");
    }

    document.getElementById('form-admin-promo').reset();
    if (editIdInput) editIdInput.value = "";
  });

  // Pestaña 3: SOLO Secciones/Colecciones de Productos
  document.getElementById('form-admin-section').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('section-id-edit').value;

    const payload = {
      name: document.getElementById('section-name').value,
      order: parseInt(document.getElementById('section-order').value) || 0
    };

    if (id) {
      await updateDoc(doc(db, "repuestos_secciones", id), payload);
    } else {
      await addDoc(collection(db, "repuestos_secciones"), payload);
    }

    document.getElementById('form-admin-section').reset();
    document.getElementById('section-id-edit').value = "";
    alert("Sección guardada en la base de datos.");
  });

  // FORMULARIO EXCLUSIVO PARA EL 6TO BOTÓN (Menú Botones)
  document.addEventListener('submit', async (e) => {
    if (e.target.id === 'form-admin-custom-menu') {
      e.preventDefault();
      const id = document.getElementById('custom-menu-id').value;
      const payload = {
        label: document.getElementById('custom-menu-label').value,
        url: document.getElementById('custom-menu-url').value
      };

      if (id) {
        await updateDoc(doc(db, "repuestos_menu_botones", id), payload);
      } else {
        await addDoc(collection(db, "repuestos_menu_botones"), payload);
      }

      document.getElementById('form-admin-custom-menu').reset();
      document.getElementById('custom-menu-id').value = "";
      alert("Botón del menú guardado correctamente.");
    }
  });

  // Modos Single / Batch
  document.getElementById('btn-mode-single').addEventListener('click', () => {
    document.getElementById('btn-mode-single').classList.add('active');
    document.getElementById('btn-mode-batch').classList.remove('active');
    document.getElementById('form-single-product-container').classList.remove('hidden');
    document.getElementById('form-batch-product-container').classList.add('hidden');
  });

  document.getElementById('btn-mode-batch').addEventListener('click', () => {
    document.getElementById('btn-mode-batch').classList.add('active');
    document.getElementById('btn-mode-single').classList.remove('active');
    document.getElementById('form-batch-product-container').classList.remove('hidden');
    document.getElementById('form-single-product-container').classList.add('hidden');
  });

  // Alta de Producto Individual (Solo Precio Mayorista)
  document.getElementById('form-admin-single-product').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('single-prod-id').value;
    const priceVal = parseFloat(document.getElementById('single-prod-wholesale-price').value) || 0;

    const payload = {
      sectionId: document.getElementById('single-prod-section').value,
      code: document.getElementById('single-prod-code').value,
      title: document.getElementById('single-prod-title').value,
      desc: document.getElementById('single-prod-desc').value,
      imageUrl: document.getElementById('single-prod-img').value,
      retailPrice: priceVal,
      wholesalePrice: priceVal,
      wholesaleMin: 1,
      stockCount: parseInt(document.getElementById('single-prod-stock-count').value) || 0,
      stockStatus: document.getElementById('single-prod-stock-status').value
    };

    if (id) {
      await updateDoc(doc(db, "repuestos_productos", id), payload);
    } else {
      await addDoc(collection(db, "repuestos_productos"), payload);
    }

    document.getElementById('form-admin-single-product').reset();
    document.getElementById('single-prod-id').value = "";
    alert("Producto guardado exitosamente.");
  });

  // Generador Tanda
  document.getElementById('btn-generate-batch-rows').addEventListener('click', () => {
    const prefix = document.getElementById('batch-code-prefix').value || "NS";
    let startNum = parseInt(document.getElementById('batch-code-start').value) || 1;
    const count = parseInt(document.getElementById('batch-count-generate').value) || 3;

    const tbody = document.getElementById('batch-table-body');
    tbody.innerHTML = '';

    for (let i = 0; i < count; i++) {
      const codeNum = String(startNum + i).padStart(2, '0');
      const code = `${prefix}${codeNum}`;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><input type="text" value="${code}" class="batch-code" readonly></td>
        <td><input type="text" placeholder="Título" class="batch-title"></td>
        <td><input type="text" placeholder="Desc" class="batch-desc"></td>
        <td><input type="number" step="0.01" placeholder="Precio ($)" class="batch-wholesale"></td>
        <td><input type="url" placeholder="https://..." class="batch-img"></td>
        <td><input type="number" value="10" class="batch-stock"></td>
      `;
      tbody.appendChild(tr);
    }

    document.getElementById('btn-save-batch-all').classList.remove('hidden');
  });

  document.getElementById('btn-save-batch-all').addEventListener('click', async () => {
    const sectionId = document.getElementById('batch-select-section').value;
    const rows = document.querySelectorAll('#batch-table-body tr');

    for (const tr of rows) {
      const title = tr.querySelector('.batch-title').value;
      if (!title) continue;

      const priceVal = parseFloat(tr.querySelector('.batch-wholesale').value) || 0;

      const payload = {
        sectionId: sectionId,
        code: tr.querySelector('.batch-code').value,
        title: title,
        desc: tr.querySelector('.batch-desc').value,
        retailPrice: priceVal,
        wholesalePrice: priceVal,
        wholesaleMin: 1,
        imageUrl: tr.querySelector('.batch-img').value || "https://via.placeholder.com/200",
        stockCount: parseInt(tr.querySelector('.batch-stock').value) || 10,
        stockStatus: 'available'
      };

      await addDoc(collection(db, "repuestos_productos"), payload);
    }

    document.getElementById('batch-table-body').innerHTML = '';
    document.getElementById('btn-save-batch-all').classList.add('hidden');
    alert("¡Tanda de productos creada con éxito!");
  });

  // Pestaña Tema
  document.getElementById('form-admin-theme').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      bgColor: document.getElementById('theme-color-bg').value,
      bgImgUrl: document.getElementById('theme-bg-img-url').value,
      headerBg: document.getElementById('theme-color-header').value,
      bottomNavBg: document.getElementById('theme-color-bottom-nav').value,
      textColor: document.getElementById('theme-color-text').value,
      cardBg: document.getElementById('theme-color-card-bg').value,
      accentColor: document.getElementById('theme-color-accent').value
    };

    await setDoc(doc(db, "repuestos_config_general", "theme"), payload, { merge: true });
    alert("Estilos guardados en la base de datos.");
  });

  // Modales
  document.getElementById('btn-close-qty-modal').addEventListener('click', () => modalQuantity.classList.add('hidden'));
  document.getElementById('btn-close-cart-modal').addEventListener('click', () => modalCart.classList.add('hidden'));

  document.getElementById('btn-bottom-cart').addEventListener('click', () => {
    renderCartModal();
    modalCart.classList.remove('hidden');
  });

  // MENÚ FLOTANTE INFERIOR DERECHO
  document.getElementById('btn-bottom-menu').addEventListener('click', () => {
    const drawer = document.getElementById('menu-drawer');
    const list = document.getElementById('drawer-menu-list');
    list.innerHTML = '';

    if (customMenuButtons.length === 0) {
      list.innerHTML = `<li style="padding:1rem; text-align:center; color:#888;">No hay botones creados. Créalos desde la pestaña '6. Menú Botones' del panel admin.</li>`;
    } else {
      customMenuButtons.forEach(btn => {
        const li = document.createElement('li');
        li.innerHTML = `<a href="${btn.url}" target="_blank" rel="noopener noreferrer" style="display:flex; justify-content:space-between; align-items:center;"><span>${btn.label}</span> ↗</a>`;
        list.appendChild(li);
      });
    }

    drawer.classList.remove('hidden');
  });

  document.getElementById('btn-close-drawer').addEventListener('click', () => {
    document.getElementById('menu-drawer').classList.add('hidden');
  });

  document.getElementById('btn-qty-dec').addEventListener('click', () => {
    let v = parseInt(document.getElementById('qty-modal-input').value) || 1;
    if (v > 1) { document.getElementById('qty-modal-input').value = v - 1; updateQuantityModalCalculation(); }
  });

  document.getElementById('btn-qty-inc').addEventListener('click', () => {
    let v = parseInt(document.getElementById('qty-modal-input').value) || 1;
    document.getElementById('qty-modal-input').value = v + 1;
    updateQuantityModalCalculation();
  });

  document.getElementById('qty-modal-input').addEventListener('input', updateQuantityModalCalculation);
  document.getElementById('btn-confirm-add-cart').addEventListener('click', confirmAddToCart);
  document.getElementById('btn-checkout-whatsapp').addEventListener('click', checkoutWhatsapp);
}

// FUNCIONES DE SOPORTE ADMIN
function populateSectionDropdowns() {
  const dropdowns = [
    document.getElementById('single-prod-section'),
    document.getElementById('batch-select-section')
  ];

  dropdowns.forEach(dd => {
    if (!dd) return;
    dd.innerHTML = '';
    sectionsData.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = s.name;
      dd.appendChild(opt);
    });
  });
}

function renderAdminSectionsList() {
  const container = document.getElementById('admin-sections-list');
  if (!container) return;
  container.innerHTML = '';

  sectionsData.forEach(s => {
    const div = document.createElement('div');
    div.style.cssText = "display:flex; justify-content:space-between; align-items:center; padding:0.4rem; background:rgba(255,255,255,0.05); margin-bottom:0.4rem; border-radius:4px;";
    div.innerHTML = `
      <span>Orden #${s.order || 0} - <strong>${s.name}</strong></span>
      <div>
        <button onclick="editSection('${s.id}', '${s.name}', ${s.order || 0})" style="background:var(--theme-accent); border:none; padding:0.2rem 0.5rem; border-radius:4px; cursor:pointer;">✏️</button>
        <button onclick="deleteSection('${s.id}')" style="background:var(--danger-color); color:#fff; border:none; padding:0.2rem 0.5rem; border-radius:4px; cursor:pointer;">🗑️</button>
      </div>
    `;
    container.appendChild(div);
  });
}

window.editSection = function(id, name, order) {
  document.getElementById('section-id-edit').value = id;
  document.getElementById('section-name').value = name;
  document.getElementById('section-order').value = order;
};

window.deleteSection = async function(id) {
  if (confirm("¿Eliminar esta sección de productos?")) {
    await deleteDoc(doc(db, "repuestos_secciones", id));
  }
};

function renderAdminProductsList() {
  const container = document.getElementById('admin-products-list');
  if (!container) return;
  container.innerHTML = '';

  productsData.forEach(p => {
    const div = document.createElement('div');
    div.style.cssText = "display:flex; justify-content:space-between; align-items:center; padding:0.4rem; background:rgba(255,255,255,0.05); margin-bottom:0.4rem; border-radius:4px;";
    div.innerHTML = `
      <div>
        <strong>[${p.code}] ${p.title}</strong>
        <div style="font-size:0.75rem;">Stock: ${p.stockCount} (${p.stockStatus})</div>
      </div>
      <div>
        <button onclick="deleteProduct('${p.id}')" style="background:var(--danger-color); color:#fff; border:none; padding:0.2rem 0.5rem; border-radius:4px; cursor:pointer;">🗑️</button>
      </div>
    `;
    container.appendChild(div);
  });
}

window.deleteProduct = async function(id) {
  if (confirm("¿Eliminar producto definitivamente?")) {
    await deleteDoc(doc(db, "repuestos_productos", id));
    expandedInlineEditId = null;
    alert("Producto eliminado.");
  }
};

function renderAdminPromosList() {
  const container = document.getElementById('admin-promos-list');
  if (!container) return;
  container.innerHTML = '';

  const formPromo = document.getElementById('form-admin-promo');
  if (formPromo && !document.getElementById('promo-id-edit')) {
    const inputHidden = document.createElement('input');
    inputHidden.type = 'hidden';
    inputHidden.id = 'promo-id-edit';
    formPromo.prepend(inputHidden);
  }

  promosData.forEach(p => {
    const div = document.createElement('div');
    div.style.cssText = "display:flex; justify-content:space-between; align-items:center; padding:0.4rem; background:rgba(255,255,255,0.05); margin-bottom:0.4rem; border-radius:4px;";
    div.innerHTML = `
      <span><strong>${p.title}</strong> - $${p.price}</span>
      <div>
        <button onclick="editPromo('${p.id}')" style="background:var(--theme-accent); border:none; padding:0.2rem 0.5rem; border-radius:4px; cursor:pointer; margin-right:0.3rem;" title="Editar">✏️</button>
        <button onclick="deletePromo('${p.id}')" style="background:var(--danger-color); color:#fff; border:none; padding:0.2rem 0.5rem; border-radius:4px; cursor:pointer;" title="Eliminar">🗑️</button>
      </div>
    `;
    container.appendChild(div);
  });
}

window.editPromo = function(id) {
  const promo = promosData.find(p => p.id === id);
  if (!promo) return;

  const promoIdInput = document.getElementById('promo-id-edit');
  if (promoIdInput) promoIdInput.value = promo.id;

  document.getElementById('promo-title').value = promo.title || "";
  document.getElementById('promo-desc').value = promo.desc || "";
  document.getElementById('promo-price').value = promo.price || 0;
  document.getElementById('promo-expiry').value = promo.expiry || "";
  document.getElementById('promo-images-urls').value = promo.imageUrls || "";

  alert("Datos de la oferta/aviso cargados en el formulario superior para editar.");
};

window.deletePromo = async function(id) {
  if (confirm("¿Eliminar oferta/aviso?")) {
    await deleteDoc(doc(db, "repuestos_promos", id));
  }
};

// RENDERIZADO DE LISTA PARA EL 6TO BOTÓN (MENÚ BOTONES)
function renderAdminCustomMenuList() {
  const container = document.getElementById('admin-custom-menu-list');
  if (!container) return;
  container.innerHTML = '';

  customMenuButtons.forEach(btn => {
    const div = document.createElement('div');
    div.style.cssText = "display:flex; justify-content:space-between; align-items:center; padding:0.4rem; background:rgba(255,255,255,0.05); margin-bottom:0.4rem; border-radius:4px;";
    div.innerHTML = `
      <div>
        <strong>${btn.label}</strong>
        <div style="font-size:0.75rem; color:#888;">${btn.url}</div>
      </div>
      <div>
        <button onclick="editCustomMenuBtn('${btn.id}', '${btn.label}', '${btn.url}')" style="background:var(--theme-accent); border:none; padding:0.2rem 0.5rem; border-radius:4px; cursor:pointer; margin-right:0.3rem;">✏️</button>
        <button onclick="deleteCustomMenuBtn('${btn.id}')" style="background:var(--danger-color); color:#fff; border:none; padding:0.2rem 0.5rem; border-radius:4px; cursor:pointer;">🗑️</button>
      </div>
    `;
    container.appendChild(div);
  });
}

window.editCustomMenuBtn = function(id, label, url) {
  document.getElementById('custom-menu-id').value = id;
  document.getElementById('custom-menu-label').value = label;
  document.getElementById('custom-menu-url').value = url;
};

window.deleteCustomMenuBtn = async function(id) {
  if (confirm("¿Eliminar este botón del menú?")) {
    await deleteDoc(doc(db, "repuestos_menu_botones", id));
  }
};

window.selectSectionFromDrawer = function(id) {
  activeSectionId = id;
  if (searchQuery) clearSearch();
  renderSections();
  renderProducts();
  document.getElementById('menu-drawer').classList.add('hidden');
};
