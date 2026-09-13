import subprocess
import re

cmd = ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
       '--headless=new',
       '--dump-dom',
       'http://localhost:8080/index.html']
out = subprocess.check_output(cmd, encoding='utf-8')
panels = re.findall(r'<section[^>]+id="panel-[^"]+"[^>]*>', out)
for p in panels:
    print('Found panel:', p)
