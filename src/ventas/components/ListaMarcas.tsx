import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Loader2, Tag, Truck } from 'lucide-react';
import { getBrands, createBrand, updateBrand, deleteBrand, type Brand } from '../../services/brands.api';
import { getProviders, type Provider } from '../../services/providers.api';
import Swal from 'sweetalert2';

export const ListaMarcas: React.FC = () => {
    const [brands, setBrands] = useState<Brand[]>([]);
    const [providers, setProviders] = useState<Provider[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBrand, setEditingBrand] = useState<Brand | null>(null);

    // Form State
    const [formData, setFormData] = useState<Partial<Brand>>({
        nombre: '',
        proveedor_id: ''
    });

    const loadData = async () => {
        setLoading(true);
        try {
            const [brandsData, providersData] = await Promise.all([getBrands(), getProviders()]);
            setBrands(brandsData);
            setProviders(providersData);
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'No se pudieron cargar los datos', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
    };

    const filteredBrands = brands.filter(b =>
        b.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleOpenModal = (brand?: Brand) => {
        if (brand) {
            setEditingBrand(brand);
            setFormData(brand);
        } else {
            setEditingBrand(null);
            setFormData({ nombre: '', proveedor_id: '' });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingBrand) {
                await updateBrand(editingBrand.marca_id, formData);
                Swal.fire('Actualizado', 'Marca actualizada correctamente', 'success');
            } else {
                await createBrand(formData as Brand);
                Swal.fire('Creado', 'Marca creada correctamente', 'success');
            }
            setIsModalOpen(false);
            loadData();
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'Hubo un error al guardar la marca', 'error');
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
                await deleteBrand(id);
                Swal.fire('Eliminado', 'La marca ha sido eliminada.', 'success');
                loadData();
            } catch (error) {
                Swal.fire('Error', 'No se pudo eliminar la marca.', 'error');
            }
        }
    };

    const getProviderName = (id?: string) => {
        if (!id) return '-';
        return providers.find(p => p.proveedor_id === id)?.nombre || 'Desconocido';
    };

    const inputClass = "w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-cyan-500 outline-none";

    return (
        <div className="min-h-screen bg-slate-900 p-6 fade-in">
            <div className="max-w-5xl mx-auto">
                <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                            <Tag className="text-cyan-400" />
                            Gestión de Marcas
                        </h1>
                        <p className="text-slate-400 mt-2">Administra las marcas y asócialas a proveedores.</p>
                    </div>
                    <button
                        onClick={() => handleOpenModal()}
                        className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-bold shadow-lg shadow-cyan-900/20"
                    >
                        <Plus size={20} />
                        Nueva Marca
                    </button>
                </header>

                <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 shadow-xl mb-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar marca..."
                            value={searchTerm}
                            onChange={handleSearch}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-cyan-500 outline-none"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {loading ? (
                        <div className="col-span-full flex justify-center py-12">
                            <Loader2 className="animate-spin text-cyan-500" size={32} />
                        </div>
                    ) : filteredBrands.length === 0 ? (
                        <div className="col-span-full text-center py-12 text-slate-500">
                            No se encontraron marcas.
                        </div>
                    ) : (
                        filteredBrands.map(brand => (
                            <div key={brand.marca_id} className="bg-slate-800 rounded-xl p-5 border border-slate-700 shadow-lg hover:shadow-cyan-900/10 transition-shadow">
                                <div className="flex justify-between items-start mb-3">
                                    <h3 className="text-lg font-bold text-white">{brand.nombre}</h3>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => handleOpenModal(brand)}
                                            className="text-cyan-400 hover:bg-cyan-400/10 p-1 rounded transition-colors"
                                        >
                                            <Edit size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(brand.marca_id)}
                                            className="text-red-400 hover:bg-red-400/10 p-1 rounded transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-slate-400">
                                    <Truck size={14} />
                                    <span>{getProviderName(brand.proveedor_id)}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-md border border-slate-700 animate-fade-in-down">
                        <div className="p-6 border-b border-slate-700 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-white">
                                {editingBrand ? 'Editar Marca' : 'Nueva Marca'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Nombre de Marca *</label>
                                <input
                                    required
                                    value={formData.nombre}
                                    onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                                    className={inputClass}
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Proveedor Asociado</label>
                                <select
                                    value={formData.proveedor_id || ''}
                                    onChange={e => setFormData({ ...formData, proveedor_id: e.target.value })}
                                    className={inputClass}
                                >
                                    <option value="">Sin proveedor</option>
                                    {providers.map(p => (
                                        <option key={p.proveedor_id} value={p.proveedor_id}>(P-{p.proveedor_id.slice(0, 4)}) {p.nombre}</option>
                                    ))}
                                </select>
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
