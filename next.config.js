/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    PORTFOLIO_API_URL: process.env.PORTFOLIO_API_URL,
  },
};

module.exports = nextConfig;
