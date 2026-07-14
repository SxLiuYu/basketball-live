import express from 'express';
import {
  getAllTeams,
  createTeam,
  getTeamById,
  getTeamPlayers,
  getAllPlayers,
  createPlayer,
  updatePlayer,
  deletePlayer,
  updateTeam,
  deleteTeam,
} from '../services/matchService';

const router = express.Router() as any;

// ===== Specific routes (must come before parameterized routes) =====

// GET /api/v1/teams/players - 获取所有球员
router.get('/players', async (req, res) => {
  try {
    const players = await getAllPlayers();
    res.json({ success: true, data: players });
  } catch (error) {
    console.error('Error fetching players:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch players' });
  }
});

// PUT /api/v1/teams/players/:id - 更新球员
router.put('/players/:id', async (req, res) => {
  try {
    const player = await updatePlayer(parseInt(req.params.id), req.body);
    if (!player) {
      return res.status(404).json({ success: false, error: 'Player not found' });
    }
    res.json({ success: true, data: player });
  } catch (error) {
    console.error('Error updating player:', error);
    res.status(500).json({ success: false, error: 'Failed to update player' });
  }
});

// DELETE /api/v1/teams/players/:id - 删除球员
router.delete('/players/:id', async (req, res) => {
  try {
    const deleted = await deletePlayer(parseInt(req.params.id));
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Player not found' });
    }
    res.json({ success: true, message: 'Player deleted' });
  } catch (error) {
    console.error('Error deleting player:', error);
    res.status(500).json({ success: false, error: 'Failed to delete player' });
  }
});

// ===== Parameterized routes =====

// GET /api/v1/teams - 获取所有球队
router.get('/', async (req, res) => {
  try {
    const teams = await getAllTeams();
    res.json({ success: true, data: teams });
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch teams' });
  }
});

// POST /api/v1/teams - 创建球队
router.post('/', async (req, res) => {
  try {
    const { name, logoUrl } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: 'name is required' });
    }
    const team = await createTeam(name, logoUrl);
    res.status(201).json({ success: true, data: team });
  } catch (error) {
    console.error('Error creating team:', error);
    res.status(500).json({ success: false, error: 'Failed to create team' });
  }
});

// PUT /api/v1/teams/:id - 更新球队
router.put('/:id', async (req, res) => {
  try {
    const { name, logoUrl } = req.body;
    const team = await updateTeam(parseInt(req.params.id), { name, logoUrl });
    if (!team) {
      return res.status(404).json({ success: false, error: 'Team not found' });
    }
    res.json({ success: true, data: team });
  } catch (error) {
    console.error('Error updating team:', error);
    res.status(500).json({ success: false, error: 'Failed to update team' });
  }
});

// DELETE /api/v1/teams/:id - 删除球队
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await deleteTeam(parseInt(req.params.id));
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Team not found' });
    }
    res.json({ success: true, message: 'Team deleted' });
  } catch (error) {
    console.error('Error deleting team:', error);
    res.status(500).json({ success: false, error: 'Failed to delete team' });
  }
});

// GET /api/v1/teams/:id - 获取球队详情
router.get('/:id', async (req, res) => {
  try {
    const team = await getTeamById(parseInt(req.params.id));
    if (!team) {
      return res.status(404).json({ success: false, error: 'Team not found' });
    }
    res.json({ success: true, data: team });
  } catch (error) {
    console.error('Error fetching team:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch team' });
  }
});

// GET /api/v1/teams/:id/players - 获取球队球员
router.get('/:id/players', async (req, res) => {
  try {
    const players = await getTeamPlayers(parseInt(req.params.id));
    res.json({ success: true, data: players });
  } catch (error) {
    console.error('Error fetching players:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch players' });
  }
});

// POST /api/v1/teams/:id/players - 创建球员
router.post('/:id/players', async (req, res) => {
  try {
    const teamId = parseInt(req.params.id);
    const { name, number, position } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: 'name is required' });
    }
    const player = await createPlayer(teamId, name, number, position);
    res.status(201).json({ success: true, data: player });
  } catch (error) {
    console.error('Error creating player:', error);
    res.status(500).json({ success: false, error: 'Failed to create player' });
  }
});

export default router;
