
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  // Validate environment variables
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error('Supabase configuration missing');
    return NextResponse.json(
      { error: { code: 'CONFIGURATION_ERROR', message: 'Authentication service not configured' } },
      { status: 500 }
    );
  }

  try {
    // Validate request body
    const body = await req.json().catch(() => ({}));
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Email and password are required' } },
        { status: 400 }
      );
    }

    // Attempt to sign in
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      console.error('Authentication error:', authError);
      return NextResponse.json(
        { 
          error: { 
            code: 'AUTH_ERROR', 
            message: authError.message || 'Invalid credentials',
            details: authError.status === 400 ? 'Invalid email or password' : undefined
          } 
        },
        { status: authError.status || 401 }
      );
    }

    if (!authData?.user) {
      return NextResponse.json(
        { error: { code: 'AUTH_ERROR', message: 'Login failed - no user returned' } },
        { status: 401 }
      );
    }

    try {
      // Fetch user profile with role information
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, role')
        .eq('id', authData.user.id)
        .single();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        return NextResponse.json(
          { error: { code: 'DATABASE_ERROR', message: 'Error fetching user profile' } },
          { status: 500 }
        );
      }

      if (!profile) {
        console.error('No profile found for user:', authData.user.id);
        return NextResponse.json(
          { error: { code: 'NOT_FOUND', message: 'User profile not found' } },
          { status: 404 }
        );
      }

      // Successfully authenticated and found profile
      return NextResponse.json({
        success: true,
        message: 'Login successful',
        user: profile,
        session: authData.session
      });
    } catch (profileError) {
      // Handle any errors in profile fetching
      console.error('Error fetching profile:', profileError);
      return NextResponse.json(
        { error: { code: 'DATABASE_ERROR', message: 'Error retrieving user information' } },
        { status: 500 }
      );
    }

  } catch (error) {
    // Handle any unexpected errors
    console.error('Login error:', error);
    return NextResponse.json(
      { 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'An unexpected error occurred',
          details: error instanceof Error ? error.message : undefined
        } 
      },
      { status: 500 }
    );
  }
}
