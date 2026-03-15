// CORS headers utility for consistent responses
export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json'
} as const;

export function createCorsResponse(data?: any, status = 200): Response {
  return new Response(
    data ? JSON.stringify(data) : 'ok',
    {
      status,
      headers: CORS_HEADERS
    }
  );
}

export function createErrorResponse(error: string, status = 500, stack?: string): Response {
  console.error('Edge Function Error:', { error, stack });
  
  return new Response(
    JSON.stringify({ 
      error, 
      ...(stack && { stack }) 
    }),
    {
      status,
      headers: CORS_HEADERS
    }
  );
}
