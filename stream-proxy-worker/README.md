# Stream Proxy Worker

A lightweight Cloudflare Worker that proxies streaming content (HLS, video, audio) while preserving referrer headers and enabling CORS access.

## Features

- 🚀 **Zero CPU overhead** - Streams pass through without buffering
- 🔒 **Referrer preservation** - Bypass referrer restrictions on streaming content
- 🌐 **CORS enabled** - Access streams from any origin
- 📹 **Range request support** - Seek support for video playback
- 🔑 **Secure URL encoding** - Base64URL encoded stream keys

## How It Works

The worker acts as a transparent proxy that:
1. Decodes a base64-encoded stream configuration
2. Fetches the content with the proper referrer header
3. Streams the response directly to the client

Since Cloudflare Workers stream responses without buffering, there are no CPU time limit issues for streaming content.

## Installation

### Prerequisites
- Node.js 16+ and npm/yarn/pnpm
- Cloudflare account
- Wrangler CLI

### Setup

1. Clone the repository:
```bash
git clone <your-repo-url>
cd stream-proxy-worker
```

2. Install dependencies:
```bash
npm install
```

3. Configure Cloudflare credentials:
```bash
npx wrangler login
```

4. Deploy to Cloudflare Workers:
```bash
npm run deploy
```

## Usage

### Generating a Stream Key

A stream key is a base64URL-encoded JSON object containing:
- `directUrl`: The actual stream URL
- `referer`: The referrer header to send

**JavaScript/TypeScript:**
```javascript
const streamKeyObj = {
  directUrl: "https://example.com/stream.m3u8",
  referer: "https://example.com"
}

// For browser
const streamKey = btoa(JSON.stringify(streamKeyObj))
  .replace(/\+/g, '-')
  .replace(/\//g, '_')
  .replace(/=/g, '');

// For Node.js
const streamKey = Buffer.from(JSON.stringify(streamKeyObj))
  .toString('base64url');

console.log(streamKey);
```

**Python:**
```python
import json
import base64

stream_key_obj = {
    "directUrl": "https://example.com/stream.m3u8",
    "referer": "https://example.com"
}

stream_key = base64.urlsafe_b64encode(
    json.dumps(stream_key_obj).encode()
).decode().rstrip('=')

print(stream_key)
```

### Making Requests

Once you have your stream key, access the stream via:
```
https://your-worker.workers.dev/stream/{stream_key}
```

**Example with HTML5 Video:**
```html
<video controls>
  <source src="https://your-worker.workers.dev/stream/eyJkaXJlY3RVcmwiOiJodHRwczovL2V4YW1wbGUuY29tL3N0cmVhbS5tM3U4IiwicmVmZXJlciI6Imh0dHBzOi8vZXhhbXBsZS5jb20ifQ" type="application/x-mpegURL">
</video>
```

**Example with fetch:**
```javascript
const response = await fetch(
  `https://your-worker.workers.dev/stream/${streamKey}`
);
const stream = await response.blob();
```

## API Reference

### `GET /stream/:stream_key`

Proxies a stream with the specified configuration.

**Parameters:**
- `stream_key` (path parameter, required): Base64URL-encoded JSON configuration

**Stream Key Object:**
```typescript
{
  directUrl: string;  // The actual stream URL to fetch
  referer: string;    // The Referer header to send
}
```

**Response:**
- `200`: Stream content (proxied response)
- `400`: Invalid stream key format
- `404`: Endpoint not found
- `500`: Stream fetch failed

**Headers:**
- Supports `Range` requests for video seeking
- Returns CORS headers for cross-origin access
- Preserves essential content headers (Content-Type, Content-Length, etc.)

## Development

### Local Development
```bash
npm run dev
```

This starts a local development server using Wrangler.

### Testing

Create a test stream key:
```bash
node -e "console.log(Buffer.from(JSON.stringify({directUrl:'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',referer:'https://mux.com'})).toString('base64url'))"
```

Test the endpoint:
```bash
curl "http://localhost:8787/stream/GENERATED_KEY"
```

## Configuration

Edit `wrangler.toml` to configure:
- Worker name
- Routes and custom domains
- Environment variables
- Compatibility settings
```toml
name = "stream-proxy-worker"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[vars]
# Add any environment variables here
```

## Limitations & Considerations

### Cloudflare Workers Limits
- **Free Tier**: 100,000 requests/day, 10ms CPU time per request
- **Paid Tier**: Unlimited requests, 50ms CPU time per request
- **Note**: Streaming responses don't count against CPU time limits

### Use Cases
✅ **Good for:**
- Proxying HLS/DASH streams
- Bypassing referrer restrictions
- Adding CORS to streaming content
- Video seeking with range requests

❌ **Not recommended for:**
- Extremely high-traffic streaming (consider CDN costs)
- Downloading large files (no CPU limit but bandwidth costs apply)

## Security Considerations

⚠️ **Important**: This proxy allows anyone with a valid stream key to access content through your worker.

**Recommendations:**
- Rate limiting (implement in the worker or via Cloudflare firewall)
- Stream key expiration (add timestamp to the encoded object)
- Domain whitelisting (only allow specific `directUrl` domains)
- Authentication (add API key verification)

**Example with domain whitelist:**
```typescript
const ALLOWED_DOMAINS = ['example.com', 'trusted-cdn.com'];

const url = new URL(directUrl);
if (!ALLOWED_DOMAINS.includes(url.hostname)) {
  return c.json({ error: 'Domain not allowed' }, 403);
}
```

## Troubleshooting

**Stream not loading:**
- Verify the stream key is properly base64URL encoded
- Check that the `directUrl` is accessible
- Ensure the `referer` matches what the origin expects

**CORS errors:**
- The worker automatically adds CORS headers
- If issues persist, check browser console for specific error messages

**429 Too Many Requests:**
- You've hit Cloudflare's rate limits
- Upgrade to paid plan or implement caching

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see LICENSE file for details

## Acknowledgments

Built with:
- [Hono](https://hono.dev/) - Fast web framework for Cloudflare Workers
- [Cloudflare Workers](https://workers.cloudflare.com/) - Serverless platform
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/) - CLI tool for Workers

## Support

For issues and questions:
- Open an issue on GitHub
- Check Cloudflare Workers documentation
- Review Hono framework docs

---

**Disclaimer**: Ensure you have the rights to proxy any content through this worker. This tool is for legitimate use cases only.
