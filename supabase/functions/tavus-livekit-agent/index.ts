/*
  # Tavus Integration with Smart Persona/Replica Fallback

  1. Purpose
    - Create Tavus sessions using persona or replica as fallback
    - Automatically detect which asset is available
    - Handle both CVI and conversation endpoints
    - Support both audio and video modes

  2. Features
    - Smart fallback: persona preferred, replica as backup
    - Uses appropriate API endpoints based on asset type
    - Proper error handling and validation
    - Session logging and management

  3. Integration
    - Primary: Persona ID p157bb5e234e
    - Fallback: Replica ID r9d30b0e55ac
    - Automatically selects best available option
*/

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Your personal assets - persona preferred, replica as fallback
const YOUR_PERSONA_ID = 'p157bb5e234e';
const YOUR_REPLICA_ID = 'r9d30b0e55ac';

interface CreateSessionRequest {
  userId: string;
  sessionType: 'safewalk' | 'heartmate';
  mode?: 'audio' | 'video';
  emergencyContacts?: Array<{name: string, phone: string}>;
}

interface SessionResponse {
  sessionId: string;
  sessionToken?: string;
  roomToken?: string;
  roomName?: string;
  wsUrl?: string;
  assetId: string;
  assetType: 'persona' | 'replica';
  mode: 'audio' | 'video';
  sessionType: string;
  status: string;
  embedUrl?: string;
  conversationUrl?: string;
}

interface TavusSession {
  session_id?: string;
  session_token?: string;
  conversation_id?: string;
  conversation_url?: string;
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

    const { userId, sessionType, mode = 'video', emergencyContacts } = requestData;

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
      .select('tavus_api_key')
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

