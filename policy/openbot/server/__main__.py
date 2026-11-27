import asyncio

from aiohttp import web
from openbot.server.main import app

if __name__ == "__main__":
    # Run on the loop the RPC and zeroconf services were created with.
    web.run_app(app, port=8000, loop=asyncio.get_event_loop())
