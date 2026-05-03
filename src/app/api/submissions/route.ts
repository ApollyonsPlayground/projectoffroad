import { NextRequest, NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { 
      error: 'Submissions now handled via lu.ma calendar and email. Please use the "Suggest a Trail" button or contact us at trails@socaloffroaders.org',
      redirect: '/#community-runs'
    },
    { status: 410 } // 410 Gone - resource permanently removed
  );
}
