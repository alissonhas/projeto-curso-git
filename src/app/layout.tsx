import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Marca AH Produções',
  description: 'Seu espaço de organização para produzir com clareza.',
  robots: { index: false, follow: false },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
