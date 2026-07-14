/**
 * bootstrap-watch-markets.ts — Kronos bootstrap for the luxury-watch catalog.
 *
 * Idempotent. Initializes the liquidity pool (if needed) and, for every market
 * in the catalog below, creates its oracle (seeded with a starting price) and
 * its MarketState PDA.
 *
 * The catalog mirrors the live markets in the static site (`script.js`) so the
 * on-chain market_ids line up with what the UI renders.
 *
 * Run (local validator):
 *   ANCHOR_PROVIDER_URL=http://localhost:8899 \
 *   ANCHOR_WALLET=$HOME/.config/solana/id.json \
 *   yarn ts-node scripts/bootstrap-watch-markets.ts
 */
import * as anchor from "@anchor-lang/core";
import { Program, BN, AnchorProvider } from "@anchor-lang/core";
import {
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Keypair,
  Connection,
} from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import * as fs from "fs";
import * as path from "path";

const PROTOCOL_SEED = Buffer.from("protocol");
const USDC_MINT_SEED = Buffer.from("usdc_mint");
const LP_POOL_SEED = Buffer.from("liquidity_pool");
const LP_VAULT_SEED = Buffer.from("lp_vault");
const ORACLE_SEED = Buffer.from("oracle");
const MARKET_SEED = Buffer.from("market");

// 100k USDC (6 decimals) max OI per side — matches DEFAULT_MAX_MARKET_OI.
const DEFAULT_MAX_OI = new BN("100000000000");

interface MarketConfig {
  marketId: string;
  seedPrice: number; // USD
}

// Live markets from the static site catalog (script.js). market_id must be ≤ 32 bytes.
const MARKETS: MarketConfig[] = [
  { marketId: "WL500-PERP", seedPrice: 48250.0 },
  { marketId: "GOLD-PERP", seedPrice: 2348.5 },
  { marketId: "SILVER-PERP", seedPrice: 28.65 },
  { marketId: "PLATINUM-PERP", seedPrice: 982.4 },
  { marketId: "ROLEX-SUB-PERP", seedPrice: 14250.0 },
  { marketId: "PATEK-NAUTILUS-PERP", seedPrice: 98400.0 },
  { marketId: "AP-ROYAL-OAK-PERP", seedPrice: 52800.0 },
  { marketId: "OMEGA-SPEEDY-PERP", seedPrice: 7850.0 },
  { marketId: "CARTIER-SANTOS-PERP", seedPrice: 9200.0 },
  { marketId: "RM-11-PERP", seedPrice: 248500.0 },
  { marketId: "VC-OVERSEAS-PERP", seedPrice: 31200.0 },
  { marketId: "IWC-PILOT-PERP", seedPrice: 11800.0 },
  { marketId: "TAG-CARRERA-PERP", seedPrice: 6450.0 },
  { marketId: "ROLEX-DAYTONA-PERP", seedPrice: 38750.0 },
  { marketId: "PP-ANNUAL-PERP", seedPrice: 62400.0 },
  { marketId: "AP-OFFSHORE-PERP", seedPrice: 44100.0 },
  { marketId: "OMEGA-SEAMASTER-PERP", seedPrice: 5600.0 },
  { marketId: "CARTIER-TANK-PERP", seedPrice: 4100.0 },
  { marketId: "HUBLOT-BB-PERP", seedPrice: 15800.0 },
  { marketId: "JLC-REVERSO-PERP", seedPrice: 9800.0 },
  { marketId: "PANERAI-LUM-PERP", seedPrice: 8900.0 },
  { marketId: "BREITLING-NAV-PERP", seedPrice: 10200.0 },
  { marketId: "ROLEX-GMT-PERP", seedPrice: 22400.0 },
];

