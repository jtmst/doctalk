import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  logging: false,
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;
