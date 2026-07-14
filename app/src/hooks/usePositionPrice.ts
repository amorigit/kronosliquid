"use client";

import { useOracle } from "./useOracle";
import { MARKETS } from "@/lib/markets";

/**
 * Mark price for a position's oracle — uses the shared keeper price cache
 * (polled every ~5s) so PnL stays in sync with the ticker.
 */
export function usePositionPrice(oracleAddress: string): number {
  const market = MARKETS.find((m) => m.oracleAddress === oracleAddress);
  const { price } = useOracle(oracleAddress, market?.priceApiMarket);
  return price;
}
