/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.r2.dev',   // Cloudflare R2 public bucket
      },
      {
        protocol: 'https',
        hostname: 'image.mux.com', // Mux thumbnail images
      },
    ],
  },
}

export default nextConfig
