import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Remove the experimental turbo config temporarily
  // experimental: {
  //   turbo: {
  //     rules: {
  //       '*.test.ts': {
  //         loaders: ['ignore'],
  //       },
  //       '*.test.tsx': {
  //         loaders: ['ignore'],
  //       },
  //       '**/__tests__/**': {
  //         loaders: ['ignore'],
  //       },
  //     },
  //   },
  // },
}

export default nextConfig
