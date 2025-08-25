
import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/database';

// Tiny in-memory cache for auth profile lookups to reduce duplicate DB calls
const authProfileCache = new Map<string, { id: string; email: string; role: string; expiresAt: number }>();
const CACHE_TTL_MS = 15_000; // 15s short TTL to avoid staleness while improving latency

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
      };
    }
  }
}

export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access token required' 
      });
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token' 
      });
    }

    // Try cache first
    const cached = authProfileCache.get(user.id);
    if (cached && cached.expiresAt > Date.now()) {
      req.user = { id: cached.id, email: cached.email, role: cached.role };
      return next();
    }

    // Fetch the user's profile to get their role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
        return res.status(401).json({ 
            success: false, 
            message: 'Invalid token or user profile not found' 
        });
    }

    req.user = {
      id: profile.id,
      email: profile.email,
      role: profile.role
    };

    authProfileCache.set(profile.id, {
      id: profile.id,
      email: profile.email,
      role: profile.role,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    next();
  } catch (error) {
    return res.status(403).json({ 
      success: false, 
      message: 'Invalid token' 
    });
  }
};

export const authorizeRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Insufficient permissions' 
      });
    }

    next();
  };
};
