const MARKETS = [
  { id: "wl500", tab: "WL500", name: "WL500-PERP", subtitle: "WL500 Index · Top 500 Luxury Watches", productId: "WL500-IDX", price: 48250.0, live: true },
  { id: "gold", tab: "GOLD", name: "GOLD-PERP", subtitle: "Gold · XAU/USD · Troy Oz Spot", productId: "XAU-USD", price: 2348.5, live: true },
  { id: "silver", tab: "SILVER", name: "SILVER-PERP", subtitle: "Silver · XAG/USD · Troy Oz Spot", productId: "XAG-USD", price: 28.65, live: true },
  { id: "platinum", tab: "PLATINUM", name: "PLATINUM-PERP", subtitle: "Platinum · XPT/USD · Troy Oz Spot", productId: "XPT-USD", price: 982.4, live: true },
  { id: "diamond", tab: "DIAMOND", name: "DIAMOND-PERP", subtitle: "Diamond · 1ct Round Brilliant · Rapaport", productId: "RAP-1CT-RB", price: 4850.0, live: true },
  { id: "rolex-sub", tab: "ROLEX-SUB", name: "ROLEX-SUB-PERP", subtitle: "Rolex Submariner · 126610LN", productId: "RX-126610LN", price: 14250.0, live: true },
  { id: "patek-nautilus", tab: "PATEK-NAUT", name: "PATEK-NAUTILUS-PERP", subtitle: "Patek Philippe · Nautilus 5711/1A", productId: "PP-5711-1A", price: 98400.0, live: true },
  { id: "ap-royal-oak", tab: "AP-RO", name: "AP-ROYAL-OAK-PERP", subtitle: "Audemars Piguet · Royal Oak 15500ST", productId: "AP-15500ST", price: 52800.0, live: true },
  { id: "omega-speedy", tab: "OMEGA-SPD", name: "OMEGA-SPEEDY-PERP", subtitle: "Omega Speedmaster · Moonwatch", productId: "OM-310-30", price: 7850.0, live: true },
  { id: "cartier-santos", tab: "CARTIER-SNT", name: "CARTIER-SANTOS-PERP", subtitle: "Cartier Santos · WSSA0018", productId: "CA-WSSA0018", price: 9200.0, live: true },
  { id: "rm-rm11", tab: "RM-11", name: "RM-11-PERP", subtitle: "Richard Mille · RM 11-03", productId: "RM-11-03", price: 248500.0, live: true },
  { id: "vc-overseas", tab: "VC-OS", name: "VC-OVERSEAS-PERP", subtitle: "Vacheron Constantin · Overseas 4500V", productId: "VC-4500V", price: 31200.0, live: true },
  { id: "iwc-pilot", tab: "IWC-PILOT", name: "IWC-PILOT-PERP", subtitle: "IWC Big Pilot · IW501001", productId: "IW-501001", price: 11800.0, live: true },
  { id: "tag-carrera", tab: "TAG-CAR", name: "TAG-CARRERA-PERP", subtitle: "TAG Heuer Carrera · Chronograph", productId: "TH-CBS2210", price: 6450.0, live: true },
  { id: "rolex-daytona", tab: "ROLEX-DAY", name: "ROLEX-DAYTONA-PERP", subtitle: "Rolex Daytona · 116500LN", productId: "RX-116500LN", price: 38750.0, live: true },
  { id: "pp-annual", tab: "PP-AC", name: "PP-ANNUAL-PERP", subtitle: "Patek Philippe · Annual Calendar 5205G", productId: "PP-5205G", price: 62400.0, live: true },
  { id: "ap-offshore", tab: "AP-OS", name: "AP-OFFSHORE-PERP", subtitle: "Audemars Piguet · Royal Oak Offshore", productId: "AP-26470ST", price: 44100.0, live: true },
  { id: "omega-seamaster", tab: "OMEGA-SM", name: "OMEGA-SEAMASTER-PERP", subtitle: "Omega Seamaster · 300M", productId: "OM-210-30", price: 5600.0, live: true },
  { id: "rolex-gmt", tab: "ROLEX-GMT", name: "ROLEX-GMT-PERP", subtitle: "Rolex GMT-Master II · 126710BLNR", productId: "RX-126710BLNR", price: 22400.0, live: true },
  { id: "hublot-bigbang", tab: "HUBLOT-BB", name: "HUBLOT-BB-PERP", subtitle: "Hublot Big Bang · Unico Titanium", productId: "HU-411-NX", price: 15800.0, live: true },
  { id: "jlc-reverso", tab: "JLC-REV", name: "JLC-REVERSO-PERP", subtitle: "Jaeger-LeCoultre · Reverso Classic", productId: "JL-3858520", price: 9800.0, live: true },
  { id: "panerai-luminor", tab: "PANERAI", name: "PANERAI-LUM-PERP", subtitle: "Panerai Luminor · Marina 1312", productId: "PA-PAM01312", price: 8900.0, live: true },
  { id: "breitling-nav", tab: "BREITLING", name: "BREITLING-NAV-PERP", subtitle: "Breitling Navitimer · B01", productId: "BR-AB0138211", price: 10200.0, live: true },
  { id: "cartier-tank", tab: "CARTIER-TK", name: "CARTIER-TANK-PERP", subtitle: "Cartier Tank · Must de Cartier", productId: "CA-WSTA0041", price: 4100.0, live: true },
];

