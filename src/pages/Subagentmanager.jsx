/**
 * pages/SubAgentManager.jsx
 * Multiple sub-agents per village. Data in PG, geo in Mongo.
 * Shows expandable rows: Village → Sub-Agents table.
 * Includes commission tracking.
 */

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    Table, Card, Typography, Button, Space, Row, Col, Select,
    Modal, Form, Input, Switch, message, Divider, Descriptions,
    Tag, Popconfirm, Tabs, Badge, Progress, InputNumber,
    Statistic, Alert
} from 'antd';
import {
    TeamOutlined, EditOutlined, EyeOutlined, UserAddOutlined,
    UserOutlined, PhoneOutlined, LockOutlined, QuestionCircleOutlined,
    HomeOutlined, SearchOutlined, DollarOutlined, CameraOutlined, IdcardOutlined
} from '@ant-design/icons';

import {
    fetchNations, fetchStates, fetchDistricts, fetchMandals, fetchVillages,
    selectNation, selectState, selectDistrict, selectMandal,
} from '../store/slices/Geoslice';
import {
    fetchVillageSubAgents, addSubAgent, updateSubAgent, deleteSubAgent,
    fetchCommissions, addCommission, payCommission,
    clearAgentError, clearSaveSuccess,
} from '../store/slices/Agentslice';
import { ImageUploadBox } from '../components/ImageUploadBox';
import { readFile } from './Mandalagentmanager';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const SubAgentManager = () => {
    const dispatch = useDispatch();

    const {
        nations, states, districts, mandals, villages,
        selectedNationId, selectedStateId, selectedDistrictId, selectedMandalId,
        loading: geoLoading,
    } = useSelector((s) => s.geo);

    const { subAgents, commissions, loading: agentLoading, error: agentError, saveSuccess } = useSelector((s) => s.agents);

    const [searchText, setSearchText] = useState('');
    const [modalMode, setModalMode] = useState(null);   // 'add'|'edit'|'view'|'commission'
    const [activeVillage, setActiveVillage] = useState(null);
    const [activeAgent, setActiveAgent] = useState(null);
    const [activeTab, setActiveTab] = useState('info');
    const [form] = Form.useForm();
    const [commForm] = Form.useForm();

    const [imgUrl, setImgUrl] = useState(null);
    const [aadFront, setAadFront] = useState(null);
    const [aadBack, setAadBack] = useState(null);

    // ── Init ──────────────────────────────────────────────────────────────────
    useEffect(() => { dispatch(fetchNations()); }, [dispatch]);

    const handleNationChange = (id) => { dispatch(selectNation(id)); dispatch(fetchStates(id)); };
    const handleStateChange = (id) => { dispatch(selectState(id)); dispatch(fetchDistricts(id)); };
    const handleDistrictChange = (id) => { dispatch(selectDistrict(id)); dispatch(fetchMandals(id)); };
    const handleMandalChange = (id) => {
        dispatch(selectMandal(id));
        dispatch(fetchVillages(id));
    };

    const loadVillageAgents = useCallback(() => {
        villages.forEach((v) => dispatch(fetchVillageSubAgents(v._id)));
    }, [villages, dispatch]);

    useEffect(() => { if (villages.length) loadVillageAgents(); }, [villages]);

    // ── Toast ─────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (saveSuccess) {
            message.success('Saved');
            dispatch(clearSaveSuccess());
            closeModal();
            loadVillageAgents();
        }
    }, [saveSuccess]);

    useEffect(() => {
        if (agentError) { message.error(agentError); dispatch(clearAgentError()); }
    }, [agentError]);

    // ── Household capacity ────────────────────────────────────────────────────
    const getAssigned = (village) => {
        const agents = subAgents[village._id] || [];
        return agents.reduce((s, a) => s + (Number(a.house_holds) || 0), 0);
    };

    const getAvailable = (village) => {
        const agents = subAgents[village._id] || [];
        const assigned = agents.reduce((s, a) => s + (Number(a.house_holds) || 0), 0);
        const currentHH = activeAgent ? Number(activeAgent.house_holds) || 0 : 0;
        return village.house_count - (assigned - currentHH);
    };

    // ── Modal helpers ─────────────────────────────────────────────────────────
    const openAdd = (village) => {
        setActiveVillage(village); setActiveAgent(null);
        setModalMode('add'); setActiveTab('info');
        form.resetFields();
        setImgUrl(null); setAadFront(null); setAadBack(null);
    };

    const openEdit = (village, agent) => {
        setActiveVillage(village); setActiveAgent(agent);
        setModalMode('edit'); setActiveTab('info');
        form.setFieldsValue({
            name: agent.name, phone: agent.phone,
            username: agent.username, password: agent.password,
            houseHolds: agent.house_holds, active: agent.active,
        });
        setImgUrl(agent.image_path || null);
        setAadFront(agent.aadhaar_front || null);
        setAadBack(agent.aadhaar_back || null);
    };

    const openView = (village, agent) => {
        setActiveVillage(village); setActiveAgent(agent);
        setModalMode('view');
        dispatch(fetchCommissions(agent.id));
    };

    const openCommission = (agent) => {
        setActiveAgent(agent);
        setModalMode('commission');
        commForm.resetFields();
        dispatch(fetchCommissions(agent.id));
    };

    const closeModal = () => {
        setModalMode(null); setActiveVillage(null); setActiveAgent(null);
    };

    // ── Save sub-agent ────────────────────────────────────────────────────────
    const handleSave = async (values) => {
        const payload = {
            name: values.name, phone: values.phone,
            username: values.username, password: values.password,
            houseHolds: values.houseHolds, active: values.active ?? true,
            image: imgUrl, AadhaarFront: aadFront, AadhaarBack: aadBack,
        };
        if (modalMode === 'add') {
            dispatch(addSubAgent({ villageId: activeVillage._id, payload }));
        } else {
            dispatch(updateSubAgent({ villageId: activeVillage._id, agentCode: activeAgent.agent_code, payload }));
        }
    };

    const handleDelete = (villageId, agentCode) => {
        dispatch(deleteSubAgent({ villageId, agentCode }));
        message.success('Sub-agent removed');
    };

    // ── Add commission ────────────────────────────────────────────────────────
    const handleAddCommission = async (values) => {
        await dispatch(addCommission({ agentId: activeAgent.id, ...values }));
        message.success('Commission recorded');
        commForm.resetFields();
        dispatch(fetchCommissions(activeAgent.id));
    };

    // ── Filtered villages ─────────────────────────────────────────────────────
    const filteredVillages = useMemo(
        () => villages.filter((v) => v.name.toLowerCase().includes(searchText.toLowerCase())),
        [villages, searchText]
    );

    // ── Village table columns ─────────────────────────────────────────────────
    const villageColumns = [
        {
            title: 'VILLAGE', dataIndex: 'name',
            render: (t) => <Text style={{ fontWeight: 600, fontSize: 15 }}>{t}</Text>,
        },
        {
            title: 'SUB-AGENTS', dataIndex: '_id',
            render: (id) => <Badge count={(subAgents[id] || []).length} color="#2563eb" showZero />,
            width: 130,
        },
        {
            title: 'TOTAL HOUSES', dataIndex: 'house_count', width: 140,
            render: (c) => <Text strong>{c}</Text>,
        },
        {
            title: 'ASSIGNMENT',
            render: (v) => {
                const assigned = getAssigned(v);
                const pct = v.house_count ? Math.min(100, Math.round((assigned / v.house_count) * 100)) : 0;
                return (
                    <Space direction="vertical" size={2} style={{ width: '100%' }}>
                        <Progress percent={pct} size="small" strokeColor={pct >= 100 ? '#16a34a' : '#2563eb'} />
                        <Text style={{ fontSize: 12 }}>
                            {assigned} / {v.house_count} assigned
                        </Text>
                    </Space>
                );
            },
        },
        {
            title: 'ACTION', align: 'right', width: 150,
            render: (v) => (
                <Button type="primary" ghost size="small" icon={<UserAddOutlined />}
                    onClick={() => openAdd(v)}>
                    Add Sub-Agent
                </Button>
            ),
        },
    ];

    // ── Expanded sub-agent columns ────────────────────────────────────────────
    const subAgentColumns = (village) => [
        { title: 'NAME', dataIndex: 'name', render: (t) => <Text strong>{t}</Text> },
        { title: 'AGENT CODE', dataIndex: 'agent_code', render: (t) => <Text code style={{ fontSize: 12 }}>{t}</Text> },
        { title: 'PHONE', dataIndex: 'phone', render: (t) => <><PhoneOutlined style={{ marginRight: 4 }} />{t}</> },
        { title: 'HH', dataIndex: 'house_holds', render: (t) => <Text strong>{t}</Text>, width: 70 },
        { title: 'SURVEYS', dataIndex: 'survey_count', render: (t) => t || 0, width: 90 },
        {
            title: 'STATUS',
            render: (a) => a.active ? <Tag color="green">ACTIVE</Tag> : <Tag color="red">SUSPENDED</Tag>,
            width: 110,
        },
        {
            title: 'ACTION', align: 'right', width: 180,
            render: (a) => (
                <Space size="small">
                    <Button type="text" icon={<EyeOutlined style={{ color: '#2563eb' }} />}
                        onClick={() => openView(village, a)} />
                    <Button type="text" icon={<EditOutlined />}
                        onClick={() => openEdit(village, a)} />
                    <Button type="text" icon={<DollarOutlined style={{ color: '#16a34a' }} />}
                        onClick={() => openCommission(a)} title="Commission" />
                    <Popconfirm title="Remove sub-agent?" onConfirm={() => handleDelete(village._id, a.agent_code)}
                        icon={<QuestionCircleOutlined style={{ color: 'red' }} />}>
                        <Button type="text" danger size="small">Remove</Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const agentCommissions = activeAgent ? (commissions[activeAgent.id] || []) : [];

    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f0f2f5', overflow: 'hidden' }}>

            {/* ── Header ── */}
            <div style={{ padding: '24px 24px 0' }}>
                <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
                    <Col>
                        <Title level={3} style={{ margin: 0 }}>
                            <TeamOutlined /> Sub-Agent Manager
                        </Title>
                    </Col>
                    <Col>
                        <Input placeholder="Search village..."
                            prefix={<SearchOutlined />} style={{ width: 280 }}
                            onChange={(e) => setSearchText(e.target.value)} />
                    </Col>
                </Row>

                <Card style={{ marginBottom: 16, borderRadius: 8 }}>
                    <Space wrap size="large" align="end">
                        {[
                            { label: 'NATION', items: nations, disabled: false, onChange: handleNationChange },
                            { label: 'STATE', items: states, disabled: !selectedNationId, onChange: handleStateChange },
                            { label: 'DISTRICT', items: districts, disabled: !selectedStateId, onChange: handleDistrictChange },
                            { label: 'MANDAL', items: mandals, disabled: !selectedDistrictId, onChange: handleMandalChange },
                        ].map(({ label, items, disabled, onChange }) => (
                            <div key={label} style={{ width: 160 }}>
                                <Text type="secondary" style={{ fontSize: 11 }}>{label}</Text>
                                <Select placeholder={`Select ${label}`} style={{ width: '100%' }}
                                    disabled={disabled} onChange={onChange} showSearch optionFilterProp="children">
                                    {items.map((i) => <Select.Option key={i._id} value={i._id}>{i.name}</Select.Option>)}
                                </Select>
                            </div>
                        ))}
                        <Button type="primary" icon={<SearchOutlined />} disabled={!selectedMandalId}
                            onClick={() => dispatch(fetchVillages(selectedMandalId))}>
                            Load Villages
                        </Button>
                    </Space>
                </Card>
            </div>

            {/* ── Table ── */}
            <div style={{ flex: 1, padding: '0 24px 24px', overflow: 'hidden' }}>
                <Table
                    loading={geoLoading.villages || agentLoading.subAgents}
                    columns={villageColumns}
                    dataSource={filteredVillages}
                    rowKey="_id"
                    pagination={false}
                    size="small"
                    scroll={{ y: 'calc(100vh - 360px)' }}
                    expandable={{
                        expandedRowRender: (village) => (
                            <Table
                                dataSource={subAgents[village._id] || []}
                                columns={subAgentColumns(village)}
                                rowKey="agent_code"
                                pagination={false}
                                size="small"
                                style={{ background: '#fafafa' }}
                            />
                        ),
                    }}
                />
            </div>

            {/* ══ VIEW MODAL ══ */}
            <Modal
                title={<b><EyeOutlined /> Sub-Agent — {activeAgent?.name}</b>}
                open={modalMode === 'view'}
                onCancel={closeModal}
                footer={<Button onClick={closeModal}>Close</Button>}
                width={660} destroyOnClose
            >
                {activeAgent && (
                    <>
                        <Row gutter={16} style={{ marginBottom: 16 }}>
                            {[
                                { label: 'Photo', src: activeAgent.image_path, round: true },
                                { label: 'Aadhaar Front', src: activeAgent.aadhaar_front, round: false },
                                { label: 'Aadhaar Back', src: activeAgent.aadhaar_back, round: false },
                            ].map(({ label, src, round }) => (
                                <Col span={8} key={label} style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase' }}>{label}</div>
                                    {src ? (
                                        <img src={src} alt={label}
                                            style={{ width: round ? 80 : '100%', height: 80, borderRadius: round ? '50%' : 8, objectFit: 'cover', border: '2px solid #e2e8f0' }} />
                                    ) : (
                                        <div style={{ height: 80, background: '#f1f5f9', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Text type="secondary" style={{ fontSize: 12 }}>No image</Text>
                                        </div>
                                    )}
                                </Col>
                            ))}
                        </Row>
                        <Divider style={{ margin: '12px 0' }} />
                        <Descriptions bordered size="small" column={2}>
                            <Descriptions.Item label="Agent Code" span={2}><Text code>{activeAgent.agent_code}</Text></Descriptions.Item>
                            <Descriptions.Item label="Name">{activeAgent.name}</Descriptions.Item>
                            <Descriptions.Item label="Phone">{activeAgent.phone}</Descriptions.Item>
                            <Descriptions.Item label="Username">{activeAgent.username}</Descriptions.Item>
                            <Descriptions.Item label="Password"><Text code>{activeAgent.password}</Text></Descriptions.Item>
                            <Descriptions.Item label="Assigned HH">{activeAgent.house_holds}</Descriptions.Item>
                            <Descriptions.Item label="Survey Count">{activeAgent.survey_count || 0}</Descriptions.Item>
                            <Descriptions.Item label="Village">{activeVillage?.name}</Descriptions.Item>
                            <Descriptions.Item label="Token"><Text code>{activeAgent.token || '—'}</Text></Descriptions.Item>
                            <Descriptions.Item label="Status">
                                {activeAgent.active ? <Tag color="green">ACTIVE</Tag> : <Tag color="red">SUSPENDED</Tag>}
                            </Descriptions.Item>
                        </Descriptions>

                        {agentCommissions.length > 0 && (
                            <>
                                <Divider>Commissions</Divider>
                                <Row gutter={16} style={{ marginBottom: 8 }}>
                                    <Col span={8}>
                                        <Statistic title="Total" value={agentCommissions.length} />
                                    </Col>
                                    <Col span={8}>
                                        <Statistic
                                            title="Total Amount"
                                            value={agentCommissions.reduce((s, c) => s + parseFloat(c.amount || 0), 0).toFixed(2)}
                                            prefix="₹"
                                        />
                                    </Col>
                                    <Col span={8}>
                                        <Statistic
                                            title="Pending"
                                            value={agentCommissions.filter((c) => c.status === 'pending').length}
                                        />
                                    </Col>
                                </Row>
                            </>
                        )}
                    </>
                )}
            </Modal>

            {/* ══ ADD / EDIT MODAL ══ */}
            <Modal
                title={
                    modalMode === 'add'
                        ? <b><UserAddOutlined /> Add Sub-Agent — {activeVillage?.name}</b>
                        : <b><EditOutlined /> Edit Sub-Agent</b>
                }
                open={modalMode === 'add' || modalMode === 'edit'}
                onCancel={closeModal}
                onOk={() => form.submit()}
                confirmLoading={agentLoading.save}
                width={600} destroyOnClose
            >
                <Form form={form} layout="vertical" onFinish={handleSave}>
                    <Tabs activeKey={activeTab} onChange={setActiveTab} size="small">
                        <TabPane tab="Basic Info" key="info" forceRender>
                            <Row gutter={16}>
                                <Col span={12}>
                                    <Form.Item name="name" label="Full Name" rules={[{ required: true }]}>
                                        <Input prefix={<UserOutlined />} />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item name="phone" label="Phone" rules={[{ required: true, len: 10 }]}>
                                        <Input prefix={<PhoneOutlined />} maxLength={10} />
                                    </Form.Item>
                                </Col>
                            </Row>
                            <Row gutter={16}>
                                <Col span={12}>
                                    <Form.Item name="username" label="Username" rules={[{ required: true }]}>
                                        <Input prefix={<UserOutlined />} />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item name="password" label="Password" rules={[{ required: true }]}>
                                        <Input.Password prefix={<LockOutlined />} />
                                    </Form.Item>
                                </Col>
                            </Row>
                            <Form.Item
                                name="houseHolds"
                                label={
                                    <Space>
                                        Assigned Households
                                        <Tag color="blue">Available: {activeVillage ? getAvailable(activeVillage) : 0}</Tag>
                                    </Space>
                                }
                                rules={[
                                    { required: true, message: 'Enter household count' },
                                    {
                                        validator: (_, value) =>
                                            !value || !activeVillage || value <= getAvailable(activeVillage)
                                                ? Promise.resolve()
                                                : Promise.reject(new Error(`Max: ${getAvailable(activeVillage)}`))
                                    },
                                ]}
                            >
                                <InputNumber prefix={<HomeOutlined />} min={0}
                                    max={activeVillage ? getAvailable(activeVillage) : undefined}
                                    style={{ width: '100%' }} />
                            </Form.Item>
                            <Form.Item name="active" label="Status" valuePropName="checked" initialValue={true}>
                                <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
                            </Form.Item>
                        </TabPane>

                        <TabPane tab="Photos & ID" key="photos" forceRender>
                            <Row gutter={16}>
                                <Col span={8}>
                                    <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 6 }}>Agent Photo *</div>
                                    <ImageUploadBox label="Upload Photo" imageUrl={imgUrl}
                                        onChange={(e) => readFile(e, setImgUrl)}
                                        icon={<CameraOutlined style={{ fontSize: 28, color: '#94a3b8' }} />} />
                                </Col>
                                <Col span={8}>
                                    <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 6 }}>Aadhaar Front *</div>
                                    <ImageUploadBox label="Aadhaar Front" imageUrl={aadFront}
                                        onChange={(e) => readFile(e, setAadFront)}
                                        icon={<IdcardOutlined style={{ fontSize: 28, color: '#94a3b8' }} />} />
                                </Col>
                                <Col span={8}>
                                    <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 6 }}>Aadhaar Back *</div>
                                    <ImageUploadBox label="Aadhaar Back" imageUrl={aadBack}
                                        onChange={(e) => readFile(e, setAadBack)}
                                        icon={<IdcardOutlined style={{ fontSize: 28, color: '#94a3b8' }} />} />
                                </Col>
                            </Row>
                        </TabPane>
                    </Tabs>
                </Form>
            </Modal>

            {/* ══ COMMISSION MODAL ══ */}
            <Modal
                title={<b><DollarOutlined /> Commissions — {activeAgent?.name}</b>}
                open={modalMode === 'commission'}
                onCancel={closeModal}
                footer={<Button onClick={closeModal}>Close</Button>}
                width={600} destroyOnClose
            >
                {activeAgent && (
                    <>
                        <Form form={commForm} layout="inline" onFinish={handleAddCommission}
                            style={{ marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                            <Form.Item name="orderId" rules={[{ required: true }]}>
                                <Input placeholder="Order ID" style={{ width: 160 }} />
                            </Form.Item>
                            <Form.Item name="amount" rules={[{ required: true }]}>
                                <InputNumber placeholder="Amount ₹" min={0} style={{ width: 120 }} />
                            </Form.Item>
                            <Form.Item name="notes">
                                <Input placeholder="Notes (optional)" style={{ width: 160 }} />
                            </Form.Item>
                            <Form.Item>
                                <Button type="primary" htmlType="submit" icon={<DollarOutlined />}>Add</Button>
                            </Form.Item>
                        </Form>

                        <Table
                            dataSource={agentCommissions}
                            rowKey="id"
                            size="small"
                            pagination={{ pageSize: 5 }}
                            columns={[
                                { title: 'Order', dataIndex: 'order_id', width: 130 },
                                { title: 'Amount', dataIndex: 'amount', render: (v) => `₹${parseFloat(v).toFixed(2)}` },
                                {
                                    title: 'Status', dataIndex: 'status',
                                    render: (s) => <Tag color={s === 'paid' ? 'green' : s === 'cancelled' ? 'red' : 'orange'}>{s.toUpperCase()}</Tag>,
                                },
                                { title: 'Date', dataIndex: 'created_at', render: (d) => new Date(d).toLocaleDateString() },
                                {
                                    title: 'Action',
                                    render: (r) => r.status === 'pending'
                                        ? <Button size="small" type="primary" ghost
                                            onClick={() => dispatch(payCommission(r.id))}>Mark Paid</Button>
                                        : null,
                                },
                            ]}
                        />
                    </>
                )}
            </Modal>
        </div>
    );
};

export default SubAgentManager;