#!/usr/bin/env python3
"""
Käynnistää HTTP-palvelimen ja avaa WEB-sovelluksen selaimessa
"""
import os
import sys
import webbrowser
import time
from http.server import HTTPServer, SimpleHTTPRequestHandler

# Projektin juurikansio
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))

# Vaihdeta projektikansion juuri työhakemistoksi
os.chdir(PROJECT_ROOT)

PORT = 3000
URL = f"http://localhost:{PORT}/WEB/index.html"

class MyHTTPRequestHandler(SimpleHTTPRequestHandler):
    """Yksinkertainen HTTP-palvelin, joka tulostaa pyynnöt"""
    def log_message(self, format, *args):
        # Jätetään oletuslokit pois, mutta näytetään virheet
        if "GET" in format or "POST" in format:
            return
        super().log_message(format, *args)

try:
    server = HTTPServer(("localhost", PORT), MyHTTPRequestHandler)
    print(f"🚀 Open page: {URL}")
    print(f"Press Ctrl+C to stop the server")
    
    # Avaa selain automaattisesti (valinnainen)
    webbrowser.open(URL, new=2)
    
    server.serve_forever()
except KeyboardInterrupt:
    print("\n✅ Server stopped")
    sys.exit(0)
except OSError as e:
    print(f"❌ Error: {e}")
    print(f"Make sure port {PORT} is available")
    sys.exit(1)
