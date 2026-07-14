// Market photos — local assets (see assets/watches/).
const MARKET_IMAGES = {
  "WL500-PERP": "assets/watches/wl500.jpg",
  "GOLD-PERP": "assets/watches/gold.jpg",
  "SILVER-PERP": "assets/watches/silver.jpg",
  "PLATINUM-PERP": "assets/watches/platinum.jpg",
  "ROLEX-SUB-PERP": "assets/watches/rolex-sub.jpg",
  "ROLEX-DAYTONA-PERP": "assets/watches/rolex-daytona.jpg",
  "ROLEX-GMT-PERP": "assets/watches/rolex-gmt.jpg",
  "PATEK-NAUTILUS-PERP": "assets/watches/patek-nautilus.jpg",
  "PP-ANNUAL-PERP": "assets/watches/pp-annual.jpg",
  "PP-AQUANAUT-PERP": "assets/watches/pp-aquanaut.jpg",
  "AP-ROYAL-OAK-PERP": "assets/watches/ap-royal-oak.jpg",
  "AP-OFFSHORE-PERP": "assets/watches/ap-offshore.jpg",
  "AP-CODE-PERP": "assets/watches/ap-code.jpg",
  "OMEGA-SPEEDY-PERP": "assets/watches/omega-speedy.jpg",
  "OMEGA-SEAMASTER-PERP": "assets/watches/omega-seamaster.jpg",
  "CARTIER-SANTOS-PERP": "assets/watches/cartier-santos.jpg",
  "CARTIER-TANK-PERP": "assets/watches/cartier-tank.jpg",
  "RM-11-PERP": "assets/watches/rm-11.jpg",
  "VC-OVERSEAS-PERP": "assets/watches/vc-overseas.jpg",
  "IWC-PILOT-PERP": "assets/watches/iwc-pilot.jpg",
  "TAG-CARRERA-PERP": "assets/watches/tag-carrera.jpg",
  "HUBLOT-BB-PERP": "assets/watches/hublot-bb.jpg",
  "JLC-REVERSO-PERP": "assets/watches/jlc-reverso.jpg",
  "PANERAI-LUM-PERP": "assets/watches/panerai-lum.jpg",
  "BREITLING-NAV-PERP": "assets/watches/breitling-nav.jpg",
};

function marketImage(name) {
  return MARKET_IMAGES[name] || MARKET_IMAGES["WL500-PERP"];
}

const HERO_WATCHES = [
  { name: "Rolex Submariner", image: marketImage("ROLEX-SUB-PERP") },
  { name: "Patek Philippe Nautilus", image: marketImage("PATEK-NAUTILUS-PERP") },
  { name: "Audemars Piguet Royal Oak", image: marketImage("AP-ROYAL-OAK-PERP") },
  { name: "Omega Speedmaster", image: marketImage("OMEGA-SPEEDY-PERP") },
  { name: "Cartier Santos", image: marketImage("CARTIER-SANTOS-PERP") },
];

