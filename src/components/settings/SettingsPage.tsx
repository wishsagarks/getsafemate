import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, 
  User, 
  Phone, 
  Users, 
  Bell, 
  Lock, 
  LogOut, 
  Save, 
  Edit3, 
  Mail,
  MapPin,
  Heart,
  Settings as SettingsIcon,
  ChevronRight,
  AlertTriangle,
  Trash2
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface ProfileData {
  full_name: string;
  phone: string;
  emergency_contact_1_name: string;
  emergency_contact_1_phone: string;
  emergency_contact_2_name: string;
  emergency_contact_2_phone: string;
  safety_preferences: {
    autoCheckIn: boolean;
    shareLocation: boolean;
    emergencyNotifications: boolean;
    preferredMode: 'safewalk' | 'heartmate' | 'both';
  };
}

export function SettingsPage() {
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [profileData, setProfileData] = useState<ProfileData>({
    full_name: '',
    phone: '',
    emergency_contact_1_name: '',
    emergency_contact_1_phone: '',
    emergency_contact_2_name: '',
    emergency_contact_2_phone: '',
    safety_preferences: {
      autoCheckIn: true,
      shareLocation: true,
      emergencyNotifications: true,
      preferredMode: 'both',
    },
  });

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setProfileData({
          full_name: data.full_name || '',
          phone: data.phone || '',
          emergency_contact_1_name: data.emergency_contact_1_name || '',
          emergency_contact_1_phone: data.emergency_contact_1_phone || '',
          emergency_contact_2_name: data.emergency_contact_2_name || '',
          emergency_contact_2_phone: data.emergency_contact_2_phone || '',
          safety_preferences: data.safety_preferences || {
            autoCheckIn: true,
            shareLocation: true,
            emergencyNotifications: true,
            preferredMode: 'both',
          },
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profileData.full_name,
          phone: profileData.phone,
          emergency_contact_1_name: profileData.emergency_contact_1_name,
          emergency_contact_1_phone: profileData.emergency_contact_1_phone,
          emergency_contact_2_name: profileData.emergency_contact_2_name,
          emergency_contact_2_phone: profileData.emergency_contact_2_phone,
          safety_preferences: profileData.safety_preferences,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;
      
      // Show success message
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Error saving settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      window.location.href = '/';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      alert('Please type "DELETE" to confirm account deletion.');
      return;
    }

    try {
      // Delete the user's profile first
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user?.id);

      if (profileError) {
        console.error('Error deleting profile:', profileError);
      }

      // Delete the user account
      const { error: authError } = await supabase.auth.admin.deleteUser(user?.id || '');
      
      if (authError) {
        console.error('Error deleting user:', authError);
        alert('Error deleting account. Please contact support.');
        return;
      }

      // Sign out and redirect
      await signOut();
      alert('Your account has been successfully deleted.');
      window.location.href = '/';
    } catch (error) {
      console.error('Error deleting account:', error);
      alert('Error deleting account. Please try again or contact support.');
    }
  };

  const updateProfileData = (field: string, value: any) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const updateSafetyPreference = (key: string, value: any) => {
    setProfileData(prev => ({
      ...prev,
      safety_preferences: {
        ...prev.safety_preferences,
        [key]: value,
      },
    }));
  };

  const tabs = [
    { id: 'profile', name: 'Profile', icon: User },
    { id: 'emergency', name: 'Emergency Contacts', icon: Users },
    { id: 'safety', name: 'Safety Preferences', icon: Shield },
    { id: 'account', name: 'Account', icon: Lock },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-300 rotate-180" />
              </button>
              <div className="p-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500">
                <SettingsIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Settings</h1>
                <p className="text-sm text-gray-600 dark:text-gray-300">Manage your SafeMate preferences</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
              <nav className="space-y-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left transition-all ${
                      activeTab === tab.id
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <tab.icon className="h-5 w-5" />
                    <span className="font-medium">{tab.name}</span>
                  </button>
                ))}
                
                {/* Sign Out Button in Sidebar */}
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => setShowLogoutConfirm(true)}
                    className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left transition-all text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 border border-transparent hover:border-red-200 dark:hover:border-red-800"
                  >
                    <LogOut className="h-5 w-5" />
                    <span className="font-medium">Sign Out</span>
                  </button>
                </div>
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8">
              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <div className="flex items-center space-x-3 mb-6">
                    <User className="h-6 w-6 text-blue-500" />
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Profile Information</h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={profileData.full_name}
                        onChange={(e) => updateProfileData('full_name', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 dark:text-white"
                        placeholder="Enter your full name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Email Address
                      </label>
                      <div className="relative">
                        <input
                          type="email"
                          value={user?.email || ''}
                          disabled
                          className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                        />
                        <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Email cannot be changed</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={profileData.phone}
                        onChange={(e) => updateProfileData('phone', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 dark:text-white"
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Emergency Contacts Tab */}
              {activeTab === 'emergency' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <div className="flex items-center space-x-3 mb-6">
                    <Users className="h-6 w-6 text-red-500" />
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Emergency Contacts</h2>
                  </div>

                  <div className="space-y-8">
                    <div className="p-6 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                        <span>Primary Emergency Contact</span>
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Full Name
                          </label>
                          <input
                            type="text"
                            value={profileData.emergency_contact_1_name}
                            onChange={(e) => updateProfileData('emergency_contact_1_name', e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 dark:text-white"
                            placeholder="John Doe"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Phone Number
                          </label>
                          <input
                            type="tel"
                            value={profileData.emergency_contact_1_phone}
                            onChange={(e) => updateProfileData('emergency_contact_1_phone', e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 dark:text-white"
                            placeholder="+1 (555) 123-4567"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="p-6 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Secondary Emergency Contact</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Full Name
                          </label>
                          <input
                            type="text"
                            value={profileData.emergency_contact_2_name}
                            onChange={(e) => updateProfileData('emergency_contact_2_name', e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 dark:text-white"
                            placeholder="Jane Smith"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Phone Number
                          </label>
                          <input
                            type="tel"
                            value={profileData.emergency_contact_2_phone}
                            onChange={(e) => updateProfileData('emergency_contact_2_phone', e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 dark:text-white"
                            placeholder="+1 (555) 987-6543"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Safety Preferences Tab */}
              {activeTab === 'safety' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <div className="flex items-center space-x-3 mb-6">
                    <Shield className="h-6 w-6 text-green-500" />
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Safety Preferences</h2>
                  </div>

                  <div className="space-y-6">
                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">Auto Check-ins</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-300">Automatically check in during journeys</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={profileData.safety_preferences.autoCheckIn}
                            onChange={(e) => updateSafetyPreference('autoCheckIn', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">Location Sharing</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-300">Share location with emergency contacts</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={profileData.safety_preferences.shareLocation}
                            onChange={(e) => updateSafetyPreference('shareLocation', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">Emergency Notifications</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-300">Receive alerts about safety incidents</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={profileData.safety_preferences.emergencyNotifications}
                            onChange={(e) => updateSafetyPreference('emergencyNotifications', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
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
                              profileData.safety_preferences.preferredMode === mode.value
                                ? `border-${mode.color}-500 bg-${mode.color}-50 dark:bg-${mode.color}-900/20`
                                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                            }`}
                          >
                            <input
                              type="radio"
                              name="preferredMode"
                              value={mode.value}
                              checked={profileData.safety_preferences.preferredMode === mode.value}
                              onChange={(e) => updateSafetyPreference('preferredMode', e.target.value)}
                              className="sr-only"
                            />
                            <mode.icon className={`h-5 w-5 mr-3 ${
                              profileData.safety_preferences.preferredMode === mode.value
                                ? `text-${mode.color}-500`
                                : 'text-gray-400 dark:text-gray-500'
                            }`} />
                            <span className={`font-medium ${
                              profileData.safety_preferences.preferredMode === mode.value
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
                </motion.div>
              )}

              {/* Account Tab */}
              {activeTab === 'account' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <div className="flex items-center space-x-3 mb-6">
                    <Lock className="h-6 w-6 text-purple-500" />
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Account Settings</h2>
                  </div>

                  <div className="space-y-6">
                    <div className="p-6 rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Account Information</h3>
                      <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                        <div className="flex justify-between">
                          <span>Email:</span>
                          <span className="font-medium">{user?.email}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Account Created:</span>
                          <span className="font-medium">
                            {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>User ID:</span>
                          <span className="font-medium font-mono text-xs">{user?.id}</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
                        <Trash2 className="h-5 w-5 text-red-500" />
                        <span>Delete Account</span>
                      </h3>
                      <div className="space-y-4">
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          Permanently delete your SafeMate account and all associated data. This action cannot be undone.
                        </p>
                        <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-lg border border-red-200 dark:border-red-700">
                          <h4 className="font-semibold text-red-800 dark:text-red-200 mb-2">⚠️ Warning</h4>
                          <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                            <li>• All your profile data will be permanently deleted</li>
                            <li>• Emergency contacts and safety preferences will be lost</li>
                            <li>• You will lose access to all SafeMate features</li>
                            <li>• This action cannot be reversed</li>
                          </ul>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Type "DELETE" to confirm account deletion:
                          </label>
                          <input
                            type="text"
                            value={deleteConfirmText}
                            onChange={(e) => setDeleteConfirmText(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-red-300 dark:border-red-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all text-gray-900 dark:text-white"
                            placeholder="Type DELETE to confirm"
                          />
                        </div>
                        <button
                          onClick={() => setShowDeleteConfirm(true)}
                          disabled={deleteConfirmText !== 'DELETE'}
                          className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center space-x-2"
                        >
                          <Trash2 className="h-5 w-5" />
                          <span>Delete Account</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Save Button */}
              {activeTab !== 'account' && (
                <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex justify-end">
                    <motion.button
                      onClick={saveProfile}
                      disabled={saving}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-all shadow-lg flex items-center space-x-2"
                    >
                      {saving ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Save className="h-5 w-5" />
                          <span>Save Changes</span>
                        </>
                      )}
                    </motion.button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8 max-w-md w-full border border-gray-200 dark:border-gray-700"
          >
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                <LogOut className="h-8 w-8 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Sign Out</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Are you sure you want to sign out? You'll be redirected to the landing page.
              </p>
              <div className="flex space-x-4">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogout}
                  className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete Account Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8 max-w-md w-full border border-gray-200 dark:border-gray-700"
          >
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                <Trash2 className="h-8 w-8 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Delete Account</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Are you absolutely sure? This will permanently delete your account and all data. This action cannot be undone.
              </p>
              <div className="flex space-x-4">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors"
                >
                  Delete Forever
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}