import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { Toaster } from 'sonner';
import './globals.css';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'DevLog',
    template: '%s | DevLog',
  },
  description: 'Task tracker for engineering teams',
  keywords: ['task management', 'developer productivity', 'engineering', 'project tracker'],
  authors: [{ name: 'DevLog Team' }],
  creator: 'DevLog',
  applicationName: 'DevLog',
  openGraph: {
    type: 'website',
    title: 'DevLog',
    description: 'Task tracker for engineering teams',
    siteName: 'DevLog',
  },
  twitter: {
    card: 'summary',
    title: 'DevLog',
    description: 'Task tracker for engineering teams',
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  robots: {
    index: true,
    follow: true,
  },
};

const RootLayout: React.FC<{ children: React.ReactNode }> = async ({ children }) => {
  const messages = await getMessages();

  return (
    <html lang="en">
      <body className={inter.className}>
        <NextIntlClientProvider messages={messages}>
          <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
              <Header />
              <main className="flex-1 overflow-auto">{children}</main>
            </div>
          </div>
          <Toaster position="bottom-left" richColors />
        </NextIntlClientProvider>
      </body>
    </html>
  );
};

export default RootLayout;
