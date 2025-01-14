import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  return NextResponse.json({
    success: false,
    error: 'Live chart functionality is under development'
  }, { status: 501 });
} 