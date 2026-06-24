import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: "img.clerk.com",
      },
      {
        protocol: 'https',
        hostname: "ougpvfsrwlnhfdaxwfle.supabase.co",
      },
      {
        protocol: 'https',
        hostname: "sleepercdn.com",
      },
    ],
  }
};


export default nextConfig;
