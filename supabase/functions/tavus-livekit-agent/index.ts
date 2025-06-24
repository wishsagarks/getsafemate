/*
  # Tavus LiveKit Agent Integration with Dynamic Conversation Creation

  1. Purpose
    - Create new Tavus conversations with p5d11710002a persona when needed
    - Integrate with LiveKit for real-time communication
    - Handle session management and error recovery
    - Support both audio and video modes

  2. Features
    - Dynamic conversation creation with specified persona
    - Generate LiveKit tokens for room access
    - Session logging and management
    - Robust error handling

  3. Integration
    - Persona ID: p5d11710002a
    - Creates new conversations for each session
    - Returns conversation details for client connection
*/

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Your persona configuration
const TAVUS_PERSONA_ID = 'p5d11710002a';

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
  conversationId: string;
  conversationUrl: string;
  personaId: string;
  status: string;
}

interface TavusConversation {
  conversation_id: string;
  conversation_url: string;
  status: string;
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

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing required environment variables');
      return new Response(
        JSON.stringify({ 
          error: 'Server configuration error',
          details: 'Missing required environment variables'
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

    // Create Supabase client
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });

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

    // Get user's API keys
    const { data: apiKeys, error: apiError } = await supabaseClient
      .from('user_api_keys')
      .select('livekit_api_key, livekit_api_secret, livekit_ws_url, tavus_api_key')
      .eq('user_id', userId)
      .maybeSingle();

    if (apiError) {
      console.error('Database error fetching API keys:', apiError);
      return new Response(
        JSON.stringify({ 
          error: 'Database error occurred while fetching API keys',
          details: 'Please try again later'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!apiKeys || !apiKeys.livekit_api_key || !apiKeys.livekit_api_secret || !apiKeys.livekit_ws_url) {
      return new Response(
        JSON.stringify({ 
          error: 'LiveKit API keys not configured',
          details: 'Please configure your LiveKit API keys in Settings to enable real-time communication'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!apiKeys.tavus_api_key) {
      return new Response(
        JSON.stringify({ 
          error: 'Tavus API key not configured',
          details: 'Please configure your Tavus API key in Settings to enable AI avatar features'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Generate unique session ID and room name
    const sessionId = crypto.randomUUID();
    const roomName = `safemate-${sessionType}-${mode}-${userId}-${Date.now()}`;

    // Create new Tavus conversation
    let tavusConversation: TavusConversation;
    try {
      tavusConversation = await createTavusConversation(apiKeys.tavus_api_key, sessionType, mode);
      console.log('Created new Tavus conversation:', tavusConversation.conversation_id);
    } catch (tavusError) {
      console.error('Error creating Tavus conversation:', tavusError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create Tavus conversation',
          details: `Tavus API error: ${tavusError.message}. Please check your Tavus API key.`
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Generate LiveKit token for the room
    let roomToken;
    try {
      roomToken = await generateLiveKitToken(
        apiKeys.livekit_api_key,
        apiKeys.livekit_api_secret,
        roomName,
        userId,
        mode
      );
    } catch (tokenError) {
      console.error('Error generating LiveKit token:', tokenError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to generate room token',
          details: 'Please check your LiveKit API credentials in Settings'
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
      // Don't fail the request if logging fails
    }

    // Return session details with new Tavus conversation
    const response: SessionResponse = {
      roomToken,
      roomName,
      avatarId: tavusConversation.conversation_id,
      sessionId,
      wsUrl: apiKeys.livekit_ws_url,
      mode,
      conversationId: tavusConversation.conversation_id,
      conversationUrl: tavusConversation.conversation_url,
      personaId: TAVUS_PERSONA_ID,
      status: tavusConversation.status
    };

    console.log('Session created successfully:', {
      sessionId,
      roomName,
      conversationId: tavusConversation.conversation_id,
      personaId: TAVUS_PERSONA_ID
    });

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

async function createTavusConversation(
  tavusApiKey: string, 
  sessionType: string, 
  mode: 'audio' | 'video'
): Promise<TavusConversation> {
  try {
    console.log('Creating new Tavus conversation with persona:', TAVUS_PERSONA_ID);
    
    const response = await fetch('https://tavusapi.com/v2/conversations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tavusApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        persona_id: TAVUS_PERSONA_ID,
        conversation_name: `SafeMate ${sessionType} Session ${new Date().toISOString()}`,
        callback_url: null,
        properties: {
          max_call_duration: 3600, // 1 hour
          participant_left_timeout: 300, // 5 minutes
          participant_absent_timeout: 60, // 1 minute
          enable_recording: false,
          enable_transcription: true,
          language: 'en'
        },
        conversation_context: `You are SafeMate, an AI safety companion with the ${TAVUS_PERSONA_ID} persona. You're in a ${mode} call with a user who needs safety monitoring and emotional support during their ${sessionType} session. Be caring, protective, and supportive. Watch for any signs of distress or danger. You can see the user through video and should acknowledge their visual state when appropriate.`,
        custom_greeting: sessionType === 'safewalk' 
          ? "Hi! I'm your SafeMate AI companion. I can see you and I'm here to keep you safe during your walk. How are you feeling right now?"
          : "Hello! I'm your SafeMate AI companion here to provide emotional support. I can see you through our video connection. How can I help you today?"
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Tavus API error:', response.status, errorData);
      throw new Error(`Tavus API error: ${response.status} - ${errorData.message || 'Failed to create conversation'}`);
    }

    const data = await response.json();
    console.log('New Tavus conversation created:', data);
    
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

async function generateLiveKitToken(
  apiKey: string, 
  apiSecret: string, 
  roomName: string, 
  userId: string,
  mode: 'audio' | 'video'
): Promise<string> {
  // This is a simplified token generation
  // In production, you would use the LiveKit server SDK:
  // import { AccessToken } from 'livekit-server-sdk';
  
  console.log('Generating LiveKit token for:', {
    roomName,
    userId,
    mode,
    apiKeyPrefix: apiKey.substring(0, 8) + '...'
  });
  
  // For now, return a mock token that includes the necessary information
  // In production, this would be a proper JWT token signed with the API secret
  const tokenData = {
    room: roomName,
    identity: userId,
    permissions: {
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      canUpdateOwnMetadata: true
    },
    metadata: JSON.stringify({
      mode,
      sessionType: 'safewalk',
      userId,
      personaId: TAVUS_PERSONA_ID
    }),
    exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour expiry
  };
  
  // This would be replaced with actual JWT signing in production
  return `lk_token_${btoa(JSON.stringify(tokenData))}_${Date.now()}`;
}

async function logSession(supabaseClient: any, sessionData: any) {
  try {
    const { error } = await supabaseClient
      .from('ai_sessions')
      .insert(sessionData);

    if (error) {
      console.error('Error logging session:', error);
      throw error;
    }
    
    console.log('Session logged successfully:', sessionData.id);
  } catch (error) {
    console.error('Error logging session:', error);
    throw error;
  }
}