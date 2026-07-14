"use client";

/**
 * DEVNET: Jupiter mainnet USDC swap does not apply.
 * Direct users to mint test USDC via CollateralPanel.
 */
type Props = {
  onClose: () => void;
};

export function SwapModal({ onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={onClose}>
      <div
        className="w-full max-w-sm border border-border bg-panel p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center">
          <h2 className="text-sm font-bold text-primary">Get test USDC</h2>
          <button onClick={onClose} className="text-secondary hover:text-primary text-xs">
            Close
          </button>
        </div>
        <p className="text-xs text-secondary leading-relaxed">
          Kronos runs on <span className="text-primary">Solana Devnet</span>. Mainnet Jupiter swaps
          won&apos;t work here. Open the trade panel&apos;s Collateral section and click{" "}
          <span className="text-long font-mono">Mint 1,000 test USDC (devnet)</span>, then Deposit.
        </p>
        <button
          onClick={onClose}
          className="w-full py-2.5 text-xs font-bold border border-long text-long hover:bg-long/10"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
