"use strict";

/**
 * gen-app-markets.js — regenerate app/src/lib/markets.ts from the on-chain
 * bootstrap manifest, producing the luxury-watch market catalog that mirrors
 * the static site (script.js) and points at real oracle PDAs.
 *
 * Run: node scripts/gen-app-markets.js
 */
const fs = require("fs");
const path = require("path");

const manifest = require("../app/src/lib/markets.bootstrap.json");

const W = [
  "https://images.unsplash.com/photo-1523170335258-f5ed11844cfe?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1614164185125-e4834f113aa6?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1622433721438-14366f4a5f57?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1587836374828-4dbafa94a0e2?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1547996160-81dfa97665a9?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1613857851772-8066a4b51562?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1611591437281-460bfbeb52b7?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1551816230-ef5deaed4a26?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1594534475808-f9f22c27b1e2?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1524593964546-eadffd65a3b4?w=400&h=400&fit=crop",
];
const C = {
  gold: "https://images.unsplash.com/photo-1610375461246-0c10621b98d2?w=400&h=400&fit=crop",
  silver: "https://images.unsplash.com/photo-1621451537820-481b465741cd?w=400&h=400&fit=crop",
  platinum: "https://images.unsplash.com/photo-1606814899291-dceeefa944a0?w=400&h=400&fit=crop",
  diamond: "https://images.unsplash.com/photo-1515562141203-7a88fb7ce338?w=400&h=400&fit=crop",
};

// name -> { subtitle, badge, image, type }
const CATALOG = {
  "WL500-PERP": { subtitle: "WL500 Index \u00B7 Top 500 Luxury Watches", badge: "INDEX", image: W[0], type: "INDEX" },
  "GOLD-PERP": { subtitle: "Gold \u00B7 XAU/USD \u00B7 Troy Oz Spot", badge: "COMMODITY", image: C.gold, type: "INDEX" },
  "SILVER-PERP": { subtitle: "Silver \u00B7 XAG/USD \u00B7 Troy Oz Spot", badge: "COMMODITY", image: C.silver, type: "INDEX" },
  "PLATINUM-PERP": { subtitle: "Platinum \u00B7 XPT/USD \u00B7 Troy Oz Spot", badge: "COMMODITY", image: C.platinum, type: "INDEX" },
  "DIAMOND-PERP": { subtitle: "Diamond \u00B7 1ct Round Brilliant \u00B7 Rapaport Index", badge: "COMMODITY", image: C.diamond, type: "INDEX" },
  "ROLEX-SUB-PERP": { subtitle: "Rolex Submariner \u00B7 126610LN \u00B7 Oystersteel", badge: "HOT", image: W[9], type: "CARDS" },
  "PATEK-NAUTILUS-PERP": { subtitle: "Patek Philippe \u00B7 Nautilus 5711/1A", badge: "", image: W[1], type: "CARDS" },
  "AP-ROYAL-OAK-PERP": { subtitle: "Audemars Piguet \u00B7 Royal Oak 15500ST", badge: "NEW", image: W[2], type: "CARDS" },
  "OMEGA-SPEEDY-PERP": { subtitle: "Omega Speedmaster \u00B7 Moonwatch Professional", badge: "", image: W[3], type: "CARDS" },
  "CARTIER-SANTOS-PERP": { subtitle: "Cartier Santos \u00B7 Large Model WSSA0018", badge: "", image: W[4], type: "CARDS" },
  "RM-11-PERP": { subtitle: "Richard Mille \u00B7 RM 11-03 \u00B7 Flyback Chronograph", badge: "HOT", image: W[5], type: "CARDS" },
  "VC-OVERSEAS-PERP": { subtitle: "Vacheron Constantin \u00B7 Overseas 4500V", badge: "", image: W[6], type: "CARDS" },
  "IWC-PILOT-PERP": { subtitle: "IWC Big Pilot \u00B7 IW501001", badge: "", image: W[7], type: "CARDS" },
  "TAG-CARRERA-PERP": { subtitle: "TAG Heuer Carrera \u00B7 Glassbox Chronograph", badge: "", image: W[8], type: "CARDS" },
  "ROLEX-DAYTONA-PERP": { subtitle: "Rolex Daytona \u00B7 116500LN \u00B7 Panda Dial", badge: "HOT", image: W[0], type: "CARDS" },
  "PP-ANNUAL-PERP": { subtitle: "Patek Philippe \u00B7 Annual Calendar 5205G", badge: "", image: W[1], type: "CARDS" },
  "AP-OFFSHORE-PERP": { subtitle: "Audemars Piguet \u00B7 Royal Oak Offshore", badge: "", image: W[2], type: "CARDS" },
  "OMEGA-SEAMASTER-PERP": { subtitle: "Omega Seamaster \u00B7 300M Co-Axial", badge: "", image: W[3], type: "CARDS" },
  "CARTIER-TANK-PERP": { subtitle: "Cartier Tank \u00B7 Must de Cartier", badge: "", image: W[4], type: "CARDS" },
  "HUBLOT-BB-PERP": { subtitle: "Hublot Big Bang \u00B7 Unico Titanium", badge: "", image: W[5], type: "CARDS" },
  "JLC-REVERSO-PERP": { subtitle: "Jaeger-LeCoultre \u00B7 Reverso Classic", badge: "", image: W[6], type: "CARDS" },
  "PANERAI-LUM-PERP": { subtitle: "Panerai Luminor \u00B7 Marina 1312", badge: "", image: W[7], type: "CARDS" },
  "BREITLING-NAV-PERP": { subtitle: "Breitling Navitimer \u00B7 B01 Chronograph", badge: "", image: W[8], type: "CARDS" },
  "ROLEX-GMT-PERP": { subtitle: "Rolex GMT-Master II \u00B7 126710BLNR", badge: "", image: W[9], type: "CARDS" },
};

const programId = manifest.programId;

const entries = manifest.markets.map((m) => {
  const meta = CATALOG[m.marketId] || {
    subtitle: m.marketId,
    badge: "",
    image: W[0],
    type: "CARDS",
  };
  const id = m.marketId.replace(/-PERP$/, "");
  return {
    id,
    name: m.marketId,
    subtitle: meta.subtitle,
    badge: meta.badge,
    live: true,
    oracleAddress: m.oracle,
    programId,
    image: meta.image,
    priceApiMarket: m.marketId,
    type: meta.type,
  };
});

const header = `export type MarketType = "CARDS" | "SEALED" | "INDEX";

export type Market = {
  id: string;
  name: string;
  subtitle: string;
  badge: string;
  live: boolean;
  oracleAddress: string;
  programId: string;
  tcgplayerId?: number;
  image?: string;
  /** Keeper API market query param (matches on-chain market_id) */
  priceApiMarket: string;
  type: MarketType;
};

// AUTO-GENERATED by scripts/gen-app-markets.js from the on-chain bootstrap
// manifest (app/src/lib/markets.bootstrap.json). Do not edit by hand; rerun
// the generator after re-bootstrapping markets.
export const MARKETS: Market[] = ${JSON.stringify(entries, null, 2)};
`;

const out = path.join(__dirname, "../app/src/lib/markets.ts");
fs.writeFileSync(out, header);
console.log(`Wrote ${entries.length} markets to ${path.relative(process.cwd(), out)}`);
