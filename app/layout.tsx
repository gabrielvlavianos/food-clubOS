import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Food Club OS',
  description: 'Sistema de gestão de refeições e cardápios',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Inject build time to force new files on each deploy
  const buildTime = process.env.BUILD_TIME || new Date().toISOString();
  const deployId = process.env.DEPLOY_ID || 'local';

  return (
    <html lang="en">
      <head>
        <meta name="build-time" content={buildTime} />
        <meta name="deploy-id" content={deployId} />
      </head>
      <body className={inter.className}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
