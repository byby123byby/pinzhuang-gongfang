#!/bin/zsh
cd -- "$(dirname -- "$0")"
exec /usr/bin/python3 - <<'PY'
import errno
import sys
import webbrowser
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.request import urlopen
from urllib.error import URLError

address = ('127.0.0.1', 4184)
url = 'http://127.0.0.1:4184/'
try:
    server = ThreadingHTTPServer(address, partial(SimpleHTTPRequestHandler, directory='site'))
except OSError as error:
    if error.errno != errno.EADDRINUSE:
        raise
    try:
        with urlopen(url,timeout=2) as response:
            existing = b'<title>' + '拼装图鉴'.encode() in response.read(8192)
    except (URLError, OSError):
        existing = False
    if not existing:
        sys.exit('4184 端口正被其他服务使用。请关闭占用它的服务，再打开拼装工坊。')
    webbrowser.open(url)
else:
    with server:
        webbrowser.open(url)
        server.serve_forever()
PY
