import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["garmin-connect"],
  async rewrites() {
    return [{ source: "/index.html", destination: "/" }];
  },
};
