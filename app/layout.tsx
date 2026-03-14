import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Sidebar } from '@/components/Sidebar';
import { TopNav } from '@/components/TopNav';
import { PageErrorBoundary } from '@/components/ErrorBoundary';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Hollywood Hills Civic | Premium Dashboard',
  description: 'Stay informed about your neighborhood',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="h-dvh overflow-hidden bg-stone-50">
          <TopNav />
          <div className="pt-16 h-full flex">
            <Sidebar />
            <main className="flex-1 h-full overflow-y-auto scrollbar-hide">
              <PageErrorBoundary>
                {children}
              </PageErrorBoundary>
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