async function main() {
  const rpc = process.env.ANCHOR_PROVIDER_URL || "http://localhost:8899";
  const keyPath =
    process.env.ANCHOR_WALLET || path.join(process.env.HOME!, ".config/solana/id.json");

  const connection = new Connection(rpc, "confirmed");
  const keyData = JSON.parse(fs.readFileSync(keyPath, "utf8"));
  const admin = Keypair.fromSecretKey(new Uint8Array(keyData));
  const wallet = new anchor.Wallet(admin);
  const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
  anchor.setProvider(provider);

  const idlPath = path.join(__dirname, "../target/idl/kronos.json");
  const idl = JSON.parse(fs.readFileSync(idlPath, "utf8"));
  const programId = new PublicKey(idl.address);
  const program = new Program(idl as any, provider) as any;

  const [protocolState] = PublicKey.findProgramAddressSync([PROTOCOL_SEED], programId);
  const [usdcMint] = PublicKey.findProgramAddressSync([USDC_MINT_SEED], programId);
  const [liquidityPool] = PublicKey.findProgramAddressSync([LP_POOL_SEED], programId);
  const [lpVault] = PublicKey.findProgramAddressSync([LP_VAULT_SEED], programId);

  console.log("\n═══════════════════════════════════════════");
  console.log("  Kronos — Bootstrap Watch Markets");
  console.log("═══════════════════════════════════════════");
  console.log("RPC:            ", rpc);
  console.log("Program ID:     ", programId.toBase58());
  console.log("Admin:          ", admin.publicKey.toBase58());
  console.log("LiquidityPool:  ", liquidityPool.toBase58());
  console.log("═══════════════════════════════════════════\n");

  // ── 1. Liquidity pool ──────────────────────────────────────────────────
  let poolExists = false;
  try {
    await program.account.liquidityPool.fetch(liquidityPool);
    poolExists = true;
  } catch (_) {}

  if (poolExists) {
    console.log("✓ Liquidity pool already initialized.\n");
  } else {
    console.log("Initializing liquidity pool...");
    const tx = await program.methods
      .initializePool()
      .accounts({
        admin: admin.publicKey,
        protocolState,
        usdcMint,
        liquidityPool,
        lpVault,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([admin])
      .rpc();
    console.log("✓ Liquidity pool initialized! tx:", tx, "\n");
  }

  // ── 2. Markets (oracle + market state) ─────────────────────────────────
  const created: { marketId: string; oracle: string; market: string }[] = [];

  for (const m of MARKETS) {
    if (Buffer.byteLength(m.marketId) > 32) {
      console.log(`  SKIP ${m.marketId}: market_id exceeds 32 bytes`);
      continue;
    }

    const idBytes = Buffer.from(m.marketId);
    const [oraclePda] = PublicKey.findProgramAddressSync([ORACLE_SEED, idBytes], programId);
    const [marketPda] = PublicKey.findProgramAddressSync([MARKET_SEED, idBytes], programId);
    const seedPriceRaw = new BN(Math.round(m.seedPrice * 1_000_000));

    console.log(`── ${m.marketId} ($${m.seedPrice})`);

    // Oracle
    let oracleExists = false;
    try {
      await program.account.oracleAccount.fetch(oraclePda);
      oracleExists = true;
    } catch (_) {}

    if (oracleExists) {
      console.log(`   oracle exists ${oraclePda.toBase58()}`);
    } else {
      const tx = await program.methods
        .initMarketOracle(m.marketId, seedPriceRaw)
        .accounts({
          admin: admin.publicKey,
          protocolState,
          oracle: oraclePda,
          systemProgram: SystemProgram.programId,
        })
        .signers([admin])
        .rpc();
      console.log(`   oracle init ${oraclePda.toBase58()} tx=${tx.slice(0, 8)}…`);
    }

    // Market state
    let marketExists = false;
    try {
      await program.account.marketState.fetch(marketPda);
      marketExists = true;
    } catch (_) {}

    if (marketExists) {
      console.log(`   market exists ${marketPda.toBase58()}`);
    } else {
      const tx = await program.methods
        .initMarketState(m.marketId, DEFAULT_MAX_OI, DEFAULT_MAX_OI)
        .accounts({
          admin: admin.publicKey,
          protocolState,
          oracle: oraclePda,
          marketState: marketPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([admin])
        .rpc();
      console.log(`   market init ${marketPda.toBase58()} tx=${tx.slice(0, 8)}…`);
    }

    created.push({
      marketId: m.marketId,
      oracle: oraclePda.toBase58(),
      market: marketPda.toBase58(),
    });
  }

  // ── 3. Emit a manifest the UI / keeper can consume ─────────────────────
  const manifest = {
    programId: programId.toBase58(),
    rpc,
    protocolState: protocolState.toBase58(),
    liquidityPool: liquidityPool.toBase58(),
    usdcMint: usdcMint.toBase58(),
    markets: created,
  };
  const outPath = path.join(__dirname, "../app/src/lib/markets.bootstrap.json");
  fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2));

  console.log("\n═══════════════════════════════════════════");
  console.log(`  Done. ${created.length} markets ready.`);
  console.log(`  Manifest written to ${path.relative(process.cwd(), outPath)}`);
  console.log("═══════════════════════════════════════════\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
