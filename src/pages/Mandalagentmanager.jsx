/**
 * pages/MandalAgentManager.jsx
 * One agent per mandal. Agent data stored in PG; geo in Mongo.
 * Uses Redux slices: geoSlice + agentSlice.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    Table, Card, Typography, Button, Space, Row, Col, Select,
    Modal, Form, Input, Switch, message, Divider, Descriptions,
    Tag, Popconfirm, Tabs
} from 'antd';
import {
    TeamOutlined, EditOutlined, EyeOutlined, PlusOutlined,
    UserOutlined, PhoneOutlined, LockOutlined, QuestionCircleOutlined,
    ReloadOutlined, CameraOutlined, IdcardOutlined, SearchOutlined
} from '@ant-design/icons';

import {
    fetchNations, fetchStates, fetchDistricts, fetchMandals,
    selectNation, selectState, selectDistrict, selectMandal,
} from '../store/slices/Geoslice';
import {
    fetchMandalAgent, addMandalAgent, updateMandalAgent, deleteMandalAgent,
    clearAgentError, clearSaveSuccess,
} from '../store/slices/Agentslice';
import { ImageUploadBox } from '../components/ImageUploadBox';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const MandalAgentManager = () => {
    const dispatch = useDispatch();

    // ── Store ─────────────────────────────────────────────────────────────────
    const {
        nations, states, districts, mandals,
        selectedNationId, selectedStateId, selectedDistrictId, selectedMandalId,
        loading: geoLoading,
    } = useSelector((s) => s.geo);

    const { mandalAgents, loading: agentLoading, error: agentError, saveSuccess } = useSelector((s) => s.agents);

    // ── Local UI state ────────────────────────────────────────────────────────
    const [searchText, setSearchText] = useState('');
    const [modalMode, setModalMode] = useState(null); // 'add' | 'edit' | 'view'
    const [activeMandal, setActiveMandal] = useState(null);
    const [activeTab, setActiveTab] = useState('info');
    const [form] = Form.useForm();

    // images
    const [imgUrl, setImgUrl] = useState(null);
    const [aadFront, setAadFront] = useState(null);
    const [aadBack, setAadBack] = useState(null);

    // ── Bootstrap nations ─────────────────────────────────────────────────────
    useEffect(() => { dispatch(fetchNations()); }, [dispatch]);

    // ── Cascade fetches ───────────────────────────────────────────────────────
    const handleNationChange = (id) => {
        dispatch(selectNation(id));
        dispatch(fetchStates(id));
    };
    const handleStateChange = (id) => {
        dispatch(selectState(id));
        dispatch(fetchDistricts(id));
    };
    const handleDistrictChange = (id) => {
        dispatch(selectDistrict(id));
        dispatch(fetchMandals(id));
    };

    // Fetch mandal agent when mandal changes
    const handleMandalChange = (id) => {
        dispatch(selectMandal(id));
    };

    // Refresh table: load agent for every visible mandal
    const loadAgents = useCallback(() => {
        mandals.forEach((m) => dispatch(fetchMandalAgent(m._id)));
    }, [mandals, dispatch]);

    useEffect(() => { if (mandals.length) loadAgents(); }, [mandals]);

    // ── Save success toast ────────────────────────────────────────────────────
    useEffect(() => {
        if (saveSuccess) {
            message.success('Saved successfully');
            dispatch(clearSaveSuccess());
            closeModal();
            loadAgents();
        }
    }, [saveSuccess]);

    useEffect(() => {
        if (agentError) { message.error(agentError); dispatch(clearAgentError()); }
    }, [agentError]);

    // ── Modal helpers ─────────────────────────────────────────────────────────
    const openAdd = (mandal) => {
        setActiveMandal(mandal);
        setModalMode('add');
        setActiveTab('info');
        form.resetFields();
        setImgUrl(null); setAadFront(null); setAadBack(null);
    };

    const openEdit = (mandal, agent) => {
        setActiveMandal(mandal);
        setModalMode('edit');
        setActiveTab('info');
        form.setFieldsValue({
            name: agent.name, phone: agent.phone,
            username: agent.username, password: agent.password,
            status: agent.active,
        });
        setImgUrl(agent.image_path || null);
        setAadFront(agent.aadhaar_front || null);
        setAadBack(agent.aadhaar_back || null);
    };

    const openView = (mandal) => {
        setActiveMandal(mandal);
        setModalMode('view');
    };

    const closeModal = () => { setModalMode(null); setActiveMandal(null); };

    // ── Save ──────────────────────────────────────────────────────────────────
    const handleSave = async (values) => {
        const payload = {
            name: values.name, phone: values.phone,
            username: values.username, password: values.password,
            status: values.status ?? true,
            image: imgUrl,
            AadhaarFront: aadFront,
            AadhaarBack: aadBack,
        };
        if (modalMode === 'add') {
            dispatch(addMandalAgent({ mandalId: activeMandal._id, payload }));
        } else {
            dispatch(updateMandalAgent({ mandalId: activeMandal._id, payload }));
        }
    };

    const handleDelete = (mandalId) => {
        dispatch(deleteMandalAgent(mandalId));
        message.success('Agent removed');
    };

    // ── Table data: join mandals with their agents ─────────────────────────────
    const tableData = mandals
        .filter((m) => m.name.toLowerCase().includes(searchText.toLowerCase()))
        .map((m) => ({ ...m, agent: mandalAgents[m._id] || null }));

    const columns = [
        {
            title: 'MANDAL', dataIndex: 'name', key: 'name',
            render: (t) => <Text style={{ fontWeight: 600, fontSize: 15 }}>{t}</Text>,
        },
        {
            title: 'AGENT ID', key: 'agentId',
            render: (r) => r.agent
                ? <Text code style={{ fontSize: 13 }}>{r.agent.agent_code}</Text>
                : <Tag color="default">Unassigned</Tag>,
        },
        {
            title: 'AGENT NAME', key: 'name2',
            render: (r) => r.agent
                ? <Text style={{ fontWeight: 700 }}>{r.agent.name}</Text>
                : null,
        },
        {
            title: 'PHONE', key: 'phone',
            render: (r) => r.agent
                ? <><PhoneOutlined style={{ marginRight: 4 }} />{r.agent.phone}</>
                : null,
        },
        {
            title: 'STATUS', key: 'status',
            render: (r) => r.agent
                ? r.agent.active
                    ? <Tag color="green">ACTIVE</Tag>
                    : <Tag color="red">SUSPENDED</Tag>
                : null,
        },
        {
            title: 'ACTION', key: 'action', align: 'center',
            render: (r) => (
                <Space size="small">
                    {r.agent ? (
                        <>
                            <Button type="text" icon={<EyeOutlined style={{ color: '#2563eb' }} />}
                                onClick={() => openView(r)} title="View" />
                            <Button type="text" icon={<EditOutlined />}
                                onClick={() => openEdit(r, r.agent)} title="Edit" />
                            <Popconfirm
                                title="Remove this agent?"
                                onConfirm={() => handleDelete(r._id)}
                                icon={<QuestionCircleOutlined style={{ color: 'red' }} />}
                            >
                                <Button type="text" danger size="small">Remove</Button>
                            </Popconfirm>
                        </>
                    ) : (
                        <Button type="primary" ghost size="small" icon={<PlusOutlined />}
                            onClick={() => openAdd(r)}>
                            Assign Agent
                        </Button>
                    )}
                </Space>
            ),
        },
    ];

    const viewAgent = activeMandal?.agent;

    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f0f2f5', overflow: 'hidden' }}>

            {/* ── Header ── */}
            <div style={{ padding: '24px 24px 0' }}>
                <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
                    <Col>
                        <Title level={3} style={{ margin: 0 }}>
                            <TeamOutlined /> Mandal Agent Manager
                        </Title>
                    </Col>
                    <Col>
                        <Input
                            placeholder="Search mandal..."
                            prefix={<SearchOutlined />}
                            style={{ width: 250 }}
                            onChange={(e) => setSearchText(e.target.value)}
                        />
                    </Col>
                </Row>

                <Card style={{ marginBottom: 16, borderRadius: 8 }}>
                    <Space wrap size="middle">
                        <div style={{ width: 180 }}>
                            <Text type="secondary" style={{ fontSize: 11 }}>NATION</Text>
                            <Select placeholder="Select Nation" style={{ width: '100%' }}
                                onChange={handleNationChange} showSearch optionFilterProp="children">
                                {nations.map((n) => <Select.Option key={n._id} value={n._id}>{n.name}</Select.Option>)}
                            </Select>
                        </div>
                        <div style={{ width: 180 }}>
                            <Text type="secondary" style={{ fontSize: 11 }}>STATE</Text>
                            <Select placeholder="Select State" style={{ width: '100%' }}
                                disabled={!selectedNationId} onChange={handleStateChange}
                                showSearch optionFilterProp="children">
                                {states.map((s) => <Select.Option key={s._id} value={s._id}>{s.name}</Select.Option>)}
                            </Select>
                        </div>
                        <div style={{ width: 180 }}>
                            <Text type="secondary" style={{ fontSize: 11 }}>DISTRICT</Text>
                            <Select placeholder="Select District" style={{ width: '100%' }}
                                disabled={!selectedStateId} onChange={handleDistrictChange}
                                showSearch optionFilterProp="children">
                                {districts.map((d) => <Select.Option key={d._id} value={d._id}>{d.name}</Select.Option>)}
                            </Select>
                        </div>
                        <Button icon={<ReloadOutlined />} style={{ marginTop: 20 }}
                            disabled={!selectedDistrictId} onClick={loadAgents}>
                            Refresh
                        </Button>
                    </Space>
                </Card>
            </div>

            {/* ── Table ── */}
            <div style={{ flex: 1, padding: '0 24px 24px', overflow: 'hidden' }}>
                <Card bodyStyle={{ padding: 0 }} style={{ height: '100%', borderRadius: 8, overflow: 'hidden' }}>
                    <Table
                        loading={geoLoading.mandals || agentLoading.mandalAgent}
                        columns={columns}
                        dataSource={tableData}
                        rowKey="_id"
                        pagination={false}
                        size="small"
                        scroll={{ y: 'calc(100vh - 320px)' }}
                    />
                </Card>
            </div>

            {/* ── VIEW MODAL ── */}
            <Modal
                title={<b><EyeOutlined /> Agent Details — {activeMandal?.name}</b>}
                open={modalMode === 'view'}
                onCancel={closeModal}
                footer={<Button onClick={closeModal}>Close</Button>}
                width={620}
                destroyOnClose
            >
                {viewAgent && (
                    <>
                        <Row gutter={16} style={{ marginBottom: 16 }}>
                            {[
                                { label: 'Agent Photo', src: viewAgent.image_path, round: true },
                                { label: 'Aadhaar Front', src: viewAgent.aadhaar_front, round: false },
                                { label: 'Aadhaar Back', src: viewAgent.aadhaar_back, round: false },
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
                            <Descriptions.Item label="Agent Code" span={2}><Text code>{viewAgent.agent_code}</Text></Descriptions.Item>
                            <Descriptions.Item label="Name">{viewAgent.name}</Descriptions.Item>
                            <Descriptions.Item label="Phone">{viewAgent.phone}</Descriptions.Item>
                            <Descriptions.Item label="Username">{viewAgent.username}</Descriptions.Item>
                            <Descriptions.Item label="Password"><Text code>{viewAgent.password}</Text></Descriptions.Item>
                            <Descriptions.Item label="Status">
                                {viewAgent.active ? <Tag color="green">ACTIVE</Tag> : <Tag color="red">SUSPENDED</Tag>}
                            </Descriptions.Item>
                            <Descriptions.Item label="Token"><Text code>{viewAgent.token || '—'}</Text></Descriptions.Item>
                        </Descriptions>
                    </>
                )}
            </Modal>

            {/* ── ADD / EDIT MODAL ── */}
            <Modal
                title={<b>{modalMode === 'add' ? <><PlusOutlined /> Assign Agent</> : <><EditOutlined /> Edit Agent</>} — {activeMandal?.name}</b>}
                open={modalMode === 'add' || modalMode === 'edit'}
                onCancel={closeModal}
                onOk={() => form.submit()}
                confirmLoading={agentLoading.save}
                width={600}
                destroyOnClose
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
                                    <Form.Item name="phone" label="Phone" rules={[{ required: true, len: 10, message: '10-digit phone required' }]}>
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
                            <Form.Item name="status" label="Status" valuePropName="checked" initialValue={true}>
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
        </div>
    );
};

// ── Shared file reader helper ─────────────────────────────────────────────────
export const readFile = (e, setter) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setter(reader.result);
    reader.readAsDataURL(file);
};

export default MandalAgentManager;