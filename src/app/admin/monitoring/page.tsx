'use client';

import BottomNav from '@/components/BottomNav';
import { MonitoringDashboard } from '@/components/admin/MonitoringDashboard';

export default function AdminMonitoringPage() {
  return (
    <div>
      <MonitoringDashboard />
      <BottomNav />
    </div>
  );
}
