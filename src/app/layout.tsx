import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import DemoBadge from '@/components/layout/DemoBadge';

export const metadata: Metadata = {
  title: 'ARGUS EYE · Public Intelligence & Risk Operating System',
  description: 'Ferramenta de inteligência pública, OSINT legal e due diligence reputacional.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full">
        <div className="grid lg:grid-cols-[248px_1fr] min-h-screen">
          <Sidebar />
          <div className="min-w-0 flex flex-col">
            <Topbar />
            <main className="flex-1 p-[26px] max-w-[1480px] w-full mx-auto animate-fade">
              {children}
            </main>
          </div>
        </div>
        <DemoBadge />
      </body>
    </html>
  );
}
