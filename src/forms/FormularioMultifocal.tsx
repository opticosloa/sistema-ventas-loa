import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { Save, Tag, Disc, Sparkles, DollarSign } from 'lucide-react';
import { upsertMultifocal, getBrands, getModels, type MultifocalBrand, type MultifocalModel } from '../services/multifocales.api';
import { getMaterials, getTreatments, type CrystalMaterial, type CrystalTreatment } from '../services/crystals.api';

export const FormularioMultifocal: React.FC = () => {
    const [loading, setLoading] = useState(false);

    // Master Data States
    const [brands, setBrands] = useState<MultifocalBrand[]>([]);
    const [models, setModels] = useState<MultifocalModel[]>([]);
    const [materials, setMaterials] = useState<CrystalMaterial[]>([]);
    const [treatments, setTreatments] = useState<CrystalTreatment[]>([]);

    const [selectedBrandId, setSelectedBrandId] = useState<string>('');
    const [isManualPrice, setIsManualPrice] = useState(false);

    const initialForm = {
        marca: '',
        modelo: '',
        material: '',
        tratamiento: '',
        esfera_desde: 0,
        esfera_hasta: 0,
        cilindro_desde: 0,
        cilindro_hasta: 0,
        precio: 0,  // Precio Venta
        costo: 0,   // Precio Costo
        margen: 0   // Margen %
    };

    const [formData, setFormData] = useState(initialForm);

    // Initial Load
    useEffect(() => {
        const load = async () => {
            try {
                const [b, m, t] = await Promise.all([
                    getBrands(),
                    getMaterials(),
                    getTreatments()
                ]);
                setBrands(b.filter(x => x.activo));
                setMaterials(m.filter(x => x.is_active));
                setTreatments(t.filter(x => x.is_active));
            } catch (err) {
                console.error(err);
            }
        };
        load();
    }, []);

    // Load Models when Brand ID changes
    useEffect(() => {
        if (selectedBrandId) {
            getModels(selectedBrandId).then(data => setModels(data.filter(m => m.activo))).catch(console.error);
        } else {
            setModels([]);
        }
    }, [selectedBrandId]);

    // Calculator: Cost + Margin -> Price
    useEffect(() => {
        if (isManualPrice) return;
        const costo = Number(formData.costo);
        const margen = Number(formData.margen);
        if (costo > 0) {
            const precio = costo * (1 + margen / 100);
            setFormData(prev => ({ ...prev, precio: parseFloat(precio.toFixed(2)) }));
        }
    }, [formData.costo, formData.margen, isManualPrice]);

    // Reverse Calculator: Price + Cost -> Margin
    useEffect(() => {
        if (!isManualPrice) return;
        const costo = Number(formData.costo);
        const precio = Number(formData.precio);

        if (costo > 0 && precio > 0) {
            const margen = ((precio / costo) - 1) * 100;
            setFormData(prev => ({ ...prev, margen: parseFloat(margen.toFixed(2)) }));
        }
    }, [formData.precio, isManualPrice, formData.costo]);


    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;

        if (name === 'precio') setIsManualPrice(true);
        if (name === 'margen') setIsManualPrice(false); // Reset manual price override if editing margin directly

        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? parseFloat(value) : value
        }));
    };

    const handleBrandChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const brandId = e.target.value;
        const brandName = brands.find(b => b.marca_id === brandId)?.nombre || '';

        setSelectedBrandId(brandId);
        setFormData(prev => ({ ...prev, marca: brandName, modelo: '' }));
    };

    const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const modelId = e.target.value;
        const modelName = models.find(m => m.modelo_id === modelId)?.nombre || '';
        setFormData(prev => ({ ...prev, modelo: modelName }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.marca || !formData.modelo || !formData.material) {
            Swal.fire("Error", "Marca, Modelo y Material son obligatorios", "warning");
            return;
        }

        setLoading(true);
        try {
            // Remove 'margen' from payload if API doesn't support it, or keep it if it does
            // API expects: id, marca, modelo, material, tratamiento, esf_desde, etc.
            // It uses 'precio' and 'costo'. We don't send 'margen' unless API changes.
            const { margen, ...payload } = formData;

            await upsertMultifocal(payload as any);
            Swal.fire("Éxito", "Multifocal creado correctamente", "success");
            setFormData(initialForm);
            setSelectedBrandId('');
            setIsManualPrice(false);
        } catch (error: any) {
            console.error(error);
            Swal.fire("Error", "No se pudo guardar el multifocal", "error");
        } finally {
            setLoading(false);
        }
    };

    const inputClass = "w-full bg-crema text-gray-600 rounded-lg p-2.5 border border-slate-300 focus:ring-2 focus:ring-cyan-500 outline-none transition-all";
    const labelClass = "block text-sm font-medium text-cyan-100 mb-1 flex items-center gap-2";

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* DEFINICION DEL PRODUCTO */}
            <section className="border border-white rounded-xl p-6 shadow-xl relative">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                    <h1 className="text-6xl font-black">MULTI</h1>
                </div>
                <h3 className="text-lg font-medium text-crema mb-4 border-b border-white/10 pb-2">1. Definición del Producto</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Grupo 1: Identidad */}
                    <div className="space-y-4">
                        <div>
                            <label className={labelClass}><Tag size={16} /> Marca</label>
                            <select
                                name="marca"
                                value={selectedBrandId}
                                onChange={handleBrandChange}
                                className={inputClass}
                                required
                            >
                                <option value="">Seleccionar Marca...</option>
                                {brands.map(b => (
                                    <option key={b.marca_id} value={b.marca_id}>{b.nombre}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}><Tag size={16} /> Modelo</label>
                            <select
                                name="modelo"
                                value={models.find(m => m.nombre === formData.modelo)?.modelo_id || ''}
                                onChange={handleModelChange}
                                className={inputClass}
                                required
                                disabled={!selectedBrandId}
                            >
                                <option value="">Seleccionar Modelo...</option>
                                {models.map(m => (
                                    <option key={m.modelo_id} value={m.modelo_id}>{m.nombre}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Grupo 2: Características */}
                    <div className="space-y-4">
                        <div>
                            <label className={labelClass}><Disc size={16} /> Material</label>
                            <select
                                name="material"
                                value={formData.material}
                                onChange={handleChange}
                                className={inputClass}
                                required
                            >
                                <option value="">Seleccionar Material...</option>
                                {materials.map(m => (
                                    <option key={m.material_id} value={m.nombre}>{m.nombre}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}><Sparkles size={16} /> Tratamiento</label>
                            <select
                                name="tratamiento"
                                value={formData.tratamiento}
                                onChange={handleChange}
                                className={inputClass}
                            >
                                <option value="">Seleccionar Tratamiento...</option>
                                {treatments.map(t => (
                                    <option key={t.tratamiento_id} value={t.nombre}>{t.nombre}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </section>

            {/* RANGOS */}
            <section className="border border-white rounded-xl p-6 shadow-xl relative overflow-hidden">
                <h3 className="text-lg font-medium text-crema mb-4 border-b border-white/10 pb-2">2. Definición de Rangos</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-white/5 p-4 rounded-lg">
                        <label className="block text-center text-blanco font-bold mb-3">Rango Esférico (Esf)</label>
                        <div className="flex items-center gap-2">
                            <div className="flex-1">
                                <label className="text-xs text-crema mb-1 block">Desde</label>
                                <input type="number" step="0.25" name="esfera_desde" value={formData.esfera_desde} onChange={handleChange} className={inputClass} />
                            </div>
                            <span className="text-crema pt-5">➜</span>
                            <div className="flex-1">
                                <label className="text-xs text-crema mb-1 block">Hasta</label>
                                <input type="number" step="0.25" name="esfera_hasta" value={formData.esfera_hasta} onChange={handleChange} className={inputClass} />
                            </div>
                        </div>
                    </div>
                    <div className="bg-white/5 p-4 rounded-lg">
                        <label className="block text-center text-blanco font-bold mb-3">Rango Cilíndrico (Cil)</label>
                        <div className="flex items-center gap-2">
                            <div className="flex-1">
                                <label className="text-xs text-crema mb-1 block">Desde</label>
                                <input type="number" step="0.25" name="cilindro_desde" value={formData.cilindro_desde} onChange={handleChange} className={inputClass} />
                            </div>
                            <span className="text-crema pt-5">➜</span>
                            <div className="flex-1">
                                <label className="text-xs text-crema mb-1 block">Hasta</label>
                                <input type="number" step="0.25" name="cilindro_hasta" value={formData.cilindro_hasta} onChange={handleChange} className={inputClass} />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* PRECIOS */}
            <section className="border border-white rounded-xl p-6 shadow-xl bg-white/5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                    <div>
                        <label className="block text-sm text-gray-400 mb-2 font-bold text-yellow-400"><DollarSign size={14} className="inline" /> Costo (Opcional)</label>
                        <input type="number" name="costo" value={formData.costo} onChange={handleChange} className={`${inputClass} border-yellow-500/30 text-lg`} />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-200 mb-2 font-bold text-blue-400">Margen %</label>
                        <input type="number" step="0.01" name="margen" value={formData.margen} onChange={handleChange} className={`${inputClass} border-blue-500/30 text-lg`} />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-2 font-bold text-green-400"><DollarSign size={14} className="inline" /> Precio Venta</label>
                        <input type="number" name="precio" value={formData.precio} onChange={handleChange} className={`${inputClass} border-green-500/30 text-lg`} required />
                    </div>
                </div>
            </section>

            <div className="flex justify-end pt-4">
                <button type="submit" disabled={loading} className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-purple-900/30 active:scale-95 w-full md:w-auto text-lg flex items-center justify-center gap-2">
                    <Save size={20} />
                    {loading ? 'Guardando...' : 'Crear Multifocal'}
                </button>
            </div>
        </form>
    );
};
