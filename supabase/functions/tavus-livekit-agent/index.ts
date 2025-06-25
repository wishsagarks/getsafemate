/*
  # Tavus Conversational Video Interface (CVI) Integration

  1. Purpose
    - Create Tavus CVI sessions using the correct API endpoints
    - Generate proper session tokens for embedding
    - Handle session management according to Tavus CVI documentation
    - Support both audio and video modes

  2. Features
    - Uses Tavus CVI API instead of conversations API
    - Generates session tokens for client-side embedding
    - Proper error handling for CVI-specific responses
    - Session logging and management

  3. Integration
    - Persona ID: p5d11710002a (your personal persona)
    - Creates CVI sessions for real-time interaction
    - Returns session details for client embedding
*/

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Your personal persona configuration - CORRECTED
const TAVUS_PERSONA_ID = 'p5d11710002a';

interface CreateSessionRequest {
  userId: string;
  sessionType: 'safewalk' | 'heartmate';
  mode?: 'audio' | 'video';
  emergencyContacts?: Array<{name: string, phone: string}>;
}

interface SessionResponse {
  sessionId: string;
  sessionToken: string;
  personaId: string;
  mode: 'audio' | 'video';
  sessionType: string;
  status: string;
  embedUrl?: string;
}

interface TavusCVISession {
  session_id: string;
  session_token: string;
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

    // Validate persona exists before creating session
    try {
      await validatePersonaExists(tavusApiKey);
    } catch (validationError) {
      console.error('Persona validation failed:', validationError);
      return new Response(
        JSON.stringify({ 
          error: 'Persona validation failed',
          details: validationError.message
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create new Tavus CVI session
    let tavusCVISession: TavusCVISession;
    try {
      tavusCVISession = await createTavusCVISession(tavusApiKey, sessionType, mode);
      console.log('Created new Tavus CVI session:', tavusCVISession.session_id);
    } catch (tavusError) {
      console.error('Error creating Tavus CVI session:', tavusError);
      
      // Provide more specific error messages based on the error
      let errorDetails = `Tavus CVI API error: ${tavusError.message}`;
      
      if (tavusError.message.includes('401') || tavusError.message.includes('Invalid access token')) {
        errorDetails = 'Invalid Tavus API key. Please verify your API key at https://tavus.io/dashboard/api-keys and ensure it has CVI permissions.';
      } else if (tavusError.message.includes('403')) {
        errorDetails = 'Tavus API key does not have permission to create CVI sessions. Please check your API key permissions.';
      } else if (tavusError.message.includes('429')) {
        errorDetails = 'Tavus API rate limit exceeded. Please try again in a few minutes.';
      } else if (tavusError.message.includes('500')) {
        errorDetails = 'Tavus API server error. Please try again later.';
      } else if (tavusError.message.includes('persona_id')) {
        errorDetails = `Persona ${TAVUS_PERSONA_ID} not found or not accessible with your API key. Please check your Tavus account permissions.`;
      }
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create Tavus CVI session',
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
        room_name: `tavus-cvi-${tavusCVISession.session_id}`,
        avatar_id: tavusCVISession.session_id,
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

    // Return session details for CVI embedding
    const response: SessionResponse = {
      sessionId: tavusCVISession.session_id,
      sessionToken: tavusCVISession.session_token,
      personaId: TAVUS_PERSONA_ID,
      mode,
      sessionType,
      status: tavusCVISession.status,
      embedUrl: `https://tavus.io/embed/${tavusCVISession.session_id}`
    };

    console.log('Tavus CVI session created successfully:', {
      sessionId: tavusCVISession.session_id,
      personaId: TAVUS_PERSONA_ID,
      mode,
      sessionType
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

async function validatePersonaExists(tavusApiKey: string): Promise<void> {
  try {
    console.log('Validating persona exists:', TAVUS_PERSONA_ID);
    
    // First try to list all personas to see what's available
    const listResponse = await fetch('https://tavusapi.com/v2/personas', {
      method: 'GET',
      headers: {
        'x-api-key': tavusApiKey,
        'Content-Type': 'application/json'
      }
    });

    if (listResponse.ok) {
      const listData = await listResponse.json();
      console.log('Available personas:', listData);
      
      // Check if our persona is in the list
      const personas = listData.data || [];
      const foundPersona = personas.find((p: any) => p.persona_id === TAVUS_PERSONA_ID);
      
      if (foundPersona) {
        console.log('✅ Persona found in list:', foundPersona);
        return; // Persona exists and is accessible
      } else {
        console.log('❌ Persona not found in list. Available personas:', personas.map((p: any) => p.persona_id));
        throw new Error(`Persona ${TAVUS_PERSONA_ID} not found in your account. Available personas: ${personas.map((p: any) => p.persona_id).join(', ')}`);
      }
    }

    // If list fails, try direct access
    const response = await fetch(`https://tavusapi.com/v2/personas/${TAVUS_PERSONA_ID}`, {
      method: 'GET',
      headers: {
        'x-api-key': tavusApiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Failed to validate persona:', response.status, errorData);
      
      if (response.status === 401) {
        throw new Error('Invalid Tavus API key. Please verify your API key at https://tavus.io/dashboard/api-keys');
      } else if (response.status === 403) {
        throw new Error('Tavus API key does not have permission to access this persona.');
      } else if (response.status === 404) {
        throw new Error(`Persona ${TAVUS_PERSONA_ID} not found. Please verify the persona exists in your Tavus account.`);
      } else {
        throw new Error(`Failed to validate persona: ${response.status} - ${errorData.message || 'Unknown error'}`);
      }
    }

    const personaData = await response.json();
    console.log('✅ Persona validated successfully:', personaData);
    
  } catch (error) {
    console.error('Error validating persona:', error);
    throw error;
  }
}

async function createTavusCVISession(
  tavusApiKey: string, 
  sessionType: string, 
  mode: 'audio' | 'video'
): Promise<TavusCVISession> {
  try {
    console.log('Creating new Tavus CVI session with persona:', TAVUS_PERSONA_ID);
    
    // Use the correct CVI endpoint according to documentation
    const response = await fetch('https://tavusapi.com/v2/cvi/sessions', {
      method: 'POST',
      headers: {
        'x-api-key': tavusApiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        persona_id: TAVUS_PERSONA_ID,
        callback_url: null,
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
      
      // Create more specific error messages
      let errorMessage = `Tavus CVI API error: ${response.status}`;
      
      if (response.status === 401) {
        errorMessage = 'Invalid access token. Please check your Tavus API key at https://tavus.io/dashboard/api-keys';
      } else if (response.status === 403) {
        errorMessage = 'Forbidden. Your API key does not have permission to create CVI sessions.';
      } else if (response.status === 404) {
        errorMessage = `Persona ${TAVUS_PERSONA_ID} not found. Please verify the persona exists in your Tavus account.`;
      } else if (response.status === 429) {
        errorMessage = 'Rate limit exceeded. Please try again in a few minutes.';
      } else if (response.status === 422) {
        errorMessage = `Invalid request data: ${errorData.message || 'Please check your request parameters'}`;
      } else if (errorData.message) {
        errorMessage = `${errorData.message}`;
      } else {
        errorMessage = 'Failed to create CVI session. Please try again.';
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('New Tavus CVI session created:', data);
    
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