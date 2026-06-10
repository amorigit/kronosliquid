const TRADERS = [
  { pubkey: "7xKp9mN2vQwR4tYb8hJc3fL6sDa1eUo5nZi0wXr", totalPnl: 48250.75, wins: 142, trades: 198, volume: 2840000 },
  { pubkey: "Hk3mP8qR2vNw5tYb1jFc6sL9dEa4uIo8nZi3wXr7p", totalPnl: 31840.20, wins: 98, trades: 156, volume: 1920000 },
  { pubkey: "9mN2vQwR4tYb8hJc3fL6sDa1eUo5nZi0wXr7pKq", totalPnl: 24620.00, wins: 87, trades: 134, volume: 1650000 },
  { pubkey: "2vQwR4tYb8hJc3fL6sDa1eUo5nZi0wXr7pKq9mN", totalPnl: 18950.45, wins: 72, trades: 121, volume: 1280000 },
  { pubkey: "QwR4tYb8hJc3fL6sDa1eUo5nZi0wXr7pKq9mN2v", totalPnl: 14280.30, wins: 65, trades: 108, volume: 980000 },
  { pubkey: "4tYb8hJc3fL6sDa1eUo5nZi0wXr7pKq9mN2vQw", totalPnl: 11420.80, wins: 58, trades: 95, volume: 820000 },
  { pubkey: "8hJc3fL6sDa1eUo5nZi0wXr7pKq9mN2vQwR4", totalPnl: 8750.15, wins: 51, trades: 88, volume: 640000 },
  { pubkey: "3fL6sDa1eUo5nZi0wXr7pKq9mN2vQwR4tY", totalPnl: 6240.60, wins: 44, trades: 76, volume: 520000 },
  { pubkey: "6sDa1eUo5nZi0wXr7pKq9mN2vQwR4tYb8h", totalPnl: 4180.25, wins: 38, trades: 68, volume: 410000 },
  { pubkey: "1eUo5nZi0wXr7pKq9mN2vQwR4tYb8hJc3", totalPnl: 2890.90, wins: 32, trades: 59, volume: 320000 },
  { pubkey: "5nZi0wXr7pKq9mN2vQwR4tYb8hJc3fL6s", totalPnl: 1540.40, wins: 28, trades: 52, volume: 245000 },
  { pubkey: "0wXr7pKq9mN2vQwR4tYb8hJc3fL6sDa1e", totalPnl: 820.15, wins: 22, trades: 45, volume: 180000 },
  { pubkey: "7pKq9mN2vQwR4tYb8hJc3fL6sDa1eUo5nZ", totalPnl: -420.50, wins: 18, trades: 41, volume: 156000 },
  { pubkey: "9mN2vQwR4tYb8hJc3fL6sDa1eUo5nZi0w", totalPnl: -1280.75, wins: 15, trades: 38, volume: 124000 },
  { pubkey: "2vQwR4tYb8hJc3fL6sDa1eUo5nZi0wXr7", totalPnl: -2450.30, wins: 12, trades: 34, volume: 98000 },
];

function truncateWallet(addr) {
  return addr.length <= 8 ? addr : addr.slice(0, 4) + "..." + addr.slice(-4);
}

function formatPnl(n) {
  const t = Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return n >= 0 ? "+$" + t : "-$" + t;
}

function formatVolume(n) {
  if (n >= 1e6) return "$" + (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return "$" + (n / 1e3).toFixed(1) + "K";
  return "$" + n.toFixed(2);
}

function rankColor(rank) {
  if (rank === 1) return "#ffaa00";
  if (rank === 2) return "#c0c0c0";
  if (rank === 3) return "#cd7f32";
  return "#666666";
}

function winRate(wins, trades) {
  return trades > 0 ? ((wins / trades) * 100).toFixed(1) : "0.0";
}

function renderLeaderboard() {
  const container = document.getElementById("leaderboard-rows");
  const sorted = [...TRADERS].sort((a, b) => b.totalPnl - a.totalPnl);

  container.innerHTML = sorted.map((trader, i) => {
    const rank = i + 1;
    const color = rankColor(rank);
    const pnlClass = trader.totalPnl >= 0 ? "text-long" : "text-short";
    const wr = winRate(trader.wins, trader.trades);
    const alt = i % 2 === 0 ? "lb-alt" : "";

    return `
      <div class="lb-row lb-desktop ${alt}">
        <div class="lb-rank" style="color:${color}">#${rank}</div>
        <div class="lb-wallet" title="${trader.pubkey}">${truncateWallet(trader.pubkey)}</div>
        <div class="lb-value ${pnlClass}">${formatPnl(trader.totalPnl)}</div>
        <div class="lb-muted">${wr}%</div>
        <div class="lb-muted">${trader.trades}</div>
        <div class="lb-muted">${formatVolume(trader.volume)}</div>
      </div>
      <div class="lb-row lb-mobile ${alt}">
        <div class="lb-rank" style="color:${color}">#${rank}</div>
        <div class="lb-wallet" title="${trader.pubkey}">${truncateWallet(trader.pubkey)}</div>
        <div class="lb-value ${pnlClass} lb-mobile-pnl">${formatPnl(trader.totalPnl)}</div>
      </div>`;
  }).join("");
}

function showToast(msg) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2200);
}

document.addEventListener("DOMContentLoaded", () => {
  renderLeaderboard();
  document.getElementById("header-connect").addEventListener("click", () => {
    showToast("Demo mode — wallet connect disabled");
  });
});
