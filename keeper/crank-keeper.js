"use strict";

/**
 * crank-keeper.js — DEVnet funding / liquidation / SL-TP crank for Kronos.
 *
 * Scans MarginAccount PDAs, settles funding per open market, and attempts
 * liquidate + execute_sl_tp (no-ops when positions are healthy).
 *
 * Env (keeper/.env):
 *   RPC_URL, ANCHOR_WALLET, MANIFEST_PATH
 *   CRANK_INTERVAL_MS   default 30000
 */
const fs = require("fs");
const path = require("path");
const {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
} = require("@solana/web3.js");
const {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  getAccount,
} = require("@solana/spl-token");

(function loadEnv() {
  const p = path.join(__dirname, ".env");
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
})();

const { sendAlert } = require("./telegram");

const RPC_URL = process.env.RPC_URL || "https://api.devnet.solana.com";
const INTERVAL_MS = Math.max(parseInt(process.env.CRANK_INTERVAL_MS || "30000", 10), 10000);
const KEY_PATH =
  process.env.ANCHOR_WALLET || path.join(process.env.HOME, ".config/solana/id.json");
const MANIFEST_PATH =
  process.env.MANIFEST_PATH || path.join(__dirname, "../app/src/lib/markets.bootstrap.json");

const MARGIN_DISC = Buffer.from([133, 220, 173, 213, 179, 211, 43, 238]);
const SETTLE_DISC = Buffer.from([11, 251, 12, 161, 199, 228, 133, 87]);
const LIQ_DISC = Buffer.from([223, 179, 226, 125, 48, 46, 39, 74]);
const SLTP_DISC = Buffer.from([206, 15, 117, 20, 118, 220, 155, 84]);
const PAUSE_DISC = Buffer.from([51, 150, 85, 59, 177, 120, 110, 24]);

const TOKEN_PROGRAM = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const POSITION_SPACE = 92;

/** Counters exposed for /health merge via file */
const STATS_PATH = path.join(__dirname, "crank-stats.json");
const stats = {
  funding_settlements_1h: 0,
  liquidation_checks_1h: 0,
  liquidations_1h: 0,
  sltp_checks_1h: 0,
  last_crank: 0,
  last_error: null,
};
const hourBuckets = { funding: [], liqChecks: [], liqs: [], sltp: [] };

function log(msg) {
  console.log(`[${new Date().toISOString()}] [crank] ${msg}`);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function loadKeypair(p) {
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(p, "utf8"))));
}

function trimHour(arr, now) {
  while (arr.length && arr[0] < now - 3600) arr.shift();
}

function persistStats() {
  const now = Math.floor(Date.now() / 1000);
  trimHour(hourBuckets.funding, now);
  trimHour(hourBuckets.liqChecks, now);
  trimHour(hourBuckets.liqs, now);
  trimHour(hourBuckets.sltp, now);
  stats.funding_settlements_1h = hourBuckets.funding.length;
  stats.liquidation_checks_1h = hourBuckets.liqChecks.length;
  stats.liquidations_1h = hourBuckets.liqs.length;
  stats.sltp_checks_1h = hourBuckets.sltp.length;
  stats.last_crank = now;
  try {
    fs.writeFileSync(STATS_PATH, JSON.stringify(stats));
  } catch {
    /* ignore */
  }
}

function parsePositions(data) {
  // disc(8) + owner(32) + collateral(8) + 5 * (1 + 92)
  const positions = [];
  let off = 8 + 32 + 8;
  const owner = new PublicKey(data.subarray(8, 40));
  for (let i = 0; i < 5; i++) {
    const tag = data[off];
    off += 1;
    if (tag === 1) {
      const oracle = new PublicKey(data.subarray(off, off + 32));
      // direction at off+32
      let slOff = off + 32 + 1 + 8 + 8 + 1 + 8 + 8 + 8;
      const slTag = data[slOff];
      let tpOff = slOff + 1 + (slTag === 1 ? 8 : 0);
      const tpTag = data[tpOff];
      positions.push({
        index: i,
        oracle,
        hasSl: slTag === 1,
        hasTp: tpTag === 1,
      });
    }
    off += POSITION_SPACE;
  }
  return { owner, positions };
}

