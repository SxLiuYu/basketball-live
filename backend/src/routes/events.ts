import express from 'express';
import {
  recordEvent,
  cancelEvent,
  getMatchEvents,
  getMatchStats,
  getPlayerStats,
  getMatchById,
} from '../services/matchService';
import {
  updateMatchStats as updateRedisStats,
  updatePlayerStats as updateRedisPlayerStats,
  addEventToList,
  removeEventFromList,
} from '../services/statsCacheService';

const router = express.Router() as any;

// POST /api/v1/matches/:id/events - 记录事件
router.post('/matches/:id/events', async (req, res) => {
  try {
    const matchId = parseInt(req.params.id);
    const match = await getMatchById(matchId);
    if (!match) {
      return res.status(404).json({ success: false, error: 'Match not found' });
    }

    const { playerId, eventType, points, assistBy, reboundType } = req.body;
    if (!playerId || !eventType) {
      return res.status(400).json({ success: false, error: 'playerId and eventType are required' });
    }

    const event = await recordEvent({
      matchId,
      playerId,
      eventType,
      points,
      assistBy,
      reboundType,
    });

    // 更新Redis缓存
    await updateRedisStats(matchId, {
      playerId: event.player_id,
      eventType: event.event_type,
      points: event.points || undefined,
      assistBy: event.assist_by || undefined,
      reboundType: event.rebound_type || undefined,
    });
    await updateRedisPlayerStats(matchId, playerId, {
      eventType: event.event_type,
      points: event.points || undefined,
    });
    await addEventToList(matchId, event.id);

    res.status(201).json({ success: true, data: event });
  } catch (error) {
    console.error('Error recording event:', error);
    res.status(500).json({ success: false, error: 'Failed to record event' });
  }
});

// DELETE /api/v1/events/:eventId - 撤销事件
router.delete('/events/:eventId', async (req, res) => {
  try {
    const cancelled = await cancelEvent(parseInt(req.params.eventId));
    if (!cancelled) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }
    res.json({ success: true, message: 'Event cancelled' });
  } catch (error) {
    console.error('Error cancelling event:', error);
    res.status(500).json({ success: false, error: 'Failed to cancel event' });
  }
});

// GET /api/v1/matches/:id/stats - 获取比赛统计数据
router.get('/matches/:id/stats', async (req, res) => {
  try {
    const stats = await getMatchStats(parseInt(req.params.id));
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});

// GET /api/v1/matches/:id/player-stats - 获取球员统计数据
router.get('/matches/:id/player-stats', async (req, res) => {
  try {
    const stats = await getPlayerStats(parseInt(req.params.id));
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching player stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch player stats' });
  }
});

// GET /api/v1/matches/:id/events - 获取比赛事件列表
router.get('/matches/:id/events', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const events = await getMatchEvents(parseInt(req.params.id), limit);
    res.json({ success: true, data: events });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch events' });
  }
});

// GET /api/v1/matches/:id/stream - 获取播放地址
router.get('/matches/:id/stream', async (req, res) => {
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

// POST /api/v1/matches/:id/stream/generate - 生成推流地址
router.post('/matches/:id/stream/generate', async (req, res) => {
  try {
    const match = await getMatchById(parseInt(req.params.id));
    if (!match) {
      return res.status(404).json({ success: false, error: 'Match not found' });
    }

    // 生成推流密钥
    const pushKey = Math.random().toString(36).substring(2, 15);
    const pushStreamUrl = `${process.env.STREAM_PUSH_BASE_URL || ''}/${match.id}_${pushKey}`;
    const liveStreamUrl = `${process.env.STREAM_PLAY_BASE_URL || ''}/${match.id}.m3u8`;

    await require('../services/matchService').updateMatch(match.id, {
      push_stream_url: pushStreamUrl,
      live_stream_url: liveStreamUrl,
    });

    res.json({ success: true, data: { pushStreamUrl, liveStreamUrl } });
  } catch (error) {
    console.error('Error generating stream:', error);
    res.status(500).json({ success: false, error: 'Failed to generate stream' });
  }
});

export default router;