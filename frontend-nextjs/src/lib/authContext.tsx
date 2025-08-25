'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';

interface User {
  id: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  register: (email: string, password: string, role?: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<{ success: boolean; message: string }>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  // API base is sourced from Next public env vars when needed
  
  useEffect(() => {
    let mounted = true;
    
    const initializeAuth = async () => {
      try {
        // Get the current session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user && mounted) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, email, role')
            .eq('id', session.user.id)
            .single();
          
          if (mounted) {
            setUser(profile);
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    
    initializeAuth();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user && mounted) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, email, role')
            .eq('id', session.user.id)
            .single();
          setUser(profile);
        } else if (mounted) {
          setUser(null);
        }
        if (mounted) {
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      // Use Supabase's signInWithPassword directly instead of custom API route
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Login failed:', error.message);
        return {
          success: false,
          message: error.message || 'Login failed'
        };
      }

      if (data.user) {
        // Fetch user profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, email, role')
          .eq('id', data.user.id)
          .single();

        if (profileError) {
          console.error('Profile fetch error:', profileError);
          return {
            success: false,
            message: 'Error fetching user profile'
          };
        }

        setUser(profile);
        return {
          success: true,
          message: 'Login successful'
        };
      }

      return {
        success: false,
        message: 'Invalid response from server'
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: 'An error occurred during login'
      };
    }
  };

  const register = async (email: string, password: string, role: string = 'staff') => {
    try {
      // Use Supabase's signUp directly
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role
          }
        }
      });

      if (error) {
        console.error('Registration failed:', error.message);
        return { success: false, message: error.message || 'Registration failed' };
      }

      if (data.user) {
        // Update the profile that was automatically created by the trigger
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            role: role
          })
          .eq('id', data.user.id);

        if (profileError) {
          console.error('Profile update error:', profileError);
          // Try to sign out since we couldn't update the profile
          await supabase.auth.signOut();
          return { success: false, message: 'Error updating user profile' };
        }

        // Fetch the updated profile
        const { data: profile, error: fetchError } = await supabase
          .from('profiles')
          .select('id, email, role')
          .eq('id', data.user.id)
          .single();

        if (fetchError) {
          console.error('Profile fetch error:', fetchError);
          return { success: false, message: 'Error fetching user profile' };
        }

        setUser(profile);
        return { success: true, message: 'Registration successful' };
      }

      return { success: false, message: 'Invalid response from server' };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, message: 'An error occurred during registration' };
    }
  };

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        return { success: false, message: error.message };
      }

      // Supabase will automatically clear the session from localStorage
      // The onAuthStateChange listener will handle setting user to null
      return { success: true, message: 'Logout successful' };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, message: 'An error occurred during logout' };
    }
  };

  const value = {
    user,
    login,
    register,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
