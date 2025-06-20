import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { OnboardingFlow } from './onboarding/OnboardingFlow';
import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const [profileLoading, setProfileLoading] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);

  useEffect(() => {
    async function checkOnboardingStatus() {
      if (!user) {
        setProfileLoading(false);
        return;
      }

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error fetching profile:', error);
          setOnboardingCompleted(false);
        } else {
          setOnboardingCompleted(profile?.onboarding_completed || false);
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        setOnboardingCompleted(false);
      } finally {
        setProfileLoading(false);
      }
    }

    checkOnboardingStatus();
  }, [user]);

  // Show loading spinner while checking auth and profile
  if (authLoading || profileLoading) {
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

  // Redirect to landing page if not authenticated
  if (!user) {
    return <>{children}</>;
  }

  // Show onboarding if not completed
  if (!onboardingCompleted) {
    return <OnboardingFlow />;
  }

  // Show protected content
  return <>{children}</>;
}