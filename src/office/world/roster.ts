import type { AgentDef, OfficeWorld } from './schema.js';

/**
 * Real organisation members as characters. An organisation source (e.g. the
 * Paperclip adapter's `org` payload on /live) lists its agents; a building kit
 * says which room each one works in. The roster is rebuilt only when
 * membership changes — status updates just change what a character does.
 */
export interface OrgAgent {
  id: string; name: string; role?: string | null; title?: string | null;
  status?: string | null; pauseReason?: string | null; lastHeartbeatAt?: string | null;
  issue?: { key: string | null; title: string | null; status: string | null; running: boolean } | null;
}
export interface RosterBinding {
  /** Key of the org payload on /live (the live source id). */
  source: string;
  /** Agent name → room id. */
  rooms: Record<string, string>;
  /** Room for agents the kit doesn't name yet (new hires show up here, not nowhere). */
  defaultRoom: string;
  /** Character skins to draw from (a stable pick per agent id). */
  skins: number[];
}

/** What a member is doing, in the same vocabulary as live tasks. */
export type Presence = 'running' | 'waiting' | 'idle' | 'paused' | 'failed' | 'unknown';
export function presenceOf(a: OrgAgent): Presence {
  if (a.status === 'error' || a.status === 'failed') return 'failed';
  if (a.status === 'paused' || a.status === 'terminated') return 'paused';
  if (a.issue?.running) return 'running';
  if (a.issue) return 'waiting';
  if (a.status === 'idle' || a.status === 'active' || a.status === 'running') return 'idle';
  return 'unknown';
}

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

/** Chairs in a room, in the order a newcomer would take them. */
function chairsIn(world: OfficeWorld, roomId: string): string[] {
  return world.furniture.filter(f => f.roomId === roomId && /chair/i.test(f.assetId))
    .sort((a, b) => a.row - b.row || a.col - b.col).map(f => f.id);
}

/** One AgentDef per org member: their room, a free chair there if any, a stable skin. */
export function rosterAgents(world: OfficeWorld, org: OrgAgent[], binding: RosterBinding): AgentDef[] {
  const rooms = new Set(world.rooms.map(r => r.id));
  const taken = new Set<string>();
  return [...org].sort((a, b) => a.name.localeCompare(b.name)).map(a => {
    const wanted = binding.rooms[a.name];
    const roomId = wanted && rooms.has(wanted) ? wanted : binding.defaultRoom;
    const seatId = chairsIn(world, roomId).find(c => !taken.has(c));
    if (seatId) taken.add(seatId);
    return { id: `org:${a.id}`, name: a.name, role: a.role || a.title || 'agent',
      skin: binding.skins[hash(a.id) % binding.skins.length], seatId, roomId };
  });
}

/** Membership fingerprint: rebuild characters only when this changes. */
export const rosterKey = (org: OrgAgent[]) => org.map(a => a.id).sort().join(',');