const MARKETS = [
  { id: "wl500", name: "WL500-PERP", subtitle: "WL500 Index · Top 500 Luxury Watches", image: marketImage("WL500-PERP"), price: 48250.0, change: 2.14, badge: "Index", live: true },
  { id: "gold", name: "GOLD-PERP", subtitle: "Gold · XAU/USD · Troy Oz Spot", image: marketImage("GOLD-PERP"), price: 2348.5, change: 0.42, badge: "Commodity", live: true },
  { id: "silver", name: "SILVER-PERP", subtitle: "Silver · XAG/USD · Troy Oz Spot", image: marketImage("SILVER-PERP"), price: 28.65, change: 1.15, badge: "Commodity", live: true },
  { id: "platinum", name: "PLATINUM-PERP", subtitle: "Platinum · XPT/USD · Troy Oz Spot", image: marketImage("PLATINUM-PERP"), price: 982.4, change: -0.28, badge: "Commodity", live: true },
  { id: "rolex-sub", name: "ROLEX-SUB-PERP", subtitle: "Rolex Submariner · 126610LN · Oystersteel", image: marketImage("ROLEX-SUB-PERP"), price: 14250.0, change: 1.82, badge: "Hot", live: true },
  { id: "patek-nautilus", name: "PATEK-NAUTILUS-PERP", subtitle: "Patek Philippe · Nautilus 5711/1A", image: marketImage("PATEK-NAUTILUS-PERP"), price: 98400.0, change: -0.45, badge: null, live: true },
  { id: "ap-royal-oak", name: "AP-ROYAL-OAK-PERP", subtitle: "Audemars Piguet · Royal Oak 15500ST", image: marketImage("AP-ROYAL-OAK-PERP"), price: 52800.0, change: 3.21, badge: "New", live: true },
  { id: "omega-speedy", name: "OMEGA-SPEEDY-PERP", subtitle: "Omega Speedmaster · Moonwatch Professional", image: marketImage("OMEGA-SPEEDY-PERP"), price: 7850.0, change: 0.67, badge: null, live: true },
  { id: "cartier-santos", name: "CARTIER-SANTOS-PERP", subtitle: "Cartier Santos · Large Model WSSA0018", image: marketImage("CARTIER-SANTOS-PERP"), price: 9200.0, change: -1.12, badge: null, live: true },
  { id: "rm-rm11", name: "RM-11-PERP", subtitle: "Richard Mille · RM 11-03 · Flyback Chronograph", image: marketImage("RM-11-PERP"), price: 248500.0, change: 4.88, badge: "Hot", live: true },
  { id: "vc-overseas", name: "VC-OVERSEAS-PERP", subtitle: "Vacheron Constantin · Overseas 4500V", image: marketImage("VC-OVERSEAS-PERP"), price: 31200.0, change: 0.34, badge: null, live: true },
  { id: "iwc-pilot", name: "IWC-PILOT-PERP", subtitle: "IWC Big Pilot · IW501001", image: marketImage("IWC-PILOT-PERP"), price: 11800.0, change: -0.89, badge: null, live: true },
  { id: "tag-carrera", name: "TAG-CARRERA-PERP", subtitle: "TAG Heuer Carrera · Glassbox Chronograph", image: marketImage("TAG-CARRERA-PERP"), price: 6450.0, change: 1.05, badge: null, live: true },
  { id: "rolex-daytona", name: "ROLEX-DAYTONA-PERP", subtitle: "Rolex Daytona · 116500LN · Panda Dial", image: marketImage("ROLEX-DAYTONA-PERP"), price: 38750.0, change: 5.42, badge: "Hot", live: true },
  { id: "pp-annual", name: "PP-ANNUAL-PERP", subtitle: "Patek Philippe · Annual Calendar 5205G", image: marketImage("PP-ANNUAL-PERP"), price: 62400.0, change: -0.22, badge: null, live: true },
  { id: "ap-offshore", name: "AP-OFFSHORE-PERP", subtitle: "Audemars Piguet · Royal Oak Offshore", image: marketImage("AP-OFFSHORE-PERP"), price: 44100.0, change: 2.76, badge: null, live: true },
  { id: "omega-seamaster", name: "OMEGA-SEAMASTER-PERP", subtitle: "Omega Seamaster · 300M Co-Axial", image: marketImage("OMEGA-SEAMASTER-PERP"), price: 5600.0, change: 0.15, badge: null, live: true },
  { id: "cartier-tank", name: "CARTIER-TANK-PERP", subtitle: "Cartier Tank · Must de Cartier", image: marketImage("CARTIER-TANK-PERP"), price: 4100.0, change: -0.58, badge: null, live: true },
  { id: "hublot-bigbang", name: "HUBLOT-BB-PERP", subtitle: "Hublot Big Bang · Unico Titanium", image: marketImage("HUBLOT-BB-PERP"), price: 15800.0, change: 1.44, badge: null, live: true },
  { id: "jlc-reverso", name: "JLC-REVERSO-PERP", subtitle: "Jaeger-LeCoultre · Reverso Classic", image: marketImage("JLC-REVERSO-PERP"), price: 9800.0, change: 0.91, badge: null, live: true },
  { id: "panerai-luminor", name: "PANERAI-LUM-PERP", subtitle: "Panerai Luminor · Marina 1312", image: marketImage("PANERAI-LUM-PERP"), price: 8900.0, change: -1.34, badge: null, live: true },
  { id: "breitling-nav", name: "BREITLING-NAV-PERP", subtitle: "Breitling Navitimer · B01 Chronograph", image: marketImage("BREITLING-NAV-PERP"), price: 10200.0, change: 0.48, badge: null, live: true },
  { id: "rolex-gmt", name: "ROLEX-GMT-PERP", subtitle: "Rolex GMT-Master II · 126710BLNR", image: marketImage("ROLEX-GMT-PERP"), price: 22400.0, change: 2.03, badge: null, live: true },
  { id: "pp-aquanaut", name: "PP-AQUANAUT-PERP", subtitle: "Patek Philippe · Aquanaut 5167A", image: marketImage("PP-AQUANAUT-PERP"), price: 71200.0, change: 1.67, badge: "Soon", live: false },
  { id: "ap-code", name: "AP-CODE-PERP", subtitle: "Audemars Piguet · Code 11.59 Chronograph", image: marketImage("AP-CODE-PERP"), price: 38900.0, change: 0.0, badge: "Soon", live: false },
];

