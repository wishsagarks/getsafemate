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
  Wifi,
  ExternalLink,
  HelpCircle
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
  telegram_bot_token: string;
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
    gemini_api_key: '',
    telegram_bot_token: ''
  });
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [validatingTavus, setValidatingTavus] = useState(false);
  const [tavusValidationResult, setTavusValidationResult] = useState<{ 
    valid: boolean; 
    message: string; 
    personaAccessible?: boolean;
    replicaAccessible?: boolean;
    availablePersonas?: string[];
    availableReplicas?: string[];
  } | null>(null);

  const apiKeyConfigs = [
    {
      key: 'gemini_api_key',
      label: 'Gemini 2.5 Flash API Key',
      description: 'REQUIRED: AI conversations and natural language processing',
      icon: Brain,
      required: true,
      color: 'purple',
      priority: 1,
      setupUrl: 'https://ai.google.dev',
      setupText: 'Get API key from Google AI Studio'
    },
    {
      key: 'deepgram_api_key',
      label: 'Deepgram API Key',
      description: 'REQUIRED: Advanced speech recognition and audio processing',
      icon: Mic,
      required: true,
      color: 'orange',
      priority: 2,
      setupUrl: 'https://deepgram.com',
      setupText: 'Sign up at Deepgram'
    },
    {
      key: 'elevenlabs_api_key',
      label: 'ElevenLabs API Key',
      description: 'REQUIRED: High-quality voice synthesis and speech generation',
      icon: MessageSquare,
      required: true,
      color: 'green',
      priority: 3,
      setupUrl: 'https://elevenlabs.io',
      setupText: 'Get voice API from ElevenLabs'
    },
    {
      key: 'tavus_api_key',
      label: 'Tavus API Key',
      description: 'REQUIRED: AI avatar creation and video companion features',
      icon: Video,
      required: true,
      color: 'blue',
      priority: 4,
      setupUrl: 'https://tavus.io/dashboard/api-keys',
      setupText: 'Get API key from Tavus Dashboard',
      validation: true
    },
    {
      key: 'livekit_api_key',
      label: 'LiveKit API Key',
      description: 'REQUIRED: Real-time video/audio communication infrastructure',
      icon: Video,
      required: true,
      color: 'blue',
      priority: 5,
      setupUrl: 'https://cloud.livekit.io',
      setupText: 'Get API keys from LiveKit Cloud'
    },
    {
      key: 'livekit_api_secret',
      label: 'LiveKit API Secret',
      description: 'REQUIRED: LiveKit room creation and token generation',
      icon: Shield,
      required: true,
      color: 'blue',
      priority: 6,
      setupUrl: 'https://cloud.livekit.io',
      setupText: 'Get API secret from LiveKit Cloud'
    },
    {
      key: 'livekit_ws_url',
      label: 'LiveKit WebSocket URL',
      description: 'REQUIRED: Your LiveKit server WebSocket endpoint',
      icon: Wifi,
      required: true,
      color: 'blue',
      placeholder: 'wss://your-server.livekit.cloud',
      priority: 7,
      setupUrl: 'https://cloud.livekit.io',
      setupText: 'Get WebSocket URL from LiveKit Cloud'
    },
    {
      key: 'telegram_bot_token',
      label: 'Telegram Bot Token',
      description: 'OPTIONAL: For sending emergency notifications via Telegram',
      icon: MessageSquare,
      required: false,
      color: 'blue',
      priority: 8,
      setupUrl: 'https://t.me/botfather',
      setupText: 'Create a bot with BotFather'
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
          gemini_api_key: data.gemini_api_key || '',
          telegram_bot_token: data.telegram_bot_token || ''
        });
        
        // Check if all required keys are present
        const hasRequiredKeys = data.livekit_api_key && 
          data.livekit_api_secret && 
          data.livekit_ws_url && 
          data.tavus_api_key && 
          data.elevenlabs_api_key && 
          data.deepgram_api_key && 
          data.gemini_api_key;
        onKeysUpdated(hasRequiredKeys);
      }
    } catch (error) {
      console.error('Error loading API keys:', error);
      setMessage({ type: 'error', text: 'Failed to load API keys' });
    } finally {
      setLoading(false);
    }
  };

  const validateTavusApiKey = async (apiKey: string) => {
    if (!apiKey.trim()) {
      setTavusValidationResult({ valid: false, message: 'API key is required' });
      return;
    }

    if (apiKey.trim().length < 20) {
      setTavusValidationResult({ valid: false, message: 'API key appears to be too short' });
      return;
    }

    setValidatingTavus(true);
    setTavusValidationResult(null);

    try {
      console.log('Validating Tavus API key using GET method...');
      
      // Use the exact GET method you provided
      const options = {
        method: 'GET', 
        headers: {
          'x-api-key': apiKey.trim()
        }
      };

      // First, try to get available personas
      const personasResponse = await fetch('https://tavusapi.com/v2/personas', options);
      
      let personaAccessible = false;
      let replicaAccessible = false;
      let availablePersonas: string[] = [];
      let availableReplicas: string[] = [];

      // Check persona access
      if (personasResponse.ok) {
        const personasData = await personasResponse.json();
        console.log('Personas data:', personasData);
        const personas = personasData.data || [];
        availablePersonas = personas.map((p: any) => p.persona_id);
      } else if (personasResponse.status === 401) {
        setTavusValidationResult({ 
          valid: false, 
          message: 'Invalid API key. Please verify your key at tavus.io/dashboard/api-keys' 
        });
        return;
      } else if (personasResponse.status === 403) {
        setTavusValidationResult({ 
          valid: false, 
          message: 'API key does not have sufficient permissions for personas' 
        });
        return;
      }

      // Check replicas
      try {
        const replicasResponse = await fetch('https://tavusapi.com/v2/replicas', options);
        
        if (replicasResponse.ok) {
          const replicasData = await replicasResponse.json();
          console.log('Replicas data:', replicasData);
          const replicas = replicasData.data || [];
          availableReplicas = replicas.map((r: any) => r.replica_id);
        }
      } catch (error) {
        console.log('Replica check failed:', error);
      }

      // Determine validation result
      if (availablePersonas.length > 0 || availableReplicas.length > 0) {
        setTavusValidationResult({ 
          valid: true, 
          message: `✅ Valid API key with access to ${availablePersonas.length} personas and ${availableReplicas.length} replicas.`,
          personaAccessible: availablePersonas.length > 0,
          replicaAccessible: availableReplicas.length > 0,
          availablePersonas,
          availableReplicas
        });
      } else {
        setTavusValidationResult({ 
          valid: false, 
          message: `❌ No personas or replicas found in your account. Please check your Tavus dashboard.`,
          personaAccessible: false,
          replicaAccessible: false,
          availablePersonas,
          availableReplicas
        });
      }
      
    } catch (error) {
      console.error('Error validating Tavus API key:', error);
      setTavusValidationResult({ 
        valid: false, 
        message: `Network error: ${error.message}` 
      });
    } finally {
      setValidatingTavus(false);
    }
  };

  const saveApiKeys = async () => {
    if (!user) return;

    // Validate all required keys are present
    const missingKeys = apiKeyConfigs
      .filter(config => config.required && !apiKeys[config.key as keyof ApiKeys].trim())
      .map(config => config.label);

    if (missingKeys.length > 0) {
      setMessage({ 
        type: 'error', 
        text: `Missing required API keys: ${missingKeys.join(', ')}` 
      });
      return;
    }

    // Check Tavus API key validation if it was validated
    if (tavusValidationResult && !tavusValidationResult.valid) {
      setMessage({ 
        type: 'error', 
        text: `Tavus API key validation failed: ${tavusValidationResult.message}` 
      });
      return;
    }

    setSaving(true);
    try {
      // Use upsert to handle both insert and update cases
      const { error } = await supabase
        .from('user_api_keys')
        .upsert({
          user_id: user.id,
          ...apiKeys,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      let successMessage = 'All API keys saved successfully!';
      if (tavusValidationResult && tavusValidationResult.valid) {
        successMessage += ` Tavus integration is ready with ${tavusValidationResult.availablePersonas?.length || 0} personas and ${tavusValidationResult.availableReplicas?.length || 0} replicas.`;
      }

      setMessage({ type: 'success', text: successMessage });
      
      // All keys are required, so if we reach here, all are present
      onKeysUpdated(true);
      
      setTimeout(() => {
        setMessage(null);
        onClose();
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
        gemini_api_key: '',
        telegram_bot_token: ''
      });
      
      onKeysUpdated(false);
      setTavusValidationResult(null);
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
    
    // Clear Tavus validation when key changes
    if (key === 'tavus_api_key') {
      setTavusValidationResult(null);
    }
  };

  const hasAllRequiredKeys = () => {
    return apiKeyConfigs
      .filter(config => config.required)
      .every(config => apiKeys[config.key as keyof ApiKeys].trim() !== '');
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
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700"
        >
          {/* Header */}
          <div className="relative p-6 bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-900/30 dark:to-blue-900/30 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-3 rounded-2xl bg-gradient-to-r from-green-500 to-blue-500 shadow-lg">
                  <Key className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Required API Configuration
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300">
                    Configure APIs for full SafeMate functionality
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
                    <span>All Required for Full Functionality</span>
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    {apiKeyConfigs
                      .filter(config => config.required)
                      .sort((a, b) => a.priority - b.priority)
                      .map((config) => (
                      <Card key={config.key} className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800">
                        <div className="flex items-start space-x-4">
                          <div className={`p-2 rounded-lg bg-${config.color}-100 dark:bg-${config.color}-900/30`}>
                            <config.icon className={`h-5 w-5 text-${config.color}-600 dark:text-${config.color}-400`} />
                          </div>
                          <div className="flex-1 space-y-3">
                            <div>
                              <h4 className="font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                                <span>{config.label}</span>
                                <span className="px-2 py-1 text-xs font-bold bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full">
                                  REQUIRED
                                </span>
                                {config.setupUrl && (
                                  <a
                                    href={config.setupUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-500 hover:text-blue-600 transition-colors"
                                    title={config.setupText}
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </a>
                                )}
                              </h4>
                              <p className="text-sm text-gray-600 dark:text-gray-300">{config.description}</p>
                              {config.setupText && (
                                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                  💡 {config.setupText}
                                </p>
                              )}
                            </div>
                            <div className="relative">
                              <Input
                                type={showKeys[config.key] ? 'text' : (config.key === 'livekit_ws_url' ? 'url' : 'password')}
                                value={apiKeys[config.key as keyof ApiKeys]}
                                onChange={(e) => updateApiKey(config.key as keyof ApiKeys, e.target.value)}
                                placeholder={config.placeholder || `Enter your ${config.label}`}
                                className="pr-12"
                                required
                              />
                              <button
                                type="button"
                                onClick={() => toggleShowKey(config.key)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                              >
                                {showKeys[config.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                            
                            {/* Tavus API Key Validation */}
                            {config.key === 'tavus_api_key' && (
                              <div className="space-y-2">
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => validateTavusApiKey(apiKeys.tavus_api_key)}
                                    disabled={validatingTavus || !apiKeys.tavus_api_key.trim()}
                                    className="px-3 py-1 text-xs bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded transition-colors flex items-center space-x-1"
                                  >
                                    {validatingTavus ? (
                                      <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                      <CheckCircle className="h-3 w-3" />
                                    )}
                                    <span>Validate Access</span>
                                  </button>
                                  <a
                                    href="https://tavus.io/dashboard/api-keys"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-500 hover:text-blue-600 flex items-center space-x-1"
                                  >
                                    <HelpCircle className="h-3 w-3" />
                                    <span>Get API Key</span>
                                  </a>
                                  <a
                                    href="https://tavus.io/dashboard"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-green-500 hover:text-green-600 flex items-center space-x-1"
                                  >
                                    <Video className="h-3 w-3" />
                                    <span>View Assets</span>
                                  </a>
                                </div>
                                
                                {tavusValidationResult && (
                                  <div className={`p-2 rounded text-xs ${
                                    tavusValidationResult.valid 
                                      ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
                                      : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                                  }`}>
                                    {tavusValidationResult.message}
                                    {!tavusValidationResult.valid && (
                                      <div className="mt-1">
                                        <a 
                                          href="https://tavus.io/dashboard" 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="underline hover:no-underline"
                                        >
                                          Check your Tavus dashboard →
                                        </a>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Optional Keys Section */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
                    <Key className="h-5 w-5 text-blue-500" />
                    <span>Optional Integrations</span>
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    {apiKeyConfigs
                      .filter(config => !config.required)
                      .sort((a, b) => a.priority - b.priority)
                      .map((config) => (
                      <Card key={config.key} className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800">
                        <div className="flex items-start space-x-4">
                          <div className={`p-2 rounded-lg bg-${config.color}-100 dark:bg-${config.color}-900/30`}>
                            <config.icon className={`h-5 w-5 text-${config.color}-600 dark:text-${config.color}-400`} />
                          </div>
                          <div className="flex-1 space-y-3">
                            <div>
                              <h4 className="font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                                <span>{config.label}</span>
                                <span className="px-2 py-1 text-xs font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full">
                                  OPTIONAL
                                </span>
                                {config.setupUrl && (
                                  <a
                                    href={config.setupUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-500 hover:text-blue-600 transition-colors"
                                    title={config.setupText}
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </a>
                                )}
                              </h4>
                              <p className="text-sm text-gray-600 dark:text-gray-300">{config.description}</p>
                              {config.setupText && (
                                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                  💡 {config.setupText}
                                </p>
                              )}
                            </div>
                            <div className="relative">
                              <Input
                                type={showKeys[config.key] ? 'text' : 'password'}
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

                {/* Info Box */}
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-800 dark:text-blue-200">Smart Fallback System</h4>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                        SafeMate will automatically use available AI services with smart fallbacks. 
                        Your API keys are encrypted and stored securely, used only for your SafeMate sessions.
                      </p>
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
                {hasAllRequiredKeys() ? (
                  <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
                    <CheckCircle className="h-5 w-5" />
                    <span className="text-sm font-medium">All required APIs configured</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
                    <AlertCircle className="h-5 w-5" />
                    <span className="text-sm font-medium">Required API keys missing</span>
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
                  className="flex items-center space-x-2 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  <span>Save All Keys</span>
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}