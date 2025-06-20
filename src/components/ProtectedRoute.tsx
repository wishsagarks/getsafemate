import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { OnboardingFlow } from './onboarding/OnboardingFlow';
import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

export function ProtectedRoute({ children, requireAuth = false }: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const [profileLoading, setProfileLoading] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [profileChecked, setProfileChecked] = useState(false);

  useEffect(() => {
    async function checkOnboardingStatus() {
      if (!user) {
        setProfileLoading(false);
        setProfileChecked(true);
        return;
      }

      // Check if we already have the status cached
      const cachedStatus = localStorage.getItem(`onboarding_${user.id}`);
      if (cachedStatus === 'completed') {
        setOnboardingCompleted(true);
        setProfileLoading(false);
        setProfileChecked(true);
        return;
      }

      try {
        console.log('Checking onboarding status for user:', user.id);
        
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('onboarding_completed, email, full_name')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
          
          // If profile doesn't exist, create it
          if (error.code === 'PGRST116') {
            console.log('Profile not found, creating new profile...');
            const { error: insertError } = await supabase
              .from('profiles')
              .insert({
                id: user.id,
                email: user.email!,
                full_name: user.user_metadata?.full_name || '',
                onboarding_completed: false,
              });

            if (insertError) {
              console.error('Error creating profile:', insertError);
            }
            setOnboardingCompleted(false);
          }
        } else {
          console.log('Profile found:', profile);
          const completed = profile?.onboarding_completed || false;
          setOnboardingCompleted(completed);
          
          // Cache the status if completed
          if (completed) {
            localStorage.setItem(`onboarding_${user.id}`, 'completed');
          }
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        setOnboardingCompleted(false);
      } finally {
        setProfileLoading(false);
        setProfileChecked(true);
      }
    }

    if (!profileChecked) {
      checkOnboardingStatus();
    }
  }, [user, profileChecked]);

  // Clear cache when user changes
  useEffect(() => {
    if (user) {
      setProfileChecked(false);
      setProfileLoading(true);
    }
  }, [user?.id]);

  // Show loading spinner while checking auth and profile
  if (authLoading || (user && profileLoading)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">Loading SafeMate...</p>
        </motion.div>
      </div>
    );
  }

  // If authentication is not required, show content regardless of auth status
  if (!requireAuth) {
    return <>{children}</>;
  }

  // If authentication is required but user is not authenticated, redirect to landing
  if (requireAuth && !user) {
    window.location.href = '/';
    return null;
  }

  // Show onboarding if authenticated but not completed
  if (user && !onboardingCompleted) {
    return <OnboardingFlow />;
  }

  // Show protected content
  return <>{children}</>;
}