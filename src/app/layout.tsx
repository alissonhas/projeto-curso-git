import type { Metadata, Viewport } from 'next';
import { PwaPanel } from '@/components/pwa-panel';
import './globals.css';
export const metadata: Metadata = {
  title: 'Marca AH Produções',
  description: 'Seu espaço de organização para produzir com clareza.',
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: 'AH Produções', statusBarStyle: 'default' },
  icons: { icon: '/pwa-icon/192', apple: '/pwa-icon/180' },
};
export const viewport: Viewport = { themeColor: '#202126', width: 'device-width', initialScale: 1 };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}<PwaPanel /></body></html>;
}
