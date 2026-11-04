#!/usr/bin/env python3
"""Agent Pixels status exporter (runs in the Paperclip container as nebulaops).

Writes ONE sanitised, read-only snapshot of the organisation for Agent Pixels:
agents (name, role, title, status, pause reason, heartbeat, current ticket),
Nebula jobs and machine health. Only GET requests; nothing in Paperclip is
changed. Fields are copied by an explicit allow-list, so adapter/runtime
configs, permissions, keys and spend never leave the container.

Output: /var/lib/agentpixels/status.json (atomic replace, world-readable).
"""
import json
import os
import subprocess
import tempfile
from datetime import datetime, timezone

OUT = os.environ.get('AGENTPIXELS_OUT', '/var/lib/agentpixels/status.json')
USAGE = '/var/lib/nebula-usage'


def get(path):
    r = subprocess.run(['/usr/local/bin/pcapi', 'GET', path], capture_output=True, text=True, timeout=30)
    if r.returncode != 0:
        raise RuntimeError(f'GET {path} failed')
    return json.loads(r.stdout)


def items(doc, key):
    return doc if isinstance(doc, list) else doc.get(key, doc.get('data', []))


def clip(v, n=160):
    return v[:n] if isinstance(v, str) else None


def read_json(path):
    try:
        with open(path) as f:
            return json.load(f)
    except (OSError, ValueError):
        return None


def main():
    snap = {'exportedAt': datetime.now(timezone.utc).isoformat(), 'errors': []}
    try:
        companies = items(get('/api/companies'), 'companies')
        company = next(c for c in companies if str(c.get('name', '')).lower().startswith('nebula'))
        cid = company['id']
        snap['company'] = {'name': company.get('name'), 'issuePrefix': company.get('issuePrefix')}
        agents = items(get(f'/api/companies/{cid}/agents'), 'agents')
        issues = items(get(f'/api/companies/{cid}/issues?status=in_progress'), 'issues')
        work = {}
        for i in issues:
            if i.get('assigneeAgentId'):
                work[i['assigneeAgentId']] = {
                    'key': i.get('identifier'), 'title': clip(i.get('title'), 120), 'status': i.get('status'),
                    'running': bool(i.get('activeRun') or i.get('executionRunId')),
                }
        snap['agents'] = [{
            'id': a.get('id'), 'name': a.get('name'), 'role': a.get('role'), 'title': a.get('title'),
            'status': a.get('status'), 'pauseReason': clip(a.get('pauseReason'), 120),
            'lastHeartbeatAt': a.get('lastHeartbeatAt'), 'reportsTo': a.get('reportsTo'),
            'issue': work.get(a.get('id')),
        } for a in agents]
    except Exception as e:  # report, never invent
        snap['errors'].append(f'paperclip: {type(e).__name__}')
    jobs = read_json(f'{USAGE}/jobs-status.json') or {}
    snap['jobs'] = [{'ticket': j.get('ticket'), 'agent': j.get('agent'), 'machine': j.get('machine'), 'state': j.get('state'),
                     'detail': clip(j.get('detail'), 120), 'checked': j.get('checked')} for j in jobs.values()]
    machines = read_json(f'{USAGE}/machines.json') or {}
    snap['machines'] = {k: {'ok': v.get('ok'), 'detail': clip(v.get('detail'), 120), 'checked': v.get('checked')} for k, v in machines.items()}
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=os.path.dirname(OUT))
    with os.fdopen(fd, 'w') as f:
        json.dump(snap, f)
    os.chmod(tmp, 0o644)
    os.replace(tmp, OUT)


if __name__ == '__main__':
    main()
