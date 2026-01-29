import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import LOAApi from '../../api/LOAApi';
import { useAuthStore } from '../../hooks';
import { ChangePasswordModal } from './ChangePasswordModal';

interface ProfileEditModalProps {
    onClose: () => void;
    targetEmail?: string;
}

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({ onClose, targetEmail }) => {
    const { nombre, apellido, email: authEmail, role } = useAuthStore();
    const effectiveEmail = targetEmail || authEmail;

    const [formData, setFormData] = useState({
        nombre: nombre || '',
        apellido: apellido || '',
        telefono: '',
        direccion: '',
        fecha_nacimiento: ''
    });

    // Extra state for non-editable fields that are not in auth store
    const [extraInfo, setExtraInfo] = useState({
        cuenta_corriente: 0,
        role: role || ''
    });

    const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);

    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            if (!effectiveEmail) {
                setFetching(false);
                return;
            }
            try {
                const { data } = await LOAApi.get(`/api/users/profile/${effectiveEmail}`);
                if (data.success && data.result) {
                    const user = data.result;
                    setFormData(prev => ({
                        ...prev,
                        nombre: user.nombre || prev.nombre,
                        apellido: user.apellido || prev.apellido,
                        telefono: user.telefono || '',
                        direccion: user.direccion || '',
                        fecha_nacimiento: user.fecha_nacimiento ? new Date(user.fecha_nacimiento).toISOString().split('T')[0] : ''
                    }));
                    setExtraInfo({
                        cuenta_corriente: user.cuenta_corriente || 0,
                        role: user.rol || role || ''
                    });
                }
            } catch (error) {
                console.error("Error fetching profile:", error);
            } finally {
                setFetching(false);
            }
        };
        fetchProfile();
    }, [effectiveEmail]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data } = await LOAApi.put(`/api/users/profile/${effectiveEmail}`, formData);

            if (data.success) {
                Swal.fire("Éxito", "Perfil actualizado correctamente.", "success");

                if (!targetEmail || targetEmail === authEmail) {
                    window.location.reload();
                }
                onClose();
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            Swal.fire("Error", "Error al actualizar el perfil.", "error");
        } finally {
            setLoading(false);
        }
    };



    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-white rounded-xl shadow-2xl w-[95%] max-w-2xl p-6 z-50 overflow-y-auto max-h-[90vh]">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                >
                    ✕
                </button>

                <header className="mb-6 border-b pb-4">
                    <h2 className="text-2xl font-bold text-gray-800">Editar Perfil</h2>
                    <p className="text-sm text-gray-500">Actualiza tu información personal</p>
                </header>

                <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* Read Only Section */}
                    <div className="col-span-1 md:col-span-2 bg-gray-50 p-4 rounded-lg border border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="col-span-1 md:col-span-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                            Información de Cuenta (No editable)
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-500 mb-1">Email</label>
                            <input type="text" value={effectiveEmail || ''} disabled className="input-disabled w-full bg-gray-100 text-gray-500 cursor-not-allowed" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-500 mb-1">Rol</label>
                            <input type="text" value={extraInfo.role || ''} disabled className="input-disabled w-full bg-gray-100 text-gray-500 cursor-not-allowed" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-500 mb-1">Cuenta Corriente</label>
                            <input type="text" value={fetching ? '...' : `$ ${extraInfo.cuenta_corriente || 0}`} disabled className="input-disabled w-full bg-gray-100 text-gray-500 cursor-not-allowed" />
                        </div>


                    </div>

                    {/* Editable Fields */}
                    <div className="md:col-span-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mt-2">
                        Información Personal
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                        <input
                            name="nombre"
                            type="text"
                            value={formData.nombre}
                            onChange={handleChange}
                            className="input w-full"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Apellido</label>
                        <input
                            name="apellido"
                            type="text"
                            value={formData.apellido}
                            onChange={handleChange}
                            className="input w-full"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                        <input
                            name="telefono"
                            type="tel"
                            value={formData.telefono}
                            onChange={handleChange}
                            className="input w-full"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Nacimiento</label>
                        <input
                            name="fecha_nacimiento"
                            type="date"
                            value={formData.fecha_nacimiento}
                            onChange={handleChange}
                            className="input w-full"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                        <input
                            name="direccion"
                            type="text"
                            value={formData.direccion}
                            onChange={handleChange}
                            className="input w-full"
                        />
                    </div>

                    <div className="md:col-span-2 flex justify-end gap-3 mt-4 pt-4 border-t">
                        <button
                            type="button"
                            onClick={() => setShowChangePasswordModal(true)}
                            className="btn-secondary px-4 mr-auto border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                        >
                            Cambiar Contraseña
                        </button>

                        <button type="button" onClick={onClose} className="btn-secondary px-6">
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary px-6 flex items-center gap-2"
                        >
                            {loading && <span className="animate-spin text-white">⟳</span>}
                            Guardar Cambios
                        </button>
                    </div>

                </form>
            </div>

            {showChangePasswordModal && (
                <ChangePasswordModal
                    onClose={() => setShowChangePasswordModal(false)}
                    targetEmail={effectiveEmail || ''}
                />
            )}
        </div>
    );
};
