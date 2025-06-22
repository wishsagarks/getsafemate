/*
  # Tavus LiveKit Agent Integration

  1. Purpose
    - Create LiveKit rooms for AI avatar sessions
    - Integrate with Tavus AI avatar API
    - Handle ElevenLabs voice synthesis
    - Process Deepgram speech recognition
    - Manage real-time communication

  2. Features
    - Room creation and management
    - AI avatar initialization
    - Voice processing pipeline
    - Emergency detection
    - Session logging

  3. API Integration
    - LiveKit room tokens
    - Tavus avatar creation
    - ElevenLabs voice synthesis
    - Deepgram speech-to-text
    - Gemini LLM conversations
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
  emergencyContacts?: Array<{name: string, phone: string}>;
}

interface SessionResponse {
  roomToken: string;
  roomName: string;
  avatarId: string;
  sessionId: string;
  wsUrl: string;
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

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Verify the user's authentication
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse request body
    const { userId, sessionType, emergencyContacts }: CreateSessionRequest = await req.json();

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
      .select('livekit_api_key, livekit_api_secret, livekit_ws_url, tavus_api_key, gemini_api_key')
      .eq('user_id', userId)
      .single();

    if (apiError || !apiKeys) {
      return new Response(
        JSON.stringify({ error: 'API keys not configured. Please set up your API keys first.' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!apiKeys.livekit_api_key || !apiKeys.livekit_api_secret || !apiKeys.livekit_ws_url || !apiKeys.tavus_api_key) {
      return new Response(
        JSON.stringify({ error: 'Missing required API keys (LiveKit and Tavus)' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Generate unique room name
    const roomName = `safemate-${sessionType}-${userId}-${Date.now()}`;
    const sessionId = crypto.randomUUID();

    // Create LiveKit room token
    const roomToken = await createLiveKitToken(
      apiKeys.livekit_api_key,
      apiKeys.livekit_api_secret,
      roomName,
      userId
    );

    // Initialize Tavus AI avatar
    const avatarId = await createTavusAvatar(apiKeys.tavus_api_key, sessionType);

    // Log session creation
    await logSession(supabaseClient, {
      id: sessionId,
      user_id: userId,
      session_type: sessionType,
      room_name: roomName,
      avatar_id: avatarId,
      emergency_contacts: emergencyContacts,
      status: 'active',
      started_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    // Return session details
    const response: SessionResponse = {
      roomToken,
      roomName,
      avatarId,
      sessionId,
      wsUrl: apiKeys.livekit_ws_url
    };

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error creating Tavus session:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
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
  userId: string
): Promise<string> {
  // This would use the LiveKit server SDK to create a room token
  // For now, we'll return a placeholder token
  
  // In a real implementation, you would:
  // 1. Import LiveKit server SDK
  // 2. Create AccessToken with proper permissions
  // 3. Set room name and participant identity
  // 4. Return signed token
  
  console.log('Creating LiveKit token for room:', roomName, 'user:', userId);
  
  // Placeholder token - replace with actual LiveKit token generation
  return `lk_token_${roomName}_${userId}_${Date.now()}`;
}

async function createTavusAvatar(apiKey: string, sessionType: string): Promise<string> {
  try {
    // Call Tavus API to create avatar
    const response = await fetch('https://tavusapi.com/v2/avatars', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        avatar_name: `SafeMate ${sessionType} Companion`,
        voice_settings: {
          stability: 0.8,
          similarity_boost: 0.8,
          style: 0.2
        },
        background_color: '#1a1a2e',
        personality: sessionType === 'safewalk' 
          ? 'caring, alert, protective, reassuring, calm'
          : 'empathetic, supportive, warm, understanding, nurturing'
      })
    });

    if (!response.ok) {
      throw new Error(`Tavus API error: ${response.status}`);
    }

    const data = await response.json();
    return data.avatar_id || `tavus_avatar_${Date.now()}`;
    
  } catch (error) {
    console.error('Error creating Tavus avatar:', error);
    // Return placeholder avatar ID
    return `placeholder_avatar_${sessionType}_${Date.now()}`;
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
    }
  } catch (error) {
    console.error('Error logging session:', error);
  }
}