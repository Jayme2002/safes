'use client';

import { AuthProvider } from '@/lib/auth/auth-context';
import Header from './header';
import Footer from './footer';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 w-full">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
            {children}
          </div>
        </main>
        <Footer />
      </div>
    </AuthProvider>
  );
}
