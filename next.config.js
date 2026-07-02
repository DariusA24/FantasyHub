/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'sleepercdn.com',
      },
      {
        protocol: 'https',
        hostname: 'img.clerk.com',
      },
      {
        protocol: 'https',
        hostname: 'images.clerk.dev',
      },
      {
        protocol: 'https',
        hostname: 'ougpvfsrwlnhfdaxwfle.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'a.espncdn.com',
      },
    ],
  },
};

module.exports = nextConfig;
