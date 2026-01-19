import LOAApi from '../api/LOAApi';
import type { Doctor } from '../types/Doctor';

export const DoctorService = {
    getAll: async () => {
        const { data } = await LOAApi.get<{ success: boolean; result: Doctor[] }>('/api/doctors');
        return data.result || [];
    },

    search: async (term: string) => {
        const { data } = await LOAApi.get<{ success: boolean; result: Doctor[] }>(`/api/doctors/search?q=${term}`);
        return data.result || [];
    },

    create: async (doctor: Partial<Doctor>) => {
        const { data } = await LOAApi.post<{ success: boolean; result: Doctor }>('/api/doctors', doctor);
        return data.result;
    },

    update: async (id: string, doctor: Partial<Doctor>) => {
        const { data } = await LOAApi.put<{ success: boolean; result: Doctor }>(`/api/doctors/${id}`, doctor);
        return data.result;
    },

    delete: async (id: string) => {
        const { data } = await LOAApi.delete<{ success: boolean; result: any }>(`/api/doctors/${id}`);
        return data.result;
    },

    // Add specific endpoint for deactivate if logic is different or reuse delete/put logic depending on backend
    // Requirement says "sp_doctor_desactivar", assuming DELETE endpoint maps to it or there is a specific one.
    // Based on user request "Llama al endpoint de borrado lógico (sp_doctor_desactivar)", usually DELETE maps to logical delete in this system.
};
