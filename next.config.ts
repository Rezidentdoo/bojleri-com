import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-hosted: public/uploads se servira automatski; remotePatterns su za spoljne/CDN slike.
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.aqualand.rs",
        pathname: "/images/**",
      },
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
