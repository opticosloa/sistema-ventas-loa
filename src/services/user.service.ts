import LOAApi from '../api/LOAApi';
import { type Empleado } from '../types/Empleado';

export interface ScheduleRule {
    cronograma_id: string;
    dia_semana: number;
    sucursal_id: string;
    sucursal_nombre?: string;
}

export const userService = {
    moveUser: async (usuario_id: Empleado | string, sucursal_id: string) => {
        const { data } = await LOAApi.post<{ success: boolean; message: string }>('/api/users/move', {
            usuario_id,
            sucursal_id
        });
        return data;
    },

    setSchedule: async (usuario_id: Empleado | string, dia: number, sucursal_id: string) => {
        const { data } = await LOAApi.post<{ success: boolean; message: string }>('/api/users/schedule', {
            usuario_id,
            dia,
            sucursal_id
        });
        return data;
    },

    deleteScheduleRule: async (usuario_id: Empleado | string, dia: number) => {
        const { data } = await LOAApi.delete<{ success: boolean; message: string }>(`/api/users/${usuario_id}/schedule/${dia}`);
        return data;
    },

    getSchedule: async (usuario_id: Empleado | string) => {
        const { data } = await LOAApi.get<{ success: boolean; result: ScheduleRule[] }>(`/api/users/${usuario_id}/schedule`);
        return data.result;
    }
};
