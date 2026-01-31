import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { X, Tag, Save, Plus } from 'lucide-react';
import LOAApi from '../../../api/LOAApi';
import type { Brand } from '../../../types/Marcas';
import { getProviders, type Provider } from '../../../services/providers.api';
import { ProviderCreateModal } from './ProviderCreateModal';

interface BrandCreateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (brand: Brand) => void;
    initialName?: string;
}

export const BrandCreateModal: React.FC<BrandCreateModalProps> = ({ isOpen, onClose, onSuccess, initialName = '' }) => {
    const [loading, setLoading] = useState(false);
    const [nombre, setNombre] = useState(initialName);
    const [providers, setProviders] = useState<Provider[]>([]);
    const [selectedProviderId, setSelectedProviderId] = useState<string>('');
    const [isProviderModalOpen, setIsProviderModalOpen] = useState(false);

    // Sync if initialName changes and modal opens
    useEffect(() => {
        if (isOpen) {
            setNombre(initialName);
            loadProviders();
        }
    }, [initialName, isOpen]);

    const loadProviders = async () => {
        try {
            const data = await getProviders();
            setProviders(data || []);
        } catch (error) {
            console.error("Error loading providers", error);
        }
    };

    const handleProviderSuccess = (newProvider: Provider) => {
        setProviders(prev => [...prev, newProvider]);
        setSelectedProviderId(newProvider.proveedor_id); // Auto select new provider
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!nombre.trim()) {
            Swal.fire("Info", "El nombre de la marca es obligatorio", "info");
            return;
        }

        if (!selectedProviderId) {
            Swal.fire("Info", "Debe seleccionar un proveedor", "info");
            return;
        }

        setLoading(true);
        try {
            // Using generic post
            const { data } = await LOAApi.post('/api/brands', {
                nombre,
                proveedor_id: selectedProviderId
            });

            console.log("Brand Create Response:", data);

            // Correct success check logic
            if (data && (data.success || data.marca_id)) {
                let newBrand: Brand;

                // Handle different response structures gracefully
                if (data.result) {
                    if (Array.isArray(data.result)) newBrand = data.result[0];
                    else if ('rows' in data.result && Array.isArray(data.result.rows)) newBrand = data.result.rows[0];
                    else newBrand = data.result;
                } else if (data.marca_id) {
                    // Sometimes sp returns id directly or wrapped differently
                    // If backend returns just ID, we might construct the object mostly manually or refecth
                    // Assuming standard response wrapper based on controller usually
                    const createdId = typeof data.marca_id === 'object' ? data.marca_id?.sp_marca_crear || data.marca_id : data.marca_id;

                    newBrand = {
                        marca_id: createdId,
                        nombre: nombre.trim().toUpperCase(),
                        proveedor_id: selectedProviderId
                    } as any;
                } else {
                    newBrand = data as any;
                }

                Swal.fire("Éxito", "Marca creada correctamente", "success");

                // Ensure we pass a valid object back
                if (onSuccess) onSuccess(newBrand);
                onClose();
            } else {
                Swal.fire("Error", "Error al crear marca: Respuesta inesperada", "error");
            }
        } catch (error: any) {
            console.error(error);
            const msg = error.response?.data?.error?.message || error.message || '';
            Swal.fire("Error", "Error al crear marca: " + msg, "error");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white/10 backdrop-blur-xl border border-white/60 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col">

                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-white/20 bg-cyan-900/40">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Tag size={24} className="text-cyan-400" />
                        Nueva Marca
                    </h3>
                    <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="group">
                        <label className="block text-sm font-medium text-cyan-100 mb-1 ml-1">
                            Nombre de la Marca *
                        </label>
                        <input
                            type="text"
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            placeholder="Ej: Ray-Ban"
                            className="w-full bg-slate-50 text-slate-900 rounded-lg p-2.5 border border-slate-300 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
                            autoFocus
                        />
                    </div>

                    <div className="group">
                        <label className="block text-sm font-medium text-cyan-100 mb-1 ml-1">
                            Proveedor *
                        </label>
                        <div className="flex gap-2">
                            <select
                                value={selectedProviderId}
                                onChange={(e) => setSelectedProviderId(e.target.value)}
                                className="w-full bg-slate-50 text-slate-900 rounded-lg p-2.5 border border-slate-300 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
                            >
                                <option value="">Seleccione un proveedor</option>
                                {providers.map(p => (
                                    <option key={p.proveedor_id} value={p.proveedor_id}>
                                        {p.nombre}
                                    </option>
                                ))}
                            </select>
                            <button
                                type="button"
                                onClick={() => setIsProviderModalOpen(true)}
                                className="bg-cyan-600 hover:bg-cyan-500 text-white p-2.5 rounded-lg transition-colors border border-white/20"
                                title="Nuevo Proveedor"
                            >
                                <Plus size={20} />
                            </button>
                        </div>
                    </div>

                    <div className="pt-2 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg text-white hover:bg-white/10 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className={`
                                flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-white shadow-lg transition-transform active:scale-95
                                ${loading
                                    ? 'bg-gray-500 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500'
                                }
                            `}
                        >
                            {loading ? 'Guardando...' : (
                                <>
                                    <Save size={18} />
                                    Guardar
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>

            <ProviderCreateModal
                isOpen={isProviderModalOpen}
                onClose={() => setIsProviderModalOpen(false)}
                onSuccess={handleProviderSuccess}
            />
        </div>
    );
};
