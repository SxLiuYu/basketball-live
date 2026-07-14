import db from '../database/pool';

export interface Team {
  id: number;
  name: string;
  logo_url: string | null;
  created_at: string;
}

export interface Player {
  id: number;
  team_id: number;
  name: string;
  number: number | null;
  position: string | null;
  created_at: string;
}

export interface Match {
  id: number;
  home_team_id: number;
  away_team_id: number;
  status: string;
  start_time: string | null;
  end_time: string | null;
  venue: string | null;
  live_stream_url: string | null;
  push_stream_url: string | null;
  created_at: string;
}

export interface MatchWithTeams extends Match {
  home_team_name?: string;
  home_logo_url?: string;
  away_team_name?: string;
  away_logo_url?: string;
}

export interface MatchPlayer {
  id: number;
  match_id: number;
  player_id: number;
  is_starting: number;
  name?: string;
  number?: number;
  position?: string;
  team_id?: number;
  team_name?: string;
}

export type EventType = 'score' | 'assist' | 'rebound' | 'steal' | 'block';

export interface PlayEvent {
  id: number;
  match_id: number;
  player_id: number;
  event_type: EventType;
  points: number | null;
  assist_by: number | null;
  rebound_type: string | null;
  created_at: string;
  is_cancelled: number;
  player_name?: string;
  player_number?: number;
  team_id?: number;
  team_name?: string;
  assist_player_name?: string;
}

export interface RecordEventInput {
  matchId: number;
  playerId: number;
  eventType: EventType;
  points?: number;
  assistBy?: number;
  reboundType?: 'offensive' | 'defensive';
}

// ============= Matches =============

export function getAllMatches(): MatchWithTeams[] {
  return db.prepare(`
    SELECT m.*, 
           ht.name as home_team_name, ht.logo_url as home_logo_url,
           at.name as away_team_name, at.logo_url as away_logo_url
    FROM matches m
    JOIN teams ht ON m.home_team_id = ht.id
    JOIN teams at ON m.away_team_id = at.id
    ORDER BY m.created_at DESC
  `).all() as MatchWithTeams[];
}

export function getMatchById(id: number): MatchWithTeams | null {
  const row = db.prepare(`
    SELECT m.*, 
           ht.name as home_team_name, ht.logo_url as home_logo_url,
           at.name as away_team_name, at.logo_url as away_logo_url
    FROM matches m
    JOIN teams ht ON m.home_team_id = ht.id
    JOIN teams at ON m.away_team_id = at.id
    WHERE m.id = ?
  `).get(id);
  return (row as MatchWithTeams) || null;
}

export function createMatch(data: {
  homeTeamId: number;
  awayTeamId: number;
  startTime: string | null;
  venue: string | null;
  liveStreamUrl: string | null;
  pushStreamUrl: string | null;
}): Match {
  const info = db.prepare(`
    INSERT INTO matches (home_team_id, away_team_id, status, start_time, venue, live_stream_url, push_stream_url)
    VALUES (?, ?, 'pending', ?, ?, ?, ?)
  `).run(data.homeTeamId, data.awayTeamId, data.startTime, data.venue, data.liveStreamUrl, data.pushStreamUrl);
  
  return getMatchById(Number(info.lastInsertRowid)) as Match;
}

export function updateMatch(id: number, data: Partial<Match>): Match | null {
  const fields: string[] = [];
  const values: any[] = [];

  if (data.home_team_id !== undefined) { fields.push('home_team_id = ?'); values.push(data.home_team_id); }
  if (data.away_team_id !== undefined) { fields.push('away_team_id = ?'); values.push(data.away_team_id); }
  if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }
  if (data.start_time !== undefined) { fields.push('start_time = ?'); values.push(data.start_time); }
  if (data.end_time !== undefined) { fields.push('end_time = ?'); values.push(data.end_time); }
  if (data.venue !== undefined) { fields.push('venue = ?'); values.push(data.venue); }
  if (data.live_stream_url !== undefined) { fields.push('live_stream_url = ?'); values.push(data.live_stream_url); }
  if (data.push_stream_url !== undefined) { fields.push('push_stream_url = ?'); values.push(data.push_stream_url); }

  if (fields.length === 0) return null;

  values.push(id);
  const sql = `UPDATE matches SET ${fields.join(', ')} WHERE id = ?`;
  const info = db.prepare(sql).run(...values);
  if (info.changes === 0) return null;

  return getMatchById(id);
}

export function deleteMatch(id: number): boolean {
  const info = db.prepare('DELETE FROM matches WHERE id = ?').run(id);
  return info.changes > 0;
}

// ============= Lineup =============

