/** @type {import('next').NextConfig} */
const nextConfig = {
  // ...existing config...
  images: {
    // if you already have an images block, just add 'sleepercdn.com' to domains
    domains: [
      // ...existing domains...
      'sleepercdn.com',
      'img.clerk.com',
      'images.clerk.dev',
    ],
    remotePatterns: [
      // ...existing patterns...
      {
        protocol: 'https',
        hostname: 'sleepercdn.com',
        pathname: '/avatars/thumbs/**',
      },
      {
        protocol: 'https',
        hostname: 'img.clerk.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.clerk.dev',
        pathname: '/**',
      },
    ],
  },
};

module.exports = nextConfig;
