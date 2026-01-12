import React, { useState } from 'react';
import LOAApi from '../../api/LOAApi';

interface SecurityPinModalProps {
    userId: number;
    userName: string;
    onClose: () => void;
    onSuccess: () => void;
}

export const SecurityPinModal: React.FC<SecurityPinModalProps> = ({ userId, userName, onClose, onSuccess }) => {
    const [pin, setPin] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPin, setShowPin] = useState(false);

    // Generar PIN numérico aleatorio de 6 dígitos
    const generateRandomPin = () => {
        const random = Math.floor(100000 + Math.random() * 900000);
        setPin(random.toString());
        setShowPin(true); // Mostrar para que el usuario pueda verlo y copiarlo
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (pin.length < 4) {
            alert('El PIN debe tener al menos 4 dígitos');
            return;
        }

        setLoading(true);
        try {
            await LOAApi.put(`/api/users/${userId}/pin`, { pin });
            alert('PIN de seguridad actualizado correctamente');
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error updating PIN:', error);
            alert('Error al actualizar el PIN. Por favor intente nuevamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div
                role="dialog"
                aria-modal="true"
                aria-label={`Configurar PIN para ${userName}`}
                className="relative bg-white rounded-xl shadow-2xl w-[95%] max-w-md p-6 z-50 border border-white/20"
            >
                <button
                    aria-label="Cerrar"
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                >
                    ✕
                </button>

                <header className="mb-6 text-center">
                    <div className="w-12 h-12 bg-celeste/10 rounded-full flex items-center justify-center mx-auto mb-3">
                        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#00A8E8">
                            <path d="M240-80q-33 0-56.5-23.5T160-160v-400q0-33 23.5-56.5T240-640h40v-80q0-83 58.5-141.5T480-920q83 0 141.5 58.5T680-720v80h40q33 0 56.5 23.5T800-560v400q0 33-23.5 56.5T720-80H240Zm240-200q33 0 56.5-23.5T560-360q0-33-23.5-56.5T480-440q-33 0-56.5 23.5T400-360q0 33 23.5 56.5T480-280ZM360-640h240v-80q0-50-35-85t-85-35q-50 0-85 35t-35 85v80Z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-800">Seguridad de Empleado</h3>
                    <p className="text-sm text-gray-500 mt-1">Configurar PIN para {userName}</p>
                </header>

                <form onSubmit={handleSave} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 block">
                            PIN de Seguridad
                        </label>
                        <div className="relative">
                            <input
                                type={showPin ? "text" : "password"}
                                value={pin}
                                onChange={(e) => setPin(e.target.value)}
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-celeste focus:border-celeste outline-none transition-all text-center tracking-widest text-lg font-mono"
                                placeholder="••••••"
                                maxLength={8}
                                minLength={4}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPin(!showPin)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                            >
                                {showPin ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor"><path d="m644-428-58-58q9-47-27-88t-93-32l-58-58q17-8 34.5-12t37.5-4q75 0 127.5 52.5T660-500q0 20-4 37.5T644-428Zm128 126-58-56q38-29 67.5-63.5T832-500q-50-101-143.5-160.5T480-720q-29 0-57 4t-55 12l-62-62q41-17 84-25.5t90-8.5q151 0 269 83.5T920-500q-23 59-60.5 109.5T772-302Zm20 246L626-222q-35 25-75 38.5T480-168q-151 0-269-83.5T40-500q44-101 141-163t201-66q57 0 111 22t95 61l144-144 56 56-616 616-56-56Zm-406-258 58-56q-35-11-66.5-15.5T320-332q-79 0-143.5 35.5T68-464q3 55 180 180t330 330Zm-4-74Z" /></svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor"><path d="M480-320q75 0 127.5-52.5T660-500q0-75-52.5-127.5T480-680q-75 0-127.5 52.5T300-500q0 75 52.5 127.5T480-320Zm0-72q-45 0-76.5-31.5T372-500q0-45 31.5-76.5T480-608q45 0 76.5 31.5T588-500q0 45-31.5 76.5T480-392Zm0 192q-146 0-266-81.5T40-500q54-137 174-218.5T480-800q146 0 266 81.5T920-500q-54 137-174 218.5T480-200Z" /></svg>
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <button
                            type="button"
                            onClick={generateRandomPin}
                            className="w-full py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor"><path d="M160-160v-200h80v120h440v-440h-40v-80h120v280q0 33-23.5 56.5T680-160H160Zm400-320-160-160 56-56 64 64 64-64 56 56-80 160Zm-360 0v-80h200v80H200Z" /></svg>
                            Generar Aleatorio
                        </button>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 px-4 bg-azul hover:bg-azul/90 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Guardando...
                                </>
                            ) : (
                                'Guardar PIN'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
