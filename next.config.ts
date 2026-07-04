import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["duckdb"],
  allowedDevOrigins: ["lenovo-bigdog.camel-dragon.ts.net"],
};

export default nextConfig;
