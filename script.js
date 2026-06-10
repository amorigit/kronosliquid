const WATCH_IMAGES = [
  "https://images.unsplash.com/photo-1523170335258-f5ed11844cfe?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1614164185125-e4834f113aa6?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1622433721438-14366f4a5f57?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1587836374828-4dbafa94a0e2?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1547996160-81dfa97665a9?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1613857851772-8066a4b51562?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1611591437281-460bfbeb52b7?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1551816230-ef5deaed4a26?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1594534475808-f9f22c27b1e2?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1524593964546-eadffd65a3b4?w=400&h=400&fit=crop",
];

const COMMODITY_IMAGES = {
  gold: "https://images.unsplash.com/photo-1610375461246-0c10621b98d2?w=400&h=400&fit=crop",
  silver: "https://images.unsplash.com/photo-1621451537820-481b465741cd?w=400&h=400&fit=crop",
  platinum: "https://images.unsplash.com/photo-1606814899291-dceeefa944a0?w=400&h=400&fit=crop",
  diamond: "https://images.unsplash.com/photo-1515562141203-7a88fb7ce338?w=400&h=400&fit=crop",
};

const HERO_WATCHES = [
  { name: "Rolex Submariner", image: WATCH_IMAGES[9] },
  { name: "Patek Philippe Nautilus", image: WATCH_IMAGES[1] },
  { name: "Audemars Piguet Royal Oak", image: WATCH_IMAGES[2] },
  { name: "Omega Speedmaster", image: WATCH_IMAGES[3] },
  { name: "Cartier Santos", image: WATCH_IMAGES[4] },
];

