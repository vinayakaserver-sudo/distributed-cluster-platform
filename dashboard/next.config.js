/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(process.env.BUILD_STANDALONE === 'true' ? { output: 'standalone' } : {}),
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  },
};
module.exports = nextConfig;
