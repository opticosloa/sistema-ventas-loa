import React, { useState } from 'react';
import Swal from 'sweetalert2';
import LOAApi from '../../api/LOAApi';

interface ChangePasswordModalProps {
    onClose: () => void;
    targetEmail: string;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ onClose, targetEmail }) => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const isFormValid = () => {
        return (
            currentPassword.trim() !== '' &&
            newPassword.trim() !== '' &&
            confirmNewPassword.trim() !== '' &&
            newPassword === confirmNewPassword &&
            newPassword.length >= 6
        );
    };

    const handleConfirmChange = async (e: React.FormEvent) => {
        e.preventDefault();

        if (newPassword !== confirmNewPassword) {
            Swal.fire('Error', 'Las contraseñas nuevas no coinciden', 'error');
            return;
        }

        setLoading(true);

        try {
            const { data } = await LOAApi.post('/api/users/change-password', {
                email: targetEmail,
                currentPassword,
                password: newPassword
            });

            if (data.success) {
                await Swal.fire('Éxito', 'Contraseña actualizada correctamente', 'success');
                // Clean fields
                setCurrentPassword('');
                setNewPassword('');
                setConfirmNewPassword('');
                onClose();
            }
        } catch (error: any) {
            console.error(error);
            const errorMessage = error.response?.data?.error || 'Error al actualizar la contraseña';
            Swal.fire('Error', errorMessage, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-white rounded-xl shadow-2xl w-[95%] max-w-md p-6 z-[60]">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                >
                    ✕
                </button>

                <header className="mb-6 border-b pb-4">
                    <h2 className="text-xl font-bold text-gray-800">Cambiar Contraseña</h2>
                    <p className="text-sm text-gray-500">Ingresa tu contraseña actual y la nueva</p>
                </header>

                <form onSubmit={handleConfirmChange} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña Actual</label>
                        <input
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="input w-full"
                            required
                            autoComplete="current-password"
                            placeholder="••••••••"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nueva Contraseña (min. 6 caracteres)</label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="input w-full"
                            required
                            autoComplete="new-password"
                            placeholder="••••••••"
                            minLength={6}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Nueva Contraseña</label>
                        <input
                            type="password"
                            value={confirmNewPassword}
                            onChange={(e) => setConfirmNewPassword(e.target.value)}
                            className="input w-full"
                            required
                            autoComplete="new-password"
                            placeholder="••••••••"
                        />
                        {newPassword && confirmNewPassword && newPassword !== confirmNewPassword && (
                            <p className="text-red-500 text-xs mt-1">Las contraseñas no coinciden</p>
                        )}
                        {newPassword && confirmNewPassword && newPassword === confirmNewPassword && (
                            <p className="text-green-500 text-xs mt-1">Las contraseñas coinciden</p>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                        <button type="button" onClick={onClose} className="btn-secondary px-4">
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={!isFormValid() || loading}
                            className={`btn-primary px-4 flex items-center gap-2 ${(!isFormValid() || loading) ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                        >
                            {loading && <span className="animate-spin text-white">⟳</span>}
                            Actualizar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
