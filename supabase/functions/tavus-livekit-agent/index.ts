/*
  # Tavus LiveKit Agent Integration with Existing Conversation

  1. Purpose
    - Use existing Tavus conversation (ca1a2790d282c4c1) with p5d11710002a persona
    - Integrate with LiveKit for real-time communication
    - Handle session management and error recovery
    - Support both audio and video modes

  2. Features
    - Use pre-configured Tavus conversation
    - Generate LiveKit tokens for room access
    - Session logging and management
    - Robust error handling

  3. Integration
    - Existing conversation ID: ca1a2790d282c4c1
    - Persona ID: p5d11710002a
    - Replica ID: r4317e64d25a
    - Conversation URL: https://tavus.daily.co/ca1a2790d282c4c1
*/

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Pre-configured Tavus conversation details
const TAVUS_CONVERSATION = {
  conversation_id: 'ca1a2790d282c4c1',
  persona_id: 'p5d11710002a',
  replica_id: 'r4317e64d25a',
  conversation_url: 'https://tavus.daily.co/ca1a2790d282c4c1',
  status: 'active'
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
  conversationId: string;
  conversationUrl: string;
  personaId: string;
  replicaId: string;
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
      .select('livekit_api_key, livekit_api_secret, livekit_ws_url')
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

    // Generate unique session ID and room name
    const sessionId = crypto.randomUUID();
    const roomName = `safemate-${sessionType}-${mode}-${userId}-${Date.now()}`;

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
        avatar_id: TAVUS_CONVERSATION.conversation_id,
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

    // Return session details with existing Tavus conversation
    const response: SessionResponse = {
      roomToken,
      roomName,
      avatarId: TAVUS_CONVERSATION.conversation_id,
      sessionId,
      wsUrl: apiKeys.livekit_ws_url,
      mode,
      conversationId: TAVUS_CONVERSATION.conversation_id,
      conversationUrl: TAVUS_CONVERSATION.conversation_url,
      personaId: TAVUS_CONVERSATION.persona_id,
      replicaId: TAVUS_CONVERSATION.replica_id
    };

    console.log('Session created successfully:', {
      sessionId,
      roomName,
      conversationId: TAVUS_CONVERSATION.conversation_id,
      personaId: TAVUS_CONVERSATION.persona_id
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
      userId
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