import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Shield, Heart, Users, Phone, MapPin, Bell } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface OnboardingData {
  phone: string;
  emergencyContact1Name: string;
  emergencyContact1Phone: string;
  emergencyContact2Name: string;
  emergencyContact2Phone: string;
  safetyPreferences: {
    autoCheckIn: boolean;
    shareLocation: boolean;
    emergencyNotifications: boolean;
    preferredMode: 'safewalk' | 'heartmate' | 'both';
  };
}

export function OnboardingFlow() {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  
  const [data, setData] = useState<OnboardingData>({
    phone: '',
    emergencyContact1Name: '',
    emergencyContact1Phone: '',
    emergencyContact2Name: '',
    emergencyContact2Phone: '',
    safetyPreferences: {
      autoCheckIn: true,
      shareLocation: true,
      emergencyNotifications: true,
      preferredMode: 'both',
    },
  });

  const steps = [
    {
      title: 'Welcome to SafeMate',
      subtitle: 'Let\'s set up your safety profile',
      icon: Shield,
      component: WelcomeStep,
    },
    {
      title: 'Your Contact Information',
      subtitle: 'We need your phone number for emergency features',
      icon: Phone,
      component: ContactStep,
    },
    {
      title: 'Emergency Contacts',
      subtitle: 'Add trusted contacts for emergency situations',
      icon: Users,
      component: EmergencyContactsStep,
    },
    {
      title: 'Safety Preferences',
      subtitle: 'Customize your safety and privacy settings',
      icon: Bell,
      component: PreferencesStep,
    },
    {
      title: 'You\'re All Set!',
      subtitle: 'Your SafeMate companion is ready to protect you',
      icon: Heart,
      component: CompletionStep,
    },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          phone: data.phone,
          emergency_contact_1_name: data.emergencyContact1Name,
          emergency_contact_1_phone: data.emergencyContact1Phone,
          emergency_contact_2_name: data.emergencyContact2Name,
          emergency_contact_2_phone: data.emergencyContact2Phone,
          safety_preferences: data.safetyPreferences,
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;
      
      // Redirect to dashboard or main app
      window.location.href = '/dashboard';
    } catch (error) {
      console.error('Error completing onboarding:', error);
    } finally {
      setLoading(false);
    }
  };

  const CurrentStepComponent = steps[currentStep].component;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Step {currentStep + 1} of {steps.length}
            </span>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {Math.round(((currentStep + 1) / steps.length) * 100)}% Complete
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <motion.div
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
            />
          </div>
        </div>

        {/* Main Card */}
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.9) 100%)',
            backdropFilter: 'blur(40px)',
            border: '1px solid rgba(255,255,255,0.2)',
          }}
        >
          {/* Header */}
          <div className="relative p-8 pb-6">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20" />
            
            <div className="relative flex items-center space-x-4 mb-6">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-500">
                <steps[currentStep].icon className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {steps[currentStep].title}
                </h1>
                <p className="text-gray-600 dark:text-gray-300">
                  {steps[currentStep].subtitle}
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-8 pb-8">
            <CurrentStepComponent data={data} setData={setData} />

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
              <motion.button
                onClick={handlePrevious}
                disabled={currentStep === 0}
                whileHover={{ scale: currentStep === 0 ? 1 : 1.05 }}
                whileTap={{ scale: currentStep === 0 ? 1 : 0.95 }}
                className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all ${
                  currentStep === 0
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700'
                }`}
              >
                <ChevronLeft className="h-5 w-5" />
                <span>Previous</span>
              </motion.button>

              {currentStep === steps.length - 1 ? (
                <motion.button
                  onClick={handleComplete}
                  disabled={loading}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center space-x-2 px-8 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 transition-all shadow-lg"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Completing...</span>
                    </>
                  ) : (
                    <>
                      <span>Complete Setup</span>
                      <Heart className="h-5 w-5" />
                    </>
                  )}
                </motion.button>
              ) : (
                <motion.button
                  onClick={handleNext}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center space-x-2 px-8 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg"
                >
                  <span>Continue</span>
                  <ChevronRight className="h-5 w-5" />
                </motion.button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// Step Components
function WelcomeStep() {
  return (
    <div className="text-center py-8">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="mb-8"
      >
        <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
          <Shield className="h-16 w-16 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Your Safety Journey Begins
        </h2>
        <p className="text-gray-600 dark:text-gray-300 max-w-md mx-auto leading-relaxed">
          We'll help you set up your personal safety profile in just a few steps. 
          This ensures SafeMate can provide the best protection tailored to your needs.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20"
        >
          <Shield className="h-8 w-8 text-blue-500 mx-auto mb-2" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Safe Walk</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">Real-time protection</p>
        </motion.div>
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="p-4 rounded-xl bg-purple-50 dark:bg-purple-900/20"
        >
          <Heart className="h-8 w-8 text-purple-500 mx-auto mb-2" />
          <h3 className="font-semibold text-gray-900 dark:text-white">HeartMate</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">Emotional support</p>
        </motion.div>
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20"
        >
          <Users className="h-8 w-8 text-green-500 mx-auto mb-2" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Community</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">Connected safety</p>
        </motion.div>
      </div>
    </div>
  );
}

function ContactStep({ data, setData }: { data: OnboardingData; setData: (data: OnboardingData) => void }) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <Phone className="h-16 w-16 text-blue-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Your Phone Number
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          This enables emergency features like SOS alerts and location sharing
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Phone Number
        </label>
        <input
          type="tel"
          value={data.phone}
          onChange={(e) => setData({ ...data, phone: e.target.value })}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          placeholder="+1 (555) 123-4567"
          required
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          We'll only use this for emergency situations and account security
        </p>
      </div>
    </div>
  );
}

function EmergencyContactsStep({ data, setData }: { data: OnboardingData; setData: (data: OnboardingData) => void }) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <Users className="h-16 w-16 text-purple-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Emergency Contacts
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          These trusted contacts will be notified in emergency situations
        </p>
      </div>

      <div className="space-y-6">
        <div className="p-6 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Primary Emergency Contact</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={data.emergencyContact1Name}
                onChange={(e) => setData({ ...data, emergencyContact1Name: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="John Doe"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={data.emergencyContact1Phone}
                onChange={(e) => setData({ ...data, emergencyContact1Phone: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="+1 (555) 123-4567"
                required
              />
            </div>
          </div>
        </div>

        <div className="p-6 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Secondary Emergency Contact</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={data.emergencyContact2Name}
                onChange={(e) => setData({ ...data, emergencyContact2Name: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Jane Smith"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={data.emergencyContact2Phone}
                onChange={(e) => setData({ ...data, emergencyContact2Phone: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="+1 (555) 987-6543"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreferencesStep({ data, setData }: { data: OnboardingData; setData: (data: OnboardingData) => void }) {
  const updatePreference = (key: keyof OnboardingData['safetyPreferences'], value: any) => {
    setData({
      ...data,
      safetyPreferences: {
        ...data.safetyPreferences,
        [key]: value,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <Bell className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Safety Preferences
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          Customize how SafeMate protects and supports you
        </p>
      </div>

      <div className="space-y-4">
        <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Auto Check-ins</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">Automatically check in during journeys</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={data.safetyPreferences.autoCheckIn}
                onChange={(e) => updatePreference('autoCheckIn', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Location Sharing</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">Share location with emergency contacts</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={data.safetyPreferences.shareLocation}
                onChange={(e) => updatePreference('shareLocation', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Emergency Notifications</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">Receive alerts about safety incidents</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={data.safetyPreferences.emergencyNotifications}
                onChange={(e) => updatePreference('emergencyNotifications', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Preferred Mode</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { value: 'safewalk', label: 'Safe Walk', icon: Shield, color: 'blue' },
              { value: 'heartmate', label: 'HeartMate', icon: Heart, color: 'purple' },
              { value: 'both', label: 'Both Modes', icon: Users, color: 'green' },
            ].map((mode) => (
              <label
                key={mode.value}
                className={`relative flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  data.safetyPreferences.preferredMode === mode.value
                    ? `border-${mode.color}-500 bg-${mode.color}-50 dark:bg-${mode.color}-900/20`
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <input
                  type="radio"
                  name="preferredMode"
                  value={mode.value}
                  checked={data.safetyPreferences.preferredMode === mode.value}
                  onChange={(e) => updatePreference('preferredMode', e.target.value)}
                  className="sr-only"
                />
                <mode.icon className={`h-5 w-5 mr-3 ${
                  data.safetyPreferences.preferredMode === mode.value
                    ? `text-${mode.color}-500`
                    : 'text-gray-400'
                }`} />
                <span className={`font-medium ${
                  data.safetyPreferences.preferredMode === mode.value
                    ? `text-${mode.color}-700 dark:text-${mode.color}-300`
                    : 'text-gray-700 dark:text-gray-300'
                }`}>
                  {mode.label}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CompletionStep() {
  return (
    <div className="text-center py-8">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="mb-8"
      >
        <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-gradient-to-r from-green-500 to-blue-500 flex items-center justify-center">
          <Heart className="h-16 w-16 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Welcome to SafeMate!
        </h2>
        <p className="text-gray-600 dark:text-gray-300 max-w-md mx-auto leading-relaxed mb-6">
          Your safety profile is complete. SafeMate is now ready to be your trusted companion 
          on every journey, providing protection and support whenever you need it.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="p-6 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/40"
        >
          <Shield className="h-10 w-10 text-blue-500 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Safe Walk Ready</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Real-time protection and emergency features are active
          </p>
        </motion.div>
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="p-6 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-900/40"
        >
          <Heart className="h-10 w-10 text-purple-500 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">HeartMate Active</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Your AI companion is ready to provide emotional support
          </p>
        </motion.div>
      </div>
    </div>
  );
}