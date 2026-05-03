'use client';

import BottomNav from '@/components/BottomNav';
import { AdminPanel } from '@/components/admin/AdminPanel';

export default function AdminPage() {
  return (
    <div>
      <AdminPanel variant="page" />
      <BottomNav />
    </div>
  );
}
