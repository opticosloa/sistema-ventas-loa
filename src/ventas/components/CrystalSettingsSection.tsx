import React, { useState, useEffect } from 'react';
import { Plus, Loader2, Edit2, Check, X, Trash2, Tag } from 'lucide-react';
import {
    getMaterials, getTreatments, createMaterial, createTreatment, updateMaterial, updateTreatment, type CrystalMaterial, type CrystalTreatment
} from '../../services/crystals.api';
import {
    getBrands, getModels, createBrand, createModel, updateBrand, updateModel, type MultifocalBrand, type MultifocalModel
} from '../../services/multifocales.api';
import Swal from 'sweetalert2';

export const CrystalSettingsSection: React.FC = () => {
    // --- MONOFOCALES STATE ---
    const [materials, setMaterials] = useState<CrystalMaterial[]>([]);
    const [treatments, setTreatments] = useState<CrystalTreatment[]>([]);

    // --- MULTIFOCALES CONFIG STATE ---
    const [brands, setBrands] = useState<MultifocalBrand[]>([]);
    const [models, setModels] = useState<MultifocalModel[]>([]);
    const [selectedBrandForModel, setSelectedBrandForModel] = useState<string>('');

    // --- UI STATE ---
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'monofocales' | 'multifocales'>('monofocales');

    // Edit Inline
    const [editingId, setEditingId] = useState<string | null>(null);
    const [tempName, setTempName] = useState('');

    // New Items Inputs
    const [newMaterial, setNewMaterial] = useState('');
    const [newTreatment, setNewTreatment] = useState('');
    const [newBrand, setNewBrand] = useState('');
    const [newModel, setNewModel] = useState('');

    // Loading states per action
    const [creatingMat, setCreatingMat] = useState(false);
    const [creatingTreat, setCreatingTreat] = useState(false);
    const [creatingBrand, setCreatingBrand] = useState(false);
    const [creatingModel, setCreatingModel] = useState(false);

    const loadData = async () => {
        setLoading(true);
        try {
            const [mats, treats, brandsData] = await Promise.all([
                getMaterials(),
                getTreatments(),
                getBrands()
            ]);
            setMaterials(mats.filter(m => m.is_active));
            setTreatments(treats.filter(t => t.is_active));
            setBrands(brandsData.filter(b => b.activo));
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    // Load models when brand selected
    useEffect(() => {
        if (selectedBrandForModel) {
            getModels(selectedBrandForModel).then(data => setModels(data.filter(m => m.activo)));
        } else {
            setModels([]);
        }
    }, [selectedBrandForModel]);

    // --- HANDLERS MONOFOCALES ---
    const handleAddMaterial = async (e: React.FormEvent) => {
        e.preventDefault(); if (!newMaterial.trim()) return;
        setCreatingMat(true);
        try {
            const added = await createMaterial(newMaterial);
            setMaterials([...materials, added]);
            setNewMaterial('');
        } catch (e) { Swal.fire('Error', 'Error al crear', 'error'); }
        finally { setCreatingMat(false); }
    };

    const handleAddTreatment = async (e: React.FormEvent) => {
        e.preventDefault(); if (!newTreatment.trim()) return;
        setCreatingTreat(true);
        try {
            const added = await createTreatment(newTreatment);
            setTreatments([...treatments, added]);
            setNewTreatment('');
        } catch (e) { Swal.fire('Error', 'Error al crear', 'error'); }
        finally { setCreatingTreat(false); }
    };

    // --- HANDLERS MULTIFOCALES ---
    const handleAddBrand = async (e: React.FormEvent) => {
        e.preventDefault(); if (!newBrand.trim()) return;
        setCreatingBrand(true);
        try {
            const added = await createBrand(newBrand);
            setBrands([...brands, added]);
            setNewBrand('');
        } catch (e) { Swal.fire('Error', 'Error al crear', 'error'); }
        finally { setCreatingBrand(false); }
    };

    const handleAddModel = async (e: React.FormEvent) => {
        e.preventDefault(); if (!newModel.trim() || !selectedBrandForModel) return;
        setCreatingModel(true);
        try {
            const added = await createModel(selectedBrandForModel, newModel);
            setModels([...models, added]);
            setNewModel('');
        } catch (e) { Swal.fire('Error', 'Error al crear', 'error'); }
        finally { setCreatingModel(false); }
    };

    // --- GENERIC UPDATE/DEACTIVATE ---
    const handleUpdate = async (type: 'mat' | 'treat' | 'brand' | 'model', id: string, name: string) => {
        if (!name.trim()) return;
        try {
            if (type === 'mat') {
                const updated = await updateMaterial(id, { nombre: name, is_active: true });
                setMaterials(materials.map(m => m.material_id === id ? updated : m));
            } else if (type === 'treat') {
                const updated = await updateTreatment(id, { nombre: name, is_active: true });
                setTreatments(treatments.map(t => t.tratamiento_id === id ? updated : t));
            } else if (type === 'brand') {
                const updated = await updateBrand(id, name, true);
                setBrands(brands.map(b => b.marca_id === id ? updated : b));
            } else if (type === 'model') {
                const updated = await updateModel(id, name, true);
                setModels(models.map(m => m.modelo_id === id ? updated : m));
            }
            setEditingId(null);
            Swal.fire('Actualizado', '', 'success');
        } catch (error) {
            Swal.fire('Error', 'No se pudo actualizar', 'error');
        }
    };

    const handleDeactivate = async (type: 'mat' | 'treat' | 'brand' | 'model', id: string) => {
        const confirm = await Swal.fire({
            title: '¿Desactivar elemento?',
            text: "Dejará de estar disponible en los selectores.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Sí, desactivar'
        });

        if (confirm.isConfirmed) {
            try {
                if (type === 'mat') {
                    await updateMaterial(id, { is_active: false });
                    setMaterials(materials.filter(m => m.material_id !== id));
                } else if (type === 'treat') {
                    await updateTreatment(id, { is_active: false });
                    setTreatments(treatments.filter(t => t.tratamiento_id !== id));
                } else if (type === 'brand') {
                    await updateBrand(id, brands.find(b => b.marca_id === id)!.nombre, false);
                    setBrands(brands.filter(b => b.marca_id !== id));
                } else if (type === 'model') {
                    await updateModel(id, models.find(m => m.modelo_id === id)!.nombre, false);
                    setModels(models.filter(m => m.modelo_id !== id));
                }
                Swal.fire('Desactivado', '', 'success');
            } catch (error) {
                Swal.fire('Error', 'No se pudo desactivar', 'error');
            }
        }
    };

    // Helper render item
    const renderItem = (id: string, name: string, type: 'mat' | 'treat' | 'brand' | 'model') => (
        <li key={id} className="bg-slate-900/50 p-2 rounded border border-slate-700/50 flex items-center justify-between group">
            {editingId === id ? (
                <div className="flex items-center gap-2 w-full">
                    <input
                        value={tempName}
                        onChange={(e) => setTempName(e.target.value)}
                        className="bg-slate-800 border border-cyan-500 rounded px-2 py-1 text-sm text-white w-full outline-none"
                        autoFocus
                    />
                    <button onClick={() => handleUpdate(type, id, tempName)} className="text-green-500 hover:text-green-400"><Check size={16} /></button>
                    <button onClick={() => setEditingId(null)} className="text-red-500 hover:text-red-400"><X size={16} /></button>
                </div>
            ) : (
                <>
                    <span className="text-slate-200 text-sm">{name}</span>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditingId(id); setTempName(name); }} className="text-slate-400 hover:text-cyan-400">
                            <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleDeactivate(type, id)} className="text-slate-400 hover:text-red-400">
                            <Trash2 size={14} />
                        </button>
                    </div>
                </>
            )}
        </li>
    );

    const inputClass = "flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-cyan-500 outline-none";

    return (
        <div className="mt-8 pt-8 border-t border-slate-700">
            <header className="mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">Configuración de Cristales</h2>
                <p className="text-slate-400 mt-2">Gestiona el catálogo de cristales y sus propiedades.</p>
            </header>

            {/* TABS NAVIGATION */}
            <div className="flex gap-1 bg-slate-800/50 p-1 rounded-lg w-fit mb-6 border border-slate-700/50">
                <button
                    onClick={() => setActiveTab('monofocales')}
                    className={`px-4 py-2 rounded-md font-medium transition-all ${activeTab === 'monofocales'
                        ? 'bg-cyan-600 text-white shadow-lg'
                        : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                        }`}
                >
                    Monofocales
                </button>
                <button
                    onClick={() => setActiveTab('multifocales')}
                    className={`px-4 py-2 rounded-md font-medium transition-all ${activeTab === 'multifocales'
                        ? 'bg-cyan-600 text-white shadow-lg'
                        : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                        }`}
                >
                    Multifocales
                </button>
            </div>

            {activeTab === 'multifocales' ? (
                /* === NEW SECTION: CONFIGURACION MULTIFOCALES (MARCAS/MODELOS) === */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {/* MARCAS */}
                    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-xl">
                        <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2"><Tag size={20} /> Marcas</h3>
                        <ul className="mb-4 max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                            {brands.map(b => renderItem(b.marca_id, b.nombre, 'brand'))}
                        </ul>
                        <form onSubmit={handleAddBrand} className="flex gap-2">
                            <input value={newBrand} onChange={e => setNewBrand(e.target.value)} placeholder="Nueva marca..." className={inputClass} />
                            <button type="submit" disabled={creatingBrand} className="bg-cyan-600 hover:bg-cyan-500 text-white p-2 rounded-lg"><Plus size={20} /></button>
                        </form>
                    </div>

                    {/* MODELOS */}
                    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-xl">
                        <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2"><Tag size={20} /> Modelos</h3>
                        <div className="mb-4">
                            <select
                                value={selectedBrandForModel}
                                onChange={(e) => setSelectedBrandForModel(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2 text-white text-sm outline-none focus:ring-2 focus:ring-cyan-500"
                            >
                                <option value="">Selecciona una marca...</option>
                                {brands.map(b => (
                                    <option key={b.marca_id} value={b.marca_id}>{b.nombre}</option>
                                ))}
                            </select>
                        </div>
                        {selectedBrandForModel ? (
                            <>
                                <ul className="mb-4 max-h-48 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                    {models.length === 0 && <li className="text-slate-500 text-sm text-center py-2">Sin modelos cargados</li>}
                                    {models.map(m => renderItem(m.modelo_id, m.nombre, 'model'))}
                                </ul>
                                <form onSubmit={handleAddModel} className="flex gap-2">
                                    <input value={newModel} onChange={e => setNewModel(e.target.value)} placeholder="Nuevo modelo..." className={inputClass} />
                                    <button type="submit" disabled={creatingModel} className="bg-cyan-600 hover:bg-cyan-500 text-white p-2 rounded-lg"><Plus size={20} /></button>
                                </form>
                            </>
                        ) : (
                            <div className="p-4 text-center text-slate-500 text-sm italic border border-dashed border-slate-700 rounded">
                                Selecciona una marca para ver sus modelos.
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                /* === EXISTING SECTION: CONFIGURACION MONOFOCALES (MATERIALES/TRATAMIENTOS) === */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {/* SECCIÓN MATERIALES */}
                    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-xl">
                        <h3 className="text-xl font-semibold text-white mb-4">Materiales</h3>
                        <ul className="mb-4 max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                            {loading ? <Loader2 className="animate-spin text-cyan-500" /> :
                                materials.map(m => renderItem(m.material_id, m.nombre, 'mat'))
                            }
                        </ul>
                        <form onSubmit={handleAddMaterial} className="flex gap-2">
                            <input
                                value={newMaterial}
                                onChange={e => setNewMaterial(e.target.value)}
                                placeholder="Nuevo material..."
                                className={inputClass}
                            />
                            <button type="submit" disabled={creatingMat || !newMaterial} className="bg-cyan-600 hover:bg-cyan-500 text-white p-2 rounded-lg disabled:opacity-50">
                                {creatingMat ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />}
                            </button>
                        </form>
                    </div>

                    {/* SECCIÓN TRATAMIENTOS */}
                    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-xl">
                        <h3 className="text-xl font-semibold text-white mb-4">Tratamientos</h3>
                        <ul className="mb-4 max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                            {loading ? <Loader2 className="animate-spin text-cyan-500" /> :
                                treatments.map(t => renderItem(t.tratamiento_id, t.nombre, 'treat'))
                            }
                        </ul>
                        <form onSubmit={handleAddTreatment} className="flex gap-2">
                            <input
                                value={newTreatment}
                                onChange={e => setNewTreatment(e.target.value)}
                                placeholder="Nuevo tratamiento..."
                                className={inputClass}
                            />
                            <button type="submit" disabled={creatingTreat || !newTreatment} className="bg-purple-600 hover:bg-purple-500 text-white p-2 rounded-lg disabled:opacity-50">
                                {creatingTreat ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};