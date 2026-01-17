import React, { useState, useEffect } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { getMaterials, getTreatments, createMaterial, createTreatment, type CrystalMaterial, type CrystalTreatment } from '../../services/crystals.api';

export const CrystalSettingsSection: React.FC = () => {
    const [materials, setMaterials] = useState<CrystalMaterial[]>([]);
    const [treatments, setTreatments] = useState<CrystalTreatment[]>([]);

    // Inputs for new items
    const [newMaterial, setNewMaterial] = useState('');
    const [newTreatment, setNewTreatment] = useState('');

    const [loading, setLoading] = useState(false);
    const [creatingMat, setCreatingMat] = useState(false);
    const [creatingTreat, setCreatingTreat] = useState(false);

    const loadData = async () => {
        setLoading(true);
        try {
            const [mats, treats] = await Promise.all([getMaterials(), getTreatments()]);
            setMaterials(mats);
            setTreatments(treats);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleAddMaterial = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMaterial.trim()) return;
        setCreatingMat(true);
        try {
            const added = await createMaterial(newMaterial);
            setMaterials([...materials, added]);
            setNewMaterial('');
        } catch (error) {
            alert('Error creating material');
        } finally {
            setCreatingMat(false);
        }
    };

    const handleAddTreatment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTreatment.trim()) return;
        setCreatingTreat(true);
        try {
            const added = await createTreatment(newTreatment);
            setTreatments([...treatments, added]);
            setNewTreatment('');
        } catch (error) {
            alert('Error creating treatment');
        } finally {
            setCreatingTreat(false);
        }
    };

    return (
        <div className="mt-8 pt-8 border-t border-slate-700">
            <header className="mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    Configuración de Cristales
                </h2>
                <p className="text-slate-400 mt-2">Gestiona los materiales y tratamientos disponibles.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* MATERIALES */}
                <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-xl">
                    <h3 className="text-xl font-semibold text-white mb-4 flex justify-between items-center">
                        Materiales
                        <span className="text-xs font-normal text-slate-400">{materials.length} activos</span>
                    </h3>

                    <ul className="mb-4 max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                        {loading ? <Loader2 className="animate-spin text-cyan-500" /> :
                            materials.map(m => (
                                <li key={m.material_id} className="bg-slate-900/50 p-2 rounded border border-slate-700/50 text-slate-200 text-sm">
                                    {m.nombre}
                                </li>
                            ))}
                    </ul>

                    <form onSubmit={handleAddMaterial} className="flex gap-2">
                        <input
                            value={newMaterial}
                            onChange={e => setNewMaterial(e.target.value)}
                            placeholder="Nuevo material..."
                            className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
                        />
                        <button
                            type="submit"
                            disabled={creatingMat || !newMaterial}
                            className="bg-cyan-600 hover:bg-cyan-500 text-white p-2 rounded-lg transition-colors disabled:opacity-50"
                        >
                            {creatingMat ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />}
                        </button>
                    </form>
                </div>

                {/* TRATAMIENTOS */}
                <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-xl">
                    <h3 className="text-xl font-semibold text-white mb-4 flex justify-between items-center">
                        Tratamientos
                        <span className="text-xs font-normal text-slate-400">{treatments.length} activos</span>
                    </h3>

                    <ul className="mb-4 max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                        {loading ? <Loader2 className="animate-spin text-cyan-500" /> :
                            treatments.map(t => (
                                <li key={t.tratamiento_id} className="bg-slate-900/50 p-2 rounded border border-slate-700/50 text-slate-200 text-sm">
                                    {t.nombre}
                                </li>
                            ))}
                    </ul>

                    <form onSubmit={handleAddTreatment} className="flex gap-2">
                        <input
                            value={newTreatment}
                            onChange={e => setNewTreatment(e.target.value)}
                            placeholder="Nuevo tratamiento..."
                            className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
                        />
                        <button
                            type="submit"
                            disabled={creatingTreat || !newTreatment}
                            className="bg-purple-600 hover:bg-purple-500 text-white p-2 rounded-lg transition-colors disabled:opacity-50"
                        >
                            {creatingTreat ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};
