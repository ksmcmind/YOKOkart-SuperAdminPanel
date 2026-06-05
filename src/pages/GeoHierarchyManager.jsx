/**
 * src/pages/GeoHierarchyManager.jsx
 * Geo hierarchy browser + manual add + bulk upload via BulkUploadModal
 */

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    Tabs, Table, Card, Typography, Button, Space, Row, Col,
    Select, Modal, Form, Input, InputNumber, message, Tag
} from 'antd';
import {
    GlobalOutlined, PlusOutlined, EditOutlined,
    EnvironmentOutlined, HomeOutlined, UploadOutlined
} from '@ant-design/icons';
import * as XLSX from 'xlsx';

import {
    fetchNations, fetchStates, fetchDistricts, fetchMandals, fetchVillages,
    createNation, createState, createDistrict, createMandal, createVillage,
    updateVillage,
    selectNation, selectState, selectDistrict, selectMandal,
    uploadGeoCSV,
} from '../store/slices/Geoslice';

import BulkUploadModal from '../components/BulkUploadModal';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

// ── Geo bulk CSV schema ───────────────────────────────────────────────────────
// These must match what BulkUploadModal normalises headers to
// (lowercase, spaces → underscores)
const GEO_SCHEMA_FIELDS = [
    'nation',
    'state',
    'district',
    'mandal',
    'village',
    'house_count',
];

// Per-field validators — return true = ok, string = error message
const GEO_FIELD_VALIDATORS = {
    // nation is optional — blank defaults to "India"
    nation: () => true,

    state: (v) => {
        if (!v || !v.trim()) return 'State is required';
        if (v.trim().length > 100) return 'Max 100 characters';
        return true;
    },
    district: (v) => {
        if (!v || !v.trim()) return 'District is required';
        if (v.trim().length > 100) return 'Max 100 characters';
        return true;
    },
    mandal: (v) => {
        if (!v || !v.trim()) return 'Mandal is required';
        if (v.trim().length > 100) return 'Max 100 characters';
        return true;
    },
    village: (v) => {
        if (!v || !v.trim()) return 'Village is required';
        if (v.trim().length > 100) return 'Max 100 characters';
        return true;
    },
    // house_count optional — must be a non-negative integer if provided
    house_count: (v) => {
        if (!v || !v.trim()) return true;           // optional
        const n = parseInt(v, 10);
        if (isNaN(n) || n < 0) return 'Must be a non-negative whole number (e.g. 250)';
        return true;
    },
};

// ── Demo template data ────────────────────────────────────────────────────────
const TEMPLATE_ROWS = [
    { nation: 'India', state: 'Andhra Pradesh', district: 'Visakhapatnam', mandal: 'Bheemunipatnam', village: 'Bheemunipatnam', house_count: 450 },
    { nation: 'India', state: 'Andhra Pradesh', district: 'Visakhapatnam', mandal: 'Anakapalle', village: 'Kasimkota', house_count: 380 },
    { nation: 'India', state: 'Telangana', district: 'Hyderabad', mandal: 'LB Nagar', village: 'Saroornagar', house_count: 520 },
    { nation: '', state: 'Andhra Pradesh', district: 'East Godavari', mandal: 'Kakinada', village: 'Kakinada Rural', house_count: 210 },
    { nation: 'India', state: 'Karnataka', district: 'Bengaluru', mandal: 'Yelahanka', village: 'Kogilu', house_count: 300 },
];

const downloadCSVTemplate = () => {
    const header = GEO_SCHEMA_FIELDS.join(',');
    const rows = TEMPLATE_ROWS.map(r =>
        GEO_SCHEMA_FIELDS.map(f => `"${r[f] ?? ''}"`).join(',')
    );
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'geo_bulk_template.csv';
    a.click();
    URL.revokeObjectURL(url);
};

const downloadXLSXTemplate = () => {
    const ws = XLSX.utils.json_to_sheet(TEMPLATE_ROWS, { header: GEO_SCHEMA_FIELDS });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Geo Template');
    XLSX.writeFile(wb, 'geo_bulk_template.xlsx');
};

