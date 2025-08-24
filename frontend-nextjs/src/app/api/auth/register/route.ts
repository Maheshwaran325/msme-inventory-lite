import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error('Supabase configuration missing');
    return NextResponse.json(
      { error: { code: 'CONFIGURATION_ERROR', message: 'Authentication service not configured' } },
      { status: 500 }
    );
  }

  try {
    const { email, password, role = 'staff' } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Email and password are required' } },
        { status: 400 }
      );
    }

    // Create user in Supabase
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: role // This will be used by the database trigger
        }
      }
    });

    if (authError) {
      console.error('Supabase auth error:', authError);
      return NextResponse.json(
        { error: { code: 'AUTH_ERROR', message: authError.message } },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: { code: 'AUTH_ERROR', message: 'Failed to create user' } },
        { status: 500 }
      );
    }

    // Instead of fetching profile, construct it from known data
    // The database trigger will still create the profile record
    const userProfile = {
      id: authData.user.id,
      email: email,
      role: role
    };

    return NextResponse.json({
      success: true,
      message: 'Registration successful',
      user: userProfile,
      session: authData.session
    }, { status: 201 });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