const MARKETS = [
  { id: "wl500", name: "WL500-PERP", subtitle: "WL500 Index · Top 500 Luxury Watches", image: WATCH_IMAGES[0], price: 48250.0, change: 2.14, badge: "Index", live: true },
  { id: "gold", name: "GOLD-PERP", subtitle: "Gold · XAU/USD · Troy Oz Spot", image: COMMODITY_IMAGES.gold, price: 2348.5, change: 0.42, badge: "Commodity", live: true },
  { id: "silver", name: "SILVER-PERP", subtitle: "Silver · XAG/USD · Troy Oz Spot", image: COMMODITY_IMAGES.silver, price: 28.65, change: 1.15, badge: "Commodity", live: true },
  { id: "platinum", name: "PLATINUM-PERP", subtitle: "Platinum · XPT/USD · Troy Oz Spot", image: COMMODITY_IMAGES.platinum, price: 982.4, change: -0.28, badge: "Commodity", live: true },
  { id: "diamond", name: "DIAMOND-PERP", subtitle: "Diamond · 1ct Round Brilliant · Rapaport Index", image: COMMODITY_IMAGES.diamond, price: 4850.0, change: 0.85, badge: "Commodity", live: true },
  { id: "rolex-sub", name: "ROLEX-SUB-PERP", subtitle: "Rolex Submariner · 126610LN · Oystersteel", image: WATCH_IMAGES[9], price: 14250.0, change: 1.82, badge: "Hot", live: true },
  { id: "patek-nautilus", name: "PATEK-NAUTILUS-PERP", subtitle: "Patek Philippe · Nautilus 5711/1A", image: WATCH_IMAGES[1], price: 98400.0, change: -0.45, badge: null, live: true },
  { id: "ap-royal-oak", name: "AP-ROYAL-OAK-PERP", subtitle: "Audemars Piguet · Royal Oak 15500ST", image: WATCH_IMAGES[2], price: 52800.0, change: 3.21, badge: "New", live: true },
  { id: "omega-speedy", name: "OMEGA-SPEEDY-PERP", subtitle: "Omega Speedmaster · Moonwatch Professional", image: WATCH_IMAGES[3], price: 7850.0, change: 0.67, badge: null, live: true },
  { id: "cartier-santos", name: "CARTIER-SANTOS-PERP", subtitle: "Cartier Santos · Large Model WSSA0018", image: WATCH_IMAGES[4], price: 9200.0, change: -1.12, badge: null, live: true },
  { id: "rm-rm11", name: "RM-11-PERP", subtitle: "Richard Mille · RM 11-03 · Flyback Chronograph", image: WATCH_IMAGES[5], price: 248500.0, change: 4.88, badge: "Hot", live: true },
  { id: "vc-overseas", name: "VC-OVERSEAS-PERP", subtitle: "Vacheron Constantin · Overseas 4500V", image: WATCH_IMAGES[6], price: 31200.0, change: 0.34, badge: null, live: true },
  { id: "iwc-pilot", name: "IWC-PILOT-PERP", subtitle: "IWC Big Pilot · IW501001", image: WATCH_IMAGES[7], price: 11800.0, change: -0.89, badge: null, live: true },
  { id: "tag-carrera", name: "TAG-CARRERA-PERP", subtitle: "TAG Heuer Carrera · Glassbox Chronograph", image: WATCH_IMAGES[8], price: 6450.0, change: 1.05, badge: null, live: true },
  { id: "rolex-daytona", name: "ROLEX-DAYTONA-PERP", subtitle: "Rolex Daytona · 116500LN · Panda Dial", image: WATCH_IMAGES[0], price: 38750.0, change: 5.42, badge: "Hot", live: true },
  { id: "pp-annual", name: "PP-ANNUAL-PERP", subtitle: "Patek Philippe · Annual Calendar 5205G", image: WATCH_IMAGES[1], price: 62400.0, change: -0.22, badge: null, live: true },
  { id: "ap-offshore", name: "AP-OFFSHORE-PERP", subtitle: "Audemars Piguet · Royal Oak Offshore", image: WATCH_IMAGES[2], price: 44100.0, change: 2.76, badge: null, live: true },
  { id: "omega-seamaster", name: "OMEGA-SEAMASTER-PERP", subtitle: "Omega Seamaster · 300M Co-Axial", image: WATCH_IMAGES[3], price: 5600.0, change: 0.15, badge: null, live: true },
  { id: "cartier-tank", name: "CARTIER-TANK-PERP", subtitle: "Cartier Tank · Must de Cartier", image: WATCH_IMAGES[4], price: 4100.0, change: -0.58, badge: null, live: true },
  { id: "hublot-bigbang", name: "HUBLOT-BB-PERP", subtitle: "Hublot Big Bang · Unico Titanium", image: WATCH_IMAGES[5], price: 15800.0, change: 1.44, badge: null, live: true },
  { id: "jlc-reverso", name: "JLC-REVERSO-PERP", subtitle: "Jaeger-LeCoultre · Reverso Classic", image: WATCH_IMAGES[6], price: 9800.0, change: 0.91, badge: null, live: true },
  { id: "panerai-luminor", name: "PANERAI-LUM-PERP", subtitle: "Panerai Luminor · Marina 1312", image: WATCH_IMAGES[7], price: 8900.0, change: -1.34, badge: null, live: true },
  { id: "breitling-nav", name: "BREITLING-NAV-PERP", subtitle: "Breitling Navitimer · B01 Chronograph", image: WATCH_IMAGES[8], price: 10200.0, change: 0.48, badge: null, live: true },
  { id: "rolex-gmt", name: "ROLEX-GMT-PERP", subtitle: "Rolex GMT-Master II · 126710BLNR", image: WATCH_IMAGES[9], price: 22400.0, change: 2.03, badge: null, live: true },
  { id: "pp-aquanaut", name: "PP-AQUANAUT-PERP", subtitle: "Patek Philippe · Aquanaut 5167A", image: WATCH_IMAGES[1], price: 71200.0, change: 1.67, badge: "Soon", live: false },
  { id: "ap-code", name: "AP-CODE-PERP", subtitle: "Audemars Piguet · Code 11.59 Chronograph", image: WATCH_IMAGES[2], price: 38900.0, change: 0.0, badge: "Soon", live: false },
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
  chartPoints: [],
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
    (w) => `<div class="watch-item"><img src="${w.image}" alt="${w.name}" draggable="false" /></div>`
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
          <img src="${m.image}" alt="${m.name}" />
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
  generateChartData();
  renderMarkets();
  renderMarketHeader();
  renderOrderBook();
  renderTradePanel();
  drawChart();
}

function renderMarketHeader() {
  const m = state.selectedMarket;
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

function generateChartData() {
  const base = state.selectedMarket.price;
  state.chartPoints = [];
  let price = base * 0.97;
  for (let i = 0; i < 80; i++) {
    price += (Math.random() - 0.48) * base * 0.003;
    price = Math.max(base * 0.92, Math.min(base * 1.06, price));
    state.chartPoints.push(price);
  }
  state.chartPoints[state.chartPoints.length - 1] = base;
}

function drawChart() {
  const canvas = document.getElementById("price-chart");
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  canvas.style.width = rect.width + "px";
  canvas.style.height = rect.height + "px";
  ctx.scale(dpr, dpr);

  const w = rect.width;
  const h = rect.height;
  const pts = state.chartPoints;
  if (!pts.length) return;

  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const range = max - min || 1;

  ctx.clearRect(0, 0, w, h);

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
  generateChartData();
  renderMarkets();
  renderMarketHeader();
  renderOrderBook();
  renderPositions();
  renderTradePanel();
  renderTicker();
  drawChart();
  window.addEventListener("resize", drawChart);
}

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
