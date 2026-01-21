import { Hono } from 'hono'
import { Buffer } from 'node:buffer';

const app = new Hono<{ Bindings: CloudflareBindings }>()

/** 
 * stream_key is a b64 encoded object that contains directUrl to the stream and referer.
 * example:
 * {
 *   "directUrl": "https://example.com/stream.m3u8",
 *   "referer": "https://example.com"
 * }
 * 
 * To encode:
 *   const streamKeyObj = {
 *     directUrl: "https://example.com/stream.m3u8",
 *     referer: "https://example.com"
 *   }
 *   const streamKey = btoa(JSON.stringify(streamKeyObj))
*/

app.get('/stream/:stream_key', async (c) => {
	const stream_key = c.req.param('stream_key')
	if (!stream_key) {
		return c.text('stream_key is required', 400)
	}

	try {
		const streamKeyObj = JSON.parse(
			Buffer.from(stream_key, 'base64url').toString('utf8')
		) as { directUrl: string, referer: string }

		const { directUrl, referer } = streamKeyObj

		/* forward range header for video seeking */
		const rangeHeader = c.req.header('range')
		const fetchHeaders: HeadersInit = {
			'Referer': referer,
			'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
		}

		if (rangeHeader) {
			fetchHeaders['Range'] = rangeHeader
		}

		const response = await fetch(directUrl, {
			headers: fetchHeaders
		})

		/* pass through the response with filtered headers */
		const headers = new Headers()
		const passThrough = [
			'content-type', 'content-length', 'content-range',
			'accept-ranges', 'cache-control', 'last-modified', 'etag', 'content-disposition'
		]

		passThrough.forEach(header => {
			const value = response.headers.get(header)
			if (value) headers.set(header, value)
		})

		headers.set('Access-Control-Allow-Origin', '*')

		return new Response(response.body, {
			status: response.status,
			headers
		})

	} catch (error) {
		return c.json({
			error: "stream failed",
			message: error instanceof Error ? error.message : 'unknown error'
		}, 500)
	}
})

/* add CORS preflight support */
app.options('/stream/:stream_key', (c) => {
	return new Response(null, {
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, OPTIONS',
			'Access-Control-Allow-Headers': 'Range'
		}
	})
})

app.all('*', (c) => {
	return c.text('Not Found', 404)
})

export default app
