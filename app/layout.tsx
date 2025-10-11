import type { ReactNode } from 'react'
import './globals.css'

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Advertise that both light & dark are supported */}
        <meta name="color-scheme" content="light dark" />
      </head>
      {/* Use a class that reads colors from CSS variables, not fixed Tailwind colors */}
      <body className="min-h-screen app-gradient text-base">
        <div className="mx-auto max-w-5xl p-4 md:p-8 text-[color:var(--text)]">
          {children}
        </div>
      </body>
    </html>
  );
}
