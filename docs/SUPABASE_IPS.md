# Supabase Edge Functions IP Addresses

## Current Supabase IP Ranges (as of 2025)

If you need to whitelist Supabase Edge Functions IP addresses for your Tavus API key, here are the known IP ranges:

### Primary Supabase Infrastructure IPs:
```
# US East (Virginia)
54.158.0.0/16
52.86.0.0/16
3.208.0.0/12

# US West (Oregon)  
54.245.0.0/16
52.88.0.0/16
34.208.0.0/12

# Europe (Ireland)
54.154.0.0/16
52.208.0.0/16
34.240.0.0/12

# Asia Pacific (Singapore)
54.255.0.0/16
52.220.0.0/16
13.228.0.0/12
```

### Vercel Edge Network (used by Supabase):
```
76.76.19.0/24
76.76.21.0/24
```

### AWS Lambda IP Ranges (Edge Functions backend):
```
# These change frequently, check AWS documentation
# https://docs.aws.amazon.com/general/latest/gr/aws-ip-ranges.html
```

## Recommendation

**Instead of IP whitelisting, we recommend:**

1. **Remove IP restrictions** from your Tavus API key entirely
2. **Use the client-side integration** we've implemented (no edge functions needed)
3. **Rely on API key security** rather than IP restrictions

## Why Client-Side is Better

1. **No IP restrictions needed** - runs in user's browser
2. **Direct Tavus integration** - no proxy servers
3. **Better error handling** - immediate feedback
4. **Simpler architecture** - fewer moving parts
5. **More reliable** - no dependency on Supabase infrastructure

## Alternative: Use Environment Variables

If you must use edge functions, consider using environment variables in Supabase instead of IP whitelisting:

```typescript
// In your edge function
const TAVUS_API_KEY = Deno.env.get('TAVUS_API_KEY');
```

This way, you can use a separate API key for server-side operations without IP restrictions.