const DUMMY_POSITIONS = [
  { market: "ROLEX-SUB-PERP", direction: "Long", leverage: 5, entry: 14120.0, pnl: 412.5, pnlPct: 2.91 },
  { market: "AP-ROYAL-OAK-PERP", direction: "Short", leverage: 3, entry: 53100.0, pnl: -186.0, pnlPct: -0.58 },
];

let state = {
  selectedMarket: MARKETS[1],
  direction: "Long",
  leverage: 5,
  collateral: 500,
  search: "",
};

function formatPrice(n) {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatPct(n) {
  const sign = n >= 0 ? "+" : "";
  return sign + n.toFixed(2) + "%";
}

function showToast(msg) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2200);
}

function acceptRisk() {
  document.getElementById("risk-overlay").classList.add("hidden");
  document.getElementById("landing").classList.add("hidden");
  document.getElementById("terminal").classList.add("active");
  initTerminal();
}

function startTrading() {
  acceptRisk();
}

function connectWallet() {
  showToast("Demo mode — wallet connect disabled");
}

function renderHeroWatches() {
  const container = document.getElementById("hero-watches");
  container.innerHTML = HERO_WATCHES.map(
    (w) => `<div class="watch-item"><img src="${w.image}" alt="${w.name}" referrerpolicy="no-referrer" loading="lazy" draggable="false" /></div>`
  ).join("");
}

function renderMarkets() {
  const list = document.getElementById("markets-list");
  const query = state.search.toLowerCase();
  const filtered = MARKETS.filter(
    (m) => m.name.toLowerCase().includes(query) || m.subtitle.toLowerCase().includes(query)
  );

  list.innerHTML = filtered
    .map((m) => {
      const active = m.id === state.selectedMarket.id ? "active" : "";
      const changeClass = m.change >= 0 ? "text-long" : "text-short";
      const badge = m.badge && m.live
        ? `<span class="market-badge">${m.badge}</span>`
        : !m.live
          ? `<span class="market-badge" style="border-color:rgba(102,102,102,0.4);color:#666">Soon</span>`
          : "";
      return `
        <button class="market-item ${active}" data-id="${m.id}">
          <img src="${m.image}" alt="${m.name}" referrerpolicy="no-referrer" loading="lazy" />
          <div class="market-item-info">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:4px">
              <span class="market-item-name">${m.name}</span>${badge}
            </div>
            <div class="market-item-sub">${m.subtitle}</div>
            <div class="market-item-price">
              <span>${m.live ? formatPrice(m.price) : "—"}</span>
              ${m.live ? `<span class="${changeClass}">${formatPct(m.change)}</span>` : ""}
            </div>
          </div>
        </button>`;
    })
    .join("");

  list.querySelectorAll(".market-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      const market = MARKETS.find((m) => m.id === btn.dataset.id);
      if (market && market.live) selectMarket(market);
    });
  });
}

function selectMarket(market) {
  state.selectedMarket = market;
  if (!priceHistory[market.name] || !priceHistory[market.name].length) {
    recordSample(market.name, market.price);
  }
  renderMarkets();
  renderMarketHeader();
  renderOrderBook();
  renderTradePanel();
  drawChart();
}

