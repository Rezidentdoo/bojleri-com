import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ugrađuje CMS env u middleware pri build-u (self-hosted).
  env: {
    CMS_PASSWORD: process.env.CMS_PASSWORD,
    CMS_SECRET: process.env.CMS_SECRET,
  },
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
