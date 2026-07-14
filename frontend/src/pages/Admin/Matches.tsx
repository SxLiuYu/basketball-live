import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  message,
  Typography,
  Card,
  Result,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, ControlOutlined, DashboardOutlined } from '@ant-design/icons';
import api from '../../utils/api';
import type { ColumnsType } from 'antd/es/table';

const { Title } = Typography;

interface Team {
  id: number;
  name: string;
  logo_url: string | null;
}

interface Match {
  id: number;
  home_team_id: number;
  away_team_id: number;
  status: string;
  start_time: string | null;
  venue: string | null;
  live_stream_url: string | null;
  push_stream_url: string | null;
  home_team_name?: string;
  away_team_name?: string;
  home_logo_url?: string;
  away_logo_url?: string;
}

export default function AdminMatches() {
  const navigate = useNavigate();
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchMatches();
    fetchTeams();
  }, []);

  const fetchMatches = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/matches');
      setMatches(res.data.data);
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || '无法连接到服务器';
      setError(msg);
      message.error('获取比赛列表失败: ' + msg);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeams = async () => {
    try {
      const res = await api.get('/teams');
      setTeams(res.data.data);
    } catch {
      // ignore
    }
  };

  const handleCreate = () => {
    setEditingMatch(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (match: Match) => {
    setEditingMatch(match);
    form.setFieldsValue({
      homeTeamId: match.home_team_id,
      awayTeamId: match.away_team_id,
      venue: match.venue,
      startTime: match.start_time ? match.start_time.substring(0, 16) : '',
      liveStreamUrl: match.live_stream_url,
      status: match.status,
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这场比赛吗？相关数据也将被删除。',
      onOk: async () => {
        try {
          await api.delete(`/matches/${id}`);
          message.success('删除成功');
          fetchMatches();
        } catch {
          message.error('删除失败');
        }
      },
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingMatch) {
        await api.put(`/matches/${editingMatch.id}`, values);
        message.success('更新成功');
      } else {
        await api.post('/matches', values);
        message.success('创建成功');
      }
      setModalVisible(false);
      fetchMatches();
    } catch {
      message.error('操作失败');
    }
  };

  const getStatusTag = (status: string) => {
    const config: Record<string, { color: string; text: string }> = {
      pending: { color: 'default', text: '未开始' },
      live: { color: 'success', text: '直播中' },
      finished: { color: 'processing', text: '已结束' },
    };
    const c = config[status] || config.pending;
    return <Tag color={c.color}>{c.text}</Tag>;
  };

  const columns: ColumnsType<Match> = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 60,
    },
    {
      title: '对阵',
      dataIndex: 'home_team_name',
      render: (_, record) => (
        <Space>
          <span>{record.home_team_name}</span>
          <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>VS</span>
          <span>{record.away_team_name}</span>
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      render: (status: string) => getStatusTag(status),
    },
    {
      title: '时间',
      dataIndex: 'start_time',
      render: (t: string) => t ? new Date(t).toLocaleString('zh-CN') : '-',
    },
    {
      title: '场馆',
      dataIndex: 'venue',
      render: (v: string) => v || '-',
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/match/${record.id}`)}
          >
            详情
          </Button>
          <Button
            type="link"
            size="small"
            icon={<ControlOutlined />}
            onClick={() => navigate(`/match/${record.id}/control`)}
          >
            操作
          </Button>
          <Button
            type="link"
            size="small"
            icon={<DashboardOutlined />}
            onClick={() => navigate(`/match/${record.id}/dashboard`)}
          >
            大屏
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <Title level={3}>比赛管理</Title>
          <Space>
            {error && <Button onClick={() => { fetchMatches(); fetchTeams(); }}>重试</Button>}
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              创建比赛
            </Button>
          </Space>
        </div>

        {error ? (
          <Result
            status="error"
            title="数据加载失败"
            subTitle={error}
            extra={
              <Button type="primary" onClick={() => { fetchMatches(); fetchTeams(); }}>
                重新加载
              </Button>
            }
          />
        ) : (
          <Table<Match>
            columns={columns}
            dataSource={matches}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 10 }}
          />
        )}
      </Card>

      <Modal
        title={editingMatch ? '编辑比赛' : '创建比赛'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item name="homeTeamId" label="主队" rules={[{ required: true, message: '请选择主队' }]}>
            <Select placeholder="选择主队">
              {teams.map((t) => (
                <Select.Option key={t.id} value={t.id}>{t.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="awayTeamId" label="客队" rules={[{ required: true, message: '请选择客队' }]}>
            <Select placeholder="选择客队">
              {teams.map((t) => (
                <Select.Option key={t.id} value={t.id}>{t.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="startTime" label="比赛时间">
            <Input type="datetime-local" />
          </Form.Item>
          <Form.Item name="venue" label="场馆">
            <Input placeholder="输入场馆名称" />
          </Form.Item>
          <Form.Item name="liveStreamUrl" label="直播播放地址">
            <Input placeholder="HLS/FLV播放地址" />
          </Form.Item>
          {!editingMatch && (
            <Form.Item name="status" label="状态" initialValue="pending">
              <Select>
                <Select.Option value="pending">未开始</Select.Option>
                <Select.Option value="live">直播中</Select.Option>
                <Select.Option value="finished">已结束</Select.Option>
              </Select>
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
}