function renderMarketHeader() {
  const m = state.selectedMarket;
  document.getElementById("market-img").referrerPolicy = "no-referrer";
  document.getElementById("market-img").src = m.image;
  document.getElementById("market-img").alt = m.name;
  document.getElementById("market-name").textContent = m.name;
  document.getElementById("market-subtitle").textContent = m.subtitle;
  document.getElementById("market-price").textContent = formatPrice(m.price);
  const changeEl = document.getElementById("market-change");
  changeEl.textContent = formatPct(m.change);
  changeEl.className = "value " + (m.change >= 0 ? "text-long" : "text-short");
  document.getElementById("stat-volume").textContent = "$" + (Math.floor(Math.random() * 800 + 200) * 1000).toLocaleString();
  document.getElementById("stat-oi").textContent = "$" + (Math.floor(Math.random() * 500 + 100) * 1000).toLocaleString();
  document.getElementById("stat-funding").textContent = (Math.random() * 0.02 - 0.005).toFixed(4) + "%";
}

function renderOrderBook() {
  const book = document.getElementById("order-book");
  const price = state.selectedMarket.price;
  let html = "";
  for (let i = 5; i >= 1; i--) {
    const ask = price + i * (price * 0.001);
    html += `<div class="ob-row ask"><span class="price">${formatPrice(ask)}</span><span>${(Math.random() * 3 + 0.5).toFixed(2)}</span><span>${Math.floor(Math.random() * 5000 + 500)}</span></div>`;
  }
  for (let i = 1; i <= 5; i++) {
    const bid = price - i * (price * 0.001);
    html += `<div class="ob-row bid"><span class="price">${formatPrice(bid)}</span><span>${(Math.random() * 3 + 0.5).toFixed(2)}</span><span>${Math.floor(Math.random() * 5000 + 500)}</span></div>`;
  }
  book.innerHTML = html;

  const longPct = 55 + Math.floor(Math.random() * 20);
  document.getElementById("oi-long").style.width = longPct + "%";
  document.getElementById("oi-short").style.width = 100 - longPct + "%";
  document.getElementById("oi-long-label").textContent = longPct + "% Long";
  document.getElementById("oi-short-label").textContent = 100 - longPct + "% Short";
}

function renderPositions() {
  const list = document.getElementById("positions-list");
  list.innerHTML = DUMMY_POSITIONS.map((p) => {
    const pnlClass = p.pnl >= 0 ? "text-long" : "text-short";
    const dirClass = p.direction === "Long" ? "text-long" : "text-short";
    return `
      <div class="pos-row">
        <span class="${dirClass}">${p.direction[0]}${p.leverage}x ${p.market.split("-")[0]}</span>
        <span>${formatPrice(p.entry)}</span>
        <span class="${pnlClass}">${p.pnl >= 0 ? "+" : ""}${formatPrice(p.pnl)} (${formatPct(p.pnlPct)})</span>
      </div>`;
  }).join("");
}

function renderTradePanel() {
  const m = state.selectedMarket;
  const notional = state.collateral * state.leverage;
  const liqPrice = state.direction === "Long"
    ? m.price * (1 - 0.8 / state.leverage)
    : m.price * (1 + 0.8 / state.leverage);
  const fee = notional * 0.0002;

  document.getElementById("summary-notional").textContent = formatPrice(notional);
  document.getElementById("summary-entry").textContent = formatPrice(m.price);
  document.getElementById("summary-liq").textContent = formatPrice(liqPrice);
  document.getElementById("summary-fee").textContent = formatPrice(fee);
  document.getElementById("leverage-display").textContent = state.leverage + "x";
  document.getElementById("collateral-input").value = state.collateral;

  const submit = document.getElementById("trade-submit");
  submit.textContent = state.direction === "Long" ? "Open Long" : "Open Short";
  submit.className = "trade-submit " + (state.direction === "Long" ? "btn-green" : "btn-red");
}

function renderTicker() {
  const track = document.getElementById("ticker-track");
  const items = MARKETS.filter((m) => m.live)
    .map((m) => {
      const cls = m.change >= 0 ? "text-long" : "text-short";
      return `<span class="ticker-item"><strong>${m.name}</strong> ${formatPrice(m.price)} <span class="${cls}">${formatPct(m.change)}</span></span>`;
    })
    .join("");
  track.innerHTML = items + items;
}

// Real price history per market, keyed by market name. Each entry is the
// sequence of observed prices since the terminal opened — the chart starts
// from the first sample (i.e. the moment data began streaming), not a
// fabricated back-history.
const priceHistory = {};
const MAX_HISTORY = 600;

