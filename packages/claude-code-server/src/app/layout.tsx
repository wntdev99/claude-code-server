import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Claude Code Server',
  description: 'Web-based agent management platform for Claude Code',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        <header className="border-b bg-white px-6 py-4">
          <nav className="mx-auto flex max-w-7xl items-center justify-between">
            <a href="/" className="text-xl font-bold">
              Claude Code Server
            </a>
            <div className="flex items-center gap-4">
              <a href="/" className="text-gray-600 hover:text-gray-900">
                Tasks
              </a>
              <a href="/settings" className="text-gray-600 hover:text-gray-900">
                Settings
              </a>
              <a
                href="/tasks/new"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
              >
                New Task
              </a>
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
