import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Manrope, Fraunces, Noto_Sans_Tamil } from 'next/font/google'
import './globals.css'

const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope' })
const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-fraunces' })
const notoTamil = Noto_Sans_Tamil({ subsets: ['tamil'], variable: '--font-tamil' })

export const metadata: Metadata = {
  title: 'KhetMitra — Smart Farming Companion',
  description:
    'Land profiling, crop recommendations, market intelligence, fertilizer scheduling, AI leaf diagnosis, profit tracking, subsidies and disaster relief dossiers for farmers.',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  themeColor: '#2f5d3f',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${manrope.variable} ${fraunces.variable} ${notoTamil.variable}`}>
      <body className="antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
