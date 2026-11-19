"""Exercise the built academy through its real player controls in a fresh Chrome profile."""
import base64
import json
from pathlib import Path
import subprocess
import tempfile
import time
from urllib.request import urlopen

import websocket

root = 'http://127.0.0.1:4184/'
evidence = Path(__file__).resolve().parent/'verification'
evidence.mkdir(exist_ok=True)

class Browser:
    def __init__(self, port):
        with urlopen(f'http://127.0.0.1:{port}/json/list') as response:
            tab = json.load(response)[0]
        self.ws = websocket.create_connection(tab['webSocketDebuggerUrl'], suppress_origin=True, timeout=60)
        self.serial = 0

    def command(self, method, **params):
        self.serial += 1
        self.ws.send(json.dumps(dict(id=self.serial, method=method, params=params)))
        while True:
            reply = json.loads(self.ws.recv())
            if reply.get('id') == self.serial:
                return reply['result']

    def js(self, expression):
        result = self.command('Runtime.evaluate', expression=expression, returnByValue=True)
        assert 'exceptionDetails' not in result, (expression,result)
        return result['result'].get('value')

    def wait(self, expression):
        for _ in range(200):
            if self.js(expression):
                return
            time.sleep(.1)
        raise AssertionError(expression)

    def go(self, path, ready):
        self.command('Page.navigate', url=root+path)
        self.wait(ready)

    def click(self, selector):
        self.js(f'document.querySelector({json.dumps(selector)}).click()')

    def size(self, width, height):
        self.command('Emulation.setDeviceMetricsOverride', width=width, height=height, deviceScaleFactor=1, mobile=False)

    def photo(self, name):
        data = self.command('Page.captureScreenshot', format='png')['data']
        (evidence/(name+'.png')).write_bytes(base64.b64decode(data))

def exercise(b):
    catalogue = "!!document.querySelector('#collection-count') && [...document.images].every(i=>i.complete && i.naturalWidth)"
    b.size(1280,840)
    b.go('#collection',catalogue)
    assert b.js("!document.querySelector('#empty-album').hidden")
    b.click('[href="#all"]')
    b.wait("!document.querySelector('#catalogue').hidden")
    b.photo('catalogue')
    b.size(390,844)
    assert b.js('document.documentElement.scrollWidth===innerWidth')
    b.photo('catalogue-phone')
    b.size(960,760)
    for work,route in [('cottage','main'),('lack','main'),('ivar','stack'),('ivar','rack'),('ivar','wall')]:
        print('Testing',work,route,flush=True)
        if work=='ivar' and route!='stack':
            b.js("localStorage.removeItem('academy.collection.v1.ivar')")
        ready = "document.querySelector('#"+('load-message' if work=='cottage' else 'loading')+"')?.hidden===true"
        b.go(work+'/',ready)
        assert b.js("document.querySelector('.brand').textContent.trim()")=='拼装工坊'
        assert b.js("document.title.includes('拼装工坊') && !/纸间工坊|PAPER ATELIER/.test(document.body.innerText)")
        if work=='cottage':
            b.photo('cottage-masthead')
        if work!='cottage':
            b.click('#enter-assembly')
        if work=='ivar':
            b.js(f"const routeSelect=document.querySelector('#route');routeSelect.value='{route}';routeSelect.onchange()")
        button = '#step-list button' if work=='cottage' else '#steps button'
        slider = '#range' if work=='ivar' else '#progress'
        def choose(n):
            b.js(f"document.querySelectorAll('{button}')[{n}].click()")
        def seek(p):
            b.js(f"(()=>{{const el=document.querySelector('{slider}');el.value={p};el.dispatchEvent(new Event('input'))}})()")
        count=b.js(f"document.querySelectorAll('{button}').length")
        assert count=={'cottage':40,'lack':8,'ivar':{'wall':9,'stack':11,'rack':13}.get(route)}[work],count
        data=f"JSON.parse(localStorage.getItem('academy.collection.v1.{work}'))"
        b.click('#preview' if work=='cottage' else '#finished')
        assert b.js(data) is None
        if work=='ivar':
            b.js(f"const opt=document.querySelector('#step');opt.value='{count}';opt.onchange()")
            seek(100)
            assert b.js(data) is None
            b.js("routeSelect.value=routeSelect.value==='wall'?'rack':'wall';routeSelect.onchange()")
            choose(0);seek(100)
            b.js(f"routeSelect.value='{route}';routeSelect.onchange()")
        choose(count-1);seek(100);seek(100)
        assert len(b.js(data)['paths'][route]['done'])==1 and not b.js(data).get('collected')
        choose(0);seek(100)
        b.go('',catalogue)
        selector=f'[data-project="{work}"] a'
        assert b.js(f"document.querySelector('{selector}').search.includes('resume=2')")
        b.click(selector)
        b.wait(ready)
        if work=='ivar':
            assert b.js("document.querySelector('#step').value")== '1'
            assert b.js("document.querySelector('#route').value")==route
        else:
            assert b.js(f"document.querySelectorAll('{button}')[1].getAttribute('aria-current')")=='step'
        for n in range(1,count-2):
            choose(n);seek(100)
        assert not b.js(data).get('collected')
        choose(count-2);seek(98);b.click('#play')
        if work=='cottage':
            b.wait("!!document.querySelector('.is-finished .collection-ticket:not([hidden])')")
            assert b.js("!document.querySelector('dialog[open]') && getComputedStyle(document.querySelector('.sheet-drawer')).display==='none'")
            b.photo('finished-cottage')
            b.click('.collection-ticket')
        b.wait("!!document.querySelector('.album-dialog[open] img')?.naturalWidth")
        first=b.js(data)['collected']
        assert len(b.js(data)['paths'][route]['done'])==count
        if work=='cottage':
            time.sleep(1.7)
            b.photo('first-collection')
        else:
            b.command('Emulation.setEmulatedMedia',features=[{'name':'prefers-reduced-motion','value':'reduce'}])
            assert b.js("getComputedStyle(document.querySelector('.album-seal')).animationName")=='none'
        b.click('.album-view')
        b.wait("!document.querySelector('.album-dialog[open]')")
        choose(count-1);seek(100)
        assert not b.js("!!document.querySelector('.album-dialog[open]')") and b.js(data)['collected']==first
        b.go('#collection',catalogue)
        b.command('Page.reload')
        b.wait(catalogue)
        b.wait(f"document.querySelector('{selector}').textContent.includes('翻看藏品')")
        b.click(selector)
        b.wait("!!document.querySelector('.album-dialog[open] img')?.naturalWidth")
        if route in ('rack','stack'):
            assert b.js("document.querySelector('.album-picture img').src").endswith(f'ivar-{route}.png')
        b.click('.album-primary');b.wait(ready)
        if work=='ivar':
            assert b.js("document.querySelector('#step').value")=='overview'
            assert b.js("document.querySelector('#route').value")==route
        print('Passed',work,route,flush=True)
    b.go('#collection',catalogue)
    assert b.js("document.querySelector('#collection-count').textContent")=='3'
    print('All works collected',flush=True)

if __name__=='__main__':
    with tempfile.TemporaryDirectory(prefix='academy-collection-') as profile:
        chrome=subprocess.Popen(['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','--headless','--use-angle=metal','--remote-debugging-port=0','--no-first-run','--user-data-dir='+profile,'about:blank'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        try:
            portfile=Path(profile)/'DevToolsActivePort'
            for _ in range(100):
                if portfile.exists(): break
                time.sleep(.1)
            exercise(Browser(portfile.read_text().splitlines()[0]))
        finally:
            chrome.terminate()
            chrome.wait(timeout=15)
