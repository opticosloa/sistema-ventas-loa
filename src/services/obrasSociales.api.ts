import LOAApi from '../api/LOAApi';
import type { ObraSocial } from '../types/ObraSocial';


export const getObrasSociales = async (): Promise<ObraSocial[]> => {
    const { data } = await LOAApi.get('/api/obras-sociales');
    return data.result; // Controller now returns result.rows directly in result field
};

export const getObraSocialById = async (id: string): Promise<ObraSocial> => {
    const { data } = await LOAApi.get(`/api/obras-sociales/${id}`);
    return data.result;
};

export const saveObraSocial = async (obraSocial: Partial<ObraSocial>): Promise<ObraSocial> => {
    // If obra_social_id is present, it's an update. If null/undefined, it's a create.
    const { data } = await LOAApi.post('/api/obras-sociales', obraSocial);
    return data.result;
};

export const deleteObraSocial = async (id: string): Promise<void> => {
    await LOAApi.delete(`/api/obras-sociales/${id}`);
};

export const searchObrasSociales = async (q: string): Promise<ObraSocial[]> => {
    const { data } = await LOAApi.get(`/api/obras-sociales/search/${q}`);
    return data.result;
};