export function setLineup(matchId: number, playerIds: { playerId: number; isStarting?: boolean }[], side: 'home' | 'away' = 'home'): void {
  const del = db.prepare('DELETE FROM match_players WHERE match_id = ? AND side = ?');
  const ins = db.prepare('INSERT INTO match_players (match_id, player_id, is_starting, side) VALUES (?, ?, ?, ?)');

  const txn = db.transaction(() => {
    del.run(matchId, side);
    for (const p of playerIds) {
      ins.run(matchId, p.playerId, p.isStarting ? 1 : 0, side);
    }
  });
  txn();
}

export function getLineup(matchId: number): MatchPlayer[] {
  return db.prepare(`
    SELECT mp.*, p.name, p.number, p.position, t.name as team_name, t.id as team_id
    FROM match_players mp
    JOIN players p ON mp.player_id = p.id
    JOIN teams t ON p.team_id = t.id
    WHERE mp.match_id = ?
    ORDER BY mp.is_starting DESC, t.name, p.number
  `).all(matchId) as MatchPlayer[];
}

// ============= Teams =============

export function getAllTeams(): Team[] {
  return db.prepare('SELECT * FROM teams ORDER BY name').all() as Team[];
}

export function createTeam(name: string, logoUrl?: string): Team {
  return db.prepare(
    'INSERT INTO teams (name, logo_url) VALUES (?, ?) RETURNING *'
  ).get(name, logoUrl || null) as Team;
}

export function getTeamById(id: number): Team | null {
  return (db.prepare('SELECT * FROM teams WHERE id = ?').get(id) as Team) || null;
}

export function getTeamPlayers(teamId: number): Player[] {
  return db.prepare(
    'SELECT * FROM players WHERE team_id = ? ORDER BY number'
  ).all(teamId) as Player[];
}

export function createPlayer(teamId: number, name: string, number?: number, position?: string): Player {
  return db.prepare(
    'INSERT INTO players (team_id, name, number, position) VALUES (?, ?, ?, ?) RETURNING *'
  ).get(teamId, name, number || null, position || null) as Player;
}

export function updatePlayer(id: number, data: Partial<Player>): Player | null {
  const fields: string[] = [];
  const values: any[] = [];

  if (data.team_id !== undefined) { fields.push('team_id = ?'); values.push(data.team_id); }
  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
  if (data.number !== undefined) { fields.push('number = ?'); values.push(data.number); }
  if (data.position !== undefined) { fields.push('position = ?'); values.push(data.position); }

  if (fields.length === 0) return null;

  values.push(id);
  const sql = `UPDATE players SET ${fields.join(', ')} WHERE id = ?`;
  const info = db.prepare(sql).run(...values);
  if (info.changes === 0) return null;

  return db.prepare('SELECT * FROM players WHERE id = ?').get(id) as Player;
}

// ============= Events =============

export function recordEvent(input: RecordEventInput): PlayEvent {
  return db.prepare(`
    INSERT INTO play_events (match_id, player_id, event_type, points, assist_by, rebound_type)
    VALUES (?, ?, ?, ?, ?, ?) RETURNING *
  `).get(input.matchId, input.playerId, input.eventType, input.points || 0, input.assistBy || null, input.reboundType || null) as PlayEvent;
}

export function cancelEvent(eventId: number): boolean {
  const info = db.prepare(
    'UPDATE play_events SET is_cancelled = 1 WHERE id = ?'
  ).run(eventId);
  return info.changes > 0;
}

export function getMatchEvents(matchId: number, limit: number = 50): PlayEvent[] {
  return db.prepare(`
    SELECT pe.*, p.name as player_name, p.number as player_number, p.team_id,
           t.name as team_name,
           ap.name as assist_player_name
    FROM play_events pe
    JOIN players p ON pe.player_id = p.id
    JOIN teams t ON p.team_id = t.id
    LEFT JOIN players ap ON pe.assist_by = ap.id
    WHERE pe.match_id = ? AND pe.is_cancelled = 0
    ORDER BY pe.created_at DESC
    LIMIT ?
  `).all(matchId, limit) as PlayEvent[];
}

// ============= Stats =============

