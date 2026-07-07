/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // We run lint separately; do not block production builds on lint warnings.
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse'],
  },
};

module.exports = nextConfig;
