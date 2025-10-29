/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  async rewrites() {
    const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL ||   process.env.NODE_ENV === 'production'    ? 'https://parsons-tutor.dedyn.io'    : 'http://localhost:8000';

    return [
      {
        source: '/api/:path*',
        destination: `${API_URL}/api/:path*`,
      },
    ];
  },
}

module.exports = nextConfig;