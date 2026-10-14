import type { MetadataRoute } from 'next';
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/', name: 'Marca AH Produções', short_name: 'AH Produções',
    description: 'Seu espaço privado de organização de produções.', lang: 'pt-BR',
    start_url: '/', scope: '/', display: 'standalone', background_color: '#f7f8f4', theme_color: '#202126',
    icons: [
      { src: '/pwa-icon/192', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/pwa-icon/512', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  };
}
