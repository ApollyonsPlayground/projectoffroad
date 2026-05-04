'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';

/** Deep links land here until a dedicated post thread exists. */
export default function PostDeepLinkPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params?.postId as string | undefined;

  useEffect(() => {
    if (postId) router.replace('/feed/');
  }, [postId, router]);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center pb-28">
      <p className="text-zinc-500 text-sm">Opening feed…</p>
      <BottomNav />
    </div>
  );
}
