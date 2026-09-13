import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Enamad's crawler is not in Next's default bot list, so metadata was streamed
  // after scripts. Blocking metadata puts the verification tag in the initial <head>.
  htmlLimitedBots: /.*/,

  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: '/api/:path*',
      },
    ];
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          {
            key: 'Content-Security-Policy',
            value:
              "frame-ancestors 'self' https://enamad.ir https://*.enamad.ir https://trustseal.enamad.ir",
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(self), geolocation=()',
          },
        ],
      },
      {
        source: '/24876525.txt',
        headers: [
          { key: 'Content-Type', value: 'text/plain' },
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
        ],
      },
      {
        source: '/downloads/:file*.apk',
        headers: [
          { key: 'Content-Type', value: 'application/vnd.android.package-archive' },
          {
            key: 'Content-Disposition',
            value: 'attachment; filename="smart-mec.apk"',
          },
        ],
      },
    ];
  },

  images: {
    dangerouslyAllowSVG: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;
