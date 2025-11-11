import './globals.css';
import { ReactNode } from 'react';

export const metadata = {
  title: 'BKC Portal Hipotecas',
  description: 'Panel de clientes BKC Home - Seguimiento de hipotecas'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-gray-50 text-gray-900">{children}</body>
    </html>
  );
}

