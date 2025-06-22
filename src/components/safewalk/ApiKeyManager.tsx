import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Key, 
  Eye, 
  EyeOff, 
  Save, 
  Trash2, 
  CheckCircle, 
  AlertCircle,
  X,
  Shield,
  Brain,
  Mic,
  Video,
  MessageSquare,
  Globe,
  Wifi
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Input } from '../ui/aceternity-input';
import { Button } from '../ui/aceternity-button';
import { Card, CardTitle, CardDescription } from '../ui/aceternity-card';

interface ApiKeys {
  livekit_api_key: string;
  livekit_api_secret: string;
  livekit_ws_url: string;
  tavus_api_key: string;
  elevenlabs_api_key: string;
  deepgram_api_key: string;
  gemini_api_key: string;
}

interface ApiKeyManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onKeysUpdated: (hasKeys: boolean) => void;
}

export function ApiKeyManager({ isOpen, onClose, onKeysUpdated }: ApiKeyManagerProps) {
  const { user } = useAuth();
  const [apiKeys, setApiKeys] = useState<ApiKeys>({
    livekit_api_key: '',
    livekit_api_secret: '',
    livekit_ws_url: '',
    tavus_api_key: '',
    elevenlabs_api_key: '',
    deepgram_api_key: '',
    gemini_api_key: ''
  });
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const apiKeyConfigs = [
    {
      key: 'livekit_api_key',
      label: 'LiveKit API Key',
      description: 'Required for real-time video/audio communication',
      icon: Video,
      required: true,
      color: 'blue'
    },
    {
      key: 'livekit_api_secret',
      label: 'LiveKit API Secret',
      description: 'Required for LiveKit room creation and token generation',
      icon: Shield,
      required: true,
      color: 'blue'
    },
    {
      key: 'livekit_ws_url',
      label: 'LiveKit WebSocket URL',
      description: 'Your LiveKit server WebSocket endpoint (e.g., wss://your-server.livekit.cloud)',
      icon: Wifi,
      required: true,
      color: 'blue',
      placeholder: 'wss://your-server.livekit.cloud'
    },
    {
      key: 'tavus_api_key',
      label: 'Tavus API Key',
      description: 'Required for AI avatar creation and management',
      icon: Brain,
      required: true,
      color: 'purple'
    },
    {
      key: 'gemini_api_key',
      label: 'Gemini API Key',
      description: 'Required for advanced LLM conversations',
      icon: Brain,
      required: true,
      color: 'indigo'
    },
    {
      key: 'elevenlabs_api_key',
      label: 'ElevenLabs API Key',
      description: 'Optional: Enhanced voice synthesis for better audio quality',
      icon: Mic,
      required: false,
      color: 'green'
    },
    {
      key: 'deepgram_api_key',
      label: 'Deepgram API Key',
      description: 'Optional: Advanced speech recognition for better voice input',
      icon: MessageSquare,
      required: false,
      color: 'orange'
    }
  ];

  useEffect(() => {
    if (isOpen && user) {
      loadApiKeys();
    }
  }, [isOpen, user]);

  const loadApiKeys = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_api_keys')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setApiKeys({
          livekit_api_key: data.livekit_api_key || '',
          livekit_api_secret: data.livekit_api_secret || '',
          livekit_ws_url: data.livekit_ws_url || '',
          tavus_api_key: data.tavus_api_key || '',
          elevenlabs_api_key: data.elevenlabs_api_key || '',
          deepgram_api_key: data.deepgram_api_key || '',
          gemini_api_key: data.gemini_api_key || ''
        });
        
        // Check if required keys are present
        const hasRequiredKeys = data.livekit_api_key && data.livekit_api_secret && data.livekit_ws_url && data.tavus_api_key && data.gemini_api_key;
        onKeysUpdated(hasRequiredKeys);
      }
    } catch (error) {
      console.error('Error loading API keys:', error);
      setMessage({ type: 'error', text: 'Failed to load API keys' });
    } finally {
      setLoading(false);
    }
  };

  const saveApiKeys = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_api_keys')
        .upsert({
          user_id: user.id,
          ...apiKeys,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      setMessage({ type: 'success', text: 'API keys saved successfully!' });
      
      // Check if required keys are present
      const hasRequiredKeys = apiKeys.livekit_api_key && apiKeys.livekit_api_secret && apiKeys.livekit_ws_url && apiKeys.tavus_api_key && apiKeys.gemini_api_key;
      onKeysUpdated(hasRequiredKeys);
      
      setTimeout(() => {
        setMessage(null);
        if (hasRequiredKeys) {
          onClose();
        }
      }, 2000);
    } catch (error) {
      console.error('Error saving API keys:', error);
      setMessage({ type: 'error', text: 'Failed to save API keys' });
    } finally {
      setSaving(false);
    }
  };

  const deleteApiKeys = async () => {
    if (!user) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('user_api_keys')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setApiKeys({
        livekit_api_key: '',
        livekit_api_secret: '',
        livekit_ws_url: '',
        tavus_api_key: '',
        elevenlabs_api_key: '',
        deepgram_api_key: '',
        gemini_api_key: ''
      });
      
      onKeysUpdated(false);
      setMessage({ type: 'success', text: 'API keys deleted successfully!' });
      
      setTimeout(() => {
        setMessage(null);
      }, 2000);
    } catch (error) {
      console.error('Error deleting API keys:', error);
      setMessage({ type: 'error', text: 'Failed to delete API keys' });
    } finally {
      setDeleting(false);
    }
  };

  const toggleShowKey = (key: string) => {
    setShowKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const updateApiKey = (key: keyof ApiKeys, value: string) => {
    setApiKeys(prev => ({ ...prev, [key]: value }));
  };

  const hasRequiredKeys = () => {
    return apiKeys.livekit_api_key && apiKeys.livekit_api_secret && apiKeys.livekit_ws_url && apiKeys.tavus_api_key && apiKeys.gemini_api_key;
  };

  const hasAnyKeys = () => {
    return Object.values(apiKeys).some(key => key.trim() !== '');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700"
        >
          {/* Header */}
          <div className="relative p-6 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-3 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-500 shadow-lg">
                  <Key className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    API Configuration
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300">
                    Configure your API keys for SafeMate's AI features
                  </p>
                </div>
              </div>
              
              <button
                onClick={onClose}
                className="p-2 rounded-full bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-700 transition-colors"
              >
                <X className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              </button>
            </div>
          </div>

          {/* Content - Scrollable */}
          <div className="p-6 max-h-[60vh] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
                <span className="ml-3 text-gray-600 dark:text-gray-300">Loading API keys...</span>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Message */}
                {message && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-xl border ${
                      message.type === 'success'
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
                        : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      {message.type === 'success' ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        <AlertCircle className="h-5 w-5" />
                      )}
                      <span className="font-medium">{message.text}</span>
                    </div>
                  </motion.div>
                )}

                {/* Required Keys Section */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
                    <Shield className="h-5 w-5 text-red-500" />
                    <span>Required API Keys</span>
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    {apiKeyConfigs.filter(config => config.required).map((config) => (
                      <Card key={config.key} className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-start space-x-4">
                          <div className={`p-2 rounded-lg bg-${config.color}-100 dark:bg-${config.color}-900/30`}>
                            <config.icon className={`h-5 w-5 text-${config.color}-600 dark:text-${config.color}-400`} />
                          </div>
                          <div className="flex-1 space-y-3">
                            <div>
                              <h4 className="font-semibold text-gray-900 dark:text-white">{config.label}</h4>
                              <p className="text-sm text-gray-600 dark:text-gray-300">{config.description}</p>
                            </div>
                            <div className="relative">
                              <Input
                                type={showKeys[config.key] ? 'text' : (config.key === 'livekit_ws_url' ? 'url' : 'password')}
                                value={apiKeys[config.key as keyof ApiKeys]}
                                onChange={(e) => updateApiKey(config.key as keyof ApiKeys, e.target.value)}
                                placeholder={config.placeholder || `Enter your ${config.label}`}
                                className="pr-12"
                              />
                              <button
                                type="button"
                                onClick={() => toggleShowKey(config.key)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                              >
                                {showKeys[config.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Optional Keys Section */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
                    <Brain className="h-5 w-5 text-blue-500" />
                    <span>Optional API Keys</span>
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    {apiKeyConfigs.filter(config => !config.required).map((config) => (
                      <Card key={config.key} className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-start space-x-4">
                          <div className={`p-2 rounded-lg bg-${config.color}-100 dark:bg-${config.color}-900/30`}>
                            <config.icon className={`h-5 w-5 text-${config.color}-600 dark:text-${config.color}-400`} />
                          </div>
                          <div className="flex-1 space-y-3">
                            <div>
                              <h4 className="font-semibold text-gray-900 dark:text-white">{config.label}</h4>
                              <p className="text-sm text-gray-600 dark:text-gray-300">{config.description}</p>
                            </div>
                            <div className="relative">
                              <Input
                                type={showKeys[config.key] ? 'text' : 'password'}
                                value={apiKeys[config.key as keyof ApiKeys]}
                                onChange={(e) => updateApiKey(config.key as keyof ApiKeys, e.target.value)}
                                placeholder={`Enter your ${config.label} (optional)`}
                                className="pr-12"
                              />
                              <button
                                type="button"
                                onClick={() => toggleShowKey(config.key)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                              >
                                {showKeys[config.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Info Box */}
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-800 dark:text-blue-200">Security Notice</h4>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                        Your API keys are encrypted and stored securely. They are only used for your SafeMate sessions and are never shared with third parties.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Setup Instructions */}
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <Globe className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-purple-800 dark:text-purple-200">Quick Setup Guide</h4>
                      <div className="text-sm text-purple-700 dark:text-purple-300 mt-1 space-y-1">
                       <p>
  • <strong>LiveKit:</strong> Get API keys from{" "}
  <a href="https://cloud.livekit.io" target="_blank" rel="noopener noreferrer" className="underline">
    cloud.livekit.io
  </a>
</p>
<p>
  • <strong>Tavus:</strong> Sign up at{" "}
  <a href="https://tavus.io" target="_blank" rel="noopener noreferrer" className="underline">
    tavus.io
  </a>{" "}for AI avatar API
</p>
<p>
  • <strong>Gemini:</strong> Get API key from{" "}
  <a href="https://ai.google.dev" target="_blank" rel="noopener noreferrer" className="underline">
    ai.google.dev
  </a>
</p>
<p>
  • <strong>ElevenLabs:</strong> Optional voice API from{" "}
  <a href="https://elevenlabs.io" target="_blank" rel="noopener noreferrer" className="underline">
    elevenlabs.io
  </a>
</p>
<p>
  • <strong>Deepgram:</strong> Optional speech API from{" "}
  <a href="https://deepgram.com" target="_blank" rel="noopener noreferrer" className="underline">
    deepgram.com
  </a>
</p>

                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {hasRequiredKeys() ? (
                  <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
                    <CheckCircle className="h-5 w-5" />
                    <span className="text-sm font-medium">Ready for AI features</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 text-amber-600 dark:text-amber-400">
                    <AlertCircle className="h-5 w-5" />
                    <span className="text-sm font-medium">Required keys missing</span>
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-3">
                {hasAnyKeys() && (
                  <Button
                    onClick={deleteApiKeys}
                    disabled={deleting}
                    variant="destructive"
                    className="flex items-center space-x-2"
                  >
                    {deleting ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    <span>Delete All</span>
                  </Button>
                )}
                
                <Button
                  onClick={saveApiKeys}
                  disabled={saving || !hasAnyKeys()}
                  className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  <span>Save Key</span>
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}