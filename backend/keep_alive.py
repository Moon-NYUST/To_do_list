import asyncio
import httpx
import os
import time

async def keep_alive():
    """
    Background task that pings the server's public URL every 10 minutes
    to prevent Render's free tier from sleeping.
    """
    url = os.getenv("RENDER_EXTERNAL_URL")
    if not url:
        print("Keep-Alive: RENDER_EXTERNAL_URL environment variable is not set. Skipping ping.")
        return

    # Ensure URL ends with /health
    if not url.endswith("/health"):
        url = url.rstrip("/") + "/health"

    print(f"Keep-Alive: Starting background pinger for {url}")
    
    async with httpx.AsyncClient() as client:
        while True:
            try:
                # Wait 10 minutes (600 seconds)
                await asyncio.sleep(600)
                
                response = await client.get(url)
                print(f"Keep-Alive: Ping successful at {time.ctime()}, status code: {response.status_code}")
            except Exception as e:
                print(f"Keep-Alive: Ping failed at {time.ctime()}, error: {e}")

def start_keep_alive():
    """
    Helper function to schedule the keep_alive task in the background.
    """
    # Use create_task to run it without blocking the main event loop
    asyncio.create_task(keep_alive())
