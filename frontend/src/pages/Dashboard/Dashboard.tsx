import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Typography, Badge, Spin, Row, Col, Card, List, Tag, Space, Button } from 'antd';
import { FullscreenOutlined } from '@ant-design/icons';
import { useSocket } from '../../hooks/useSocket';
import api from '../../utils/api';
import ReactECharts from 'echarts-for-react';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

interface PlayerStats {
  playerId: number;
  playerName: string;
  teamName: string;
  isHome: boolean;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
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

export default function Dashboard() {
  const { id } = useParams<{ id: string }>();
  const matchId = parseInt(id || '0');

  const [match, setMatch] = useState<any>(null);
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [homeRebounds, setHomeRebounds] = useState(0);
  const [awayRebounds, setAwayRebounds] = useState(0);
  const [homeAssists, setHomeAssists] = useState(0);
  const [awayAssists, setAwayAssists] = useState(0);
  const [homeSteals, setHomeSteals] = useState(0);
  const [awaySteals, setAwaySteals] = useState(0);
  const [homeBlocks, setHomeBlocks] = useState(0);
  const [awayBlocks, setAwayBlocks] = useState(0);
  const [playerStats, setPlayerStats] = useState<PlayerStats[]>([]);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const { emit: _socketEmit } = useSocket({
    matchId: matchId || null,
    onMatchUpdate: (data: any) => {
      if (data.homeScore !== undefined) {
        setHomeScore(data.homeScore);
        setAwayScore(data.awayScore);
        setHomeRebounds(data.home_rebounds || 0);
        setAwayRebounds(data.away_rebounds || 0);
        setHomeAssists(data.home_assists || 0);
        setAwayAssists(data.away_assists || 0);
        setHomeSteals(data.home_steals || 0);
        setAwaySteals(data.away_steals || 0);
        setHomeBlocks(data.home_blocks || 0);
        setAwayBlocks(data.away_blocks || 0);
      }
      if (data.lastEvents) {
        setEvents(data.lastEvents);
      }
    },
  });

  useEffect(() => {
    fetchData();
  }, [matchId]);

  const fetchData = async () => {
    try {
      const [matchRes, statsRes, playerRes, eventsRes] = await Promise.all([
        api.get(`/matches/${matchId}`),
        api.get(`/matches/${matchId}/stats`),
        api.get(`/matches/${matchId}/player-stats`),
        api.get(`/matches/${matchId}/events?limit=30`),
      ]);
      setMatch(matchRes.data.data);
      const s = statsRes.data.data;
      setHomeScore(s.homeScore || 0);
      setAwayScore(s.awayScore || 0);
      setHomeRebounds(s.homeRebounds || 0);
      setAwayRebounds(s.awayRebounds || 0);
      setHomeAssists(s.homeAssists || 0);
      setAwayAssists(s.awayAssists || 0);
      setHomeSteals(s.homeSteals || 0);
      setAwaySteals(s.awaySteals || 0);
      setHomeBlocks(s.homeBlocks || 0);
      setAwayBlocks(s.awayBlocks || 0);
      setPlayerStats(playerRes.data.data);
      setEvents(eventsRes.data.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  // ECharts option for team comparison bar chart
  const teamCompareOption = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis' as const, axisPointer: { type: 'shadow' as const } },
    legend: { data: ['主队', '客队'], textStyle: { color: '#ccc' } },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: '#555' } },
      splitLine: { lineStyle: { color: '#333' } },
    },
    yAxis: {
      type: 'category',
      data: ['得分', '篮板', '助攻', '抢断', '盖帽'],
      axisLine: { lineStyle: { color: '#555' } },
      axisLabel: { color: '#ccc' },
    },
    series: [
      {
        name: '主队',
        type: 'bar',
        data: [homeScore, homeRebounds, homeAssists, homeSteals, homeBlocks],
        itemStyle: { color: '#ff4d4f' },
      },
      {
        name: '客队',
        type: 'bar',
        data: [awayScore, awayRebounds, awayAssists, awaySteals, awayBlocks],
        itemStyle: { color: '#1890ff' },
      },
    ],
  };

  // Top scorers pie chart
  const topScorersOption = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item' as const },
    series: [
      {
        type: 'pie' as const,
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: { show: false },
        data: playerStats.slice(0, 8).map((p) => ({
          value: p.points,
          name: `${p.playerName} (${p.teamName})`,
        })),
      },
    ],
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0a0e27' }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a0e27 0%, #1a1a3e 50%, #0d1117 100%)',
        color: '#fff',
        padding: '20px 40px',
        fontFamily: "'Microsoft YaHei', sans-serif",
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Title level={3} style={{ color: '#ffd700', margin: 0 }}>
          🏀 篮球赛事实时数据大屏
        </Title>
        <Space>
          <Badge
            count={match?.status === 'live' ? 'LIVE' : 'OFFLINE'}
            style={{ backgroundColor: match?.status === 'live' ? '#52c41a' : '#888' }}
          />
          <Text type="secondary">{match?.venue || ''}</Text>
          <Text type="secondary">{match?.start_time ? dayjs(match.start_time).format('YYYY-MM-DD HH:mm') : ''}</Text>
        </Space>
      </div>

