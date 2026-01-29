import React, { useState, useMemo, useEffect } from 'react';
import { createBatchCristales } from '../services';
import { getMaterials, getTreatments, type CrystalMaterial, type CrystalTreatment } from '../services/crystals.api';
import Swal from 'sweetalert2';
import { useBranch } from '../context/BranchContext';
import { FormularioMultifocal } from '.';

// Cambiamos los tipos a string para permitir estados intermedios como "-" o ""
interface BatchForm {
    material: string;
    tratamiento: string;
    precio_usd: string;
    precio_costo: string;
    porcentaje_ganancia: string;
    esfera_min: string;
    esfera_max: string;
    cilindro_min: string;
    cilindro_max: string;
    stock_inicial: string;
    stock_minimo: string;
    ubicacion: string;
}

const initialForm: BatchForm = {
    material: '',
    tratamiento: '',
    precio_usd: '0',
    precio_costo: '0',
    porcentaje_ganancia: '0',
    esfera_min: '0.00',
    esfera_max: '0.00',
    cilindro_min: '0.00',
    cilindro_max: '0.00',
    stock_inicial: '0',
    stock_minimo: '2',
    ubicacion: ''
};

export const FormularioCristal: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'monofocal' | 'multifocal'>('monofocal');

    // --- MONOFOCAL STATE ---
    const [form, setForm] = useState<BatchForm>(initialForm);
    const [loading, setLoading] = useState(false);
    const [materials, setMaterials] = useState<CrystalMaterial[]>([]);
    const [treatments, setTreatments] = useState<CrystalTreatment[]>([]);
    const [isManualPrice, setIsManualPrice] = useState(false);

    // Multi-Branch Stock
    const { branches, refreshBranches } = useBranch();
    const [stockDistribution, setStockDistribution] = useState<Record<string, number>>({});
    const [selectedBranches, setSelectedBranches] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (branches.length === 0) refreshBranches();
    }, [branches.length, refreshBranches]);

    const toggleBranch = (branchId: string) => {
        setSelectedBranches(prev => ({ ...prev, [branchId]: !prev[branchId] }));
    };

    const handleBranchStockChange = (branchId: string, value: string) => {
        const qty = parseInt(value) || 0;
        setStockDistribution(prev => ({ ...prev, [branchId]: qty }));
    };

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const [mats, treats] = await Promise.all([getMaterials(), getTreatments()]);
                setMaterials(mats);
                setTreatments(treats);
            } catch (error) {
                console.error("Error loading crystal settings", error);
            }
        };
        loadSettings();
    }, []);

    // Calculator Logic
    useEffect(() => {
        if (isManualPrice) return;

        const costo = parseFloat(form.precio_costo);
        const margen = parseFloat(form.porcentaje_ganancia);

        if (!isNaN(costo) && !isNaN(margen)) {
            const venta = costo * (1 + margen / 100);
            setForm(prev => ({
                ...prev,
                precio_usd: venta.toFixed(2)
            }));
        }
    }, [form.precio_costo, form.porcentaje_ganancia, isManualPrice]);

    // Reverse Calculator Logic (Price -> Margin)
    useEffect(() => {
        if (!isManualPrice) return;

        const costo = parseFloat(form.precio_costo);
        const venta = parseFloat(form.precio_usd);

        if (!isNaN(costo) && costo > 0 && !isNaN(venta) && venta > 0) {
            const margen = ((venta / costo) - 1) * 100;
            setForm(prev => ({
                ...prev,
                porcentaje_ganancia: margen.toFixed(2)
            }));
        }
    }, [form.precio_usd, isManualPrice, form.precio_costo]);


    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'precio_usd') setIsManualPrice(true);
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const calculatedCrystals = useMemo(() => {
        const esfMin = parseFloat(form.esfera_min) || 0;
        const esfMax = parseFloat(form.esfera_max) || 0;
        const cilMin = parseFloat(form.cilindro_min) || 0;
        const cilMax = parseFloat(form.cilindro_max) || 0;

        const esfSteps = Math.abs((esfMax - esfMin) / 0.25) + 1;
        const cilSteps = Math.abs((cilMax - cilMin) / 0.25) + 1;
        return Math.floor(esfSteps * cilSteps);
    }, [form.esfera_min, form.esfera_max, form.cilindro_min, form.cilindro_max]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const esfMinVal = parseFloat(form.esfera_min) || 0;
        const esfMaxVal = parseFloat(form.esfera_max) || 0;
        const cilMinVal = parseFloat(form.cilindro_min) || 0;
        const cilMaxVal = parseFloat(form.cilindro_max) || 0;

        const [esfMin, esfMax] = [esfMinVal, esfMaxVal].sort((a, b) => a - b);
        const [cilMin, cilMax] = [cilMinVal, cilMaxVal].sort((a, b) => a - b);

        const stockInitial = parseInt(form.stock_inicial) || 0;
        const precioUsd = parseFloat(form.precio_usd) || 0;

        if (stockInitial <= 0) return Swal.fire('Error', 'El Stock Inicial debe ser mayor a 0', 'error');
        if (precioUsd <= 0) return Swal.fire('Error', 'El Precio de Venta (USD) debe ser mayor a 0', 'error');

        // Prepare Stock Distribution map for backend
        const distributionData = Object.entries(selectedBranches)
            .filter(([_, isSelected]) => isSelected)
            .map(([branchId, _]) => ({
                sucursal_id: branchId,
                cantidad: stockDistribution[branchId] || 0
            }))
            .filter(item => item.cantidad > 0);

        const finalPayload = {
            material: form.material,
            tratamiento: form.tratamiento,
            esfera_min: esfMin,
            esfera_max: esfMax,
            cilindro_min: cilMin,
            cilindro_max: cilMax,
            precio_usd: precioUsd,
            precio_costo: parseFloat(form.precio_costo) || 0,
            stock_inicial: 0, // Legacy/Global param, sending 0 as we use specific distribution
            stock_distribution: distributionData, // New field for multi-branch
            stock_minimo: parseInt(form.stock_minimo) || 2,
            ubicacion: form.ubicacion
        };

        setLoading(true);
        try {
            await createBatchCristales(finalPayload as any);
            Swal.fire('Cristales creados correctamente', '', 'success');
            setForm(initialForm);
            setIsManualPrice(false);
        } catch (error) {
            console.error(error);
            Swal.fire('Error al generar la matriz de cristales', '', 'error');
        } finally {
            setLoading(false);
        }
    };

    const inputClass = "w-full border border-white/30 bg-crema rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all";

    return (
        <div className="w-full max-w-5xl mx-auto p-4 sm:p-6 fade-in text-white">
            <div className="flex items-center justify-between gap-3 mb-6">
                <div>
                    <h2 className="text-2xl font-semibold">Carga de Cristales</h2>
                    <p className="text-gray-400 text-sm">Administración de stock monofocal y alta de multifocales.</p>
                </div>
            </div>

            {/* TAB SELECTOR */}
            <div className="flex gap-2 mb-6 border-b border-white/10 pb-1">
                <button
                    onClick={() => setActiveTab('monofocal')}
                    className={`px - 6 py - 2 rounded - t - lg font - medium transition - all ${activeTab === 'monofocal'
                        ? 'bg-cyan-600 text-white shadow-lg translate-y-[1px]'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                        } `}
                >
                    Stock Monofocal
                </button>
                <button
                    onClick={() => setActiveTab('multifocal')}
                    className={`px - 6 py - 2 rounded - t - lg font - medium transition - all ${activeTab === 'multifocal'
                        ? 'bg-cyan-600 text-white shadow-lg translate-y-[1px]'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                        } `}
                >
                    Nuevo Multifocal
                </button>
            </div>

            {activeTab === 'monofocal' ? (
                /* === CONTENIDO STOCK MONOFOCAL === */
                <form onSubmit={handleSubmit} className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* DEFINICIÓN DEL LOTE */}
                    <section className="border border-white rounded-xl p-6 shadow-xl relative">
                        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                            <h1 className="text-6xl font-black">MONO</h1>
                        </div>
                        <h3 className="text-lg font-medium text-crema mb-4 border-b border-white/10 pb-2">1. Definición de Lote</h3>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-sm text-crema mb-2">Material</label>
                                <select required name="material" value={form.material} onChange={handleChange} className={inputClass} >
                                    <option value="" className="bg-crema text-gray-600">Seleccionar...</option>
                                    {materials.map(m => <option key={m.material_id} value={m.nombre} className="bg-crema text-gray-600">{m.nombre}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-crema mb-2">Tratamiento / Color</label>
                                <select required name="tratamiento" value={form.tratamiento} onChange={handleChange} className={inputClass} >
                                    <option value="" className="bg-crema text-gray-600">Seleccionar...</option>
                                    {treatments.map(t => <option key={t.tratamiento_id} value={t.nombre} className="bg-crema text-gray-600">{t.nombre}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-2 font-bold text-yellow-400">Precio Costo (USD)</label>
                                <input type="number" step="0.01" required name="precio_costo" value={form.precio_costo} onChange={handleChange} className={`${inputClass} border - yellow - 500 / 30 text - lg`} />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-200 mb-2 font-bold text-blue-400">Margen de ganancia (%)</label>
                                <input type="number" step="0.01" required name="porcentaje_ganancia" value={form.porcentaje_ganancia} onChange={handleChange} className={`${inputClass} border - blue - 500 / 30 text - lg`} />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-2 font-bold text-green-400">Precio Venta (USD)</label>
                                <input type="number" step="0.01" required name="precio_usd" value={form.precio_usd} onChange={handleChange} className={`${inputClass} border - green - 500 / 30 text - lg`} />
                            </div>
                        </div>
                    </section>

                    {/* DEFINICIÓN DE RANGOS */}
                    <section className="border border-white rounded-xl p-6 shadow-xl relative overflow-hidden">
                        <h3 className="text-lg font-medium text-crema mb-4 border-b border-white/10 pb-2">2. Definición de Rangos (Step 0.25)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-white/5 p-4 rounded-lg">
                                <label className="block text-center text-blanco font-bold mb-3">Rango Esférico (Esf)</label>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1">
                                        <label className="text-xs text-crema mb-1 block">Desde (Min)</label>
                                        <input type="number" step="0.25" name="esfera_min" value={form.esfera_min} onChange={handleChange} className={inputClass} />
                                    </div>
                                    <span className="text-crema pt-5">➜</span>
                                    <div className="flex-1">
                                        <label className="text-xs text-crema mb-1 block">Hasta (Max)</label>
                                        <input type="number" step="0.25" name="esfera_max" value={form.esfera_max} onChange={handleChange} className={inputClass} />
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white/5 p-4 rounded-lg">
                                <label className="block text-center text-blanco font-bold mb-3">Rango Cilíndrico (Cil)</label>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1">
                                        <label className="text-xs text-crema mb-1 block">Desde (Min)</label>
                                        <input type="number" step="0.25" name="cilindro_min" value={form.cilindro_min} onChange={handleChange} className={inputClass} />
                                    </div>
                                    <span className="text-crema pt-5">➜</span>
                                    <div className="flex-1">
                                        <label className="text-xs text-crema mb-1 block">Hasta (Max)</label>
                                        <input type="number" step="0.25" name="cilindro_max" value={form.cilindro_max} onChange={handleChange} className={inputClass} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* STOCK Y RESUMEN */}
                    <section className="border border-white rounded-xl p-6 shadow-xl flex flex-col gap-6">
                        <div className="flex flex-col md:flex-row gap-6">
                            <div className="flex-1 bg-slate-900/30 p-4 rounded-lg border border-white/20">
                                <label className="block text-sm text-blanco mb-3 font-bold border-b border-white/10 pb-2">Distribución de Stock Inicial</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto custom-scrollbar">
                                    {branches.map(branch => {
                                        const isSelected = selectedBranches[branch.sucursal_id!] || false;
                                        return (
                                            <div key={branch.sucursal_id} className={`flex items - center gap - 2 p - 2 rounded border transition - colors ${isSelected ? 'bg-cyan-900/40 border-cyan-500/50' : 'bg-slate-800/40 border-slate-600'} `}>
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => toggleBranch(branch.sucursal_id!)}
                                                    className="w-4 h-4 accent-cyan-500"
                                                />
                                                <div className="flex-1 truncate">
                                                    <span className="text-xs text-white" title={branch.nombre}>{branch.nombre}</span>
                                                </div>
                                                {isSelected && (
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={stockDistribution[branch.sucursal_id!] || 0}
                                                        onChange={(e) => handleBranchStockChange(branch.sucursal_id!, e.target.value)}
                                                        className="w-16 bg-slate-700 border border-slate-500 rounded px-1 text-center text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                                                        placeholder="Cant."
                                                    />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                                <p className="text-xs text-gray-400 mt-2">Se sumará al stock existente si ya existe la combinación.</p>
                            </div>

                            <div className="w-full md:w-1/3 flex flex-col gap-4">
                                <div>
                                    <label className="block text-sm text-blanco mb-2 font-bold">Stock Mínimo</label>
                                    <input type="number" name="stock_minimo" value={form.stock_minimo} onChange={handleChange} className={inputClass} />
                                    <p className="text-xs text-crema mt-1">Alerta cuando baje de este número.</p>
                                </div>
                                <div>
                                    <label className="block text-sm text-blanco mb-2 font-bold">Ubicación</label>
                                    <input type="text" name="ubicacion" value={form.ubicacion} onChange={handleChange} placeholder="Ej: Cajón A3" className={inputClass} />
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="border border-white rounded-xl p-6 shadow-xl text-center items-center justify-center flex">
                        <div className="flex-1 bg-cyan-900/20 border border-cyan-500/20 rounded-lg p-4 w-full text-center max-w-lg">
                            <span className="block text-sm text-cyan-400 uppercase tracking-wider mb-1">Total Cristales a Generar</span>
                            <span className="text-4xl font-bold text-white">{isNaN(calculatedCrystals) ? 0 : calculatedCrystals}</span>
                            <span className="block text-xs text-gray-400 mt-1">Combinaciones Esfera x Cilindro</span>
                        </div>
                    </section>

                    <div className="flex justify-end pt-4">
                        <button type="submit" disabled={loading} className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-cyan-900/30 active:scale-95 w-full md:w-auto text-lg">
                            {loading ? 'Procesando...' : 'Generar Matriz de Stock'}
                        </button>
                    </div>
                </form>
            ) : (
                /* === CONTENIDO ALTA MULTIFOCAL === */
                <FormularioMultifocal />
            )}
        </div>
    );
};
