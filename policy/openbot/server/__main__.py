from aiohttp import web
from openbot.server.main import app

if __name__ == "__main__":
    web.run_app(app,host='0.0.0.0', port=8000)
