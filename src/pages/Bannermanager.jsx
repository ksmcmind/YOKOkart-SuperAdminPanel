import { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
    fetchBanners, createBanner, updateBanner,
    toggleBanner, deleteBanner, clearError,
    selectAllBanners, selectLoading, selectSaving, selectError,
} from "../store/slices/Bannerslice";
import useMart from "../hooks/useMart";
import PageHeader from "../components/PageHeader";
import Button from "../components/Button";
import Badge from "../components/Badge";
import Modal from "../components/Modal";
import Input from "../components/Input";

const PLATFORMS = ["app", "web", "both"];
const SLOTS = ["hero", "mid", "bottom", "popup"];
const LINK_TYPES = ["none", "category", "subcategory", "product", "brand", "url"];

const EMPTY_FORM = { 
    title: "", 
    subtitle: "", 
    platform: "both", 
    imageUrl: "", 
    webImageUrl: "", 
    slot: "hero", 
    linkType: "none", 
    linkValue: "", 
    sortOrder: 0, 
    startsAt: "", 
    endsAt: "" 
};

// ─── ATOMS ───────────────────────────────────────────────────

function Field({ label, required, hint, children }) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {label}{required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {children}
            {hint && <span className="text-[11px] text-gray-400 italic">{hint}</span>}
        </div>
    );
}

function Seg({ options, value, onChange }) {
    return (
        <div className="flex bg-gray-50 rounded-lg p-1 border border-gray-100">
            {options.map(o => (
                <button
                    key={o}
                    onClick={() => onChange(o)}
                    className={`flex-1 py-1.5 px-3 rounded-md text-xs font-bold uppercase tracking-wide transition-all ${
                        value === o 
                        ? "bg-white text-primary-600 shadow-sm border border-gray-100" 
                        : "text-gray-400 hover:text-gray-600"
                    }`}
                >
                    {o}
                </button>
            ))}
        </div>
    );
}

// ─── FORM ────────────────────────────────────────────────────