export function getMatchStats(matchId: number) {
  // SQLite-compatible stats query using subqueries for team identification
  const match = getMatchById(matchId);
  if (!match) {
    return {
      homeScore: 0, awayScore: 0,
      homeRebounds: 0, awayRebounds: 0,
      homeAssists: 0, awayAssists: 0,
      homeSteals: 0, awaySteals: 0,
      homeBlocks: 0, awayBlocks: 0,
    };
  }

  const homeTeamId = match.home_team_id;
  const awayTeamId = match.away_team_id;

  const row = db.prepare(`
    SELECT 
      COALESCE(SUM(CASE WHEN p.team_id = ? AND pe.event_type = 'score' THEN pe.points ELSE 0 END), 0) as home_score,
      COALESCE(SUM(CASE WHEN p.team_id = ? AND pe.event_type = 'score' THEN pe.points ELSE 0 END), 0) as away_score,
      COALESCE(SUM(CASE WHEN p.team_id = ? AND pe.event_type = 'rebound' THEN 1 ELSE 0 END), 0) as home_rebounds,
      COALESCE(SUM(CASE WHEN p.team_id = ? AND pe.event_type = 'rebound' THEN 1 ELSE 0 END), 0) as away_rebounds,
      COALESCE(SUM(CASE WHEN p.team_id = ? AND pe.event_type = 'assist' THEN 1 ELSE 0 END), 0) as home_assists,
      COALESCE(SUM(CASE WHEN p.team_id = ? AND pe.event_type = 'assist' THEN 1 ELSE 0 END), 0) as away_assists,
      COALESCE(SUM(CASE WHEN p.team_id = ? AND pe.event_type = 'steal' THEN 1 ELSE 0 END), 0) as home_steals,
      COALESCE(SUM(CASE WHEN p.team_id = ? AND pe.event_type = 'steal' THEN 1 ELSE 0 END), 0) as away_steals,
      COALESCE(SUM(CASE WHEN p.team_id = ? AND pe.event_type = 'block' THEN 1 ELSE 0 END), 0) as home_blocks,
      COALESCE(SUM(CASE WHEN p.team_id = ? AND pe.event_type = 'block' THEN 1 ELSE 0 END), 0) as away_blocks
    FROM play_events pe
    JOIN players p ON pe.player_id = p.id
    WHERE pe.match_id = ? AND pe.is_cancelled = 0
  `).get(
    homeTeamId, awayTeamId,
    homeTeamId, awayTeamId,
    homeTeamId, awayTeamId,
    homeTeamId, awayTeamId,
    homeTeamId, awayTeamId,
    matchId
  ) as any;

  return {
    homeScore: row.home_score || 0,
    awayScore: row.away_score || 0,
    homeRebounds: row.home_rebounds || 0,
    awayRebounds: row.away_rebounds || 0,
    homeAssists: row.home_assists || 0,
    awayAssists: row.away_assists || 0,
    homeSteals: row.home_steals || 0,
    awaySteals: row.away_steals || 0,
    homeBlocks: row.home_blocks || 0,
    awayBlocks: row.away_blocks || 0,
  };
}

export function getPlayerStats(matchId: number) {
  const match = getMatchById(matchId);
  if (!match) return [];

  return db.prepare(`
    SELECT 
      p.id as player_id,
      p.name as player_name,
      t.name as team_name,
      CASE WHEN t.id = ? THEN 1 ELSE 0 END as is_home,
      COALESCE(SUM(CASE WHEN pe.event_type = 'score' THEN pe.points ELSE 0 END), 0) as points,
      COALESCE(SUM(CASE WHEN pe.event_type = 'rebound' THEN 1 ELSE 0 END), 0) as rebounds,
      COALESCE(SUM(CASE WHEN pe.event_type = 'assist' THEN 1 ELSE 0 END), 0) as assists,
      COALESCE(SUM(CASE WHEN pe.event_type = 'steal' THEN 1 ELSE 0 END), 0) as steals,
      COALESCE(SUM(CASE WHEN pe.event_type = 'block' THEN 1 ELSE 0 END), 0) as blocks
    FROM play_events pe
    JOIN players p ON pe.player_id = p.id
    JOIN teams t ON p.team_id = t.id
    WHERE pe.match_id = ? AND pe.is_cancelled = 0
    GROUP BY p.id, p.name, t.name
    ORDER BY points DESC
  `).all(match.home_team_id, matchId) as any[];
}

export function getAllPlayers(): Player[] {
  return db.prepare('SELECT * FROM players ORDER BY name').all() as Player[];
}
export function updateTeam(id: number, data: { name?: string; logoUrl?: string }): Team | null {
  const fields: string[] = [];
  const values: any[] = [];
  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
  if (data.logoUrl !== undefined) { fields.push('logo_url = ?'); values.push(data.logoUrl); }
  if (fields.length === 0) return null;
  values.push(id);
  const sql = `UPDATE teams SET ${fields.join(', ')} WHERE id = ?`;
  db.prepare(sql).run(...values);
  return getTeamById(id);
}

export function deleteTeam(id: number): boolean {
  const result = db.prepare('DELETE FROM teams WHERE id = ?').run(id);
  return result.changes > 0;
}

export function deletePlayer(id: number): boolean {
  const result = db.prepare('DELETE FROM players WHERE id = ?').run(id);
  return result.changes > 0;
}
