import type { Metadata, Viewport } from 'next'
import { Roboto_Slab, DM_Sans } from 'next/font/google'
import { ServiceWorkerRegistrar } from '@/components/ui/ServiceWorkerRegistrar'
import './globals.css'

const display = Roboto_Slab({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['400', '600', '700'],
})

const sans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['400', '500', '600', '700'],
})

export const viewport: Viewport = {
  themeColor: '#1C22FF',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export const metadata: Metadata = {
  title: 'Sacolas Braga',
  description: 'Sistema de Gestão de Produção',
  manifest: '/manifest.json',
  icons: {
    apple: '/icons/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Sacolas Braga',
  },
  formatDetection: {
    telephone: false,
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${display.variable} ${sans.variable} font-sans antialiased bg-brand-cream`}>
        <ServiceWorkerRegistrar />
        {children}
      </body>
    </html>
  )
}
