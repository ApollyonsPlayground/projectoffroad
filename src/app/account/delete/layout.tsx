import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Delete account & data | SoCal Offroaders',
  description:
    'Permanently delete your SoCal Offroaders account and associated personal data.',
  alternates: { canonical: '/account/delete/' },
};

export default function DeleteAccountLayout({ children }: { children: React.ReactNode }) {
  return children;
}
