import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { createProvider, updateProvider, type Provider } from '../../../services/providers.api';

interface ProviderCreateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (provider: Provider) => void;
    initialData?: Provider | null;
}

export const ProviderCreateModal: React.FC<ProviderCreateModalProps> = ({ isOpen, onClose, onSuccess, initialData }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<Partial<Provider>>({
        nombre: '',
        telefono: '',
        cuit: '',
        iva: '',
        contacto: '',
        condiciones: ''
    });

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setFormData(initialData);
            } else {
                setFormData({ nombre: '', telefono: '', cuit: '', iva: '', contacto: '', condiciones: '' });
            }
        }
    }, [isOpen, initialData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            let result: Provider;
            if (initialData?.proveedor_id) {
                result = await updateProvider(initialData.proveedor_id, formData);
                Swal.fire('Actualizado', 'Proveedor actualizado correctamente', 'success');
            } else {
                result = await createProvider(formData as Provider);
                Swal.fire('Creado', 'Proveedor creado correctamente', 'success');
            }
            onSuccess(result);
            onClose();
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'Hubo un error al guardar el proveedor', 'error');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const inputClass = "w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-cyan-500 outline-none";

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg border border-slate-700 animate-fade-in-down">
                <div className="p-6 border-b border-slate-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white">
                        {initialData ? 'Editar Proveedor' : 'Nuevo Proveedor'}
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm text-slate-400 mb-1">Razón Social / Nombre *</label>
                        <input
                            required
                            value={formData.nombre || ''}
                            onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                            className={inputClass}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">CUIT</label>
                            <input
                                value={formData.cuit || ''}
                                onChange={e => setFormData({ ...formData, cuit: e.target.value })}
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Condición IVA</label>
                            <select
                                value={formData.iva || ''}
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
                                value={formData.telefono || ''}
                                onChange={e => setFormData({ ...formData, telefono: e.target.value })}
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Persona de Contacto</label>
                            <input
                                value={formData.contacto || ''}
                                onChange={e => setFormData({ ...formData, contacto: e.target.value })}
                                className={inputClass}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm text-slate-400 mb-1">Condiciones de Pago / Notas</label>
                        <textarea
                            rows={3}
                            value={formData.condiciones || ''}
                            onChange={e => setFormData({ ...formData, condiciones: e.target.value })}
                            className={inputClass}
                        />
                    </div>

                    <div className="flex justify-end pt-4 gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg transition-colors flex items-center justify-center min-w-[100px]"
                        >
                            {loading ? 'Guardando...' : 'Guardar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