let selectedIndex = 0;
let chartPoints = [];

function formatPrice(n) {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatTimeAgo(minutes) {
  if (minutes < 1) return "just now";
  if (minutes < 60) return minutes + "m ago";
  return Math.floor(minutes / 60) + "h " + (minutes % 60) + "m ago";
}

function showToast(msg) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2200);
}

function generateChartData(basePrice) {
  chartPoints = [];
  let price = basePrice * 0.97;
  const now = Math.floor(Date.now() / 1000);
  for (let i = 48; i >= 0; i--) {
    price += (Math.random() - 0.48) * basePrice * 0.004;
    price = Math.max(basePrice * 0.92, Math.min(basePrice * 1.06, price));
    chartPoints.push({ ewma: price, timestamp: now - i * 300 });
  }
  chartPoints[chartPoints.length - 1].ewma = basePrice;
}

function drawChart() {
  const canvas = document.getElementById("stats-chart");
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = 192 * dpr;
  canvas.style.width = rect.width + "px";
  canvas.style.height = "192px";
  ctx.scale(dpr, dpr);

  const w = rect.width;
  const h = 192;
  const pts = chartPoints;
  if (pts.length < 2) return;

  const values = pts.map((p) => p.ewma);
  const min = Math.min(...values) * 0.995;
  const max = Math.max(...values) * 1.005;
  const range = max - min || 1;
  const margin = { top: 20, right: 50, bottom: 30, left: 10 };
  const plotW = w - margin.left - margin.right;
  const plotH = h - margin.top - margin.bottom;

  ctx.clearRect(0, 0, w, h);

  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = margin.top + (plotH / 4) * i;
    ctx.beginPath();
    ctx.moveTo(margin.left, y);
    ctx.lineTo(w - margin.right, y);
    ctx.stroke();
    const val = max - (range / 4) * i;
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.font = "10px monospace";
    ctx.textAlign = "left";
    ctx.fillText("$" + val.toFixed(2), w - margin.right + 5, y + 3);
  }

  const timeIdx = [0, Math.floor(pts.length / 4), Math.floor(pts.length / 2), Math.floor((3 * pts.length) / 4), pts.length - 1];
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.textAlign = "center";
  for (const idx of timeIdx) {
    const x = margin.left + (idx / (pts.length - 1)) * plotW;
    const d = new Date(pts[idx].timestamp * 1000);
    const label = String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
    ctx.fillText(label, x, h - 8);
  }

  const grad = ctx.createLinearGradient(0, margin.top, 0, margin.top + plotH);
  grad.addColorStop(0, "rgba(0, 255, 65, 0.15)");
  grad.addColorStop(1, "rgba(0, 255, 65, 0)");

  ctx.beginPath();
  pts.forEach((p, i) => {
    const x = margin.left + (i / (pts.length - 1)) * plotW;
    const y = margin.top + plotH - ((p.ewma - min) / range) * plotH;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.lineTo(margin.left + plotW, margin.top + plotH);
  ctx.lineTo(margin.left, margin.top + plotH);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.beginPath();
  pts.forEach((p, i) => {
    const x = margin.left + (i / (pts.length - 1)) * plotW;
    const y = margin.top + plotH - ((p.ewma - min) / range) * plotH;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = "#00ff41";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const last = pts[pts.length - 1];
  const lx = margin.left + plotW;
  const ly = margin.top + plotH - ((last.ewma - min) / range) * plotH;
  ctx.beginPath();
  ctx.arc(lx, ly, 3, 0, Math.PI * 2);
  ctx.fillStyle = "#00ff41";
  ctx.fill();
}

function selectMarket(index) {
  selectedIndex = index;
  const m = MARKETS[index];
  generateChartData(m.price);

  document.getElementById("oracle-title").textContent = "Oracle Status — " + m.name;
  document.getElementById("oracle-price").textContent = formatPrice(m.price);
  document.getElementById("oracle-product").textContent = "Product " + m.productId;
  document.getElementById("oracle-updated").textContent = formatTimeAgo(Math.floor(Math.random() * 4 + 1));
  document.getElementById("readings-count").textContent = chartPoints.length;

  const values = chartPoints.map((p) => p.ewma);
  document.getElementById("session-high").textContent = formatPrice(Math.max(...values));
  document.getElementById("session-low").textContent = formatPrice(Math.min(...values));
  document.getElementById("ewma-price").textContent = formatPrice(m.price * (0.998 + Math.random() * 0.004));

  document.querySelectorAll(".stats-tab").forEach((btn, i) => {
    btn.classList.toggle("active", i === index);
  });

  drawChart();
}

function renderTabs() {
  const container = document.getElementById("market-tabs");
  container.innerHTML = MARKETS.filter((m) => m.live).map((m, i) => {
    const realIndex = MARKETS.indexOf(m);
    return `<button class="stats-tab${realIndex === selectedIndex ? " active" : ""}" data-index="${realIndex}">${m.tab}</button>`;
  }).join("");

  container.querySelectorAll(".stats-tab").forEach((btn) => {
    btn.addEventListener("click", () => selectMarket(parseInt(btn.dataset.index, 10)));
  });
}

document.addEventListener("DOMContentLoaded", () => {
  renderTabs();
  selectMarket(0);

  document.getElementById("header-connect").addEventListener("click", () => {
    showToast("Demo mode — wallet connect disabled");
  });

  window.addEventListener("resize", drawChart);
});
