import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { X, Save, Layers, Tag, Disc, Sparkles, DollarSign } from 'lucide-react';
import { upsertMultifocal, getBrands, getModels, type Multifocal, type MultifocalBrand, type MultifocalModel } from '../../services/multifocales.api';

interface MultifocalModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    multifocalToEdit?: Multifocal | null;
}

export const MultifocalModal: React.FC<MultifocalModalProps> = ({ isOpen, onClose, onSuccess, multifocalToEdit }) => {
    const [loading, setLoading] = useState(false);

    // Master Data State
    const [brands, setBrands] = useState<MultifocalBrand[]>([]);
    const [models, setModels] = useState<MultifocalModel[]>([]);
    const [selectedBrandId, setSelectedBrandId] = useState<string>('');

    const [formData, setFormData] = useState({
        modelo_id: '',
        material: '',
        tratamiento: '',
        precio: 0,
        costo: 0
    });

    // Load Brands on open
    useEffect(() => {
        if (isOpen) {
            getBrands().then(data => setBrands(data.filter(b => b.activo))).catch(console.error);
        }
    }, [isOpen]);

    // Initialize Form Data
    useEffect(() => {
        if (isOpen) {
            if (multifocalToEdit) {
                setFormData({
                    modelo_id: multifocalToEdit.modelo_id,
                    material: multifocalToEdit.material,
                    tratamiento: multifocalToEdit.tratamiento || '',
                    precio: multifocalToEdit.precio,
                    costo: multifocalToEdit.costo || 0
                });
                // We need to resolve Brand from Model if possible, or just expect it to be passed
                // For now, let's assume we can try to find the brand via model lookup or other means
                // But simplified: the user selects brand again or we fetch models
            } else {
                setFormData({
                    modelo_id: '',
                    material: '',
                    tratamiento: '',
                    precio: 0,
                    costo: 0
                });
                setSelectedBrandId('');
                setModels([]);
            }
        }
    }, [isOpen, multifocalToEdit]);

    // Load Models when Brand ID changes
    useEffect(() => {
        if (selectedBrandId) {
            getModels(selectedBrandId).then(data => setModels(data.filter(m => m.activo))).catch(console.error);
        } else {
            setModels([]);
        }
    }, [selectedBrandId]);


    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? parseFloat(value) : value
        }));
    };

    const handleBrandChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const brandId = e.target.value;
        setSelectedBrandId(brandId);
        setFormData(prev => ({ ...prev, modelo_id: '' })); // Reset model when brand changes
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.modelo_id || !formData.material) {
            Swal.fire("Error", "Modelo y Material son obligatorios", "warning");
            return;
        }

        setLoading(true);
        try {
            const payload = {
                ...formData,
                id: multifocalToEdit ? multifocalToEdit.multifocal_id : undefined
            };
            await upsertMultifocal(payload as any);
            Swal.fire("Éxito", "Multifocal guardado correctamente", "success");
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error(error);
            Swal.fire("Error", "No se pudo guardar el multifocal", "error");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const inputClass = "w-full bg-slate-50 text-slate-900 rounded-lg p-2.5 border border-slate-300 focus:ring-2 focus:ring-cyan-500 outline-none";
    const labelClass = "block text-sm font-medium text-cyan-100 mb-1 flex items-center gap-2";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-600 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-700 bg-slate-800">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Layers size={24} className="text-cyan-400" />
                        {multifocalToEdit ? 'Editar Multifocal' : 'Nuevo Multifocal'}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Form */}
                <div className="p-6 overflow-y-auto custom-scrollbar">
                    <form onSubmit={handleSubmit} className="space-y-6">

                        {/* Grupo 1: Identidad (Selects from Master Data) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}><Tag size={14} /> Marca *</label>
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
                                <label className={labelClass}><Tag size={14} /> Modelo *</label>
                                <select
                                    name="modelo_id"
                                    value={formData.modelo_id}
                                    onChange={e => setFormData(prev => ({ ...prev, modelo_id: e.target.value }))}
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}><Disc size={14} /> Material *</label>
                                <input name="material" value={formData.material} onChange={handleChange} className={inputClass} placeholder="Ej: Orgánico 1.67" required />
                            </div>
                            <div>
                                <label className={labelClass}><Sparkles size={14} /> Tratamiento</label>
                                <input name="tratamiento" value={formData.tratamiento} onChange={handleChange} className={inputClass} placeholder="Ej: Blue Cut" />
                            </div>
                        </div>

                        {/* Grupo 4: Económico */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}><DollarSign size={14} /> Precio Venta *</label>
                                <input type="number" name="precio" value={formData.precio} onChange={handleChange} className={inputClass} required />
                            </div>
                            <div>
                                <label className={labelClass}><DollarSign size={14} /> Costo</label>
                                <input type="number" name="costo" value={formData.costo} onChange={handleChange} className={inputClass} />
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-300 hover:text-white transition-colors">Cancelar</button>
                            <button type="submit" disabled={loading} className="px-6 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg shadow-lg font-bold flex items-center gap-2 disabled:opacity-50">
                                <Save size={18} /> {loading ? 'Guardando...' : 'Guardar'}
                            </button>
                        </div>

                    </form>
                </div>
            </div>
        </div>
    );
};
