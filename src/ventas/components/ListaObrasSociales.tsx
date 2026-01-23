import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Loader2, Building, Globe, CheckCircle, XCircle } from 'lucide-react';
import { getObrasSociales, saveObraSocial, deleteObraSocial } from '../../services/obrasSociales.api';
import Swal from 'sweetalert2';
import { useAppSelector } from '../../hooks/useAppDispatch';
import type { ObraSocial } from '../../types/ObraSocial';

export const ListaObrasSociales: React.FC = () => {
    const [obrasSociales, setObrasSociales] = useState<ObraSocial[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingObraSocial, setEditingObraSocial] = useState<ObraSocial | null>(null);

    const { role } = useAppSelector((state: any) => state.auth);
    const isSuperAdmin = role === 'SUPERADMIN';

    // Form State
    const [formData, setFormData] = useState<Partial<ObraSocial>>({
        nombre: '',
        plan: '',
        sitio_web: '',
        instrucciones: '',
        activo: true,
        monto_cobertura_total: 0,
        cobertura_armazon_max: 0,
        cobertura_cristal_max: 0,
        cobertura: {
            porcentaje_cristales: 0,
            porcentaje_armazones: 0
        }
    });

    // Local state for numeric inputs to handle "0" better or just bind directly.
    const [percCristales, setPercCristales] = useState<number>(0);
    const [percArmazones, setPercArmazones] = useState<number>(0);

    const [maxCristales, setMaxCristales] = useState<number>(0);
    const [maxArmazones, setMaxArmazones] = useState<number>(0);
    const [montoCobertura, setMontoCobertura] = useState<number>(0);

    const loadObrasSociales = async () => {
        setLoading(true);
        try {
            const data = await getObrasSociales();
            setObrasSociales(data);
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'No se pudieron cargar las obras sociales', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadObrasSociales();
    }, []);

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
    };

    const filteredObrasSociales = obrasSociales.filter(os =>
        os.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (os.plan && os.plan.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const handleOpenModal = (obraSocial?: ObraSocial) => {
        if (obraSocial) {
            setEditingObraSocial(obraSocial);
            setFormData(obraSocial);
            setPercCristales(obraSocial.cobertura?.porcentaje_cristales || 0);
            setPercArmazones(obraSocial.cobertura?.porcentaje_armazones || 0);
            setMaxCristales(obraSocial.cobertura_cristal_max || 0);
            setMaxArmazones(obraSocial.cobertura_armazon_max || 0);
            setMontoCobertura(obraSocial.monto_cobertura_total || 0);
        } else {
            setEditingObraSocial(null);
            setFormData({ nombre: '', plan: '', sitio_web: '', instrucciones: '', activo: true, cobertura: { porcentaje_cristales: 0, porcentaje_armazones: 0 }, monto_cobertura_total: 0, cobertura_cristal_max: 0, cobertura_armazon_max: 0 });
            setPercCristales(0);
            setPercArmazones(0);
            setMaxCristales(0);
            setMaxArmazones(0);
            setMontoCobertura(0);
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Security check for creation
        if (!editingObraSocial && !isSuperAdmin) {
            Swal.fire('Error', 'Solo los SUPERADMIN pueden crear Obras Sociales', 'error');
            return;
        }

        try {
            // Package coverage
            const finalFormData = {
                ...formData,
                monto_cobertura_total: montoCobertura,
                cobertura_armazon_max: maxArmazones,
                cobertura_cristal_max: maxCristales,
                cobertura: {
                    porcentaje_cristales: percCristales,
                    porcentaje_armazones: percArmazones
                }
            };

            // For creation, ensure id is not sent or is null. For update, it uses the existing one.
            const payload = editingObraSocial
                ? { ...finalFormData, obra_social_id: editingObraSocial.obra_social_id }
                : { ...finalFormData, obra_social_id: undefined };

            await saveObraSocial(payload);

            Swal.fire(
                editingObraSocial ? 'Actualizado' : 'Creado',
                `Obra Social ${editingObraSocial ? 'actualizada' : 'creada'} correctamente`,
                'success'
            );
            setIsModalOpen(false);
            loadObrasSociales();
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'Hubo un error al guardar la Obra Social', 'error');
        }
    };

    const handleDelete = async (id: string) => {
        const result = await Swal.fire({
            title: '¿Estás seguro?',
            text: "No podrás revertir esto",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await deleteObraSocial(id);
                Swal.fire('Eliminado', 'La obra social ha sido eliminada.', 'success');
                loadObrasSociales();
            } catch (error) {
                Swal.fire('Error', 'No se pudo eliminar la obra social.', 'error');
            }
        }
    };

    const inputClass = "w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-cyan-500 outline-none";

    return (
        <div className="min-h-screen bg-slate-900 p-6 fade-in rounded-lg">
            <div className="max-w-6xl mx-auto">
                <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                            <Building className="text-cyan-400" />
                            Gestión de Obras Sociales
                        </h1>
                        <p className="text-slate-400 mt-2">Administra las obras sociales, sus planes y coberturas.</p>
                    </div>
                    {isSuperAdmin && (
                        <button
                            onClick={() => handleOpenModal()}
                            className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-bold shadow-lg shadow-cyan-900/20"
                        >
                            <Plus size={20} />
                            Nueva Obra Social
                        </button>
                    )}
                </header>

                <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 shadow-xl mb-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o plan..."
                            value={searchTerm}
                            onChange={handleSearch}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-cyan-500 outline-none"
                        />
                    </div>
                </div>

                <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-slate-300">
                            <thead className="bg-slate-900/50 text-slate-400 uppercase text-xs">
                                <tr>
                                    <th className="px-6 py-4">Nombre</th>
                                    <th className="px-6 py-4">Plan</th>
                                    <th className="px-6 py-4">Cobertura Fija</th>
                                    <th className="px-6 py-4">Cobertura %</th>
                                    <th className="px-6 py-4">Instrucciones</th>
                                    <th className="px-6 py-4 text-center">Estado</th>
                                    <th className="px-6 py-4 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700">
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="text-center py-8">
                                            <Loader2 className="animate-spin mx-auto text-cyan-500" size={32} />
                                        </td>
                                    </tr>
                                ) : filteredObrasSociales.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="text-center py-8 text-slate-500">
                                            No se encontraron obras sociales.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredObrasSociales.map(os => (
                                        <tr key={os.obra_social_id} className="hover:bg-slate-700/30 transition-colors">
                                            <td className="px-6 py-4 font-medium text-white">{os.nombre}</td>
                                            <td className="px-6 py-4 text-sm text-cyan-300">{os.plan || '-'}</td>
                                            <td className="px-6 py-4 text-sm text-green-400 font-bold">
                                                {os.monto_cobertura_total && Number(os.monto_cobertura_total) > 0
                                                    ? `$${Number(os.monto_cobertura_total).toLocaleString()}`
                                                    : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-xs">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-slate-300">Cristales: <span className="text-green-400 font-bold">{os.cobertura?.porcentaje_cristales || 0}%</span></span>
                                                    <span className="text-slate-300">Armazones: <span className="text-green-400 font-bold">{os.cobertura?.porcentaje_armazones || 0}%</span></span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm max-w-xs truncate" title={os.instrucciones || ''}>
                                                {os.instrucciones || '-'}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {os.activo ?
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs">
                                                        <CheckCircle size={12} /> Activo
                                                    </span> :
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/20 text-red-400 text-xs">
                                                        <XCircle size={12} /> Inactivo
                                                    </span>
                                                }
                                            </td>
                                            <td className="px-6 py-4 text-right space-x-2">
                                                <button
                                                    onClick={() => handleOpenModal(os)}
                                                    className="text-cyan-400 hover:text-cyan-300 p-1 hover:bg-cyan-400/10 rounded disabled:opacity-50"
                                                >
                                                    <Edit size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(os.obra_social_id)}
                                                    className="text-red-400 hover:text-red-300 p-1 hover:bg-red-400/10 rounded disabled:opacity-50"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg border border-slate-700 animate-fade-in-down max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800 sticky top-0 z-10">
                            <h2 className="text-xl font-bold text-white">
                                {editingObraSocial ? 'Editar Obra Social' : 'Nueva Obra Social'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Nombre *</label>
                                    <input
                                        required
                                        value={formData.nombre || ''}
                                        onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                                        className={inputClass}
                                        placeholder="Ej. OSDE"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Plan</label>
                                    <input
                                        value={formData.plan || ''}
                                        onChange={e => setFormData({ ...formData, plan: e.target.value })}
                                        className={inputClass}
                                        placeholder="Ej. 210"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Sitio Web</label>
                                <div className="relative">
                                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        value={formData.sitio_web || ''}
                                        onChange={e => setFormData({ ...formData, sitio_web: e.target.value })}
                                        className={`${inputClass} pl-10`}
                                        placeholder="www.ejemplo.com"
                                    />
                                </div>
                            </div>

                            <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-700">
                                <h3 className="text-sm font-semibold text-cyan-400 mb-3 uppercase tracking-wider">Cobertura Automática</h3>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div className="col-span-2">
                                        <label className="block text-xs text-slate-400 mb-1">Monto Cobertura Fija ($)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={montoCobertura || 0}
                                            onChange={e => setMontoCobertura(e.target.value === '' ? 0 : parseFloat(e.target.value))}
                                            onFocus={e => e.target.select()}
                                            className={inputClass}
                                            placeholder="Ej: 35000"
                                        />
                                        <p className="text-slate-500 text-[10px] mt-1">Si es mayor a 0, se aplica como pago fijo automáticamente.</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                                        <label className="block text-xs font-bold text-cyan-300 mb-2 uppercase">Cristales</label>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-xs text-slate-400 mb-1">Porcentaje (%)</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    value={percCristales}
                                                    onChange={e => setPercCristales(Number(e.target.value))}
                                                    className={inputClass}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-slate-400 mb-1">Tope Máximo ($)</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={maxCristales || 0}
                                                    onChange={e => setMaxCristales(e.target.value === '' ? 0 : parseFloat(e.target.value))}
                                                    onFocus={e => e.target.select()}
                                                    className={inputClass}
                                                    placeholder="Sin Límite"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                                        <label className="block text-xs font-bold text-cyan-300 mb-2 uppercase">Armazones</label>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-xs text-slate-400 mb-1">Porcentaje (%)</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    value={percArmazones}
                                                    onChange={e => setPercArmazones(Number(e.target.value))}
                                                    className={inputClass}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-slate-400 mb-1">Tope Máximo ($)</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={maxArmazones || 0}
                                                    onChange={e => setMaxArmazones(e.target.value === '' ? 0 : parseFloat(e.target.value))}
                                                    onFocus={e => e.target.select()}
                                                    className={inputClass}
                                                    placeholder="Sin Límite"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>


                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Instrucciones</label>
                                <textarea
                                    rows={3}
                                    value={formData.instrucciones || ''}
                                    onChange={e => setFormData({ ...formData, instrucciones: e.target.value })}
                                    className={inputClass}
                                    placeholder="Detalles sobre facturación..."
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="activo"
                                    checked={formData.activo}
                                    onChange={e => setFormData({ ...formData, activo: e.target.checked })}
                                    className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-cyan-600 focus:ring-cyan-500"
                                />
                                <label htmlFor="activo" className="text-slate-300">Activo</label>
                            </div>

                            <div className="flex justify-end pt-4 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg transition-colors"
                                >
                                    Guardar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