// ── Custom preview for geo rows ───────────────────────────────────────────────
const GeoPreview = ({ payload }) => (
    <div className="overflow-x-auto max-h-80 border border-gray-100 rounded-lg">
        <table className="table text-xs w-full">
            <thead className="bg-gray-50 sticky top-0">
                <tr>
                    {GEO_SCHEMA_FIELDS.map(f => (
                        <th key={f} className="capitalize">{f.replace('_', ' ')}</th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {payload.slice(0, 15).map((row, i) => (
                    <tr key={i}>
                        <td className="text-gray-500">{row.nation || <em className="text-gray-300">India</em>}</td>
                        <td>{row.state}</td>
                        <td>{row.district}</td>
                        <td>{row.mandal}</td>
                        <td>{row.village}</td>
                        <td className="text-right">
                            {row.house_count
                                ? <span className="font-mono font-semibold text-blue-600">{row.house_count}</span>
                                : <span className="text-gray-300">—</span>
                            }
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
        {payload.length > 15 && (
            <p className="text-xs text-gray-400 text-center py-2">
                Showing first 15 of {payload.length} rows
            </p>
        )}
    </div>
);

// ── Small reusable "Add" modal ────────────────────────────────────────────────
const AddModal = ({ title, open, onClose, onFinish, loading, children }) => {
    const [form] = Form.useForm();
    const handleOk = async () => {
        const values = await form.validateFields();
        await onFinish(values);
        form.resetFields();
    };
    return (
        <Modal title={title} open={open} onCancel={onClose}
            onOk={handleOk} confirmLoading={loading} destroyOnClose>
            <Form form={form} layout="vertical">{children}</Form>
        </Modal>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
const GeoHierarchyManager = () => {
    const dispatch = useDispatch();
    const {
        nations, states, districts, mandals, villages,
        selectedNationId, selectedStateId, selectedDistrictId, selectedMandalId,
        loading,
    } = useSelector((s) => s.geo);

    const user = useSelector((state) => state.auth.user);
    const isSuperAdmin = user?.role === 'super_admin';

    const [activeTab, setActiveTab] = useState('nations');
    const [modal, setModal] = useState(null);
    const [editTarget, setEditTarget] = useState(null);
    const [saving, setSaving] = useState(false);
    const [bulkOpen, setBulkOpen] = useState(false);

    useEffect(() => { dispatch(fetchNations()); }, [dispatch]);

    // ── Cascade helpers ───────────────────────────────────────────────────────
    const onNationChange = (id) => { dispatch(selectNation(id)); dispatch(fetchStates(id)); };
    const onStateChange = (id) => { dispatch(selectState(id)); dispatch(fetchDistricts(id)); };
    const onDistrictChange = (id) => { dispatch(selectDistrict(id)); dispatch(fetchMandals(id)); };
    const onMandalChange = (id) => { dispatch(selectMandal(id)); dispatch(fetchVillages(id)); };

    // ── Save handlers ─────────────────────────────────────────────────────────
    const saveNation = async (v) => {
        setSaving(true);
        await dispatch(createNation(v));
        setSaving(false); setModal(null);
        message.success('Nation saved');
    };
    const saveState = async (v) => {
        if (!selectedNationId) return message.error('Select a nation first');
        setSaving(true);
        await dispatch(createState({ ...v, nation_id: selectedNationId }));
        setSaving(false); setModal(null);
        message.success('State saved');
        dispatch(fetchStates(selectedNationId));
    };
    const saveDistrict = async (v) => {
        if (!selectedStateId) return message.error('Select a state first');
        setSaving(true);
        await dispatch(createDistrict({ ...v, state_id: selectedStateId }));
        setSaving(false); setModal(null);
        message.success('District saved');
        dispatch(fetchDistricts(selectedStateId));
    };
    const saveMandal = async (v) => {
        if (!selectedDistrictId) return message.error('Select a district first');
        setSaving(true);
        await dispatch(createMandal({ ...v, district_id: selectedDistrictId }));
        setSaving(false); setModal(null);
        message.success('Mandal saved');
        dispatch(fetchMandals(selectedDistrictId));
    };
    const saveVillage = async (v) => {
        if (!selectedMandalId) return message.error('Select a mandal first');
        setSaving(true);
        await dispatch(createVillage({ ...v, mandal_id: selectedMandalId }));
        setSaving(false); setModal(null);
        message.success('Village saved');
        dispatch(fetchVillages(selectedMandalId));
    };
    const saveEditVillage = async (v) => {
        setSaving(true);
        await dispatch(updateVillage({ id: editTarget._id, ...v }));
        setSaving(false); setModal(null); setEditTarget(null);
        message.success('Village updated');
        dispatch(fetchVillages(selectedMandalId));
    };

    // ── Bulk upload handler (called by BulkUploadModal after preview confirm) ──
    const handleBulkUpload = async (rows) => {
        // Normalise: default nation to "India", house_count to 0
        const normalised = rows.map((r) => ({
            nation: (r.nation || 'India').trim(),
            state: r.state.trim(),
            district: r.district.trim(),
            mandal: r.mandal.trim(),
            village: r.village.trim(),
            house_count: parseInt(r.house_count || 0, 10),
        }));

        // Build FormData with a JSON blob so the existing /geo/bulk/upload
        // endpoint (which expects multipart/form-data with a 'csv' file field)
        // still works — OR dispatch the Redux thunk directly.
        // Here we dispatch the thunk with a synthetic CSV blob so the existing
        // backend endpoint is called without changes.
        const csvLines = [
            GEO_SCHEMA_FIELDS.join(','),
            ...normalised.map(r =>
                GEO_SCHEMA_FIELDS.map(f => `"${r[f] ?? ''}"`).join(',')
            ),
        ].join('\n');

        const blob = new Blob([csvLines], { type: 'text/csv' });
        const file = new File([blob], 'geo_bulk.csv', { type: 'text/csv' });
        const formData = new FormData();
        formData.append('csv', file);

        const result = await dispatch(uploadGeoCSV(formData)).unwrap();
        // Return shape BulkUploadModal expects: { jobId?, created?, updated?, errors? }
        return {
            jobId: result.jobId,
            created: result.totalRows,
            updated: 0,
            errors: result.errors || [],
        };
    };

    // ── Columns ───────────────────────────────────────────────────────────────
    const nameCol = { title: 'NAME', dataIndex: 'name', render: (t) => <Text strong>{t}</Text> };
    const idCol = {
        title: 'ID', dataIndex: '_id', width: 200,
        render: (t) => <Text code style={{ fontSize: 11 }}>{t}</Text>
    };

    // ── Cascading filter bar ──────────────────────────────────────────────────
    const FilterBar = ({ level }) => {
        const showNation = ['states', 'districts', 'mandals', 'villages'].includes(level);
        const showState = ['districts', 'mandals', 'villages'].includes(level);
        const showDistrict = ['mandals', 'villages'].includes(level);
        const showMandal = level === 'villages';
        return (
            <Card size="small" style={{ marginBottom: 16 }}>
                <Space wrap>
                    {showNation && (
                        <div>
                            <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>NATION</Text>
                            <Select showSearch optionFilterProp="children" placeholder="Nation"
                                style={{ width: 160 }} onChange={onNationChange}>
                                {nations.map(n => <Select.Option key={n._id} value={n._id}>{n.name}</Select.Option>)}
                            </Select>
                        </div>
                    )}
                    {showState && (
                        <div>
                            <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>STATE</Text>
                            <Select showSearch optionFilterProp="children" placeholder="State"
                                disabled={!selectedNationId} style={{ width: 160 }} onChange={onStateChange}>
                                {states.map(s => <Select.Option key={s._id} value={s._id}>{s.name}</Select.Option>)}
                            </Select>
                        </div>
                    )}
                    {showDistrict && (
                        <div>
                            <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>DISTRICT</Text>
                            <Select showSearch optionFilterProp="children" placeholder="District"
                                disabled={!selectedStateId} style={{ width: 160 }} onChange={onDistrictChange}>
                                {districts.map(d => <Select.Option key={d._id} value={d._id}>{d.name}</Select.Option>)}
                            </Select>
                        </div>
                    )}
                    {showMandal && (
                        <div>
                            <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>MANDAL</Text>
                            <Select showSearch optionFilterProp="children" placeholder="Mandal"
                                disabled={!selectedDistrictId} style={{ width: 160 }} onChange={onMandalChange}>
                                {mandals.map(m => <Select.Option key={m._id} value={m._id}>{m.name}</Select.Option>)}
                            </Select>
                        </div>
                    )}
                </Space>
            </Card>
        );
    };

    return (
        <div style={{ padding: 24 }}>
            {/* ── Page header ── */}
            <Row justify="space-between" align="middle" style={{ marginBottom: 20 }}>
                <Col>
                    <Title level={3} style={{ margin: 0 }}>
                        <GlobalOutlined style={{ color: '#2563eb', marginRight: 8 }} />
                        Geo Hierarchy Manager
                    </Title>
                    <Text type="secondary">
                        Manage Nation → State → District → Mandal → Village. Use bulk upload for large imports.
                    </Text>
                </Col>
                <Col>
                    {!isSuperAdmin && (
                        <Button
                            type="primary"
                            icon={<UploadOutlined />}
                            onClick={() => setBulkOpen(true)}
                            style={{ background: '#16a34a', borderColor: '#16a34a' }}
                        >
                            Bulk Upload CSV / XLSX
                        </Button>
                    )}
                </Col>
            </Row>

            {/* ── Tabs ── */}
            <Tabs activeKey={activeTab} onChange={setActiveTab}>

                {/* NATIONS */}
                <TabPane tab={<span><GlobalOutlined /> Nations</span>} key="nations">
                    {!isSuperAdmin && (
                        <Row justify="end" style={{ marginBottom: 12 }}>
                            <Button type="primary" icon={<PlusOutlined />} onClick={() => setModal('nation')}>
                                Add Nation
                            </Button>
                        </Row>
                    )}
                    <Table dataSource={nations} rowKey="_id" size="small" loading={loading.nations}
                        columns={[nameCol, { title: 'CODE', dataIndex: 'nationCode', width: 100 }, idCol]} />
                </TabPane>

                {/* STATES */}
                <TabPane tab={<span><EnvironmentOutlined /> States</span>} key="states">
                    <FilterBar level="states" />
                    {!isSuperAdmin && (
                        <Row justify="end" style={{ marginBottom: 12 }}>
                            <Button type="primary" icon={<PlusOutlined />} onClick={() => setModal('state')}
                                disabled={!selectedNationId}>
                                Add State
                            </Button>
                        </Row>
                    )}
                    <Table dataSource={states} rowKey="_id" size="small" loading={loading.states}
                        columns={[nameCol, { title: 'CODE', dataIndex: 'stateCode', width: 100 }, idCol]} />
                </TabPane>

                {/* DISTRICTS */}
                <TabPane tab="Districts" key="districts">
                    <FilterBar level="districts" />
                    {!isSuperAdmin && (
                        <Row justify="end" style={{ marginBottom: 12 }}>
                            <Button type="primary" icon={<PlusOutlined />} onClick={() => setModal('district')}
                                disabled={!selectedStateId}>
                                Add District
                            </Button>
                        </Row>
                    )}
                    <Table dataSource={districts} rowKey="_id" size="small" loading={loading.districts}
                        columns={[nameCol, idCol]} />
                </TabPane>

                {/* MANDALS */}
                <TabPane tab="Mandals" key="mandals">
                    <FilterBar level="mandals" />
                    {!isSuperAdmin && (
                        <Row justify="end" style={{ marginBottom: 12 }}>
                            <Button type="primary" icon={<PlusOutlined />} onClick={() => setModal('mandal')}
                                disabled={!selectedDistrictId}>
                                Add Mandal
                            </Button>
                        </Row>
                    )}
                    <Table dataSource={mandals} rowKey="_id" size="small" loading={loading.mandals}
                        columns={[nameCol, idCol]} />
                </TabPane>

                {/* VILLAGES */}
                <TabPane tab={<span><HomeOutlined /> Villages</span>} key="villages">
                    <FilterBar level="villages" />
                    {!isSuperAdmin && (
                        <Row justify="end" style={{ marginBottom: 12 }}>
                            <Button type="primary" icon={<PlusOutlined />} onClick={() => setModal('village')}
                                disabled={!selectedMandalId}>
                                Add Village
                            </Button>
                        </Row>
                    )}
                    <Table dataSource={villages} rowKey="_id" size="small" loading={loading.villages}
                        columns={[
                            nameCol,
                            {
                                title: 'HOUSE COUNT', dataIndex: 'house_count',
                                render: (c) => <Tag color="blue">{c || 0}</Tag>,
                                width: 140,
                            },
                            idCol,
                            ...(!isSuperAdmin ? [{
                                title: 'EDIT', width: 80, align: 'center',
                                render: (r) => (
                                    <Button type="text" icon={<EditOutlined />}
                                        onClick={() => { setEditTarget(r); setModal('editVillage'); }} />
                                ),
                            }] : []),
                        ]}
                    />
                </TabPane>
            </Tabs>

            {/* ══ BULK UPLOAD MODAL ══ */}
            <BulkUploadModal
                open={bulkOpen}
                onClose={() => setBulkOpen(false)}
                onDone={() => {
                    setBulkOpen(false);
                    // Refresh whichever level is currently loaded
                    if (selectedMandalId) dispatch(fetchVillages(selectedMandalId));
                    else if (selectedDistrictId) dispatch(fetchMandals(selectedDistrictId));
                    else if (selectedStateId) dispatch(fetchDistricts(selectedStateId));
                    else if (selectedNationId) dispatch(fetchStates(selectedNationId));
                    else dispatch(fetchNations());
                }}
                title="Bulk Upload Geo Hierarchy"
                schemaFields={GEO_SCHEMA_FIELDS}
                fieldValidators={GEO_FIELD_VALIDATORS}
                onUpload={handleBulkUpload}
                downloadCSVTemplate={downloadCSVTemplate}
                downloadXLSXTemplate={downloadXLSXTemplate}
                groupRows={(rows) => rows}              // rows go straight through
                previewComponent={GeoPreview}
                instructions={
                    <div>
                        <p className="font-semibold text-gray-600 mb-2">Required columns (6):</p>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                            <div><span className="font-mono text-blue-600">nation</span> <span className="text-gray-400">— optional, defaults to India</span></div>
                            <div><span className="font-mono text-red-600">state</span> <span className="text-gray-400">— required</span></div>
                            <div><span className="font-mono text-red-600">district</span> <span className="text-gray-400">— required</span></div>
                            <div><span className="font-mono text-red-600">mandal</span> <span className="text-gray-400">— required</span></div>
                            <div><span className="font-mono text-red-600">village</span> <span className="text-gray-400">— required</span></div>
                            <div><span className="font-mono text-blue-600">house_count</span> <span className="text-gray-400">— optional, number ≥ 0</span></div>
                        </div>
                        <p className="mt-2 text-gray-400">
                            Existing records are <strong>updated</strong>, never duplicated. Run the upload safely multiple times.
                        </p>
                    </div>
                }
            />

            {/* ══ ADD / EDIT MODALS ══ */}
            <AddModal title="Add Nation" open={modal === 'nation'} loading={saving}
                onClose={() => setModal(null)} onFinish={saveNation}>
                <Form.Item name="name" label="Nation Name" rules={[{ required: true }]}>
                    <Input placeholder="e.g. India" />
                </Form.Item>
                <Form.Item name="nationCode" label="Nation Code (optional)">
                    <Input placeholder="e.g. IN" maxLength={5} />
                </Form.Item>
            </AddModal>

            <AddModal
                title={`Add State under ${nations.find(n => n._id === selectedNationId)?.name || '…'}`}
                open={modal === 'state'} loading={saving}
                onClose={() => setModal(null)} onFinish={saveState}>
                <Form.Item name="name" label="State Name" rules={[{ required: true }]}>
                    <Input placeholder="e.g. Andhra Pradesh" />
                </Form.Item>
                <Form.Item name="stateCode" label="State Code (optional)">
                    <Input placeholder="e.g. AP" maxLength={5} />
                </Form.Item>
            </AddModal>

            <AddModal
                title={`Add District under ${states.find(s => s._id === selectedStateId)?.name || '…'}`}
                open={modal === 'district'} loading={saving}
                onClose={() => setModal(null)} onFinish={saveDistrict}>
                <Form.Item name="name" label="District Name" rules={[{ required: true }]}>
                    <Input placeholder="e.g. Visakhapatnam" />
                </Form.Item>
            </AddModal>

            <AddModal
                title={`Add Mandal under ${districts.find(d => d._id === selectedDistrictId)?.name || '…'}`}
                open={modal === 'mandal'} loading={saving}
                onClose={() => setModal(null)} onFinish={saveMandal}>
                <Form.Item name="name" label="Mandal Name" rules={[{ required: true }]}>
                    <Input placeholder="e.g. Anakapalle" />
                </Form.Item>
            </AddModal>

            <AddModal
                title={`Add Village under ${mandals.find(m => m._id === selectedMandalId)?.name || '…'}`}
                open={modal === 'village'} loading={saving}
                onClose={() => setModal(null)} onFinish={saveVillage}>
                <Form.Item name="name" label="Village Name" rules={[{ required: true }]}>
                    <Input placeholder="e.g. Bheemunipatnam" />
                </Form.Item>
                <Form.Item name="house_count" label="House Count" initialValue={0}>
                    <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
            </AddModal>

            <AddModal
                title={`Edit Village — ${editTarget?.name}`}
                open={modal === 'editVillage'} loading={saving}
                onClose={() => { setModal(null); setEditTarget(null); }}
                onFinish={saveEditVillage}>
                <Form.Item name="house_count" label="House Count"
                    initialValue={editTarget?.house_count || 0}>
                    <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
            </AddModal>
        </div>
    );
};

export default GeoHierarchyManager;