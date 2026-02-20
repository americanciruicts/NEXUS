import type { Metadata } from "next";
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
            __html: "document.documentElement && document.documentElement.classList.remove('dark');"
          }}
        />
      </head>
      <body className={`${inter.className} antialiased bg-white text-gray-900`}>
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
