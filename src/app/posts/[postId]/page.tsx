'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

/** Deep links land here until a dedicated post thread exists. */
export default function PostDeepLinkPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params?.postId as string | undefined;

  useEffect(() => {
    if (postId) router.replace('/');
  }, [postId, router]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <p className="text-zinc-500 text-sm">Opening feed…</p>
    </div>
  );
}
