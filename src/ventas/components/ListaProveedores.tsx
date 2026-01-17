import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Loader2, Building2 } from 'lucide-react';
import { getProviders, createProvider, updateProvider, deleteProvider, type Provider } from '../../services/providers.api';
import Swal from 'sweetalert2';

export const ListaProveedores: React.FC = () => {
    const [providers, setProviders] = useState<Provider[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProvider, setEditingProvider] = useState<Provider | null>(null);

    // Form State
    const [formData, setFormData] = useState<Partial<Provider>>({
        nombre: '',
        telefono: '',
        cuit: '',
        iva: '',
        contacto: '',
        condiciones: ''
    });

    const loadProviders = async () => {
        setLoading(true);
        try {
            const data = await getProviders();
            setProviders(data);
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'No se pudieron cargar los proveedores', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadProviders();
    }, []);

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
    };

    const filteredProviders = providers.filter(p =>
        p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.cuit?.includes(searchTerm)
    );

    const handleOpenModal = (provider?: Provider) => {
        if (provider) {
            setEditingProvider(provider);
            setFormData(provider);
        } else {
            setEditingProvider(null);
            setFormData({ nombre: '', telefono: '', cuit: '', iva: '', contacto: '', condiciones: '' });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingProvider) {
                await updateProvider(editingProvider.proveedor_id, formData);
                Swal.fire('Actualizado', 'Proveedor actualizado correctamente', 'success');
            } else {
                await createProvider(formData as Provider);
                Swal.fire('Creado', 'Proveedor creado correctamente', 'success');
            }
            setIsModalOpen(false);
            loadProviders();
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'Hubo un error al guardar el proveedor', 'error');
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
                await deleteProvider(id);
                Swal.fire('Eliminado', 'El proveedor ha sido eliminado.', 'success');
                loadProviders();
            } catch (error) {
                Swal.fire('Error', 'No se pudo eliminar el proveedor.', 'error');
            }
        }
    };

    const inputClass = "w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-cyan-500 outline-none";

    return (
        <div className="min-h-screen bg-slate-900 p-6 fade-in">
            <div className="max-w-6xl mx-auto">
                <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                            <Building2 className="text-cyan-400" />
                            Gestión de Proveedores
                        </h1>
                        <p className="text-slate-400 mt-2">Administra tus proveedores y sus datos de contacto.</p>
                    </div>
                    <button
                        onClick={() => handleOpenModal()}
                        className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-bold shadow-lg shadow-cyan-900/20"
                    >
                        <Plus size={20} />
                        Nuevo Proveedor
                    </button>
                </header>

                <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 shadow-xl mb-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o CUIT..."
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
                                    <th className="px-6 py-4">Razón Social</th>
                                    <th className="px-6 py-4">CUIT / IVA</th>
                                    <th className="px-6 py-4">Contacto</th>
                                    <th className="px-6 py-4">Teléfono</th>
                                    <th className="px-6 py-4 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="text-center py-8">
                                            <Loader2 className="animate-spin mx-auto text-cyan-500" size={32} />
                                        </td>
                                    </tr>
                                ) : filteredProviders.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="text-center py-8 text-slate-500">
                                            No se encontraron proveedores.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredProviders.map(provider => (
                                        <tr key={provider.proveedor_id} className="hover:bg-slate-700/30 transition-colors">
                                            <td className="px-6 py-4 font-medium text-white">{provider.nombre}</td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm">{provider.cuit || '-'}</div>
                                                <div className="text-xs text-slate-500">{provider.iva || '-'}</div>
                                            </td>
                                            <td className="px-6 py-4">{provider.contacto || '-'}</td>
                                            <td className="px-6 py-4">{provider.telefono || '-'}</td>
                                            <td className="px-6 py-4 text-right space-x-2">
                                                <button
                                                    onClick={() => handleOpenModal(provider)}
                                                    className="text-cyan-400 hover:text-cyan-300 p-1 hover:bg-cyan-400/10 rounded disabled:opacity-50"
                                                >
                                                    <Edit size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(provider.proveedor_id)}
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
                    <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg border border-slate-700 animate-fade-in-down">
                        <div className="p-6 border-b border-slate-700 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-white">
                                {editingProvider ? 'Editar Proveedor' : 'Nuevo Proveedor'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Razón Social / Nombre *</label>
                                <input
                                    required
                                    value={formData.nombre}
                                    onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                                    className={inputClass}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">CUIT</label>
                                    <input
                                        value={formData.cuit}
                                        onChange={e => setFormData({ ...formData, cuit: e.target.value })}
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Condición IVA</label>
                                    <select
                                        value={formData.iva}
                                        onChange={e => setFormData({ ...formData, iva: e.target.value })}
                                        className={inputClass}
                                    >
                                        <option value="">Seleccionar...</option>
                                        <option value="Responsable Inscripto">Responsable Inscripto</option>
                                        <option value="Monotributista">Monotributista</option>
                                        <option value="Exento">Exento</option>
                                        <option value="Consumidor Final">Consumidor Final</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Teléfono</label>
                                    <input
                                        value={formData.telefono}
                                        onChange={e => setFormData({ ...formData, telefono: e.target.value })}
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Persona de Contacto</label>
                                    <input
                                        value={formData.contacto}
                                        onChange={e => setFormData({ ...formData, contacto: e.target.value })}
                                        className={inputClass}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Condiciones de Pago / Notas</label>
                                <textarea
                                    rows={3}
                                    value={formData.condiciones}
                                    onChange={e => setFormData({ ...formData, condiciones: e.target.value })}
                                    className={inputClass}
                                />
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
