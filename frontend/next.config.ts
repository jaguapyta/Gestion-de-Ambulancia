/** @type {import('next').NextConfig} */
const nextConfig = {
  // Salida autocontenida para Docker (genera .next/standalone con su propio server.js).
  output: 'standalone',
  allowedDevOrigins: ['192.168.100.197'],
};

module.exports = nextConfig;