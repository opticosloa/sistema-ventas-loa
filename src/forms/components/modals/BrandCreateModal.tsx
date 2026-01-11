import React, { useState } from 'react';
import { X, Tag, Save } from 'lucide-react';
import LOAApi from '../../../api/LOAApi';
import type { Brand } from '../../../types/Marcas';

interface BrandCreateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (brand: Brand) => void;
    initialName?: string;
}

export const BrandCreateModal: React.FC<BrandCreateModalProps> = ({ isOpen, onClose, onSuccess, initialName = '' }) => {
    const [loading, setLoading] = useState(false);
    const [nombre, setNombre] = useState(initialName);

    // Sync if initialName changes and modal opens (though usually mounted conditionally or state reset)
    React.useEffect(() => {
        if (isOpen) setNombre(initialName);
    }, [initialName, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!nombre.trim()) {
            alert("El nombre de la marca es obligatorio");
            return;
        }

        setLoading(true);
        try {
            // Using generic post, assuming backend handles null/undefined provider_id
            const { data } = await LOAApi.post('/api/brands', { nombre });

            if (data.success) {
                // Assuming data.result is the created brand or array with 1 item
                // Usually for stored procedures returning rows, it might be data.result.rows[0] or data.result[0]
                // Based on BrandController: res.json({ success: true, result });
                // If sp_marca_crear returns the row, it's likely inside result.rows[0] or result directly if helper handles it.
                // Let's assume standard behavior:
                const newBrand = Array.isArray(data.result) ? data.result[0] : (data.result.rows ? data.result.rows[0] : data.result);

                alert("Marca creada correctamente");
                onSuccess(newBrand);
                onClose();
            } else {
                alert("Error al crear marca");
            }
        } catch (error: any) {
            console.error(error);
            const msg = error.response?.data?.error?.message || error.message || '';
            alert("Error al crear marca: " + msg);
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
        </div>
    );
};
