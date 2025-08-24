
import { NextRequest, NextResponse } from 'next/server';

async function handler(req: NextRequest) {
    const { pathname, search } = new URL(req.url);
    const path = pathname.replace('/api', '');
    const backendBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api';
    const url = `${backendBaseUrl}${path}${search}`;

    try {
        const response = await fetch(url, {
            method: req.method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': req.headers.get('Authorization') || '',
            },
            body: req.method !== 'GET' && req.method !== 'DELETE' ? await req.text() : null,
        });

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
    }
}

export { handler as GET, handler as POST, handler as PUT, handler as DELETE };