      {/* Main Scoreboard */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 60, padding: '30px 0', marginBottom: 20 }}>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <Title level={2} style={{ color: '#ff4d4f', margin: 0 }}>
            {match?.home_team_name || '主队'}
          </Title>
          <Title level={1} style={{ color: '#fff', margin: '10px 0', fontSize: 96 }}>{homeScore}</Title>
        </div>
        <div style={{ fontSize: 48, fontWeight: 'bold', color: '#ffd700' }}>VS</div>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <Title level={2} style={{ color: '#1890ff', margin: 0 }}>
            {match?.away_team_name || '客队'}
          </Title>
          <Title level={1} style={{ color: '#fff', margin: '10px 0', fontSize: 96 }}>{awayScore}</Title>
        </div>
      </div>

      {/* Stats Cards */}
      <Row gutter={24} style={{ marginBottom: 24 }}>
        <Col span={6}><StatCard label="篮板" home={homeRebounds} away={awayRebounds} /></Col>
        <Col span={6}><StatCard label="助攻" home={homeAssists} away={awayAssists} /></Col>
        <Col span={6}><StatCard label="抢断" home={homeSteals} away={awaySteals} /></Col>
        <Col span={6}><StatCard label="盖帽" home={homeBlocks} away={awayBlocks} /></Col>
      </Row>

      {/* Charts and Events */}
      <Row gutter={24} style={{ marginBottom: 24 }}>
        <Col span={12}>
          <Card
            title="📊 球队对比"
            style={{ background: '#141b2d', borderColor: '#333' }}
            headStyle={{ borderBottom: '1px solid #333' }}
            bodyStyle={{ padding: '10px 20px' }}
          >
            <ReactECharts option={teamCompareOption} style={{ height: 300 }} />
          </Card>
        </Col>
        <Col span={12}>
          <Card
            title="🏆 得分TOP8"
            style={{ background: '#141b2d', borderColor: '#333' }}
            headStyle={{ borderBottom: '1px solid #333' }}
            bodyStyle={{ padding: '10px 20px' }}
          >
            <ReactECharts option={topScorersOption} style={{ height: 300 }} />
          </Card>
        </Col>
      </Row>

      {/* Event Feed */}
      <Card
        title="⚡ 实时事件流"
        style={{ background: '#141b2d', borderColor: '#333' }}
        headStyle={{ borderBottom: '1px solid #333', color: '#fff' }}
        bodyStyle={{ maxHeight: 200, overflowY: 'auto' }}
      >
        <List
          dataSource={events}
          locale={{ emptyText: '暂无事件' }}
          renderItem={(item) => (
            <List.Item style={{ borderBottom: '1px solid #222', padding: '8px 0' }}>
              <Space>
                <Tag color={getEventColor(item.event_type)}>{getEventTypeLabel(item.event_type)}</Tag>
                <Text strong>{item.player_name}</Text>
                <Text type="secondary">({item.team_name})</Text>
                {item.points && <Text type="success">+{item.points}</Text>}
                {item.assist_player_name && <Text>🎯 {item.assist_player_name}</Text>}
                <Text type="secondary">{dayjs(item.created_at).format('HH:mm:ss')}</Text>
              </Space>
            </List.Item>
          )}
        />
      </Card>

      {/* Fullscreen button */}
      <div style={{ position: 'fixed', bottom: 20, right: 20 }}>
        <Button type="primary" icon={<FullscreenOutlined />} onClick={toggleFullscreen}>
          全屏
        </Button>
      </div>
    </div>
  );
}

// Helper components
function StatCard({ label, home, away }: { label: string; home: number; away: number }) {
  return (
    <Card style={{ background: 'linear-gradient(135deg, #1a1a3e, #2a2a5e)', borderColor: '#444', textAlign: 'center' }}>
      <Text type="secondary" style={{ fontSize: 14 }}>{label}</Text>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 20, marginTop: 8 }}>
        <Title level={2} style={{ color: '#ff4d4f', margin: 0 }}>{home}</Title>
        <Text type="secondary">-</Text>
        <Title level={2} style={{ color: '#1890ff', margin: 0 }}>{away}</Title>
      </div>
    </Card>
  );
}

function getEventTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    score: '得分',
    assist: '助攻',
    rebound: '篮板',
    steal: '抢断',
    block: '盖帽',
  };
  return labels[type] || type;
}

function getEventColor(type: string): string {
  const colors: Record<string, string> = {
    score: 'orange',
    assist: 'blue',
    rebound: 'green',
    steal: 'purple',
    block: 'red',
  };
  return colors[type] || 'default';
}
