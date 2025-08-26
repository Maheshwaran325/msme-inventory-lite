import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const backendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
  const url = `${backendBaseUrl}/api/metrics`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Metrics proxy error:', error);
    return NextResponse.json({ 
      status: 'error',
      message: 'Metrics failed'
    }, { status: 500 });
  }
}
