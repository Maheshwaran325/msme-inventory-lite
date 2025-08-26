import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const backendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
  const url = `${backendBaseUrl}/api/health`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Health check proxy error:', error);
    return NextResponse.json({ 
      status: 'error',
      message: 'Health check failed'
    }, { status: 500 });
  }
}
