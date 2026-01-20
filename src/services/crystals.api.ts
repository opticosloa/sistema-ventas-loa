import LOAApi from '../api/LOAApi';

export interface CrystalMaterial {
    material_id: string;
    nombre: string;
    is_active: boolean;
}

export interface CrystalTreatment {
    tratamiento_id: string;
    nombre: string;
    is_active: boolean;
}

export const getMaterials = async (): Promise<CrystalMaterial[]> => {
    const { data } = await LOAApi.get('/api/crystals/materials');
    return data.result || data;
};

export const getTreatments = async (): Promise<CrystalTreatment[]> => {
    const { data } = await LOAApi.get('/api/crystals/treatments');
    return data.result || data;
};

export const createMaterial = async (nombre: string): Promise<CrystalMaterial> => {
    const { data } = await LOAApi.post('/api/crystals/materials', { nombre });
    return data;
};

export const createTreatment = async (nombre: string): Promise<CrystalTreatment> => {
    const { data } = await LOAApi.post('/api/crystals/treatments', { nombre });
    return data;
};

export const updateMaterial = async (id: string, data: { nombre?: string, is_active?: boolean }): Promise<CrystalMaterial> => {
    const { data: response } = await LOAApi.put(`/api/crystals/materials/${id}`, data);
    return response;
};

export const updateTreatment = async (id: string, data: { nombre?: string, is_active?: boolean }): Promise<CrystalTreatment> => {
    const { data: response } = await LOAApi.put(`/api/crystals/treatments/${id}`, data);
    return response;
};

export const updatePricesSelectively = async (material: string, tratamiento: string, porcentaje: number) => {
    const { data } = await LOAApi.post('/api/crystals/update-prices-selectively', {
        material,
        tratamiento,
        porcentaje
    });
    return data;
};