import { PublicKey } from "@solana/web3.js";

// Defaults below match the devnet deployment from `anchor migrate` +
// `scripts/bootstrap-watch-markets.ts`. Override via NEXT_PUBLIC_* in
// app/.env.local for a different cluster.
export const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID ?? "HEZgFANPKb5hCCDZYzz1gdnbsD7C52gAPx5GNU1ifziP"
);

export const PROTOCOL_STATE = new PublicKey(
  process.env.NEXT_PUBLIC_PROTOCOL_STATE ?? "HzpzGHZRTDFrQ7GbEAx1SrCzUq7ykWvF4baBH7z69tcg"
);

export const ORACLE_ACCOUNT = new PublicKey(
  process.env.NEXT_PUBLIC_ORACLE_ACCOUNT ?? "F4kK3Rim3a2ikcqxAasBCr9xtnwVbbP9tDHqFUggUQdw"
);

export const FEE_VAULT = new PublicKey(
  process.env.NEXT_PUBLIC_FEE_VAULT ?? "F4wfXD5yNULQy7tdMwVtNag4XZSQBHSdSACxn7TrmCmr"
);

export const INSURANCE_FUND = new PublicKey(
  process.env.NEXT_PUBLIC_INSURANCE_FUND ?? "5gS3Q9us8yptZ8cbQoQexqAc1ToC2skchRJMefCRZvfn"
);

export const USDC_MINT = new PublicKey(
  process.env.NEXT_PUBLIC_USDC_MINT ?? "3zsAG5W1sqNb9KdAGEceptZTuHGCWGSLCK8nUv4iPQn9"
);

// PDA seeds (mirror constants.rs)
export const PROTOCOL_SEED = Buffer.from("protocol");
export const ORACLE_SEED = Buffer.from("oracle");
export const MARGIN_SEED = Buffer.from("margin");
export const FEE_VAULT_SEED = Buffer.from("fee_vault");
export const INSURANCE_FUND_SEED = Buffer.from("insurance_fund");
export const USDC_MINT_SEED = Buffer.from("usdc_mint");
export const MARKET_SEED = Buffer.from("market");
export const LP_SEED = Buffer.from("lp");
export const LP_POOL_SEED = Buffer.from("liquidity_pool");
export const LP_VAULT_SEED = Buffer.from("lp_vault");

export function getMarginAccountPDA(userPubkey: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [MARGIN_SEED, userPubkey.toBuffer()],
    PROGRAM_ID
  );
  return pda;
}

export function getLiquidityPoolPDA(): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [LP_POOL_SEED],
    PROGRAM_ID
  );
  return pda;
}

export function getLpVaultPDA(): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [LP_VAULT_SEED],
    PROGRAM_ID
  );
  return pda;
}

export function getLpPositionPDA(userPubkey: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [LP_SEED, userPubkey.toBuffer()],
    PROGRAM_ID
  );
  return pda;
}

export const REFERRAL_SEED = Buffer.from("referral");

export function getReferralAccountPDA(userPubkey: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [REFERRAL_SEED, userPubkey.toBuffer()],
    PROGRAM_ID
  );
  return pda;
}

export const LIQUIDITY_POOL = getLiquidityPoolPDA();
export const LP_VAULT = getLpVaultPDA();
