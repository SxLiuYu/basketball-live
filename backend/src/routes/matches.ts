import express from 'express';
import {
  getAllMatches,
  getMatchById,
  createMatch,
  updateMatch,
  deleteMatch,
  setLineup,
  getLineup,
  recordEvent,
  cancelEvent,
  getMatchEvents,
  getMatchStats,
  getPlayerStats,
} from '../services/matchService';
import {
  updateMatchStats as updateRedisStats,
  updatePlayerStats as updateRedisPlayerStats,
  addEventToList,
  removeEventFromList,
} from '../services/statsCacheService';

const router = express.Router() as any;

// ============= Match CRUD =============

// GET /api/v1/matches - 获取所有比赛
router.get('/', async (req, res) => {
  try {
    const matches = await getAllMatches();
    res.json({ success: true, data: matches });
  } catch (error) {
    console.error('Error fetching matches:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch matches' });
  }
});

// POST /api/v1/matches - 创建比赛
router.post('/', async (req, res) => {
  try {
    const { homeTeamId, awayTeamId, startTime, venue, liveStreamUrl, pushStreamUrl } = req.body;
    if (!homeTeamId || !awayTeamId) {
      return res.status(400).json({ success: false, error: 'homeTeamId and awayTeamId are required' });
    }
    const match = await createMatch({ homeTeamId, awayTeamId, startTime: startTime || null, venue, liveStreamUrl, pushStreamUrl });
    res.status(201).json({ success: true, data: match });
  } catch (error) {
    console.error('Error creating match:', error);
    res.status(500).json({ success: false, error: 'Failed to create match' });
  }
});

// GET /api/v1/matches/:id - 获取比赛详情
router.get('/:id', async (req, res) => {
  try {
    const match = await getMatchById(parseInt(req.params.id));
    if (!match) {
      return res.status(404).json({ success: false, error: 'Match not found' });
    }
    res.json({ success: true, data: match });
  } catch (error) {
    console.error('Error fetching match:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch match' });
  }
});

// PUT /api/v1/matches/:id - 更新比赛
router.put('/:id', async (req, res) => {
  try {
    const match = await updateMatch(parseInt(req.params.id), req.body);
    if (!match) {
      return res.status(404).json({ success: false, error: 'Match not found' });
    }
    res.json({ success: true, data: match });
  } catch (error) {
    console.error('Error updating match:', error);
    res.status(500).json({ success: false, error: 'Failed to update match' });
  }
});

// PUT /api/v1/matches/:id/status - 更新比赛状态
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, error: 'status is required' });
    }
    const match = await updateMatch(parseInt(req.params.id), { status });
    if (!match) {
      return res.status(404).json({ success: false, error: 'Match not found' });
    }
    res.json({ success: true, data: match });
  } catch (error) {
    console.error('Error updating match status:', error);
    res.status(500).json({ success: false, error: 'Failed to update match status' });
  }
});

// DELETE /api/v1/matches/:id - 删除比赛
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await deleteMatch(parseInt(req.params.id));
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Match not found' });
    }
    res.json({ success: true, message: 'Match deleted' });
  } catch (error) {
    console.error('Error deleting match:', error);
    res.status(500).json({ success: false, error: 'Failed to delete match' });
  }
});

// ============= Lineup =============

// POST /api/v1/matches/:id/lineup/home - 设置主队上场名单
router.post('/:id/lineup/home', async (req, res) => {
  try {
    const matchId = parseInt(req.params.id);
    const { playerIds } = req.body;
    const playerIdsArr = playerIds || req.body.player_ids;
    if (!playerIdsArr || !Array.isArray(playerIdsArr) || playerIdsArr.length === 0) {
      return res.status(400).json({ success: false, error: 'playerIds array is required' });
    }
    const lineup = playerIdsArr.map((pid) => ({ playerId: pid, isStarting: true }));
    await setLineup(matchId, lineup, 'home');
    res.json({ success: true, message: 'Home lineup set' });
  } catch (error) {
    console.error('Error setting lineup:', error);
    res.status(500).json({ success: false, error: 'Failed to set lineup' });
  }
});

// POST /api/v1/matches/:id/lineup/away - 设置客队上场名单
router.post('/:id/lineup/away', async (req, res) => {
  try {
    const matchId = parseInt(req.params.id);
    const { playerIds } = req.body;
    const playerIdsArr = playerIds || req.body.player_ids;
    if (!playerIdsArr || !Array.isArray(playerIdsArr) || playerIdsArr.length === 0) {
      return res.status(400).json({ success: false, error: 'playerIds array is required' });
    }
    const lineup = playerIdsArr.map((pid) => ({ playerId: pid, isStarting: true }));
    await setLineup(matchId, lineup, 'away');
    res.json({ success: true, message: 'Away lineup set' });
  } catch (error) {
    console.error('Error setting lineup:', error);
    res.status(500).json({ success: false, error: 'Failed to set lineup' });
  }
});

