import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Operações | Cremoso',
  description: 'Estoque, reposição e conferência entre unidades.',
  robots: { index: false, follow: false },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
