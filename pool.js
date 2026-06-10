const POOL = {
  totalUsdc: 2847320.5,
  totalShares: 2847320,
  sharePrice: 1.0,
  accumulatedFees: 48912.33,
  apy: 18.4,
};

const USER = {
  connected: false,
  usdcBalance: 10000,
  shares: 12450,
  usdcDeposited: 12450,
  feesClaimed: 142.8,
  claimable: 18.5,
};

function formatUsd(n) {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatNum(n) {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function poolSharePct(shares) {
  return POOL.totalShares > 0 ? (shares / POOL.totalShares) * 100 : 0;
}

function showToast(msg) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2200);
}

function renderConnected() {
  const sharePct = poolSharePct(USER.shares);

  document.getElementById("stat-share").textContent = sharePct.toFixed(2) + "%";

  document.getElementById("lp-position-content").innerHTML = `
    <div class="lp-position-grid">
      <div>
        <div class="lp-field-label">Shares</div>
        <div class="lp-field-value">${formatNum(USER.shares)}</div>
      </div>
      <div>
        <div class="lp-field-label">Value</div>
        <div class="lp-field-value">${formatUsd(USER.shares * POOL.sharePrice)}</div>
      </div>
      <div>
        <div class="lp-field-label">Pool %</div>
        <div class="lp-field-value">${sharePct.toFixed(2)}%</div>
      </div>
      <div>
        <div class="lp-field-label">Claimable</div>
        <div class="lp-field-value text-long">${formatUsd(USER.claimable)}</div>
      </div>
    </div>`;

  document.getElementById("wallet-content").innerHTML = `
    <div class="wallet-balance-label">USDC Balance</div>
    <div class="wallet-balance-value">${formatUsd(USER.usdcBalance)}</div>`;

  document.getElementById("claimable-amount").textContent = formatUsd(USER.claimable);
  document.getElementById("claim-total").textContent =
    `Total earned: ${formatUsd(USER.feesClaimed + USER.claimable)} USDC`;
  document.getElementById("claim-total").classList.remove("hidden");

  ["deposit-amount", "withdraw-amount", "btn-deposit", "btn-withdraw", "btn-claim"].forEach((id) => {
    document.getElementById(id).disabled = false;
  });
  document.querySelectorAll(".pct-btn").forEach((b) => { b.disabled = false; });

  document.getElementById("header-connect").textContent = "Connected";
}

function renderDisconnected() {
  document.getElementById("stat-share").textContent = "0.00%";
  document.getElementById("lp-position-content").innerHTML =
    '<p class="pool-muted">Connect wallet to view</p>';
  document.getElementById("wallet-content").innerHTML =
    '<p class="pool-muted">Connect wallet</p>';
  document.getElementById("claimable-amount").textContent = "$0.00";
  document.getElementById("claim-total").classList.add("hidden");

  ["deposit-amount", "withdraw-amount", "btn-deposit", "btn-withdraw", "btn-claim"].forEach((id) => {
    document.getElementById(id).disabled = true;
  });
  document.querySelectorAll(".pct-btn").forEach((b) => { b.disabled = true; });
}

function updateDepositPreview() {
  const amount = parseFloat(document.getElementById("deposit-amount").value) || 0;
  const preview = document.getElementById("deposit-preview");
  if (amount <= 0 || !USER.connected) {
    preview.classList.add("hidden");
    return;
  }
  const newShares = amount / POOL.sharePrice;
  const newTotalShares = POOL.totalShares + newShares;
  const newSharePct = (USER.shares + newShares) / newTotalShares * 100;
  document.getElementById("deposit-shares").textContent = formatNum(Math.floor(newShares));
  document.getElementById("deposit-share-pct").textContent = newSharePct.toFixed(2) + "%";
  preview.classList.remove("hidden");
}

function updateWithdrawPreview() {
  const amount = parseFloat(document.getElementById("withdraw-amount").value) || 0;
  const preview = document.getElementById("withdraw-preview");
  if (amount <= 0 || !USER.connected) {
    preview.classList.add("hidden");
    return;
  }
  document.getElementById("withdraw-usdc").textContent = formatUsd(amount * POOL.sharePrice);
  preview.classList.remove("hidden");
}

function toggleWallet() {
  USER.connected = !USER.connected;
  if (USER.connected) {
    renderConnected();
    showToast("Wallet connected (demo)");
  } else {
    renderDisconnected();
    document.getElementById("header-connect").textContent = "Connect Wallet";
    showToast("Wallet disconnected");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  renderDisconnected();

  document.getElementById("header-connect").addEventListener("click", toggleWallet);

  document.getElementById("deposit-amount").addEventListener("input", updateDepositPreview);

  document.getElementById("withdraw-amount").addEventListener("input", updateWithdrawPreview);

  document.querySelectorAll(".pct-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!USER.connected) return;
      const pct = parseInt(btn.dataset.pct, 10);
      document.getElementById("withdraw-amount").value = Math.floor(USER.shares * pct / 100);
      updateWithdrawPreview();
    });
  });

  document.getElementById("btn-deposit").addEventListener("click", () => {
    const amount = parseFloat(document.getElementById("deposit-amount").value) || 0;
    if (amount <= 0) return;
    if (amount > USER.usdcBalance) {
      showToast("Insufficient USDC balance");
      return;
    }
    const shares = amount / POOL.sharePrice;
    USER.usdcBalance -= amount;
    USER.shares += shares;
    USER.usdcDeposited += amount;
    POOL.totalUsdc += amount;
    POOL.totalShares += shares;
    document.getElementById("deposit-amount").value = "";
    document.getElementById("deposit-preview").classList.add("hidden");
    document.getElementById("stat-tvl").textContent = formatUsd(POOL.totalUsdc);
    document.getElementById("pool-total-usdc").textContent = formatUsd(POOL.totalUsdc);
    document.getElementById("pool-total-shares").textContent = formatNum(POOL.totalShares);
    renderConnected();
    showToast(`Deposited ${formatUsd(amount)} into LP pool`);
  });

  document.getElementById("btn-withdraw").addEventListener("click", () => {
    const amount = parseFloat(document.getElementById("withdraw-amount").value) || 0;
    if (amount <= 0 || amount > USER.shares) return;
    const usdc = amount * POOL.sharePrice;
    USER.shares -= amount;
    USER.usdcDeposited -= usdc;
    USER.usdcBalance += usdc;
    POOL.totalUsdc -= usdc;
    POOL.totalShares -= amount;
    document.getElementById("withdraw-amount").value = "";
    document.getElementById("withdraw-preview").classList.add("hidden");
    document.getElementById("stat-tvl").textContent = formatUsd(POOL.totalUsdc);
    document.getElementById("pool-total-usdc").textContent = formatUsd(POOL.totalUsdc);
    document.getElementById("pool-total-shares").textContent = formatNum(POOL.totalShares);
    renderConnected();
    showToast(`Withdrew ${formatNum(amount)} shares from LP pool`);
  });

  document.getElementById("btn-claim").addEventListener("click", () => {
    if (USER.claimable <= 0) return;
    const claimed = USER.claimable;
    USER.feesClaimed += claimed;
    USER.usdcBalance += claimed;
    USER.claimable = 0;
    renderConnected();
    showToast(`Claimed ${formatUsd(claimed)} in fees`);
  });
});
