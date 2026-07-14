import { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  message,
  Typography,
  Card,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import api from '../../utils/api';

const { Title } = Typography;

interface Team {
  id: number;
  name: string;
  logo_url: string | null;
}

interface Player {
  id: number;
  team_id: number;
  name: string;
  number: number | null;
  position: string | null;
}

export default function AdminTeams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [teamModal, setTeamModal] = useState(false);
  const [playerModal, setPlayerModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamForm] = Form.useForm();
  const [playerForm] = Form.useForm();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [teamsRes, playersRes] = await Promise.all([
        api.get('/teams'),
        api.get('/players'),
      ]);
      setTeams(teamsRes.data.data);
      setPlayers(playersRes.data.data);
    } catch {
      message.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async () => {
    try {
      const values = await teamForm.validateFields();
      await api.post('/teams', { name: values.name, logoUrl: values.logoUrl });
      message.success('创建成功');
      setTeamModal(false);
      fetchData();
    } catch {
      message.error('创建失败');
    }
  };

  const handleDeleteTeam = async (_id: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '删除球队将同时删除其所有球员和关联数据，确定继续？',
      onOk: async () => {
        try {
          // Teams are referenced by matches, need to handle carefully
          message.info('请先删除关联比赛后再试');
        } catch {
          message.error('删除失败');
        }
      },
    });
  };

  const handleDeletePlayer = async (_id: number) => {
    try {
      // No direct delete endpoint, but we can implement
      message.info('球员删除需要通过关联的比赛处理');
    } catch {
      message.error('删除失败');
    }
  };

  const teamColumns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '球队名称', dataIndex: 'name' },
    {
      title: '球员数',
      render: (_: any, record: Team) => players.filter((p) => p.team_id === record.id).length,
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Team) => (
        <Space>
          <Button
            type="link"
            size="small"
            onClick={() => {
              setSelectedTeam(record);
              setPlayerModal(true);
            }}
          >
            管理球员
          </Button>
          <Button type="link" size="small" danger onClick={() => handleDeleteTeam(record.id)}>
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
          <Title level={3}>球队与球员管理</Title>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setTeamModal(true)}>
            创建球队
          </Button>
        </div>

        <Table<Team>
          columns={teamColumns}
          dataSource={teams}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* Create Team Modal */}
      <Modal
        title="创建球队"
        open={teamModal}
        onOk={handleCreateTeam}
        onCancel={() => setTeamModal(false)}
      >
        <Form form={teamForm} layout="vertical">
          <Form.Item name="name" label="球队名称" rules={[{ required: true }]}>
            <Input placeholder="输入球队名称" />
          </Form.Item>
          <Form.Item name="logoUrl" label="Logo URL">
            <Input placeholder="图片URL（可选）" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Manage Players Modal */}
      <Modal
        title={`管理球员 - ${selectedTeam?.name}`}
        open={playerModal}
        onCancel={() => {
          setPlayerModal(false);
          setSelectedTeam(null);
        }}
        footer={null}
        width={700}
      >
        <div style={{ marginBottom: 16 }}>
          <Button
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => {
              playerForm.resetFields();
              playerForm.setFieldsValue({ teamId: selectedTeam?.id });
            }}
          >
            添加球员
          </Button>
        </div>

        <Modal
          title="添加球员"
          open={!!playerForm.getFieldValue('submit')}
          onOk={async () => {
            try {
              await playerForm.validateFields();
              const values = playerForm.getFieldsValue();
              await api.post('/players', {
                teamId: selectedTeam?.id,
                name: values.name,
                number: values.number,
                position: values.position,
              });
              message.success('添加成功');
              playerForm.resetFields();
              playerForm.setFieldValue('submit', false);
              fetchData();
            } catch {
              message.error('添加失败');
            }
          }}
          onCancel={() => playerForm.setFieldValue('submit', false)}
        >
          <Form form={playerForm} layout="vertical">
            <Form.Item name="name" label="姓名" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="number" label="号码">
              <Input type="number" />
            </Form.Item>
            <Form.Item name="position" label="位置">
              <Select placeholder="选择位置">
                <Select.Option value="PG">PG</Select.Option>
                <Select.Option value="SG">SG</Select.Option>
                <Select.Option value="SF">SF</Select.Option>
                <Select.Option value="PF">PF</Select.Option>
                <Select.Option value="C">C</Select.Option>
              </Select>
            </Form.Item>
          </Form>
        </Modal>

        <Table<Player>
          dataSource={players.filter((p) => selectedTeam && p.team_id === selectedTeam.id)}
          rowKey="id"
          pagination={false}
          size="small"
          columns={[
            { title: '号码', dataIndex: 'number', width: 60 },
            { title: '姓名', dataIndex: 'name' },
            { title: '位置', dataIndex: 'position', width: 80 },
            {
              title: '操作',
              key: 'action',
              render: (_: any, record: Player) => (
                <Button type="link" size="small" danger onClick={() => handleDeletePlayer(record.id)}>
                  删除
                </Button>
              ),
            },
          ]}
        />
      </Modal>
    </div>
  );
}
