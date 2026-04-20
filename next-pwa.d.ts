declare module 'next-pwa' {
  import { NextConfig } from 'next'
  interface PWAConfig {
    dest?: string
    register?: boolean
    skipWaiting?: boolean
    disable?: boolean
    runtime?: string
    fallbacks?: {
      document?: string
      font?: string
      image?: string
      script?: string
      style?: string
    }
  }
  function withPWA(config: PWAConfig): (config: NextConfig) => NextConfig
  export default withPWA
}