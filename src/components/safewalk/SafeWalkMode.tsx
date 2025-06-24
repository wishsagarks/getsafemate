import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { ApiKeyManager } from './ApiKeyManager';
import { PermissionManager } from './PermissionManager';
import { LocationTracker } from './LocationTracker';
import { EmergencySystem } from './EmergencySystem';
import { EnhancedAICompanion } from './EnhancedAICompanion';

interface ApiKeys {
  livekit_api_key: string | null;
  livekit_api_secret: string | null;
  livekit_ws_url: string | null;
  tavus_api_key: string | null;
  elevenlabs_api_key: string | null;
  deepgram_api_key: string | null;
  gemini_api_key: string | null;
}

export function SafeWalkMode() {
  const { user } = useAuth();
  const [apiKeys, setApiKeys] = useState<ApiKeys | null>(null);
  const [hasRequiredKeys, setHasRequiredKeys] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkApiKeys = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

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
        setApiKeys(data);
        // Check if all required keys are present
        const required = data.livekit_api_key && 
                        data.livekit_api_secret && 
                        data.livekit_ws_url && 
                        data.tavus_api_key && 
                        data.elevenlabs_api_key && 
                        data.deepgram_api_key && 
                        data.gemini_api_key;
        setHasRequiredKeys(!!required);
      } else {
        setApiKeys(null);
        setHasRequiredKeys(false);
      }
    } catch (err) {
      console.error('Error checking API keys:', err);
      setError(err instanceof Error ? err.message : 'Failed to check API keys');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkApiKeys();
  }, [user]);

  const handleApiKeysUpdated = () => {
    checkApiKeys();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading SafeWalk...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-red-400 text-xl">Error: {error}</div>
      </div>
    );
  }

  if (!hasRequiredKeys) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl font-bold text-white mb-8 text-center">
              SafeWalk Setup
            </h1>
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 mb-8">
              <p className="text-white/80 text-lg mb-6 text-center">
                To use SafeWalk, you need to configure your API keys for the AI services.
              </p>
              <ApiKeyManager 
                apiKeys={apiKeys} 
                onApiKeysUpdated={handleApiKeysUpdated}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold text-white mb-8 text-center">
            SafeWalk Mode
          </h1>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Controls */}
            <div className="space-y-6">
              <PermissionManager />
              <LocationTracker />
              <EmergencySystem />
            </div>
            
            {/* Right Column - AI Companion */}
            <div>
              <EnhancedAICompanion apiKeys={apiKeys} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}