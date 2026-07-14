"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { getReadonlyProgram } from "@/lib/program";
import { getMarginAccountPDA } from "@/lib/addresses";

export type Position = {
  index: number; // slot index 0–4
  oracle: string; // oracle pubkey (base58) — identifies which market
  direction: "Long" | "Short";
  collateral: number; // raw
  notional: number; // raw
  leverage: number;
  entryPrice: number; // raw
  openTimestamp: number;
  lastFundingTimestamp: number;
  slPrice: number | null; // raw, or null if not set
  tpPrice: number | null; // raw, or null if not set
};

export type MarginAccountData = {
  collateral: number; // raw (free collateral)
  positions: Position[];
  hasOpenPosition: boolean;
  isLoading: boolean;
  exists: boolean;
  error: string | null;
};

const DEFAULT: MarginAccountData = {
  collateral: 0,
  positions: [],
  hasOpenPosition: false,
  isLoading: true,
  exists: false,
  error: null,
};

function decodeDirection(dir: any): "Long" | "Short" {
  if (!dir) return "Long";
  if ("long" in dir || "Long" in dir) return "Long";
  return "Short";
}

function decodeAccount(acc: any): Omit<MarginAccountData, "isLoading" | "error"> {
  const positions: Position[] = [];
  const posArray: any[] = acc.positions ?? [];
  for (let i = 0; i < posArray.length; i++) {
    const p = posArray[i];
    if (p) {
      positions.push({
        index: i,
        oracle: p.oracle?.toBase58?.() ?? "",
        direction: decodeDirection(p.direction),
        collateral: p.collateral.toNumber(),
        notional: p.notional.toNumber(),
        leverage: p.leverage,
        entryPrice: p.entryPrice.toNumber(),
        openTimestamp: p.openTimestamp.toNumber(),
        lastFundingTimestamp: p.lastFundingTimestamp.toNumber(),
        slPrice: p.slPrice ? p.slPrice.toNumber() : null,
        tpPrice: p.tpPrice ? p.tpPrice.toNumber() : null,
      });
    }
  }
  return {
    collateral: acc.collateral.toNumber(),
    positions,
    hasOpenPosition: positions.length > 0,
    exists: true,
  };
}

export function useMarginAccount(): MarginAccountData & { refresh: () => void } {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [data, setData] = useState<MarginAccountData>(DEFAULT);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const refresh = useCallback(() => setRefreshTrigger((n) => n + 1), []);
  const subIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!publicKey) {
      setData({ ...DEFAULT, isLoading: false, exists: false });
      return;
    }

    let cancelled = false;
    const pda = getMarginAccountPDA(publicKey);

    const fetchOnce = async () => {
      try {
        const program = getReadonlyProgram(connection);
        const acc = await (program.account as any).marginAccount.fetch(pda);
        if (cancelled) return;
        setData({ ...decodeAccount(acc), isLoading: false, error: null });
      } catch (e: any) {
        if (cancelled) return;
        const msg = e?.message ?? "";
        if (msg.includes("Account does not exist") || e?.code === 3012) {
          setData({ ...DEFAULT, isLoading: false, exists: false, error: null });
        } else if (
          msg.includes("Invalid account discriminator") ||
          msg.includes("unexpected length") ||
          msg.includes("borsh") ||
          (msg.includes("expected") && msg.includes("bytes"))
        ) {
          setData((prev) => ({
            ...prev,
            isLoading: false,
            exists: true,
            error: "schema_mismatch",
          }));
        } else {
          setData((prev) => ({
            ...prev,
            isLoading: false,
            error: null,
          }));
        }
      }
    };

    fetchOnce();
    const pollId = setInterval(fetchOnce, 3_000);

    // Live updates when the margin PDA changes on-chain (open/close/add margin)
    (async () => {
      try {
        const id = connection.onAccountChange(
          pda,
          () => {
            if (!cancelled) fetchOnce();
          },
          "confirmed"
        );
        if (cancelled) {
          connection.removeAccountChangeListener(id).catch(() => {});
        } else {
          subIdRef.current = id;
        }
      } catch {
        /* RPC may not support WS — poll still runs */
      }
    })();

    return () => {
      cancelled = true;
      clearInterval(pollId);
      if (subIdRef.current != null) {
        connection.removeAccountChangeListener(subIdRef.current).catch(() => {});
        subIdRef.current = null;
      }
    };
  }, [connection, publicKey, refreshTrigger]);

  return { ...data, refresh };
}
