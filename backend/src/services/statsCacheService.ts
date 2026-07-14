import { getRedisClient } from './redisService';
import {
  getMatchStats as getDbStats,
  getPlayerStats as getDbPlayerStats,
  getMatchEvents as getDbEvents,
} from './matchService';

const STATS_TTL = 86400 * 7; // 7 days

export async function updateMatchStats(matchId: number, event: {
  playerId: number;
  eventType: string;
  points?: number;
  assistBy?: number;
  reboundType?: string;
}): Promise<void> {
  const redis = await getRedisClient();
  const statsKey = `match:${matchId}:stats`;

  const current = await redis.hGetAll(statsKey) || {};
  const homeScore = parseInt(String(current.home_score || '0'));
  const awayScore = parseInt(String(current.away_score || '0'));

  await redis.hSet(statsKey, {
    home_score: String(homeScore),
    away_score: String(awayScore),
    last_updated: new Date().toISOString(),
  });
  await redis.expire(statsKey, STATS_TTL);
}

export async function updatePlayerStats(matchId: number, playerId: number, event: {
  eventType: string;
  points?: number;
}): Promise<void> {
  const redis = await getRedisClient();
  const statsKey = `match:${matchId}:players:${playerId}:stats`;

  const current = await redis.hGetAll(statsKey) || {};
  const points = parseInt(String(current.points || '0')) + (event.eventType === 'score' ? (event.points || 0) : 0);
  const rebounds = parseInt(String(current.rebounds || '0')) + (event.eventType === 'rebound' ? 1 : 0);
  const assists = parseInt(String(current.assists || '0')) + (event.eventType === 'assist' ? 1 : 0);
  const steals = parseInt(String(current.steals || '0')) + (event.eventType === 'steal' ? 1 : 0);
  const blocks = parseInt(String(current.blocks || '0')) + (event.eventType === 'block' ? 1 : 0);

  await redis.hSet(statsKey, {
    points: String(points),
    rebounds: String(rebounds),
    assists: String(assists),
    steals: String(steals),
    blocks: String(blocks),
  });
  await redis.expire(statsKey, STATS_TTL);
}

export async function addEventToList(matchId: number, eventId: number): Promise<void> {
  const redis = await getRedisClient();
  const eventsKey = `match:${matchId}:events`;
  await redis.lPush(eventsKey, String(eventId));
  await redis.lTrim(eventsKey, 0, 49);
  await redis.expire(eventsKey, STATS_TTL);
}

export async function removeEventFromList(matchId: number, eventId: number): Promise<void> {
  const redis = await getRedisClient();
  const eventsKey = `match:${matchId}:events`;
  await redis.lRem(eventsKey, 0, String(eventId));
}

export async function getCachedMatchStats(matchId: number) {
  const redis = await getRedisClient();
  const statsKey = `match:${matchId}:stats`;
  const cached = await redis.hGetAll(statsKey);

  if (Object.keys(cached).length > 0) {
    return {
      homeScore: parseInt(String(cached.home_score || '0')),
      awayScore: parseInt(String(cached.away_score || '0')),
      homeRebounds: parseInt(String(cached.home_rebounds || '0')),
      awayRebounds: parseInt(String(cached.away_rebounds || '0')),
      homeAssists: parseInt(String(cached.home_assists || '0')),
      awayAssists: parseInt(String(cached.away_assists || '0')),
      homeSteals: parseInt(String(cached.home_steals || '0')),
      awaySteals: parseInt(String(cached.away_steals || '0')),
      homeBlocks: parseInt(String(cached.home_blocks || '0')),
      awayBlocks: parseInt(String(cached.away_blocks || '0')),
    };
  }

  // Cache miss, fetch from DB
  const dbStats = getDbStats(matchId);
  await redis.hSet(statsKey, {
    home_score: String(dbStats.homeScore),
    away_score: String(dbStats.awayScore),
    home_rebounds: String(dbStats.homeRebounds),
    away_rebounds: String(dbStats.awayRebounds),
    home_assists: String(dbStats.homeAssists),
    away_assists: String(dbStats.awayAssists),
    home_steals: String(dbStats.homeSteals),
    away_steals: String(dbStats.awaySteals),
    home_blocks: String(dbStats.homeBlocks),
    away_blocks: String(dbStats.awayBlocks),
    last_updated: new Date().toISOString(),
  });
  await redis.expire(statsKey, STATS_TTL);
  return dbStats;
}

export async function getCachedPlayerStats(matchId: number, playerId: number) {
  const redis = await getRedisClient();
  const statsKey = `match:${matchId}:players:${playerId}:stats`;
  const cached = await redis.hGetAll(statsKey);

  if (Object.keys(cached).length > 0) {
    return cached;
  }

  // Cache miss
  const allStats = getDbPlayerStats(matchId);
  const playerStat = allStats.find((s: any) => s.player_id === playerId);
  if (playerStat) {
    await redis.hSet(statsKey, {
      points: String(playerStat.points),
      rebounds: String(playerStat.rebounds),
      assists: String(playerStat.assists),
      steals: String(playerStat.steals),
      blocks: String(playerStat.blocks),
    });
    await redis.expire(statsKey, STATS_TTL);
  }
  return cached;
}

export async function getCachedRecentEvents(matchId: number, limit: number = 50) {
  const redis = await getRedisClient();
  const eventsKey = `match:${matchId}:events`;

  const eventIds = await redis.lRange(eventsKey, 0, limit - 1);
  if (eventIds.length === 0) {
    // Cache miss
    const events = getDbEvents(matchId, limit);
    for (const ev of events) {
      await redis.lPush(eventsKey, String(ev.id));
    }
    await redis.lTrim(eventsKey, 0, 49);
    await redis.expire(eventsKey, STATS_TTL);
    return events;
  }

  return eventIds.map(id => ({ id: parseInt(id) }));
}