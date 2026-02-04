import React, { useState } from 'react';
import Swal from 'sweetalert2';
import LOAApi from '../../api/LOAApi';

interface MaxDiscountModalProps {
    userId: string;
    initialDiscount: number;
    onClose: () => void;
    onSuccess: () => void;
}

export const MaxDiscountModal: React.FC<MaxDiscountModalProps> = ({ userId, initialDiscount, onClose, onSuccess }) => {
    const [maxDiscount, setMaxDiscount] = useState<number>(initialDiscount);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await LOAApi.put(`/api/users/${userId}/max-descuento`, {
                max_descuento: maxDiscount
            });
            Swal.fire('Exito', 'Descuento máximo actualizado correctamente', 'success');
        } catch (error) {
            console.error("Error updating max discount:", error);
            Swal.fire("Error", "Error al actualizar el descuento máximo. Intente nuevamente.", "error");
        } finally {
            setLoading(false);
            onClose();
            onSuccess();
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-lg shadow-xl w-[90%] max-w-sm p-6 z-[70]">
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
                >
                    ✕
                </button>

                <h3 className="text-lg font-semibold mb-4 text-gray-800">Definir Descuento Máximo</h3>

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Porcentaje Máximo (%)
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                value={maxDiscount}
                                onChange={(e) => setMaxDiscount(parseFloat(e.target.value) || 0)}
                                className="input w-full pr-8"
                                autoFocus
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">%</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            Este es el porcentaje máximo de descuento que el empleado podrá aplicar en una venta.
                        </p>
                    </div>

                    <div className="flex gap-3 justify-end mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn-secondary"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary flex items-center gap-2"
                        >
                            {loading ? 'Guardando...' : 'Guardar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
