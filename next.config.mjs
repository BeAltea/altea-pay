/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // NOTE: Do NOT put ASAAS_API_KEY in env or serverRuntimeConfig.
  // The env block inlines values at BUILD TIME, so if the key wasn't set
  // during build, it stays empty forever. Server Actions and API routes
  // can read process.env.ASAAS_API_KEY directly at runtime.
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.externals = config.externals || []
      config.externals.push({
        twilio: 'commonjs twilio',
      })
      
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        http: false,
        https: false,
        zlib: false,
        path: false,
        os: false,
      }
    }
    return config
  },
}

export default nextConfig