async function ensureAta(connection, payer, mint) {
  const ata = getAssociatedTokenAddressSync(mint, payer.publicKey);
  try {
    await getAccount(connection, ata);
    return { ata, createIx: null };
  } catch {
    return {
      ata,
      createIx: createAssociatedTokenAccountInstruction(payer.publicKey, ata, payer.publicKey, mint),
    };
  }
}

async function sendIx(connection, payer, ixs, label) {
  const tx = new Transaction();
  for (const ix of ixs) tx.add(ix);
  const { blockhash } = await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;
  tx.feePayer = payer.publicKey;
  tx.sign(payer);
  const sig = await connection.sendRawTransaction(tx.serialize(), {
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });
  log(`  ok ${label} ${sig.slice(0, 8)}…`);
  return sig;
}

async function main() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  const programId = new PublicKey(manifest.programId);
  const protocolState = new PublicKey(manifest.protocolState);
  const liquidityPool = new PublicKey(manifest.liquidityPool);
  const usdcMint = new PublicKey(manifest.usdcMint);
  const feeVaultPk = new PublicKey("F4wfXD5yNULQy7tdMwVtNag4XZSQBHSdSACxn7TrmCmr");
  const insurancePk = new PublicKey("5gS3Q9us8yptZ8cbQoQexqAc1ToC2skchRJMefCRZvfn");
  const lpVault = PublicKey.findProgramAddressSync([Buffer.from("lp_vault")], programId)[0];

  const oracleToMarket = new Map();
  for (const m of manifest.markets) {
    oracleToMarket.set(m.oracle, {
      marketId: m.marketId,
      market: new PublicKey(m.market),
      oracle: new PublicKey(m.oracle),
    });
  }

  const payer = loadKeypair(KEY_PATH);
  const connection = new Connection(RPC_URL, "confirmed");

  log(`starting crank interval=${INTERVAL_MS}ms admin=${payer.publicKey.toBase58()}`);
  log(`  program=${programId.toBase58()} markets=${oracleToMarket.size}`);

  async function runCrank() {
    const now = Math.floor(Date.now() / 1000);
    try {
      const { ata: liqAta, createIx } = await ensureAta(connection, payer, usdcMint);
      if (createIx) {
        await sendIx(connection, payer, [createIx], "create-liq-ata");
      }

      const accounts = await connection.getProgramAccounts(programId, {
        filters: [{ dataSize: 8 + 32 + 8 + 5 * (1 + POSITION_SPACE) + 1 + 32 }],
      });
      const margins = accounts.filter((a) => a.account.data.subarray(0, 8).equals(MARGIN_DISC));

      log(`scan ${margins.length} margin accounts`);

      for (const { pubkey, account } of margins) {
        const { owner, positions } = parsePositions(account.data);
        if (!positions.length) continue;

        for (const pos of positions) {
          const m = oracleToMarket.get(pos.oracle.toBase58());
          if (!m) continue;

          // settle_funding
          try {
            const ix = new TransactionInstruction({
              programId,
              keys: [
                { pubkey: payer.publicKey, isSigner: true, isWritable: false },
                { pubkey: protocolState, isSigner: false, isWritable: true },
                { pubkey: m.oracle, isSigner: false, isWritable: false },
                { pubkey: m.market, isSigner: false, isWritable: true },
                { pubkey, isSigner: false, isWritable: true },
                { pubkey: feeVaultPk, isSigner: false, isWritable: true },
                { pubkey: insurancePk, isSigner: false, isWritable: true },
                { pubkey: liquidityPool, isSigner: false, isWritable: true },
                { pubkey: TOKEN_PROGRAM, isSigner: false, isWritable: false },
              ],
              data: SETTLE_DISC,
            });
            await sendIx(connection, payer, [ix], `settle ${owner.toBase58().slice(0, 6)} ${m.marketId}`);
            hourBuckets.funding.push(now);
          } catch (e) {
            // Often "nothing to settle" / constraint — ignore
            const msg = String(e.message || e);
            if (!/custom program error|Simulation failed|0x1/.test(msg)) {
              log(`  settle skip: ${msg.slice(0, 100)}`);
            }
          }

          hourBuckets.liqChecks.push(now);
          hourBuckets.sltp.push(now);

          // liquidate
          try {
            const userBuf = owner.toBytes();
            const data = Buffer.concat([LIQ_DISC, userBuf, Buffer.from([pos.index])]);
            const ix = new TransactionInstruction({
              programId,
              keys: [
                { pubkey: payer.publicKey, isSigner: true, isWritable: true },
                { pubkey: owner, isSigner: false, isWritable: false },
                { pubkey: protocolState, isSigner: false, isWritable: true },
                { pubkey, isSigner: false, isWritable: true },
                { pubkey: m.oracle, isSigner: false, isWritable: false },
                { pubkey: m.market, isSigner: false, isWritable: true },
                { pubkey: feeVaultPk, isSigner: false, isWritable: true },
                { pubkey: insurancePk, isSigner: false, isWritable: true },
                { pubkey: liqAta, isSigner: false, isWritable: true },
                { pubkey: liquidityPool, isSigner: false, isWritable: true },
                { pubkey: TOKEN_PROGRAM, isSigner: false, isWritable: false },
              ],
              data,
            });
            await sendIx(connection, payer, [ix], `liq ${owner.toBase58().slice(0, 6)}#${pos.index}`);
            hourBuckets.liqs.push(now);
          } catch {
            /* not liquidatable */
          }

          // execute_sl_tp
          if (pos.hasSl || pos.hasTp) {
            try {
              const userBuf = owner.toBytes();
              const data = Buffer.concat([SLTP_DISC, userBuf, Buffer.from([pos.index])]);
              const ix = new TransactionInstruction({
                programId,
                keys: [
                  { pubkey: payer.publicKey, isSigner: true, isWritable: true },
                  { pubkey: owner, isSigner: false, isWritable: false },
                  { pubkey: protocolState, isSigner: false, isWritable: true },
                  { pubkey, isSigner: false, isWritable: true },
                  { pubkey: m.oracle, isSigner: false, isWritable: false },
                  { pubkey: m.market, isSigner: false, isWritable: true },
                  { pubkey: feeVaultPk, isSigner: false, isWritable: true },
                  { pubkey: insurancePk, isSigner: false, isWritable: true },
                  { pubkey: liqAta, isSigner: false, isWritable: true },
                  { pubkey: liquidityPool, isSigner: false, isWritable: true },
                  { pubkey: lpVault, isSigner: false, isWritable: true },
                  { pubkey: TOKEN_PROGRAM, isSigner: false, isWritable: false },
                ],
                data,
              });
              await sendIx(connection, payer, [ix], `sltp ${owner.toBase58().slice(0, 6)}#${pos.index}`);
            } catch {
              /* not triggered */
            }
          }

          await sleep(150);
        }
      }

      // check_and_pause on first market oracle (permissionless staleness guard)
      try {
        const first = manifest.markets[0];
        if (first) {
          const ix = new TransactionInstruction({
            programId,
            keys: [
              { pubkey: payer.publicKey, isSigner: true, isWritable: false },
              { pubkey: protocolState, isSigner: false, isWritable: true },
              { pubkey: new PublicKey(first.oracle), isSigner: false, isWritable: false },
              { pubkey: new PublicKey(first.market), isSigner: false, isWritable: false },
            ],
            data: PAUSE_DISC,
          });
          await sendIx(connection, payer, [ix], "check_and_pause");
        }
      } catch {
        /* oracle fresh */
      }

      stats.last_error = null;
    } catch (e) {
      stats.last_error = String(e.message || e).slice(0, 200);
      log(`ERROR ${stats.last_error}`);
      sendAlert("CRITICAL", "Crank scan failed", {
        error: stats.last_error,
      }).catch(() => {});
    }
    persistStats();
  }

  await runCrank();
  setInterval(() => {
    runCrank().catch((e) => {
      log(`tick error: ${e.message || e}`);
      sendAlert("CRITICAL", "Crank tick failed", {
        error: String(e.message || e).slice(0, 200),
      }).catch(() => {});
    });
  }, INTERVAL_MS);
}

main().catch((e) => {
  console.error("FATAL crank:", e);
  sendAlert("CRITICAL", "Crank fatal exit", {
    error: String(e.message || e).slice(0, 200),
  }).finally(() => process.exit(1));
});
