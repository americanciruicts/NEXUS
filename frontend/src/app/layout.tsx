import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import ToastProvider from "@/components/providers/ToastProvider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NEXUS - American Circuits Traveler Management",
  description: "Manufacturing Traveler Management System for American Circuits",
  icons: {
    icon: "/nexus-icon.svg",
    shortcut: "/nexus-icon.svg",
    apple: "/nexus-icon.svg",
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('nexus_theme');if(t==='dark')document.documentElement.classList.add('dark');else document.documentElement.classList.remove('dark');}catch(e){}})();`
          }}
        />
      </head>
      <body className={`${inter.className} antialiased bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 transition-colors duration-200`}>
        <ErrorBoundary>
          <ThemeProvider>
            <AuthProvider>
              {children}
            </AuthProvider>
          </ThemeProvider>
        </ErrorBoundary>
        <ToastProvider />
      </body>
    </html>
  );
}
