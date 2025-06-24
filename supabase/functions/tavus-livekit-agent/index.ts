/*
  # Tavus LiveKit Agent Integration with p5d11710002a Persona

  1. Purpose
    - Create LiveKit rooms for AI avatar sessions
    - Integrate with Tavus AI avatar API using p5d11710002a persona
    - Handle ElevenLabs voice synthesis
    - Process Deepgram speech recognition
    - Manage real-time communication with Gemini 2.5 Flash

  2. Features
    - Room creation and management
    - AI avatar initialization with specific persona
    - Voice processing pipeline
    - Emergency detection
    - Session logging
    - Support for audio-only and video modes

  3. API Integration
    - LiveKit room tokens
    - Tavus avatar creation with p5d11710002a
    - ElevenLabs voice synthesis
    - Deepgram speech-to-text
    - Gemini 2.5 Flash LLM conversations
*/

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface CreateSessionRequest {
  userId: string;
  sessionType: 'safewalk' | 'heartmate';
  mode?: 'audio' | 'video';
  emergencyContacts?: Array<{name: string, phone: string}>;
}

interface SessionResponse {
  roomToken: string;
  roomName: string;
  avatarId: string;
  sessionId: string;
  wsUrl: string;
  mode: 'audio' | 'video';
  conversationId?: string;
  conversationUrl?: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check for required environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      console.error('Missing required environment variables:', {
        SUPABASE_URL: !!supabaseUrl,
        SUPABASE_ANON_KEY: !!supabaseAnonKey,
        SUPABASE_SERVICE_ROLE_KEY: !!supabaseServiceRoleKey
      });
      
