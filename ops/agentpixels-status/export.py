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
        company = next(c for c in companies if c.get('id') == '7b3de9f6-dc63-4fa6-8cb5-65d1693aec3f')
        cid = company['id']
        snap['company'] = {'name': company.get('name'), 'issuePrefix': company.get('issuePrefix'), 'id': cid}
        agents = items(get(f'/api/companies/{cid}/agents'), 'agents')
        all_issues = []
        complete = False
        for offset in range(0, 5000, 100):
            page = items(get(f'/api/companies/{cid}/issues?view=compact&limit=100&offset={offset}&sortField=id&sortDir=asc'), 'issues')
            all_issues.extend(page)
            if len(page) < 100:
                complete = True
                break
        fields = ('id', 'identifier', 'title', 'status', 'priority', 'assigneeAgentId', 'parentId', 'startedAt', 'completedAt', 'createdAt', 'updatedAt')
        safe_issues = [{**{k: i.get(k) for k in fields}, 'key': i.get('identifier'),
                        'description': clip(i.get('description'), 1200),
                        'blockerCount': (i.get('blockerAttention') or {}).get('unresolvedBlockerCount', 0)} for i in all_issues]
        from collections import Counter
        counts = dict(Counter(i.get('status') for i in all_issues))
        snap['workboard'] = {'complete': complete, 'updatedAt': snap['exportedAt'], 'counts': counts, 'issues': safe_issues}
        live_runs = items(get(f'/api/companies/{cid}/live-runs?limit=100'), 'runs')
        snap['liveRuns'] = [{k:r.get(k) for k in ('id','status','agentId','issueId','startedAt','finishedAt','createdAt')} for r in live_runs if r.get('status') in ('queued','running')]
        active_agents = {r.get('agentId') for r in snap['liveRuns'] if r.get('status') == 'running'}
        work = {}
        for i in all_issues:
            if i.get('assigneeAgentId') and i.get('status') == 'in_progress':
                work[i['assigneeAgentId']] = {'key': i.get('identifier'), 'title': clip(i.get('title'), 160), 'status': i.get('status'),
                                             'running': i['assigneeAgentId'] in active_agents}
        try:
            attention = get(f'/api/companies/{cid}/attention?limit=100')
            safe_attention = []
            for item in attention.get('items', []):
                subject = item.get('subject') or {}
                href = subject.get('href')
                if not isinstance(href, str) or not href.startswith('/NEB/'):
                    href = '/NEB/inbox'
                safe_attention.append({'id':item.get('id'), 'kind':item.get('sourceKind'), 'severity':item.get('severity'),
                    'reason':clip(item.get('whyNow'), 400), 'activityAt':item.get('activityAt'),
                    'title':clip(subject.get('title'), 200), 'key':subject.get('identifier'), 'href':href})
            snap['attention'] = {'total':attention.get('totalCount'), 'counts':attention.get('countsBySourceKind'),
                                 'complete':not bool(attention.get('nextCursor')), 'items':safe_attention, 'updatedAt':attention.get('generatedAt')}
            snap['inbox'] = get(f'/api/companies/{cid}/sidebar-badges')
        except Exception as e:
            snap['errors'].append(f'attention: {type(e).__name__}')
        try:
            dash = get(f'/api/companies/{cid}/dashboard')
            snap['dashboard'] = {k:dash.get(k) for k in ('agents','tasks','pendingApprovals')}
            snap['dashboard']['runActivity'] = [{k:r.get(k) for k in ('date','succeeded','failed','recovered','other','total')} for r in dash.get('runActivity', [])]
            activity = items(get(f'/api/companies/{cid}/activity?limit=30'), 'activity')
            snap['activity'] = [{k:r.get(k) for k in ('id','actorType','actorId','action','entityType','entityId','agentId','createdAt')} for r in activity]
        except Exception as e:
            snap['errors'].append(f'activity: {type(e).__name__}')
        snap['agents'] = [{
            'id': a.get('id'), 'name': a.get('name'), 'role': a.get('role'), 'title': a.get('title'),
            'status': a.get('status'), 'pauseReason': clip(a.get('pauseReason'), 120),
            'lastHeartbeatAt': a.get('lastHeartbeatAt'), 'reportsTo': a.get('reportsTo'),
            'issue': work.get(a.get('id')),
            'issues': [i['id'] for i in safe_issues if i.get('assigneeAgentId') == a.get('id') and i.get('status') not in ('done','cancelled')],
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
