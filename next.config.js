/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  // Disable automatic service worker generation for public PWA
  // We use manual service workers for each PWA (admin, pos, scanner)
  buildExcludes: [/sw-admin\.js$/, /sw-pos\.js$/, /sw-scanner\.js$/],
});

const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [],
  },
  // Allow subdomains
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
        ],
      },
    ];
  },
};

module.exports = withPWA(nextConfig);

