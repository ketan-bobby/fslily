
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"; 
import { SystemSettingsProvider } from '@/contexts/SystemSettingsContext';

export const metadata: Metadata = {
  title: 'IntelliAssistant',
  description: 'AI-Powered HR Assistant',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Tailwind config specifies 'Inter'. Ensure it's available system-wide or via @font-face in globals.css if not using explicit <link> */}
      </head>
      <body className="font-body antialiased"> 
        <SystemSettingsProvider>
            {children}
            <Toaster />
        </SystemSettingsProvider>
      </body>
    </html>
  );
}
