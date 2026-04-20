import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import './globals.css';

export const metadata: Metadata = {
  title: 'Project Harness Chat',
  description: 'Chat surface for the sandboxed coding harness.',
};

export default function RootLayout(props: { children: ReactNode }): ReactNode {
  return (
    <html lang="en">
      <body>{props.children}</body>
    </html>
  );
}
