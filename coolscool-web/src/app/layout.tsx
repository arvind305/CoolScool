import type { Metadata } from 'next';
import './globals.css';
import { Header, Footer, BottomNav } from '@/components/layout';
import { SessionProvider } from '@/components/providers/session-provider';
import { QueryProvider } from '@/components/providers/query-provider';
import { ToastProvider } from '@/components/ui/toast';
import { CurriculumProvider } from '@/contexts/CurriculumContext';

export const metadata: Metadata = {
  title: 'CoolScool | Pressure-free Curriculum Practice',
  description: 'Master your curriculum with adaptive practice. ICSE, CBSE, and State Board content for classes 1-12.',
  keywords: ['education', 'quiz', 'practice', 'ICSE', 'CBSE', 'mathematics', 'science'],
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'CoolScool | Pressure-free Curriculum Practice',
    description: 'Master your curriculum with adaptive practice. ICSE, CBSE, and State Board content for classes 1-12.',
    url: 'https://www.coolscool.in',
    siteName: 'CoolScool',
    images: [
      {
        url: 'https://www.coolscool.in/og-image.png',
        width: 1200,
        height: 630,
        alt: 'CoolScool — Pressure-free Curriculum Practice',
      },
    ],
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CoolScool | Pressure-free Curriculum Practice',
    description: 'Master your curriculum with adaptive practice. ICSE, CBSE, and State Board content for classes 1-12.',
    images: ['https://www.coolscool.in/og-image.png'],
  },
};

// Script to apply theme immediately on page load (prevents flash)
const themeScript = `
  (function() {
    try {
      const stored = localStorage.getItem('coolscool_settings');
      const settings = stored ? JSON.parse(stored) : null;
      const theme = settings?.theme || 'system';
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (theme === 'dark' || (theme === 'system' && systemDark)) {
        document.documentElement.classList.add('dark');
      }
    } catch (e) {}
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
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
                <BottomNav />
              </ToastProvider>
            </CurriculumProvider>
          </QueryProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
