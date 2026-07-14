"use client";

import Link from "next/link";

/**
 * WL500 methodology — index level targets $5,000 (devnet seed / ramp decision 2026-07-02).
 * Constituent weights are equal among the 19 listed watch perps; metals are excluded from the basket.
 */

const CONSTITUENTS: { id: string; name: string; weight: string }[] = [
  { id: "ROLEX-SUB-PERP", name: "Rolex Submariner 126610LN", weight: "1/19" },
  { id: "PATEK-NAUTILUS-PERP", name: "Patek Philippe Nautilus 5711/1A", weight: "1/19" },
  { id: "AP-ROYAL-OAK-PERP", name: "Audemars Piguet Royal Oak 15500ST", weight: "1/19" },
  { id: "OMEGA-SPEEDY-PERP", name: "Omega Speedmaster Professional", weight: "1/19" },
  { id: "CARTIER-SANTOS-PERP", name: "Cartier Santos WSSA0018", weight: "1/19" },
  { id: "RM-11-PERP", name: "Richard Mille RM 11-03", weight: "1/19" },
  { id: "VC-OVERSEAS-PERP", name: "Vacheron Constantin Overseas", weight: "1/19" },
  { id: "IWC-PILOT-PERP", name: "IWC Big Pilot", weight: "1/19" },
  { id: "TAG-CARRERA-PERP", name: "TAG Heuer Carrera", weight: "1/19" },
  { id: "ROLEX-DAYTONA-PERP", name: "Rolex Daytona 116500LN", weight: "1/19" },
  { id: "PP-ANNUAL-PERP", name: "Patek Philippe Annual Calendar", weight: "1/19" },
  { id: "AP-OFFSHORE-PERP", name: "AP Royal Oak Offshore", weight: "1/19" },
  { id: "OMEGA-SEAMASTER-PERP", name: "Omega Seamaster Diver 300M", weight: "1/19" },
  { id: "CARTIER-TANK-PERP", name: "Cartier Tank Must", weight: "1/19" },
  { id: "HUBLOT-BB-PERP", name: "Hublot Big Bang", weight: "1/19" },
  { id: "JLC-REVERSO-PERP", name: "Jaeger-LeCoultre Reverso", weight: "1/19" },
  { id: "PANERAI-LUM-PERP", name: "Panerai Luminor Marina", weight: "1/19" },
  { id: "BREITLING-NAV-PERP", name: "Breitling Navitimer", weight: "1/19" },
  { id: "ROLEX-GMT-PERP", name: "Rolex GMT-Master II", weight: "1/19" },
];

export default function Wl500Page() {
  return (
    <div className="min-h-screen bg-bg text-primary px-4 md:px-8 py-10 pb-24">
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <Link href="/" className="text-[11px] text-secondary hover:text-long">
            &larr; Trade
          </Link>
          <h1 className="mt-3 text-2xl font-bold tracking-wide">WL500 Index</h1>
          <p className="mt-2 text-sm text-secondary leading-relaxed">
            Equal-weighted basket of Kronos&rsquo;s 19 listed luxury-watch perpetual markets.
            Target index level on devnet: <span className="text-primary font-mono">$5,000</span>.
          </p>
        </div>

        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-secondary">Methodology</h2>
          <ul className="text-sm text-secondary space-y-2 leading-relaxed list-disc pl-5">
            <li>
              <strong className="text-primary">Universe:</strong> all live watch perps on Kronos
              (Rolex, Patek, AP, Omega, Cartier, RM, VC, IWC, TAG, Hublot, JLC, Panerai, Breitling).
              Commodity markets (GOLD, SILVER, PLATINUM, DIAMOND) are <em>not</em> in the basket.
            </li>
            <li>
              <strong className="text-primary">Weighting:</strong> equal weight (1/19 each). No market-cap
              or liquidity tilt in v1.
            </li>
            <li>
              <strong className="text-primary">Level:</strong> the on-chain WL500 oracle is an{" "}
              <em>index level</em>, not a sum of watch prices. Devnet target is $5,000 (ramped from the
              earlier ~$47.6k seed).
            </li>
            <li>
              <strong className="text-primary">Pricing (devnet):</strong> synthetic — the keeper drives
              WL500 with a bounded random walk around $5,000. A production build would recompute the
              level from constituent oracle prices each tick:
              <code className="block mt-2 text-[11px] font-mono text-primary/80 bg-panel border border-border p-3 overflow-x-auto">
                WL500_t = 5000 × Σ_i (P_i,t / P_i,0) / 19
              </code>
              where P_i,0 is each constituent&rsquo;s base price at index inception.
            </li>
            <li>
              <strong className="text-primary">Rebalance:</strong> none in v1. Adding/removing markets
              requires a documented reconstitution and a new base date.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-secondary mb-3">
            Constituents ({CONSTITUENTS.length})
          </h2>
          <div className="border border-border overflow-hidden">
            <table className="w-full text-left text-[12px] font-mono">
              <thead>
                <tr className="border-b border-border text-secondary text-[10px] uppercase tracking-wider">
                  <th className="px-3 py-2 font-semibold">Market</th>
                  <th className="px-3 py-2 font-semibold">Reference</th>
                  <th className="px-3 py-2 font-semibold text-right">Weight</th>
                </tr>
              </thead>
              <tbody>
                {CONSTITUENTS.map((c) => (
                  <tr key={c.id} className="border-b border-border/60 last:border-0">
                    <td className="px-3 py-2 text-long">{c.id}</td>
                    <td className="px-3 py-2 text-secondary">{c.name}</td>
                    <td className="px-3 py-2 text-right text-primary">{c.weight}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <p className="text-[11px] text-secondary/70 leading-relaxed">
          This methodology is provisional for the Kronos devnet demo. It is not investment advice and
          does not claim to track a third-party published watch index.
        </p>
      </div>
    </div>
  );
}
