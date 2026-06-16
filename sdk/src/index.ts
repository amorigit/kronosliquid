// @kronos/sdk — TypeScript SDK for the Kronos perpetual futures DEX

// API client (read-only market data)
export { KronosAPI } from "./api";

// On-chain trading client
export { KronosClient, usdToRaw, rawToUsd } from "./client";
export type { Wallet } from "./client";

// Types
export { Long, Short } from "./types";
export type {
  Direction,
  Position,
  MarginAccount,
  LpPosition,
  PriceRecord,
  Candle,
  Trade,
  ProtocolStats,
  HealthStatus,
} from "./types";

// Constants & PDA helpers
export {
  PROGRAM_ID,
  PROTOCOL_STATE,
  FEE_VAULT,
  INSURANCE_FUND,
  USDC_MINT,
  USDC_DECIMALS,
  PRICE_SCALE,
  MARKETS,
  LIQUIDITY_POOL,
  LP_VAULT,
  getMarginPDA,
  getMarketStatePDA,
  getLiquidityPoolPDA,
  getLpVaultPDA,
  getLpPositionPDA,
} from "./constants";
export type { MarketConfig } from "./constants";
