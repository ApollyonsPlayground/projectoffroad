import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Feed | SoCal Offroaders',
  description:
    'Community feed — posts, runs, and stories from Southern California off-road riders. Sign in to post and comment.',
};

export default function FeedLayout({ children }: { children: React.ReactNode }) {
  return children;
}
