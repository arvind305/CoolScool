import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/layout';
import { Footer } from '@/components/layout';
import { SessionProvider } from '@/components/providers/session-provider';
import { QueryProvider } from '@/components/providers/query-provider';
import { ToastProvider } from '@/components/ui/toast';
import { CurriculumProvider } from '@/contexts/CurriculumContext';

export const metadata: Metadata = {
  title: 'Cool S-Cool | Pressure-free Curriculum Practice',
  description: 'Master your curriculum with adaptive practice. ICSE, CBSE, and State Board content for classes 1-12.',
  keywords: ['education', 'quiz', 'practice', 'ICSE', 'CBSE', 'mathematics', 'science'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <SessionProvider>
          <QueryProvider>
            <CurriculumProvider>
              <ToastProvider>
                <Header />
                <main className="flex-1">
                  {children}
                </main>
                <Footer />
              </ToastProvider>
            </CurriculumProvider>
          </QueryProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