// GET /api/v1/matches/:id/lineup - 获取上场名单
router.get('/:id/lineup', async (req, res) => {
  try {
    const lineup = await getLineup(parseInt(req.params.id));
    res.json({ success: true, data: lineup });
  } catch (error) {
    console.error('Error fetching lineup:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch lineup' });
  }
});

// ============= Events =============

// POST /api/v1/matches/:id/events - 记录事件
router.post('/:id/events', async (req, res) => {
  try {
    const matchId = parseInt(req.params.id);
    const match = await getMatchById(matchId);
    if (!match) {
      return res.status(404).json({ success: false, error: 'Match not found' });
    }

    // Accept both camelCase and snake_case for convenience
    const playerId = req.body.playerId || req.body.player_id;
    const eventType = req.body.eventType || req.body.event_type;
    const points = req.body.points;
    const assistBy = req.body.assistBy || req.body.assist_by;
    const reboundType = req.body.reboundType || req.body.rebound_type;
    if (!playerId || !eventType) {
      return res.status(400).json({ success: false, error: 'playerId and eventType are required' });
    }

    const event = await recordEvent({
      matchId,
      playerId,
      eventType,
      points: points || 0,
      assistBy,
      reboundType,
    });

    // 更新Redis缓存
    try {
      await updateRedisStats(matchId, {
        playerId: event.player_id,
        eventType: event.event_type,
        points: event.points || undefined,
        assistBy: event.assist_by || undefined,
        reboundType: event.rebound_type || undefined,
      });
      await updateRedisPlayerStats(matchId, event.player_id, {
        eventType: event.event_type,
        points: event.points || undefined,
      });
      await addEventToList(matchId, event.id);
    } catch (cacheErr) {
      console.warn('⚠️  Redis cache update failed (non-critical):', cacheErr);
    }

    res.status(201).json({ success: true, data: event });
  } catch (error) {
    console.error('Error recording event:', error);
    res.status(500).json({ success: false, error: 'Failed to record event' });
  }
});

// DELETE /api/v1/matches/:id/events/:eventId - 撤销事件
router.delete('/:id/events/:eventId', async (req, res) => {
  try {
    const eventId = parseInt(req.params.eventId);
    const cancelled = await cancelEvent(eventId);
    if (!cancelled) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    // 尝试从Redis移除
    try {
      const matchId = parseInt(req.params.id);
      await removeEventFromList(matchId, eventId);
    } catch (cacheErr) {
      console.warn('⚠️  Redis cache cleanup failed (non-critical):', cacheErr);
    }

    res.json({ success: true, message: 'Event cancelled' });
  } catch (error) {
    console.error('Error cancelling event:', error);
    res.status(500).json({ success: false, error: 'Failed to cancel event' });
  }
});

// GET /api/v1/matches/:id/events - 获取比赛事件列表
router.get('/:id/events', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const events = await getMatchEvents(parseInt(req.params.id), limit);
    res.json({ success: true, data: events });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch events' });
  }
});

// ============= Stats =============

// GET /api/v1/matches/:id/stats - 获取比赛统计数据
router.get('/:id/stats', async (req, res) => {
  try {
    const rawStats = await getMatchStats(parseInt(req.params.id));
    // Format as nested home/away structure for frontend
    const formatted = {
      home: {
        total_points: rawStats.homeScore || 0,
        rebounds: rawStats.homeRebounds || 0,
        assists: rawStats.homeAssists || 0,
        steals: rawStats.homeSteals || 0,
        blocks: rawStats.homeBlocks || 0,
        players: {},
      },
      away: {
        total_points: rawStats.awayScore || 0,
        rebounds: rawStats.awayRebounds || 0,
        assists: rawStats.awayAssists || 0,
        steals: rawStats.awaySteals || 0,
        blocks: rawStats.awayBlocks || 0,
        players: {},
      },
    };
    res.json({ success: true, data: formatted });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});

// GET /api/v1/matches/:id/player-stats - 获取球员统计数据
router.get('/:id/player-stats', async (req, res) => {
  try {
    const rawStats = await getPlayerStats(parseInt(req.params.id));
    // Convert array to object keyed by player_id
    const playerObj: any = {};
    for (const s of rawStats) {
      playerObj[s.player_id] = {
        name: s.player_name,
        team_name: s.team_name,
        points: s.points,
        rebounds: s.rebounds,
        assists: s.assists,
        steals: s.steals,
        blocks: s.blocks,
        is_home: s.is_home === 1,
      };
    }
    res.json({ success: true, data: playerObj });
  } catch (error) {
    console.error('Error fetching player stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch player stats' });
  }
});

// GET /api/v1/matches/:id/stream - 获取播放地址
router.get('/:id/stream', async (req, res) => {
  try {
    const match = await getMatchById(parseInt(req.params.id));
    if (!match) {
      return res.status(404).json({ success: false, error: 'Match not found' });
    }
    res.json({ success: true, data: { streamUrl: match.live_stream_url } });
  } catch (error) {
    console.error('Error fetching stream:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch stream' });
  }
});

export default router;
