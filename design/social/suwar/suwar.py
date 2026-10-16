"""Client MCP minimal (HTTP « streamable ») pour Suwar. Lit l'adresse et l'en-tête d'autorisation dans
la configuration MCP de Claude Code (~/.claude.json, serveur « suwar » du projet mcp-suwar) : le jeton
n'est jamais écrit ni affiché.   from suwar import call ; call('list_projects', {})"""
import json, time, urllib.request
from pathlib import Path

_cfg = json.loads((Path.home() / '.claude.json').read_text())['projects'][str(Path.home() / 'Code/mcp-suwar')]['mcpServers']['suwar']
URL = 'https://mcp.suwar.app/mcp'  # l'ancienne adresse (mcp-suwar.n0.ma) redirige ici en 301
PROJET = 'cmvanoxig0001p91fkic8flml'  # projet « Bayen », espace Netspace
_H = {'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream',
      'Authorization': _cfg['headers']['Authorization'], 'User-Agent': 'claude-code-mcp/1.0'}  # sans User-Agent : 403 Cloudflare
_n = 0


def _post(payload: dict):
    req = urllib.request.Request(URL, data=json.dumps(payload).encode(), headers=_H, method='POST')
    for essai in range(3):  # réponse parfois jamais livrée : on abandonne au bout de 3 min et on réessaie
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
                body = r.read().decode()
            break
        except (TimeoutError, OSError):
            if essai == 2: raise
    if not body.strip(): return None
    if body.lstrip().startswith('{'): return json.loads(body)
    data = [l[5:].strip() for l in body.splitlines() if l.startswith('data:')]
    return json.loads(data[-1])


def call(name: str, args: dict, essais: int = 6):
    """Appelle un outil Suwar et renvoie son résultat décodé (JSON si possible). Lève une erreur Suwar lisible.
    Limite de débit (429 « wait a minute ») : on attend une minute et on réessaie."""
    global _n
    for essai in range(essais):
        _n += 1
        r = _post({'jsonrpc': '2.0', 'id': _n, 'method': 'tools/call', 'params': {'name': name, 'arguments': args}})
        if 'error' in r: raise RuntimeError(f"{name} : {r['error']}")
        res = r['result']
        text = ''.join(c.get('text', '') for c in res.get('content', []) if c.get('type') == 'text')
        if res.get('isError') and ('API 429' in text or 'fetch failed' in text or 'Render failed' in text) and essai < essais - 1:
            time.sleep(65); continue
        break
    if res.get('isError'): raise RuntimeError(f'{name} : {text[:1500]}')
    try: return json.loads(text)
    except ValueError: return text


def telecharge(url: str, chemin) -> None:
    """Télécharge un rendu Suwar (Cloudflare refuse les requêtes sans User-Agent)."""
    url = url if url.startswith('http') else 'https://suwar.app' + url
    req = urllib.request.Request(url, headers={'User-Agent': _H['User-Agent']})
    for essai in range(4):  # le CDN de Suwar coupe parfois une lecture longue : on réessaie
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
                Path(chemin).write_bytes(r.read())
            return
        except (TimeoutError, OSError):
            if essai == 3: raise
            time.sleep(5)
