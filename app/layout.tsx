import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'PES Playground — Potential Energy Surface Explorer',
  description: '山と谷を配置し、EQ・LUP・AFIR・IRC・PTを視覚的に探索できるインタラクティブPES。',
  metadataBase: new URL('https://pes-playground-lab.mossy-teal-5279.chatgpt.site'),
  openGraph: {
    title: 'PES Playground',
    description: 'Potential energy surface explorer',
    images: ['/og.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PES Playground',
    description: 'Potential energy surface explorer',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
