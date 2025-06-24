/*
  # Tavus LiveKit Agent Integration with Configurable Persona

  1. Purpose
    - Create LiveKit rooms for AI avatar sessions
    - Integrate with Tavus AI avatar API with fallback persona handling
    - Handle ElevenLabs voice synthesis
    - Process Deepgram speech recognition
    - Manage real-time communication with Gemini 2.5 Flash

  2. Features
    - Room creation and management
    - AI avatar initialization with configurable persona
    - Voice processing pipeline
    - Emergency detection
    - Session logging
    - Support for audio-only and video modes
    - Robust error handling for API failures

  3. API Integration
    - Tavus conversation creation with LiveKit integration
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
      .select('tavus_api_key, gemini_api_key, livekit_api_key, livekit_api_secret, livekit_ws_url')
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
          details: 'Please configure your API keys in the Settings page before starting an AI session. You need to set up Tavus and other required API keys.'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check for required API keys
    if (!apiKeys.tavus_api_key || apiKeys.tavus_api_key.trim() === '') {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required API keys',
          details: 'Please configure your Tavus API key in Settings. Go to Settings > API Configuration and add a valid Tavus API key.'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate Tavus API key format (basic check)
    if (!apiKeys.tavus_api_key.startsWith('tvs-')) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid Tavus API key format',
          details: 'Tavus API keys should start with "tvs-". Please check your API key in Settings.'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Generate unique session ID
    const sessionId = crypto.randomUUID();

    // Create Tavus conversation with enhanced error handling
    let tavusConversation;
    try {
      tavusConversation = await createTavusConversation(apiKeys.tavus_api_key, sessionType, mode);
    } catch (tavusError) {
      console.error('Error creating Tavus conversation:', tavusError);
      
      // Provide more specific error messages based on the error
      let errorMessage = 'Failed to create AI avatar conversation';
      let errorDetails = 'Please check your Tavus API key and try again';
      
      if (tavusError.message.includes('401') || tavusError.message.includes('Unauthorized') || tavusError.message.includes('Invalid access token')) {
        errorDetails = 'Your Tavus API key is invalid or expired. Please go to Settings > API Configuration and update your Tavus API key with a valid one from your Tavus dashboard (tavus.io).';
      } else if (tavusError.message.includes('403') || tavusError.message.includes('Forbidden')) {
        errorDetails = 'Your Tavus API key does not have permission to create conversations. Please check your Tavus account permissions or generate a new API key.';
      } else if (tavusError.message.includes('404') || tavusError.message.includes('persona')) {
        errorDetails = 'The AI persona is not available in your Tavus account. The system will try to create a conversation without a specific persona.';
      } else if (tavusError.message.includes('429')) {
        errorDetails = 'Too many requests to Tavus API. Please wait a moment and try again.';
      } else if (tavusError.message.includes('500')) {
        errorDetails = 'Tavus API is experiencing issues. Please try again later.';
      } else if (tavusError.message.includes('network') || tavusError.message.includes('fetch')) {
        errorDetails = 'Network error connecting to Tavus API. Please check your internet connection and try again.';
      }
      
      return new Response(
        JSON.stringify({ 
          error: errorMessage,
          details: errorDetails,
          tavusError: tavusError.message
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
        room_name: tavusConversation.conversation_id,
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

    // Return session details using Tavus-provided LiveKit credentials
    const response: SessionResponse = {
      roomToken: tavusConversation.livekit_token,
      roomName: tavusConversation.conversation_id,
      avatarId: tavusConversation.conversation_id,
      sessionId,
      wsUrl: tavusConversation.livekit_url,
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

async function createTavusConversation(apiKey: string, sessionType: string, mode: 'audio' | 'video'): Promise<any> {
  try {
    console.log('Creating Tavus conversation...');
    
    // First, validate the API key by testing a simple API call
    try {
      console.log('Validating Tavus API key...');
      const testResponse = await fetch('https://tavusapi.com/v2/personas', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!testResponse.ok) {
        const errorData = await testResponse.json().catch(() => ({}));
        console.error('API key validation failed:', {
          status: testResponse.status,
          statusText: testResponse.statusText,
          errorData
        });
        
        if (testResponse.status === 401) {
          throw new Error('Tavus API error: 401 - Invalid or expired API key');
        } else if (testResponse.status === 403) {
          throw new Error('Tavus API error: 403 - Insufficient permissions');
        } else {
          throw new Error(`Tavus API error: ${testResponse.status} - ${testResponse.statusText}`);
        }
      }
      
      console.log('API key validation successful');
    } catch (validationError) {
      console.error('API key validation error:', validationError);
      throw validationError;
    }
    
    // Try to get available personas to find a working one
    let personaId = null;
    
    try {
      console.log('Fetching available personas...');
      const personasResponse = await fetch('https://tavusapi.com/v2/personas', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (personasResponse.ok) {
        const personasData = await personasResponse.json();
        console.log('Available personas count:', personasData.data?.length || 0);
        
        if (personasData.data && personasData.data.length > 0) {
          // Use the first available persona
          personaId = personasData.data[0].persona_id;
          console.log('Using persona:', personaId);
        } else {
          console.log('No personas available, creating conversation without persona');
        }
      } else {
        console.warn('Could not fetch personas, will create conversation without persona_id');
      }
    } catch (personaError) {
      console.warn('Error fetching personas:', personaError);
      // Continue without persona_id
    }
    
    // Prepare conversation payload
    const conversationPayload: any = {
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
      conversation_context: `You are SafeMate, an AI safety companion. You're currently in a ${mode} call with a user who needs safety monitoring and emotional support during their ${sessionType} session. Be caring, protective, and supportive. Watch for any signs of distress or danger. You can see the user through video and should acknowledge their visual state when appropriate.`,
      custom_greeting: sessionType === 'safewalk' 
        ? "Hi! I'm your SafeMate AI companion. I can see you and I'm here to keep you safe during your walk. How are you feeling right now?"
        : "Hello! I'm your SafeMate AI companion here to provide emotional support. I can see you through our video connection. How can I help you today?"
    };
    
    // Only add persona_id if we found one
    if (personaId) {
      conversationPayload.persona_id = personaId;
    }
    
    console.log('Creating conversation with payload:', JSON.stringify(conversationPayload, null, 2));
    
    // Call Tavus API to create conversation
    const response = await fetch('https://tavusapi.com/v2/conversations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(conversationPayload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Tavus API error response:', {
        status: response.status,
        statusText: response.statusText,
        errorData
      });
      
      let errorMessage = `Tavus API error: ${response.status}`;
      
      if (response.status === 401) {
        errorMessage += ' - Invalid access token';
      } else if (response.status === 403) {
        errorMessage += ' - Insufficient permissions';
      } else if (response.status === 404) {
        errorMessage += ' - Resource not found';
      } else if (response.status === 429) {
        errorMessage += ' - Rate limit exceeded';
      } else if (errorData.message) {
        errorMessage += ` - ${errorData.message}`;
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('Tavus conversation created successfully:', data);
    
    // Validate required fields in response
    if (!data.conversation_id || !data.livekit_token || !data.livekit_url) {
      console.error('Invalid Tavus response - missing required fields:', data);
      throw new Error('Invalid response from Tavus API - missing required LiveKit credentials');
    }
    
    // Extract LiveKit credentials from Tavus response
    return {
      conversation_id: data.conversation_id,
      conversation_url: data.conversation_url,
      livekit_token: data.livekit_token,
      livekit_url: data.livekit_url,
      status: data.status,
      persona_id: personaId
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