    if (!apiKeys || !apiKeys.tavus_api_key?.trim()) {
      return new Response(
        JSON.stringify({ 
          error: 'Tavus API key not configured',
          details: 'Please configure your Tavus API key in Settings. Get your API key from https://tavus.io/dashboard/api-keys'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate Tavus API key format
    const tavusApiKey = apiKeys.tavus_api_key.trim();
    if (tavusApiKey.length < 20) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid Tavus API key format',
          details: 'Tavus API key appears to be too short. Please verify your API key from https://tavus.io/dashboard/api-keys'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Determine which asset to use (persona preferred, replica as fallback)
    const { assetId, assetType } = await determineAvailableAsset(tavusApiKey);

    // Create Tavus session based on asset type
    let tavusSession: TavusSession;
    let sessionResponse: SessionResponse;

    try {
      if (assetType === 'persona') {
        // Use CVI for personas
        tavusSession = await createTavusCVISession(tavusApiKey, sessionType, mode);
        sessionResponse = {
          sessionId: tavusSession.session_id!,
          sessionToken: tavusSession.session_token,
          assetId,
          assetType,
          mode,
          sessionType,
          status: tavusSession.status,
          embedUrl: `https://tavus.io/embed/${tavusSession.session_id}`
        };
      } else {
        // Use conversations for replicas
        tavusSession = await createTavusConversation(tavusApiKey, sessionType, mode);
        
        // For replicas, we need to create a room and token (simplified approach)
        const roomName = `safemate-${sessionType}-${mode}-${userId}-${Date.now()}`;
        
        sessionResponse = {
          sessionId: tavusSession.conversation_id!,
          roomToken: 'replica-session-token', // Simplified for replica
          roomName,
          assetId,
          assetType,
          mode,
          sessionType,
          status: tavusSession.status,
          conversationUrl: tavusSession.conversation_url
        };
      }

      console.log(`Created Tavus session using ${assetType} ${assetId}:`, tavusSession);
    } catch (tavusError) {
      console.error('Error creating Tavus session:', tavusError);
      
      // Provide more specific error messages
      let errorDetails = `Tavus API error: ${tavusError.message}`;
      
      if (tavusError.message.includes('401')) {
        errorDetails = 'Invalid Tavus API key. Please verify your API key at https://tavus.io/dashboard/api-keys';
      } else if (tavusError.message.includes('403')) {
        errorDetails = 'Tavus API key does not have permission to create sessions.';
      } else if (tavusError.message.includes('404')) {
        errorDetails = `Asset ${assetId} not found or not accessible with your API key.`;
      } else if (tavusError.message.includes('429')) {
        errorDetails = 'Tavus API rate limit exceeded. Please try again in a few minutes.';
      }
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create Tavus session',
          details: errorDetails
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Generate unique session ID for our internal tracking
    const internalSessionId = crypto.randomUUID();

    // Log session creation
    try {
      await logSession(supabaseClient, {
        id: internalSessionId,
        user_id: userId,
        session_type: sessionType,
        room_name: sessionResponse.roomName || `tavus-${assetType}-${sessionResponse.sessionId}`,
        avatar_id: sessionResponse.sessionId,
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

    console.log('Tavus session created successfully:', {
      sessionId: sessionResponse.sessionId,
      assetId,
      assetType,
      mode,
      sessionType
    });

    return new Response(
      JSON.stringify(sessionResponse),
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

async function determineAvailableAsset(tavusApiKey: string): Promise<{ assetId: string; assetType: 'persona' | 'replica' }> {
  try {
    console.log('Determining available asset...');
    
    // Check personas first (preferred)
    try {
      const personasResponse = await fetch('https://tavusapi.com/v2/personas', {
        method: 'GET',
        headers: {
          'x-api-key': tavusApiKey,
          'Content-Type': 'application/json'
        }
      });

      if (personasResponse.ok) {
        const personasData = await personasResponse.json();
        const personas = personasData.data || [];
        const foundPersona = personas.find((p: any) => p.persona_id === YOUR_PERSONA_ID);
        
        if (foundPersona) {
          console.log('✅ Using persona:', YOUR_PERSONA_ID);
          return { assetId: YOUR_PERSONA_ID, assetType: 'persona' };
        }
      }
    } catch (error) {
      console.log('Persona check failed, trying replica...');
    }

    // Check replicas as fallback
    try {
      const replicasResponse = await fetch('https://tavusapi.com/v2/replicas', {
        method: 'GET',
        headers: {
          'x-api-key': tavusApiKey,
          'Content-Type': 'application/json'
        }
      });

      if (replicasResponse.ok) {
        const replicasData = await replicasResponse.json();
        const replicas = replicasData.data || [];
        const foundReplica = replicas.find((r: any) => r.replica_id === YOUR_REPLICA_ID);
        
        if (foundReplica) {
          console.log('✅ Using replica as fallback:', YOUR_REPLICA_ID);
          return { assetId: YOUR_REPLICA_ID, assetType: 'replica' };
        }
      }
    } catch (error) {
      console.log('Replica check failed');
    }

    // If neither is available, throw error
    throw new Error(`Neither persona ${YOUR_PERSONA_ID} nor replica ${YOUR_REPLICA_ID} found in your account`);
    
  } catch (error) {
    console.error('Error determining available asset:', error);
    throw error;
  }
}

async function createTavusCVISession(
  tavusApiKey: string, 
  sessionType: string, 
  mode: 'audio' | 'video'
): Promise<TavusSession> {
  try {
    console.log('Creating Tavus CVI session with persona:', YOUR_PERSONA_ID);
    
    const response = await fetch('https://tavusapi.com/v2/cvi/sessions', {
      method: 'POST',
      headers: {
        'x-api-key': tavusApiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        persona_id: YOUR_PERSONA_ID,
        properties: {
          max_session_duration: 3600, // 1 hour
          participant_left_timeout: 300, // 5 minutes
          participant_absent_timeout: 60, // 1 minute
          enable_recording: false,
          enable_transcription: true,
          language: 'en'
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Tavus CVI session creation failed:', response.status, errorData);
      throw new Error(`CVI API error: ${response.status} - ${errorData.message || 'Unknown error'}`);
    }

    const data = await response.json();
    console.log('Tavus CVI session created:', data);
    
    return {
      session_id: data.session_id,
      session_token: data.session_token,
      status: data.status || 'active'
    };
    
  } catch (error) {
    console.error('Error creating Tavus CVI session:', error);
    throw error;
  }
}

async function createTavusConversation(
  tavusApiKey: string, 
  sessionType: string, 
  mode: 'audio' | 'video'
): Promise<TavusSession> {
  try {
    console.log('Creating Tavus conversation with replica:', YOUR_REPLICA_ID);
    
    const response = await fetch('https://tavusapi.com/v2/conversations', {
      method: 'POST',
      headers: {
        'x-api-key': tavusApiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        replica_id: YOUR_REPLICA_ID,
        conversation_name: `SafeMate ${sessionType} Session ${new Date().toISOString()}`,
        properties: {
          max_call_duration: 3600, // 1 hour
          participant_left_timeout: 300, // 5 minutes
          participant_absent_timeout: 60, // 1 minute
          enable_recording: false,
          enable_transcription: true,
          language: 'en'
        },
        conversation_context: `You are SafeMate, an AI safety companion. You're in a ${mode} call with a user who needs safety monitoring and emotional support during their ${sessionType} session. Be caring, protective, and supportive.`,
        custom_greeting: sessionType === 'safewalk' 
          ? "Hi! I'm your SafeMate AI companion. How are you feeling?"
          : "Hello! I'm your SafeMate AI companion. How can I help you today?"
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Tavus conversation creation failed:', response.status, errorData);
      throw new Error(`Conversation API error: ${response.status} - ${errorData.message || 'Unknown error'}`);
    }

    const data = await response.json();
    console.log('Tavus conversation created:', data);
    
    return {
      conversation_id: data.conversation_id,
      conversation_url: data.conversation_url,
      status: data.status || 'active'
    };
    
  } catch (error) {
    console.error('Error creating Tavus conversation:', error);
    throw error;
  }
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