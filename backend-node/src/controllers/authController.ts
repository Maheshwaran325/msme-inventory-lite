import { Request, Response } from 'express';
import { supabase } from '../config/database';

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Email and password are required',
      },
    });
  }

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError) {
    return res.status(authError.status || 401).json({
      error: {
        code: 'AUTH_ERROR',
        message: authError.message || 'Invalid credentials',
      },
    });
  }

  if (!authData.user) {
    return res.status(401).json({
      error: {
        code: 'AUTH_ERROR',
        message: 'Login failed - no user returned',
      },
    });
  }

  // Per instructions, the backend authenticates and the frontend will use the session.
  // The frontend can then fetch user-specific data like roles if needed.
  return res.json({
    message: 'Login successful',
    user: authData.user,
    session: authData.session,
  });
};