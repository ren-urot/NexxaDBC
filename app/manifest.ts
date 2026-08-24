import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'DBC Holder',
    short_name: 'DBC Holder',
    description: 'Your digital business card, saved to your phone.',
    start_url: '/holder',
    scope: '/holder',
    display: 'standalone',
    background_color: '#fff8f4',
    theme_color: '#ff5a1f',
    icons: [
      {
        src: '/icon',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