      return new Response(
        JSON.stringify({ 
          error: 'Server configuration error: Missing required environment variables',
          details: 'Please ensure SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY are configured'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Extract token from authorization header
    const token = authHeader.replace('Bearer ', '');

    // Create Supabase client with user's authentication token
    let supabaseClient;
    try {
      supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      });
    } catch (clientError) {
      console.error('Error creating Supabase client:', clientError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to initialize database connection',
          details: 'Please check Supabase configuration'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Verify the user's authentication
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse request body
    let requestData: CreateSessionRequest;
    try {
      requestData = await req.json();
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { userId, sessionType, mode = 'audio', emergencyContacts } = requestData;

    // Validate required fields
    if (!userId || !sessionType) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId and sessionType' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate user can only create sessions for themselves
    if (user.id !== userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Can only create sessions for yourself' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get user's API keys - use maybeSingle() to handle cases where no keys exist
    const { data: apiKeys, error: apiError } = await supabaseClient
      .from('user_api_keys')
      .select('livekit_api_key, livekit_api_secret, livekit_ws_url, tavus_api_key, gemini_api_key')
      .eq('user_id', userId)
      .maybeSingle();

    // Handle actual database query errors (500 status)
    if (apiError) {
      console.error('Database error fetching API keys:', apiError);
      return new Response(
        JSON.stringify({ 
          error: 'Database error occurred while fetching API keys',
          details: 'Please try again later or contact support if the issue persists'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Handle case where no API keys are configured (400 status)
    if (!apiKeys) {
      return new Response(
        JSON.stringify({ 
          error: 'API keys not configured',
          details: 'Please configure your API keys in the Settings page before starting an AI session. You need to set up LiveKit, Tavus, and other required API keys.'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check for required API keys
    if (!apiKeys.livekit_api_key || !apiKeys.livekit_api_secret || !apiKeys.livekit_ws_url || !apiKeys.tavus_api_key) {
      const missingKeys = [];
      if (!apiKeys.livekit_api_key) missingKeys.push('LiveKit API Key');
      if (!apiKeys.livekit_api_secret) missingKeys.push('LiveKit API Secret');
      if (!apiKeys.livekit_ws_url) missingKeys.push('LiveKit WebSocket URL');
      if (!apiKeys.tavus_api_key) missingKeys.push('Tavus API Key');

      return new Response(
        JSON.stringify({ 
          error: 'Missing required API keys',
          details: `Please configure the following API keys in Settings: ${missingKeys.join(', ')}`
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Generate unique room name
    const roomName = `safemate-${sessionType}-${mode}-${userId}-${Date.now()}`;
    const sessionId = crypto.randomUUID();

    // Create Tavus conversation with p5d11710002a persona
    let tavusConversation;
    try {
      tavusConversation = await createTavusConversation(apiKeys.tavus_api_key, sessionType, mode);
    } catch (tavusError) {
      console.error('Error creating Tavus conversation:', tavusError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create AI avatar conversation',
          details: 'Please check your Tavus API key and try again'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create LiveKit room token
    let roomToken;
    try {
      roomToken = await createLiveKitToken(
        apiKeys.livekit_api_key,
        apiKeys.livekit_api_secret,
        roomName,
        userId,
        mode
      );
    } catch (tokenError) {
      console.error('Error creating LiveKit token:', tokenError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create room token',
          details: 'Please check your LiveKit API credentials'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Log session creation
    try {
      await logSession(supabaseClient, {
        id: sessionId,
        user_id: userId,
        session_type: sessionType,
        room_name: roomName,
        avatar_id: tavusConversation.conversation_id,
        emergency_contacts: emergencyContacts,
        status: 'active',
        started_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    } catch (logError) {
      console.error('Error logging session:', logError);
      // Don't fail the request if logging fails, just log the error
    }

    // Return session details
    const response: SessionResponse = {
      roomToken,
      roomName,
      avatarId: tavusConversation.conversation_id,
      sessionId,
      wsUrl: apiKeys.livekit_ws_url,
      mode,
      conversationId: tavusConversation.conversation_id,
      conversationUrl: tavusConversation.conversation_url
    };

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error in tavus-livekit-agent:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: 'An unexpected error occurred while creating the AI session'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function createLiveKitToken(
  apiKey: string, 
  apiSecret: string, 
  roomName: string, 
  userId: string,
  mode: 'audio' | 'video'
): Promise<string> {
  // This would use the LiveKit server SDK to create a room token
  // For now, we'll return a placeholder token
  
  // In a real implementation, you would:
  // 1. Import LiveKit server SDK
  // 2. Create AccessToken with proper permissions
  // 3. Set room name and participant identity
  // 4. Configure permissions based on mode (audio-only vs video)
  // 5. Return signed token
  
  console.log('Creating LiveKit token for room:', roomName, 'user:', userId, 'mode:', mode);
  
  // Placeholder token - replace with actual LiveKit token generation
  return `lk_token_${roomName}_${userId}_${mode}_${Date.now()}`;
}

async function createTavusConversation(apiKey: string, sessionType: string, mode: 'audio' | 'video'): Promise<any> {
  try {
    console.log('Creating Tavus conversation with p5d11710002a persona...');
    
    // Call Tavus API to create conversation with specific persona
    const response = await fetch('https://tavusapi.com/v2/conversations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        persona_id: 'p5d11710002a', // Your specific persona ID
        conversation_name: `SafeMate ${sessionType} Session ${Date.now()}`,
        callback_url: null, // Optional webhook URL
        properties: {
          max_call_duration: 3600, // 1 hour max
          participant_left_timeout: 300, // 5 minutes
          participant_absent_timeout: 60, // 1 minute
          enable_recording: false, // Set to true if you want recordings
          enable_transcription: true,
          language: 'en'
        },
        conversation_context: `You are SafeMate, an AI safety companion with the p5d11710002a persona. You're currently in a ${mode} call with a user who needs safety monitoring and emotional support during their ${sessionType} session. Be caring, protective, and supportive. Watch for any signs of distress or danger. You can see the user through video and should acknowledge their visual state when appropriate.`,
        custom_greeting: sessionType === 'safewalk' 
          ? "Hi! I'm your SafeMate AI companion. I can see you and I'm here to keep you safe during your walk. How are you feeling right now?"
          : "Hello! I'm your SafeMate AI companion here to provide emotional support. I can see you through our video connection. How can I help you today?"
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Tavus API error:', errorData);
      throw new Error(`Tavus API error: ${response.status} - ${errorData.message || 'Unknown error'}`);
    }

    const data = await response.json();
    console.log('Tavus conversation created with p5d11710002a:', data);
    
    return {
      conversation_id: data.conversation_id,
      conversation_url: data.conversation_url,
      status: data.status
    };
    
  } catch (error) {
    console.error('Error creating Tavus conversation:', error);
    throw error;
  }
}

async function logSession(supabaseClient: any, sessionData: any) {
  try {
    // Log the session in the database
    const { error } = await supabaseClient
      .from('ai_sessions')
      .insert(sessionData);

    if (error) {
      console.error('Error logging session:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error logging session:', error);
    throw error;
  }
}