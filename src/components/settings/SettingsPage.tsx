import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  ChevronLeft,
  AlertTriangle,
  Trash2,
  Key,
  Smartphone,
  Fingerprint,
  Globe,
  Zap,
  Calendar
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Card, CardTitle, CardDescription } from '../ui/aceternity-card';
import { Input } from '../ui/aceternity-input';
import { Button } from '../ui/aceternity-button';
import { useNavigate } from 'react-router-dom';
import { ApiKeyManager } from '../safewalk/ApiKeyManager';

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
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showApiKeyManager, setShowApiKeyManager] = useState(false);
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
      setShowSuccessMessage(true);
      setTimeout(() => {
        setShowSuccessMessage(false);
      }, 3000);
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
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      alert('Please type "DELETE" to confirm account deletion.');
      return;
    }

    if (!user) {
      alert('No user found. Please try logging in again.');
      return;
    }

    setDeleting(true);
    try {
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        alert('Authentication error. Please try logging in again.');
        return;
      }

      // Call the edge function to delete the user account
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete account');
      }

      // Sign out and redirect
      await signOut();
      alert('Your account has been successfully deleted.');
      navigate('/');
    } catch (error) {
      console.error('Error deleting account:', error);
      alert(`Error deleting account: ${error instanceof Error ? error.message : 'Please try again or contact support.'}`);
    } finally {
      setDeleting(false);
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

  const handleApiKeysUpdated = (hasKeys: boolean) => {
    console.log('API keys updated:', hasKeys);
  };

  const tabs = [
    { id: 'profile', name: 'Profile', icon: User, description: 'Manage your personal information' },
    { id: 'emergency', name: 'Emergency Contacts', icon: Users, description: 'Set up your emergency contacts' },
    { id: 'safety', name: 'Safety Preferences', icon: Shield, description: 'Configure your safety settings' },
    { id: 'account', name: 'Account', icon: Lock, description: 'Manage your account settings' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <motion.button
                onClick={() => navigate('/dashboard')}
                whileHover={{ scale: 1.05, x: -2 }}
                whileTap={{ scale: 0.95 }}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
              >
                <ChevronLeft className="h-5 w-5 text-white" />
              </motion.button>
              <div className="p-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500">
                <SettingsIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Settings</h1>
                <p className="text-sm text-neutral-400">Manage your SafeMate preferences</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button
                onClick={() => setShowApiKeyManager(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <Key className="h-4 w-4 mr-2" />
                <span>API Keys</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="bg-black border-white/[0.2]">
              <div className="p-6">
                <nav className="space-y-2">
                  {tabs.map((tab) => (
                    <motion.button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      whileHover={{ x: 5 }}
                      whileTap={{ scale: 0.98 }}
                      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left transition-all ${
                        activeTab === tab.id
                          ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-white border border-blue-500/30'
                          : 'text-neutral-400 hover:bg-white/5'
                      }`}
                    >
                      <tab.icon className="h-5 w-5" />
                      <span className="font-medium">{tab.name}</span>
                    </motion.button>
                  ))}
                  
                  {/* Sign Out Button in Sidebar */}
                  <div className="pt-4 border-t border-white/10">
                    <motion.button
                      onClick={() => setShowLogoutConfirm(true)}
                      whileHover={{ x: 5 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left transition-all text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/30"
                    >
                      <LogOut className="h-5 w-5" />
                      <span className="font-medium">Sign Out</span>
                    </motion.button>
                  </div>
                </nav>
              </div>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Card className="bg-black border-white/[0.2]">
              <div className="p-8">
                {/* Success Message */}
                <AnimatePresence>
                  {showSuccessMessage && (
                    <motion.div
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="mb-6 p-4 bg-green-500/20 border border-green-500/30 rounded-xl"
                    >
                      <div className="flex items-center space-x-2">
                        <Shield className="h-5 w-5 text-green-400" />
                        <span className="text-green-300 font-medium">Settings saved successfully!</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Profile Tab */}
                {activeTab === 'profile' && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    <div className="flex items-center space-x-3 mb-6">
                      <User className="h-6 w-6 text-blue-400" />
                      <h2 className="text-2xl font-bold text-white">Profile Information</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-2">
                          Full Name
                        </label>
                        <Input
                          type="text"
                          value={profileData.full_name}
                          onChange={(e) => updateProfileData('full_name', e.target.value)}
                          className="bg-white/10 border-white/20 text-white placeholder-neutral-500"
                          placeholder="Enter your full name"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-2">
                          Email Address
                        </label>
                        <div className="relative">
                          <Input
                            type="email"
                            value={user?.email || ''}
                            disabled
                            className="bg-white/5 border-white/10 text-neutral-500 cursor-not-allowed"
                          />
                          <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-neutral-500" />
                        </div>
                        <p className="text-xs text-neutral-500 mt-1">Email cannot be changed</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-2">
                          Phone Number
                        </label>
                        <Input
                          type="tel"
                          value={profileData.phone}
                          onChange={(e) => updateProfileData('phone', e.target.value)}
                          className="bg-white/10 border-white/20 text-white placeholder-neutral-500"
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
                      <Users className="h-6 w-6 text-red-400" />
                      <h2 className="text-2xl font-bold text-white">Emergency Contacts</h2>
                    </div>

                    <div className="space-y-8">
                      <Card className="bg-gradient-to-br from-red-500/20 to-red-500/10 border-red-500/30">
                        <div className="p-6">
                          <h3 className="font-semibold text-white mb-4 flex items-center space-x-2">
                            <AlertTriangle className="h-5 w-5 text-red-400" />
                            <span>Primary Emergency Contact</span>
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-neutral-300 mb-2">
                                Full Name
                              </label>
                              <Input
                                type="text"
                                value={profileData.emergency_contact_1_name}
                                onChange={(e) => updateProfileData('emergency_contact_1_name', e.target.value)}
                                className="bg-white/10 border-white/20 text-white placeholder-neutral-500"
                                placeholder="John Doe"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-neutral-300 mb-2">
                                Phone Number
                              </label>
                              <Input
                                type="tel"
                                value={profileData.emergency_contact_1_phone}
                                onChange={(e) => updateProfileData('emergency_contact_1_phone', e.target.value)}
                                className="bg-white/10 border-white/20 text-white placeholder-neutral-500"
                                placeholder="+1 (555) 123-4567"
                              />
                            </div>
                          </div>
                        </div>
                      </Card>

                      <Card className="bg-gradient-to-br from-orange-500/20 to-orange-500/10 border-orange-500/30">
                        <div className="p-6">
                          <h3 className="font-semibold text-white mb-4">Secondary Emergency Contact</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-neutral-300 mb-2">
                                Full Name
                              </label>
                              <Input
                                type="text"
                                value={profileData.emergency_contact_2_name}
                                onChange={(e) => updateProfileData('emergency_contact_2_name', e.target.value)}
                                className="bg-white/10 border-white/20 text-white placeholder-neutral-500"
                                placeholder="Jane Smith"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-neutral-300 mb-2">
                                Phone Number
                              </label>
                              <Input
                                type="tel"
                                value={profileData.emergency_contact_2_phone}
                                onChange={(e) => updateProfileData('emergency_contact_2_phone', e.target.value)}
                                className="bg-white/10 border-white/20 text-white placeholder-neutral-500"
                                placeholder="+1 (555) 987-6543"
                              />
                            </div>
                          </div>
                        </div>
                      </Card>
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
                      <Shield className="h-6 w-6 text-green-400" />
                      <h2 className="text-2xl font-bold text-white">Safety Preferences</h2>
                    </div>

                    <div className="space-y-6">
                      <Card className="bg-black border-white/[0.2]">
                        <div className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-semibold text-white flex items-center space-x-2">
                                <Bell className="h-5 w-5 text-blue-400" />
                                <span>Auto Check-ins</span>
                              </h3>
                              <p className="text-sm text-neutral-400 mt-1">Automatically check in during journeys</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={profileData.safety_preferences.autoCheckIn}
                                onChange={(e) => updateSafetyPreference('autoCheckIn', e.target.checked)}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-neutral-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                          </div>
                        </div>
                      </Card>

                      <Card className="bg-black border-white/[0.2]">
                        <div className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-semibold text-white flex items-center space-x-2">
                                <MapPin className="h-5 w-5 text-green-400" />
                                <span>Location Sharing</span>
                              </h3>
                              <p className="text-sm text-neutral-400 mt-1">Share location with emergency contacts</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={profileData.safety_preferences.shareLocation}
                                onChange={(e) => updateSafetyPreference('shareLocation', e.target.checked)}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-neutral-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                            </label>
                          </div>
                        </div>
                      </Card>

                      <Card className="bg-black border-white/[0.2]">
                        <div className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-semibold text-white flex items-center space-x-2">
                                <Bell className="h-5 w-5 text-yellow-400" />
                                <span>Emergency Notifications</span>
                              </h3>
                              <p className="text-sm text-neutral-400 mt-1">Receive alerts about safety incidents</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={profileData.safety_preferences.emergencyNotifications}
                                onChange={(e) => updateSafetyPreference('emergencyNotifications', e.target.checked)}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-neutral-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-600"></div>
                            </label>
                          </div>
                        </div>
                      </Card>

                      <Card className="bg-black border-white/[0.2]">
                        <div className="p-6">
                          <h3 className="font-semibold text-white mb-4 flex items-center space-x-2">
                            <Zap className="h-5 w-5 text-purple-400" />
                            <span>Preferred Mode</span>
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {[
                              { value: 'safewalk', label: 'Safe Walk', icon: Shield, color: 'blue' },
                              { value: 'heartmate', label: 'HeartMate', icon: Heart, color: 'pink' },
                              { value: 'both', label: 'Both Modes', icon: Users, color: 'purple' },
                            ].map((mode) => (
                              <motion.label
                                key={mode.value}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className={`relative flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                  profileData.safety_preferences.preferredMode === mode.value
                                    ? `border-${mode.color}-500 bg-${mode.color}-500/20`
                                    : 'border-white/20 hover:border-white/30 bg-white/5'
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
                                    ? `text-${mode.color}-400`
                                    : 'text-neutral-400'
                                }`} />
                                <span className={`font-medium ${
                                  profileData.safety_preferences.preferredMode === mode.value
                                    ? `text-${mode.color}-300`
                                    : 'text-neutral-300'
                                }`}>
                                  {mode.label}
                                </span>
                              </motion.label>
                            ))}
                          </div>
                        </div>
                      </Card>
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
                      <Lock className="h-6 w-6 text-purple-400" />
                      <h2 className="text-2xl font-bold text-white">Account Settings</h2>
                    </div>

                    <div className="space-y-6">
                      <Card className="bg-gradient-to-br from-blue-500/20 to-purple-500/10 border-blue-500/30">
                        <div className="p-6">
                          <h3 className="font-semibold text-white mb-4 flex items-center space-x-2">
                            <Key className="h-5 w-5 text-blue-400" />
                            <span>Account Information</span>
                          </h3>
                          <div className="space-y-4">
                            <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                              <div className="flex items-center space-x-3">
                                <Mail className="h-5 w-5 text-neutral-400" />
                                <span className="text-neutral-300">Email</span>
                              </div>
                              <span className="text-white font-medium">{user?.email}</span>
                            </div>
                            
                            <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                              <div className="flex items-center space-x-3">
                                <Calendar className="h-5 w-5 text-neutral-400" />
                                <span className="text-neutral-300">Account Created</span>
                              </div>
                              <span className="text-white font-medium">
                                {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                              </span>
                            </div>
                            
                            <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                              <div className="flex items-center space-x-3">
                                <Fingerprint className="h-5 w-5 text-neutral-400" />
                                <span className="text-neutral-300">User ID</span>
                              </div>
                              <span className="text-neutral-400 font-mono text-xs">{user?.id}</span>
                            </div>
                          </div>
                        </div>
                      </Card>

                      <Card className="bg-gradient-to-br from-red-500/20 to-red-500/10 border-red-500/30">
                        <div className="p-6">
                          <h3 className="font-semibold text-white mb-4 flex items-center space-x-2">
                            <Trash2 className="h-5 w-5 text-red-400" />
                            <span>Delete Account</span>
                          </h3>
                          <div className="space-y-4">
                            <p className="text-neutral-300">
                              Permanently delete your SafeMate account and all associated data. This action cannot be undone.
                            </p>
                            <div className="p-4 bg-red-500/20 rounded-lg border border-red-500/30">
                              <h4 className="font-semibold text-red-300 mb-2 flex items-center space-x-2">
                                <AlertTriangle className="h-4 w-4" />
                                <span>Warning</span>
                              </h4>
                              <ul className="text-sm text-red-200 space-y-1">
                                <li>• All your profile data will be permanently deleted</li>
                                <li>• Emergency contacts and safety preferences will be lost</li>
                                <li>• You will lose access to all SafeMate features</li>
                                <li>• This action cannot be reversed</li>
                              </ul>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-neutral-300 mb-2">
                                Type "DELETE" to confirm account deletion:
                              </label>
                              <Input
                                type="text"
                                value={deleteConfirmText}
                                onChange={(e) => setDeleteConfirmText(e.target.value)}
                                className="bg-white/10 border-red-500/30 text-white placeholder-neutral-500"
                                placeholder="Type DELETE to confirm"
                              />
                            </div>
                            <Button
                              onClick={() => setShowDeleteConfirm(true)}
                              disabled={deleteConfirmText !== 'DELETE' || deleting}
                              className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {deleting ? (
                                <>
                                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                                  <span>Deleting...</span>
                                </>
                              ) : (
                                <>
                                  <Trash2 className="h-5 w-5 mr-2" />
                                  <span>Delete Account</span>
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </Card>
                    </div>
                  </motion.div>
                )}

                {/* Save Button */}
                {activeTab !== 'account' && (
                  <div className="mt-8 pt-6 border-t border-white/10">
                    <div className="flex justify-end">
                      <Button
                        onClick={saveProfile}
                        disabled={saving}
                        className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50"
                      >
                        {saving ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                            <span>Saving...</span>
                          </>
                        ) : (
                          <>
                            <Save className="h-5 w-5 mr-2" />
                            <span>Save Changes</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* API Key Manager Modal */}
      <ApiKeyManager
        isOpen={showApiKeyManager}
        onClose={() => setShowApiKeyManager(false)}
        onKeysUpdated={handleApiKeysUpdated}
      />

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="max-w-md w-full"
            >
              <Card className="bg-black border-white/[0.2]">
                <div className="p-8 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-red-500/20 to-red-500/10 flex items-center justify-center border border-red-500/30">
                    <LogOut className="h-8 w-8 text-red-400" />
                  </div>
                  <CardTitle className="text-white mb-2">Sign Out</CardTitle>
                  <CardDescription className="text-neutral-400 mb-6">
                    Are you sure you want to sign out? You'll be redirected to the landing page.
                  </CardDescription>
                  <div className="flex space-x-4">
                    <Button
                      onClick={() => setShowLogoutConfirm(false)}
                      className="flex-1 bg-white/10 hover:bg-white/20 text-white"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleLogout}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                    >
                      Sign Out
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Account Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="max-w-md w-full"
            >
              <Card className="bg-black border-white/[0.2]">
                <div className="p-8 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-red-500/20 to-red-500/10 flex items-center justify-center border border-red-500/30">
                    <Trash2 className="h-8 w-8 text-red-400" />
                  </div>
                  <CardTitle className="text-white mb-2">Delete Account</CardTitle>
                  <CardDescription className="text-neutral-400 mb-6">
                    Are you absolutely sure? This will permanently delete your account and all data. This action cannot be undone.
                  </CardDescription>
                  <div className="flex space-x-4">
                    <Button
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={deleting}
                      className="flex-1 bg-white/10 hover:bg-white/20 text-white disabled:opacity-50"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleDeleteAccount}
                      disabled={deleting}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 flex items-center justify-center"
                    >
                      {deleting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                          <span>Deleting...</span>
                        </>
                      ) : (
                        <span>Delete Forever</span>
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}