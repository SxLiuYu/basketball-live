import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Layout,
  Card,
  Row,
  Col,
  Tabs,
  Table,
  Tag,
  Typography,
  Space,
  Button,
  message,
  Divider,
} from 'antd';
import {
  ArrowLeftOutlined,
  ControlOutlined,
  DashboardOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';

const { Header, Content } = Layout;
const { Title, Text } = Typography;
import api from '../../utils/api';
import dayjs from 'dayjs';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import 'hls.js/dist/hls.min.js';

interface Match {
  id: number;
  home_team_name: string;
  away_team_name: string;
  status: string;
  start_time: string;
  venue: string;
  live_stream_url: string;
  push_stream_url: string;
}

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

export default function MatchDetail() {
  const { id } = useParams<{ id: string }>();
  const matchId = parseInt(id || '0');
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<any>(null);

  const [match, setMatch] = useState<Match | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [playerStats, setPlayerStats] = useState<PlayerStats[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [matchId]);

  useEffect(() => {
    if (match?.live_stream_url && videoRef.current) {
      initVideoPlayer(match.live_stream_url);
    }
  }, [match?.live_stream_url]);

  const fetchData = async () => {
    try {
      const [matchRes, statsRes, playerRes, eventsRes] = await Promise.all([
        api.get(`/matches/${matchId}`),
        api.get(`/matches/${matchId}/stats`),
        api.get(`/matches/${matchId}/player-stats`),
        api.get(`/matches/${matchId}/events?limit=30`),
      ]);
      setMatch(matchRes.data.data);
      setStats(statsRes.data.data);
      setPlayerStats(playerRes.data.data);
      setEvents(eventsRes.data.data);
    } catch {
      message.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  const initVideoPlayer = (url: string) => {
    if (!videoRef.current) return;

    if (playerRef.current) {
      playerRef.current.dispose();
    }

    const isHls = url.includes('.m3u8');

    playerRef.current = videojs(videoRef.current, {
      autoplay: false,
      muted: true,
      controls: true,
      responsive: true,
      fluid: true,
      html: {
        errors: true,
      },
      ...(isHls && {
        techOrder: ['html5', 'flv', 'hls'],
        sources: [{ src: url, type: 'application/x-mpegURL' }],
      }),
    });

    playerRef.current.on('error', () => {
      console.error('Video playback error');
      message.warning('视频播放出错，请检查直播源');
    });
  };

  const generateStream = async () => {
    try {
      const res = await api.post(`/matches/${matchId}/stream/generate`);
      setMatch((prev) => prev ? { ...prev, ...res.data.data } : prev);
      message.success('推流地址已生成');
    } catch {
      message.error('生成推流地址失败');
    }
  };

  const statusTag = match ? (
    <Tag color={match.status === 'live' ? 'green' : match.status === 'finished' ? 'blue' : 'default'}>
      {match.status === 'live' ? '直播中' : match.status === 'finished' ? '已结束' : '未开始'}
    </Tag>
  ) : null;

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 100 }}>加载中...</div>;
  }

  if (!match) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Button onClick={() => window.location.href = '/admin/matches'}>
          <ArrowLeftOutlined /> 返回
        </Button>
      </div>
    );
  }

  const playerColumns = [
    { title: '球队', dataIndex: 'teamName', width: 80 },
    { title: '球员', dataIndex: 'playerName' },
    { title: '得分', dataIndex: 'points', sorter: (a: any, b: any) => a.points - b.points, width: 80 },
    { title: '篮板', dataIndex: 'rebounds', width: 80 },
    { title: '助攻', dataIndex: 'assists', width: 80 },
    { title: '抢断', dataIndex: 'steals', width: 80 },
    { title: '盖帽', dataIndex: 'blocks', width: 80 },
  ];

  return (
    <Layout style={{ minHeight: '100vh', background: '#000' }}>
      <Header style={{ background: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} type="text" onClick={() => window.history.back()} style={{ color: '#fff' }} />
          <Title level={4} style={{ color: '#fff', margin: 0 }}>
            {match.home_team_name} vs {match.away_team_name}
          </Title>
          {statusTag}
        </Space>
        <Space>
          <Link to={`/match/${matchId}/control`}>
            <Button icon={<ControlOutlined />}>操作端</Button>
          </Link>
          <Link to={`/match/${matchId}/dashboard`}>
            <Button icon={<DashboardOutlined />}>数据大屏</Button>
          </Link>
        </Space>
      </Header>

      <Content style={{ padding: 24, background: '#0a0a1a' }}>
        <Row gutter={24}>
          {/* Video Player */}
          <Col span={16}>
            <Card
              title={<><PlayCircleOutlined /> 直播画面</>}
              extra={
                <Space>
                  <Text type="secondary">推流地址: {match.push_stream_url || '未生成'}</Text>
                  <Button size="small" onClick={generateStream}>生成推流</Button>
                </Space>
              }
              style={{ background: '#141b2d', borderColor: '#333' }}
            >
              <video ref={videoRef} className="video-js vjs-default-skin" style={{ width: '100%', height: 'auto' }} />
              {!match.live_stream_url && (
                <div style={{ textAlign: 'center', padding: 100, color: '#666' }}>
                  <PlayCircleOutlined style={{ fontSize: 48 }} />
                  <p>暂无直播画面，请先生成推流地址</p>
                </div>
              )}
            </Card>
          </Col>

          {/* Stats Panel */}
          <Col span={8}>
            <Card title="📊 实时数据" style={{ background: '#141b2d', borderColor: '#333', color: '#fff' }}>
              {stats && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <Text style={{ color: '#ff4d4f', fontSize: 18 }}>{match.home_team_name}</Text>
                    <Text style={{ fontSize: 32, fontWeight: 'bold' }}>{stats.homeScore} : {stats.awayScore}</Text>
                    <Text style={{ color: '#1890ff', fontSize: 18 }}>{match.away_team_name}</Text>
                  </div>
                  <Divider style={{ borderColor: '#333' }} />
                  <Row gutter={[16, 16]}>
                    <Col span={12}>
                      <StatItem label="篮板" value={`${stats.home_rebounds || 0} - ${stats.away_rebounds || 0}`} />
                    </Col>
                    <Col span={12}>
                      <StatItem label="助攻" value={`${stats.home_assists || 0} - ${stats.away_assists || 0}`} />
                    </Col>
                    <Col span={12}>
                      <StatItem label="抢断" value={`${stats.home_steals || 0} - ${stats.away_steals || 0}`} />
                    </Col>
                    <Col span={12}>
                      <StatItem label="盖帽" value={`${stats.home_blocks || 0} - ${stats.away_blocks || 0}`} />
                    </Col>
                  </Row>
                </div>
              )}

              <Text type="secondary" style={{ fontSize: 12 }}>
                场馆: {match.venue || '-'}
              </Text>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>
                时间: {match.start_time ? dayjs(match.start_time).format('YYYY-MM-DD HH:mm') : '-'}
              </Text>
            </Card>
          </Col>
        </Row>

        {/* Tabs: Player Stats & Event Feed */}
        <Tabs
          defaultActiveKey="players"
          style={{ marginTop: 24 }}
          items={[
            {
              key: 'players',
              label: '🏆 球员数据',
              children: (
                <Table<PlayerStats>
                  dataSource={playerStats}
                  columns={playerColumns}
                  rowKey="playerId"
                  pagination={{ pageSize: 10 }}
                  size="small"
                />
              ),
            },
            {
              key: 'events',
              label: '⚡ 事件流',
              children: (
                <Table<any>
                  dataSource={events}
                  columns={[
                    { title: '时间', dataIndex: 'created_at', render: (t: string) => dayjs(t).format('HH:mm:ss'), width: 100 },
                    { title: '球员', dataIndex: 'player_name' },
                    { title: '球队', dataIndex: 'team_name', width: 100 },
                    {
                      title: '类型',
                      dataIndex: 'event_type',
                      render: (t: string) => <Tag color={getEventColor(t)}>{getEventTypeLabel(t)}</Tag>,
                      width: 100,
                    },
                    { title: '详情', dataIndex: 'points', render: (p: number) => p ? `+${p}分` : '-' },
                  ]}
                  pagination={{ pageSize: 20 }}
                  size="small"
                />
              ),
            },
          ]}
        />
      </Content>
    </Layout>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ textAlign: 'center', padding: 8 }}>
      <Text type="secondary" style={{ fontSize: 12 }}>{label}</Text>
      <div style={{ fontSize: 20, fontWeight: 'bold', marginTop: 4 }}>{value}</div>
    </div>
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
