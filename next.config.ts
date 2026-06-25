import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.aqualand.rs",
        pathname: "/images/**",
      },
    ],
  },
};

export default nextConfig;
