import type { ReactNode } from 'react';
import './globals.css';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-b from-slate-50 to-white text-slate-900">
        <div className="mx-auto max-w-5xl p-4 md:p-8">{children}</div>
      </body>
    </html>
  );
}