function recordSample(name, price) {
  if (!name || !isFinite(price) || price <= 0) return;
  if (!priceHistory[name]) priceHistory[name] = [];
  const h = priceHistory[name];
  h.push({ t: Date.now(), p: price });
  if (h.length > MAX_HISTORY) h.shift();
}

function drawChart() {
  const canvas = document.getElementById("price-chart");
  if (!canvas) return;
  const placeholder = document.querySelector(".chart-placeholder");
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  canvas.style.width = rect.width + "px";
  canvas.style.height = rect.height + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const w = rect.width;
  const h = rect.height;
  ctx.clearRect(0, 0, w, h);

  const hist = priceHistory[state.selectedMarket.name] || [];
  const pts = hist.map((s) => s.p);
  // Need at least two real samples before a line is meaningful.
  if (pts.length < 2) {
    if (placeholder) placeholder.style.display = "flex";
    return;
  }
  if (placeholder) placeholder.style.display = "none";

  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const range = max - min || 1;

  ctx.strokeStyle = "rgba(255,255,255,0.04)";
  ctx.lineWidth = 1;
  for (let i = 1; i < 5; i++) {
    const y = (h / 5) * i;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  const up = pts[pts.length - 1] >= pts[0];
  const color = up ? "#00ff41" : "#ff3333";

  ctx.beginPath();
  pts.forEach((p, i) => {
    const x = (i / (pts.length - 1)) * w;
    const y = h - ((p - min) / range) * (h - 20) - 10;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, up ? "rgba(0,255,65,0.15)" : "rgba(255,51,51,0.15)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grad;
  ctx.fill();
}

function initTerminal() {
  recordSample(state.selectedMarket.name, state.selectedMarket.price);
  renderMarkets();
  renderMarketHeader();
  renderOrderBook();
  renderPositions();
  renderTradePanel();
  renderTicker();
  drawChart();
  window.addEventListener("resize", drawChart);

  // Fallback sampler: when no live on-chain feed is driving prices
  // (chain.js sets __kronosChainLive), nudge the selected market with a
  // gentle drift so the chart still builds from the moment it opened.
  setInterval(() => {
    if (window.__kronosChainLive) return;
    const m = state.selectedMarket;
    const h = priceHistory[m.name];
    const base = h && h.length ? h[h.length - 1].p : m.price;
    const next = Math.max(base * 0.5, base * (1 + (Math.random() - 0.5) * 0.008));
    m.price = next;
    recordSample(m.name, next);
    renderMarketHeader();
    drawChart();
  }, 2500);
}

// Exposed so the on-chain price client (chain.js) can feed real samples in.
window.kronosRecordSample = recordSample;
window.kronosDrawChart = drawChart;

document.addEventListener("DOMContentLoaded", () => {
  renderHeroWatches();

  document.getElementById("risk-accept").addEventListener("click", acceptRisk);
  document.getElementById("btn-start").addEventListener("click", startTrading);
  document.getElementById("btn-connect").addEventListener("click", connectWallet);
  document.getElementById("header-connect").addEventListener("click", connectWallet);

  document.getElementById("market-search").addEventListener("input", (e) => {
    state.search = e.target.value;
    renderMarkets();
  });

  document.getElementById("btn-long").addEventListener("click", () => {
    state.direction = "Long";
    document.getElementById("btn-long").classList.add("active-long");
    document.getElementById("btn-short").classList.remove("active-short");
    renderTradePanel();
  });

  document.getElementById("btn-short").addEventListener("click", () => {
    state.direction = "Short";
    document.getElementById("btn-short").classList.add("active-short");
    document.getElementById("btn-long").classList.remove("active-long");
    renderTradePanel();
  });

  document.getElementById("btn-long").classList.add("active-long");

  document.querySelectorAll(".lev-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.leverage = parseInt(btn.dataset.lev, 10);
      document.querySelectorAll(".lev-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      renderTradePanel();
    });
  });

  document.getElementById("collateral-input").addEventListener("input", (e) => {
    state.collateral = Math.max(0, parseFloat(e.target.value) || 0);
    renderTradePanel();
  });

  document.getElementById("trade-submit").addEventListener("click", () => {
    showToast(`Demo: ${state.direction} ${state.selectedMarket.name} @ ${state.leverage}x opened`);
  });

  document.querySelectorAll(".lev-btn").forEach((b) => {
    if (parseInt(b.dataset.lev, 10) === state.leverage) b.classList.add("active");
  });
});
