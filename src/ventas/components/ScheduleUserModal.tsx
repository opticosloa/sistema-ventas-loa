import React, { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { userService, type ScheduleRule } from '../../services/user.service';
import LOAApi from '../../api/LOAApi';

interface ScheduleUserModalProps {
    userId: string;
    userName: string;
    onClose: () => void;
}

interface Sucursal {
    sucursal_id: string;
    nombre: string;
}

const DAYS = [
    { id: 0, name: 'Domingo' },
    { id: 1, name: 'Lunes' },
    { id: 2, name: 'Martes' },
    { id: 3, name: 'Miércoles' },
    { id: 4, name: 'Jueves' },
    { id: 5, name: 'Viernes' },
    { id: 6, name: 'Sábado' },
];

export const ScheduleUserModal: React.FC<ScheduleUserModalProps> = ({ userId, userName, onClose }) => {
    const [schedule, setSchedule] = useState<ScheduleRule[]>([]);
    const [sucursales, setSucursales] = useState<Sucursal[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [schedRes, sucRes] = await Promise.all([
                    userService.getSchedule(userId),
                    LOAApi.get<{ success: boolean; result: any }>('/api/tenants')
                ]);
                setSchedule(schedRes || []);
                if (sucRes.data.success) {
                    const tenantsList = Array.isArray(sucRes.data.result) ? sucRes.data.result : sucRes.data.result?.rows || [];
                    setSucursales(tenantsList);
                }
            } catch (error) {
                console.error("Error loading schedule data", error);
                Swal.fire('Error', 'No se pudieron cargar los datos del cronograma', 'error');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [userId]);

    const handleSetBranch = async (dayId: number, sucursalId: string) => {
        try {
            await userService.setSchedule(userId, dayId, sucursalId);
            // Refresh local state
            const updatedSchedule = await userService.getSchedule(userId);
            setSchedule(updatedSchedule);
            // Swal.fire('Ok', 'Día actualizado', 'success');
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'No se pudo actualizar el cronograma', 'error');
        }
    };

    const handleDeleteRule = async (dayId: number) => {
        try {
            await userService.deleteScheduleRule(userId, dayId);
            setSchedule(prev => prev.filter(s => s.dia_semana !== dayId));
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'No se pudo eliminar la regla', 'error');
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 z-[60] max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-xl font-semibold">Cronograma Rotativo</h3>
                        <p className="text-sm text-gray-500">Configura los días en sucursal para <strong>{userName}</strong>.</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>

                {loading ? (
                    <div className="p-4 text-center">Cargando...</div>
                ) : (
                    <div className="space-y-3">
                        {DAYS.map(day => {
                            const rule = schedule.find(s => s.dia_semana === day.id);
                            return (
                                <div key={day.id} className="flex flex-col sm:flex-row items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 bg-white">
                                    <div className="w-24 font-medium">{day.name}</div>
                                    <div className="flex-1 w-full">
                                        <select
                                            className={`w-full p-2 border rounded-md ${rule ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-gray-50 text-gray-500'}`}
                                            value={rule?.sucursal_id || ''}
                                            onChange={(e) => {
                                                if (e.target.value) {
                                                    handleSetBranch(day.id, e.target.value);
                                                } else {
                                                    // if selecting empty, maybe ask to delete? or handle as delete
                                                    // For now user should use "Reset" button to delete, 
                                                    // but selecting empty typically means clear.
                                                    if (rule) handleDeleteRule(day.id);
                                                }
                                            }}
                                        >
                                            <option value="">Predeterminado (Base)</option>
                                            {sucursales.map(suc => (
                                                <option key={suc.sucursal_id} value={suc.sucursal_id}>
                                                    {suc.nombre}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    {rule && (
                                        <button
                                            onClick={() => handleDeleteRule(day.id)}
                                            className="text-red-500 hover:text-red-700 text-sm px-2"
                                            title="Restaurar a predeterminado"
                                        >
                                            Borrar Asignación
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                <div className="mt-6 flex justify-end">
                    <button onClick={onClose} className="btn-primary">
                        Listo
                    </button>
                </div>
            </div>
        </div>
    );
};
