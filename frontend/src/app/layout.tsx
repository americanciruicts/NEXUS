import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import ToastProvider from "@/components/providers/ToastProvider";
import LazyOfflineIndicator from "@/components/LazyOfflineIndicator";
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
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0d9488" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('nexus_theme');if(t==='dark')document.documentElement.classList.add('dark');else document.documentElement.classList.remove('dark');}catch(e){}})();
/* Catch chunk load failures after deploy — reload cleanly instead of crashing */
window.addEventListener('error',function(e){if(e.message&&(e.message.indexOf('Loading chunk')!==-1||e.message.indexOf('ChunkLoadError')!==-1)){e.preventDefault();window.location.reload();}},true);
window.addEventListener('unhandledrejection',function(e){if(e.reason&&e.reason.name==='ChunkLoadError'){e.preventDefault();window.location.reload();}});`
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
        <LazyOfflineIndicator />
      </body>
    </html>
  );
}
