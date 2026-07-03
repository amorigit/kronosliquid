/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // Local keeper API (keeper/watch-keeper.js serves prices/candles/history).
    const keeperApi = process.env.KEEPER_API_URL || "http://localhost:3001";
    return [
      { source: "/api/keeper/:path*", destination: `${keeperApi}/:path*` },
      { source: "/api/v1/:path*", destination: `${keeperApi}/:path*` },
    ];
  },
  webpack: (config) => {
    // Required for Anchor / Solana web3.js in browser
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      os: false,
      path: false,
      crypto: false,
    };
    return config;
  },
};

module.exports = nextConfig;
