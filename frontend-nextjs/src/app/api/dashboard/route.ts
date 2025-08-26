import { NextRequest, NextResponse } from 'next/server';

async function handler(req: NextRequest) {
    const backendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
    const url = `${backendBaseUrl}/api/dashboard/kpis`;
    
    try {
        const response = await fetch(url, {
            method: req.method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': req.headers.get('Authorization') || '',
            },
        });
        
        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        console.error('API proxy error:', error);
        return NextResponse.json({ 
            success: false, 
            message: 'Internal server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

export { handler as GET };