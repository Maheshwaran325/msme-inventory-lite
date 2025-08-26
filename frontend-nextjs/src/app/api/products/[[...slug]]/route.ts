import { NextRequest, NextResponse } from 'next/server';

async function handler(req: NextRequest) {
    const { pathname, search } = new URL(req.url);
    const path = pathname.replace('/api', '');
    const backendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
    const url = `${backendBaseUrl}/api${path}${search}`;

    try {
        // Get the request body for non-GET requests
        let body = null;
        if (req.method !== 'GET' && req.method !== 'DELETE') {
            body = await req.text();
        }

        const response = await fetch(url, {
            method: req.method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': req.headers.get('Authorization') || '',
            },
            body: body,
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

export { handler as GET, handler as POST, handler as PUT, handler as DELETE };