function BannerForm({ initial, onSave, onCancel, saving }) {
    const [form, setForm] = useState(initial || EMPTY_FORM);
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const submit = () => {
        if (!form.title.trim()) return alert("Title is required");
        if (!form.imageUrl.trim()) return alert("App image URL is required");
        onSave(form);
    };

    return (
        <div className="space-y-4">
            <Field label="Title" required>
                <Input value={form.title} onChange={e => set("title", e.target.value)} placeholder="e.g. Weekend Flash Sale" className="mb-0" />
            </Field>
            <Field label="Subtitle">
                <Input value={form.subtitle || ""} onChange={e => set("subtitle", e.target.value)} placeholder="e.g. Up to 50% off" className="mb-0" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
                <Field label="Platform">
                    <Seg options={PLATFORMS} value={form.platform} onChange={v => set("platform", v)} />
                </Field>
                <Field label="Slot">
                    <Seg options={SLOTS} value={form.slot} onChange={v => set("slot", v)} />
                </Field>
            </div>
            <Field label="App Image URL" required hint="1200×450px · 16:6 ratio">
                <Input value={form.imageUrl} onChange={e => set("imageUrl", e.target.value)} placeholder="https://cdn.example.com/banner.jpg" className="mb-0" />
            </Field>
            <Field label="Web Image URL" hint="1440×343px · falls back to app image if empty">
                <Input value={form.webImageUrl || ""} onChange={e => set("webImageUrl", e.target.value)} placeholder="https://cdn.example.com/web-banner.jpg" className="mb-0" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
                <Field label="Link Type">
                    <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white" value={form.linkType} onChange={e => set("linkType", e.target.value)}>
                        {LINK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </Field>
                <Field label="Link Value" hint={form.linkType === "url" ? "Full URL" : "slug or ID"}>
                    <Input value={form.linkValue || ""} onChange={e => set("linkValue", e.target.value)} placeholder={form.linkType === "url" ? "https://..." : "e.g. dairy"} disabled={form.linkType === "none"} className="mb-0" />
                </Field>
            </div>
            <div className="grid grid-cols-3 gap-4">
                <Field label="Sort Order">
                    <Input type="number" value={form.sortOrder} onChange={e => set("sortOrder", Number(e.target.value))} className="mb-0" />
                </Field>
                <Field label="Starts At">
                    <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" type="datetime-local" value={form.startsAt ? form.startsAt.slice(0, 16) : ""} onChange={e => set("startsAt", e.target.value ? new Date(e.target.value).toISOString() : "")} />
                </Field>
                <Field label="Ends At">
                    <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" type="datetime-local" value={form.endsAt ? form.endsAt.slice(0, 16) : ""} onChange={e => set("endsAt", e.target.value ? new Date(e.target.value).toISOString() : "")} />
                </Field>
            </div>
            {form.imageUrl && (
                <div className="rounded-xl overflow-hidden border border-gray-100 shadow-sm bg-gray-50 p-2">
                    <img src={form.imageUrl} alt="preview" className="w-full h-24 object-cover rounded-lg" onError={e => { e.target.style.display = "none"; }} />
                </div>
            )}
            <div className="flex gap-2 justify-end pt-4 border-t border-gray-100">
                <Button variant="secondary" onClick={onCancel}>Cancel</Button>
                <Button variant="primary" onClick={submit} loading={saving}>Save Banner</Button>
            </div>
        </div>
    );
}

// ─── CARD ────────────────────────────────────────────────────

function BannerCard({ banner, onEdit, onDelete, onToggle }) {
    const [confirmDel, setConfirmDel] = useState(false);
    
    const slotColors = { hero: "orange", mid: "purple", bottom: "blue", popup: "pink" };
    const platformColors = { app: "green", web: "blue", both: "orange" };

    return (
        <div className={`bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm transition-all hover:shadow-md ${!banner.isActive ? "opacity-60 grayscale-[0.5]" : ""}`}>
            <div className="relative h-28 bg-gray-100">
                <img src={banner.imageUrl} alt={banner.title} className="w-full h-full object-cover" onError={e => { e.target.style.display = "none"; }} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <div className="absolute top-2 right-2 flex gap-1.5">
                    <Badge variant={slotColors[banner.slot] || "neutral"} size="xs">{banner.slot}</Badge>
                    <Badge variant={platformColors[banner.platform] || "neutral"} size="xs">{banner.platform}</Badge>
                </div>
                <div className="absolute bottom-2 left-3">
                    <h3 className="font-bold text-white text-sm truncate max-w-[200px]">{banner.title}</h3>
                </div>
            </div>
            <div className="p-3">
                {banner.subtitle && <p className="text-xs text-gray-500 truncate mb-2">{banner.subtitle}</p>}
                
                <div className="flex items-center justify-between text-[10px] font-mono text-gray-400 mb-3 bg-gray-50 p-1.5 rounded-lg border border-gray-100">
                    <div className="flex flex-col">
                        <span className="uppercase text-[8px] font-bold text-gray-300">Link</span>
                        <span className="text-primary-600 truncate max-w-[100px]">{banner.linkType === 'none' ? 'No Link' : `${banner.linkType}:${banner.linkValue}`}</span>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="uppercase text-[8px] font-bold text-gray-300">Order</span>
                        <span className="font-bold text-gray-600">#{banner.sortOrder}</span>
                    </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                    <div className="flex items-center gap-2">
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={banner.isActive} onChange={() => onToggle(banner.id, !banner.isActive)} />
                            <div className="w-8 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-green-500"></div>
                        </label>
                        <span className={`text-[10px] font-bold uppercase ${banner.isActive ? "text-green-600" : "text-gray-400"}`}>
                            {banner.isActive ? "Active" : "Inactive"}
                        </span>
                    </div>
                    <div className="flex gap-1.5">
                        <button onClick={() => onEdit(banner)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-primary-600 transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-5M16.242 16.242L19.414 13.086a2 2 0 012.828 0l2.828 2.828a2 2 0 010 2.828l-3.172 3.172a2 2 0 01-2.828 0l-2.828-2.828a2 2 0 010-2.828z" /></svg>
                        </button>
                        {confirmDel
                            ? <button onClick={() => onDelete(banner.id)} onMouseLeave={() => setConfirmDel(false)} className="px-2 py-1 bg-red-50 text-red-600 text-[10px] font-bold rounded-lg border border-red-100">Sure?</button>
                            : <button onClick={() => setConfirmDel(true)} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                        }
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── PAGE ─────────────────────────────────────────────────────

export default function BannerManager() {
    const dispatch = useDispatch();
    const { activeMartId: martId, selectorProps } = useMart();
    const banners = useSelector(selectAllBanners);
    const loading = useSelector(selectLoading);
    const saving = useSelector(selectSaving);
    const error = useSelector(selectError);

    const [showCreate, setShowCreate] = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [filterSlot, setFilterSlot] = useState("all");
    const [filterPlat, setFilterPlat] = useState("all");
    const [filterStatus, setFilterStatus] = useState("all");

    useEffect(() => { 
        if (martId) dispatch(fetchBanners(martId)); 
    }, [dispatch, martId]);

    const handleCreate = (data) => dispatch(createBanner({ martId, data })).unwrap().then(() => setShowCreate(false)).catch(() => { });
    const handleUpdate = (data) => dispatch(updateBanner({ martId, bannerId: editTarget.id, data })).unwrap().then(() => setEditTarget(null)).catch(() => { });
    const handleToggle = (bannerId, isActive) => dispatch(toggleBanner({ martId, bannerId, isActive }));
    const handleDelete = (bannerId) => dispatch(deleteBanner({ martId, bannerId }));

    const filtered = useMemo(() => (banners || [])?.filter(b => {
        if (filterSlot !== "all" && b.slot !== filterSlot) return false;
        if (filterPlat !== "all" && b.platform !== filterPlat) return false;
        if (filterStatus === "active" && !b.isActive) return false;
        if (filterStatus === "inactive" && b.isActive) return false;
        return true;
    }), [banners, filterSlot, filterPlat, filterStatus]);

    const grouped = useMemo(() => SLOTS?.reduce((acc, s) => { 
        acc[s] = filtered?.filter(b => b.slot === s); 
        return acc; 
    }, {}), [filtered]);

    return (
        <div className="p-4 sm:p-6 space-y-6 bg-gray-50/50 min-h-screen">
            <PageHeader
                title="Banner Management"
                subtitle="Manage promotional banners for app & web"
                action={
                    <div className="flex gap-2">
                        <Button variant="primary" onClick={() => setShowCreate(true)}>+ New Banner</Button>
                    </div>
                }
            />

            {/* Selection & Filters */}
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                    <div className="w-full sm:w-auto flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Mart</span>
                        <select 
                            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-gray-50 focus:bg-white outline-none"
                            value={selectorProps.value}
                            onChange={e => selectorProps.onChange(e.target.value)}
                        >
                            <option value="">Select a Mart</option>
                            {selectorProps.marts?.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                    </div>

                    <div className="flex flex-wrap gap-2 items-center">
                        <div className="flex items-center gap-1.5 bg-gray-50 rounded-lg p-1 border border-gray-100">
                            {["all", ...SLOTS].map(s => (
                                <button 
                                    key={s} 
                                    onClick={() => setFilterSlot(s)}
                                    className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-all ${filterSlot === s ? "bg-white text-primary-600 shadow-sm" : "text-gray-400"}`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center gap-1.5 bg-gray-50 rounded-lg p-1 border border-gray-100">
                            {["all", ...PLATFORMS].map(p => (
                                <button 
                                    key={p} 
                                    onClick={() => setFilterPlat(p)}
                                    className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-all ${filterPlat === p ? "bg-white text-primary-600 shadow-sm" : "text-gray-400"}`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm flex justify-between items-center">
                    <span>{error}</span>
                    <button onClick={() => dispatch(clearError())} className="font-bold hover:text-red-800">×</button>
                </div>
            )}

            {!martId ? (
                <div className="bg-white rounded-xl border border-gray-100 p-16 text-center shadow-sm">
                    <div className="text-4xl mb-4">🖼️</div>
                    <p className="text-gray-500 font-medium text-lg">Please select a mart to manage banners</p>
                    <p className="text-gray-400 text-sm">Banners are specific to each mart location</p>
                </div>
            ) : loading ? (
                <div className="py-20 text-center text-gray-400 animate-pulse">Loading banners...</div>
            ) : filtered?.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-100 p-16 text-center shadow-sm">
                    <div className="text-4xl mb-4">📭</div>
                    <p className="text-gray-500 font-medium">No banners found matching filters</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {SLOTS.map(slot => grouped[slot]?.length > 0 && (
                        <div key={slot} className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className={`w-1.5 h-6 rounded-full bg-${slot === 'hero' ? 'orange' : slot === 'mid' ? 'purple' : slot === 'bottom' ? 'blue' : 'pink'}-500`} />
                                <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest">{slot} Slot</h2>
                                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full font-bold">{grouped[slot].length}</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {grouped[slot].map(b => (
                                    <BannerCard 
                                        key={b.id} 
                                        banner={b} 
                                        onEdit={setEditTarget} 
                                        onDelete={handleDelete} 
                                        onToggle={handleToggle} 
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Modal open={showCreate} title="Create New Banner" onClose={() => setShowCreate(false)} size="lg">
                <BannerForm onSave={handleCreate} onCancel={() => setShowCreate(false)} saving={saving} />
            </Modal>

            <Modal open={!!editTarget} title="Edit Banner" onClose={() => setEditTarget(null)} size="lg">
                {editTarget && (
                    <BannerForm
                        initial={{ 
                            title: editTarget.title, 
                            subtitle: editTarget.subtitle || "", 
                            platform: editTarget.platform, 
                            imageUrl: editTarget.imageUrl, 
                            webImageUrl: editTarget.webImageUrl || "", 
                            slot: editTarget.slot, 
                            linkType: editTarget.linkType, 
                            linkValue: editTarget.linkValue || "", 
                            sortOrder: editTarget.sortOrder, 
                            startsAt: editTarget.startsAt || "", 
                            endsAt: editTarget.endsAt || "" 
                        }}
                        onSave={handleUpdate}
                        onCancel={() => setEditTarget(null)}
                        saving={saving}
                    />
                )}
            </Modal>
        </div>
    );
}