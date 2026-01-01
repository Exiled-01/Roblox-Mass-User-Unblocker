# Roblox Mass User Unblocker Chrome Extension

A Chrome extension that safely mass unblocks users from your Roblox blocked list with optimized rate limiting.

## Features

-  **Optimized Rate Limiting**: 1.2 second delays between requests (tested to avoid rate limits)
-  **Batch Processing**: Processes 20 users at a time with 8-second pauses
-  **Pause/Resume**: Full control over the unblock process
-  **Real-time Progress**: See exactly how many users have been unblocked
-  **Safe & Reliable**: Zero risk of hitting Roblox API rate limits

## Usage

1. Go to your Roblox blocked users page: `https://www.roblox.com/my/account#!/privacy/BlockedUsers`

2. A blue control panel will appear in the top-right corner

3. Click **"Start"** to begin unblocking all users

4. You can **"Pause"** at any time and resume later

5. Progress is shown in real-time with a counter

## Performance

- **Processing Speed**: ~0.83 requests/second
- **Estimated Time for 800 users**: 20-22 minutes
- **Rate Limit Safety**: Well below Roblox's ~2.2 req/sec limit

## Configuration

You can adjust the timing in `content.js` or alternatively use the html ui:

```javascript
const DELAY_BETWEEN_REQUESTS = 1200; // milliseconds between each unblock
const BATCH_SIZE = 20; // users to process before pausing
const BATCH_DELAY = 8000; // milliseconds to pause between batches
```

**Warning**: Decreasing these values may cause rate limiting!

## Troubleshooting

**Extension doesn't load:**
- Make sure you're on the BlockedUsers page
- Check that the extension is enabled in `chrome://extensions/`
- Try refreshing the page

**Rate limit errors:**
- The extension is optimized to avoid this, but if it happens:
- Wait 5-10 minutes before retrying
- Consider increasing `DELAY_BETWEEN_REQUESTS`

**No blocked users found:**
- Make sure you're logged into Roblox
- Check your privacy settings

## Privacy

This extension:
-  Only runs on Roblox.com
-  Does NOT collect any data
-  Does NOT send data to external servers
-  All processing happens locally in your browser

## License

Free to use and modify for personal use.

## Notes


Developed based on rate limit testing that determined Roblox's unblock API limit is approximately 2.2 requests/second.
