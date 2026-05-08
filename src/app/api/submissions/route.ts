import { NextResponse } from 'next/server';
import { SITE_SUPPORT_EMAIL } from '@/lib/siteContact';

export async function POST() {
  return NextResponse.json(
    { 
      error: `Submissions now handled via lu.ma calendar and email. Please use the "Suggest a Trail" button or contact us at ${SITE_SUPPORT_EMAIL}`,
      redirect: '/#community-runs'
    },
    { status: 410 } // 410 Gone - resource permanently removed
  );
}
