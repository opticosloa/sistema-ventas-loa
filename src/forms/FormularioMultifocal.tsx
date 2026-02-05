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

    // Initial Form State
    const initialForm = {
        marca: '',
        modelo_id: '',
        material_id: '',
        tratamiento_id: '',
        precio: 0,
        costo: 0,
        margen: 0
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
        if (name === 'margen') setIsManualPrice(false);

        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? parseFloat(value) : value
        }));
    };

    const handleBrandChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const brandId = e.target.value;
        const brandName = brands.find(b => b.marca_id === brandId)?.nombre || '';

        setSelectedBrandId(brandId);
        setFormData(prev => ({ ...prev, marca: brandName, modelo_id: '' }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.modelo_id || !formData.material_id || !formData.precio) {
            Swal.fire("Error", "Marca, Modelo, Material y Precio son obligatorios", "warning");
            return;
        }

        const payload = {
            modelo_id: formData.modelo_id,
            material_id: formData.material_id,
            tratamiento_id: formData.tratamiento_id || undefined,
            precio: formData.precio,
            costo: formData.costo
        };

        setLoading(true);
        try {
            await upsertMultifocal(payload);
            Swal.fire("Éxito", "Multifocal guardado correctamente (Combinación Única).", "success");
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
            <section className="border border-white rounded-xl p-6 shadow-xl relative bg-slate-800/50 backdrop-blur-sm">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                    <h1 className="text-6xl font-black text-white">CATALOGO</h1>
                </div>
                <h3 className="text-lg font-medium text-crema mb-4 border-b border-white/10 pb-2">Definición de Catálogo Multifocal</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                name="modelo_id"
                                value={formData.modelo_id}
                                onChange={handleChange}
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
                    <div className="space-y-4">
                        <div>
                            <label className={labelClass}><Disc size={16} /> Material</label>
                            <select
                                name="material_id"
                                value={formData.material_id}
                                onChange={handleChange}
                                className={inputClass}
                                required
                            >
                                <option value="">Seleccionar Material...</option>
                                {materials.map(m => (
                                    <option key={m.material_id} value={m.material_id}>{m.nombre}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}><Sparkles size={16} /> Tratamiento (Opcional)</label>
                            <select
                                name="tratamiento_id"
                                value={formData.tratamiento_id}
                                onChange={handleChange}
                                className={inputClass}
                            >
                                <option value="">Sin Tratamiento / Estándar</option>
                                {treatments.map(t => (
                                    <option key={t.tratamiento_id} value={t.tratamiento_id}>{t.nombre}</option>
                                ))}
                            </select>
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
                    {loading ? 'Guardando...' : 'Guardar en Catálogo'}
                </button>
            </div>
        </form>
    );
};
