import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Row,
  Col,
  Button,
  Space,
  Tag,
  List,
  Typography,
  Drawer,
  message,
} from 'antd';
import {
  ArrowLeftOutlined,
  UndoOutlined,
} from '@ant-design/icons';
import { useSocket } from '../../hooks/useSocket';
import api from '../../utils/api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

interface PlayerInfo {
  id: number;
  name: string;
  number: number | null;
  position: string | null;
  team_id: number;
  team_name: string;
  is_starting: boolean;
}

interface MatchEvent {
  id: number;
  player_name: string;
  team_name: string;
  event_type: string;
  points: number | null;
  assist_player_name?: string;
  rebound_type?: string;
  created_at: string;
}

interface MatchStats {
  homeScore: number;
  awayScore: number;
  homeRebounds: number;
  awayRebounds: number;
  homeAssists: number;
  awayAssists: number;
  homeSteals: number;
  awaySteals: number;
  homeBlocks: number;
  awayBlocks: number;
  homeTurnovers: number;
  awayTurnovers: number;
  homeFouls: number;
  awayFouls: number;
}

export default function ControlPanel() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const matchId = parseInt(id || '0');

  const [match, setMatch] = useState<any>(null);
  const [homePlayers, setHomePlayers] = useState<PlayerInfo[]>([]);
  const [awayPlayers, setAwayPlayers] = useState<PlayerInfo[]>([]);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [stats, setStats] = useState<MatchStats>({
    homeScore: 0, awayScore: 0,
    homeRebounds: 0, awayRebounds: 0,
    homeAssists: 0, awayAssists: 0,
    homeSteals: 0, awaySteals: 0,
    homeBlocks: 0, awayBlocks: 0,
    homeTurnovers: 0, awayTurnovers: 0,
    homeFouls: 0, awayFouls: 0,
  });
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerInfo | null>(null);
  const [selectDrawerOpen, setSelectDrawerOpen] = useState(false);

  const { emit } = useSocket({
    matchId: matchId || null,
    onMatchUpdate: (data: any) => {
      if (data.homeScore !== undefined) {
        setStats({
          homeScore: data.homeScore,
          awayScore: data.awayScore,
          homeRebounds: data.home_rebounds || 0,
          awayRebounds: data.away_rebounds || 0,
          homeAssists: data.home_assists || 0,
          awayAssists: data.away_assists || 0,
          homeSteals: data.home_steals || 0,
          awaySteals: data.away_steals || 0,
          homeBlocks: data.home_blocks || 0,
          awayBlocks: data.away_blocks || 0,
          homeTurnovers: data.home_turnovers || 0,
          awayTurnovers: data.away_turnovers || 0,
          homeFouls: data.home_fouls || 0,
          awayFouls: data.away_fouls || 0,
        });
      }
      if (data.lastEvents) {
        setEvents(data.lastEvents);
      }
      if (data.lineup) {
        const home: PlayerInfo[] = [];
        const away: PlayerInfo[] = [];
        for (const lp of data.lineup) {
          const info: PlayerInfo = {
            id: lp.player_id,
            name: lp.player_name,
            number: lp.player_number,
            position: lp.position,
            team_id: lp.team_id,
            team_name: lp.team_name,
            is_starting: lp.is_starting,
          };
          if (match && lp.team_id === match.home_team_id) {
            home.push(info);
          } else {
            away.push(info);
          }
        }
        setHomePlayers(home);
        setAwayPlayers(away);
      }
    },
  });

  useEffect(() => {
    fetchMatch();
  }, [matchId]);

  const fetchMatch = async () => {
    try {
      const res = await api.get(`/matches/${matchId}`);
      setMatch(res.data.data);
    } catch {
      message.error('获取比赛信息失败');
    }
  };

  const handlePlayerClick = (player: PlayerInfo) => {
    setSelectedPlayer(player);
    setSelectDrawerOpen(true);
  };

  const handleAction = async (eventType: string, extra: any = {}) => {
    if (!selectedPlayer || !matchId) return;

    try {
      emit('record-event', {
        matchId,
        playerId: selectedPlayer.id,
        eventType,
        points: extra.points,
        assistBy: extra.assistBy,
        reboundType: extra.reboundType,
        teamName: selectedPlayer.team_name,
        playerName: selectedPlayer.name,
      });
      setSelectDrawerOpen(false);
      message.success('事件已记录');
    } catch {
      message.error('记录事件失败');
    }
  };

  const handleCancelEvent = async (eventId: number) => {
    try {
      emit('cancel-event', { eventId, matchId });
      message.success('事件已撤销');
    } catch {
      message.error('撤销失败');
    }
  };

  const getEventTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      score: '得分',
      'free-throw': '罚球',
      assist: '助攻',
      rebound: '篮板',
      steal: '抢断',
      block: '盖帽',
      turnover: '失误',
      foul: '犯规',
    };
    return labels[type] || type;
  };

  const getEventColor = (type: string) => {
    const colors: Record<string, string> = {
      score: 'orange',
      'free-throw': 'gold',
      assist: 'blue',
      rebound: 'green',
      steal: 'purple',
      block: 'red',
      turnover: 'gray',
      foul: 'pink',
    };
    return colors[type] || 'default';
  };

  if (!match) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Button onClick={() => navigate('/admin/matches')}>返回管理后台</Button>
      </div>
    );
  }

  return (
    <div style={{ padding: 16, minHeight: '100vh', background: '#f0f2f5' }}>
      {/* Top Bar */}
      <Card style={{ marginBottom: 16 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin/matches')} style={{ marginRight: 16 }}>
              返回
            </Button>
            <Title level={4} style={{ margin: 0 }}>
              {match.home_team_name || `球队${match.home_team_id}`} vs {match.away_team_name || `球队${match.away_team_id}`}
            </Title>
          </Col>
          <Col>
            <Space size="large">
              <span>
                <Text type="secondary">{match.home_team_name || '主队'}</Text>
                <Text strong style={{ fontSize: 32, color: '#ff4d4f', margin: '0 12px' }}>{stats.homeScore}</Text>
              </span>
              <Text type="secondary">:</Text>
              <span>
                <Text strong style={{ fontSize: 32, color: '#1890ff', margin: '0 12px' }}>{stats.awayScore}</Text>
                <Text type="secondary">{match.away_team_name || '客队'}</Text>
              </span>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Player Selection */}
      <Row gutter={[16, 16]}>
        {/* Home Team */}
        <Col span={12}>
          <Card title={`🏠 ${match.home_team_name || '主队'}`}>
            <Row gutter={[8, 8]}>
              {homePlayers.map((p) => (
                <Col span={12} key={p.id}>
                  <Button
                    type={selectedPlayer?.id === p.id ? 'primary' : 'default'}
                    block
                    onClick={() => handlePlayerClick(p)}
                    style={{ height: 56, fontSize: 14 }}
                  >
                    <Space>
                      <span style={{ fontSize: 18, fontWeight: 'bold' }}>#{p.number ?? '-'}</span>
                      <span>{p.name}</span>
                    </Space>
                  </Button>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>

        {/* Away Team */}
        <Col span={12}>
          <Card title={`✈️ ${match.away_team_name || '客队'}`}>
            <Row gutter={[8, 8]}>
              {awayPlayers.map((p) => (
                <Col span={12} key={p.id}>
                  <Button
                    type={selectedPlayer?.id === p.id ? 'primary' : 'default'}
                    block
                    onClick={() => handlePlayerClick(p)}
                    style={{ height: 56, fontSize: 14 }}
                  >
                    <Space>
                      <span style={{ fontSize: 18, fontWeight: 'bold' }}>#{p.number ?? '-'}</span>
                      <span>{p.name}</span>
                    </Space>
                  </Button>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>
      </Row>

      {/* Event Log */}
      <Card title="📋 事件记录" style={{ marginTop: 16 }}>
        <List
          dataSource={events}
          locale={{ emptyText: '暂无事件' }}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Button
                  type="link"
                  size="small"
                  danger
                  icon={<UndoOutlined />}
                  onClick={() => handleCancelEvent(item.id)}
                >
                  撤销
                </Button>,
              ]}
            >
              <List.Item.Meta
                avatar={<Tag color={getEventColor(item.event_type)}>{getEventTypeLabel(item.event_type)}</Tag>}
                title={
                  <Space>
                    <Text strong>{item.player_name}</Text>
                    <Text type="secondary">({item.team_name})</Text>
                    {item.points && <Text type="success">+{item.points}分</Text>}
                    {item.assist_player_name && <Text>助攻: {item.assist_player_name}</Text>}
                    {item.rebound_type && <Text>{item.rebound_type === 'offensive' ? '进攻' : '防守'}篮板</Text>}
                  </Space>
                }
                description={dayjs(item.created_at).format('HH:mm:ss')}
              />
            </List.Item>
          )}
        />
      </Card>

      {/* Player Action Drawer */}
      <Drawer
        title={`操作: ${selectedPlayer?.name} (#${selectedPlayer?.number})`}
        placement="right"
        width={360}
        open={selectDrawerOpen}
        onClose={() => setSelectDrawerOpen(false)}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* Scoring */}
          <Card size="small" title="🏀 得分">
            <Space>
              <Button type="primary" size="large" onClick={() => handleAction('score', { points: 2 })}>
                +2 分
              </Button>
              <Button type="primary" size="large" onClick={() => handleAction('score', { points: 3 })}>
                +3 分
              </Button>
            </Space>
          </Card>

          {/* Free Throw */}
          <Card size="small" title="🎯 罚球">
            <Space>
              <Button type="primary" size="large" onClick={() => handleAction('free-throw', { points: 1 })}>
                命中 +1
              </Button>
              <Button type="default" size="large" onClick={() => handleAction('free-throw', { points: 0 })}>
                不中
              </Button>
            </Space>
          </Card>

          {/* Assist */}
          <Card size="small" title="🎯 助攻">
            <Button type="default" size="large" block onClick={() => handleAction('assist')}>
              记一次助攻
            </Button>
          </Card>

          {/* Rebound */}
          <Card size="small" title="🛡️ 篮板">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button type="default" block onClick={() => handleAction('rebound', { reboundType: 'offensive' })}>
                进攻篮板
              </Button>
              <Button type="default" block onClick={() => handleAction('rebound', { reboundType: 'defensive' })}>
                防守篮板
              </Button>
            </Space>
          </Card>

          {/* Steal */}
          <Card size="small" title="💨 抢断">
            <Button type="default" block onClick={() => handleAction('steal')}>
              记一次抢断
            </Button>
          </Card>

          {/* Block */}
          <Card size="small" title="🚫 盖帽">
            <Button type="default" block onClick={() => handleAction('block')}>
              记一次盖帽
            </Button>
          </Card>

          {/* Turnover */}
          <Card size="small" title="⚠️ 失误">
            <Button type="default" block onClick={() => handleAction('turnover')}>
              记一次失误
            </Button>
          </Card>

          {/* Foul */}
          <Card size="small" title="👋 犯规">
            <Button type="default" block onClick={() => handleAction('foul')}>
              记一次犯规
            </Button>
          </Card>
        </Space>
      </Drawer>
    </div>
  );
}
