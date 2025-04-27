import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Stock Point',
  description: 'Stock market analysis and prediction app',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-100 pt-24`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}

