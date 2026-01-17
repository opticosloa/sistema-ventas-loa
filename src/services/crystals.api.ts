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
    return data;
};

export const getTreatments = async (): Promise<CrystalTreatment[]> => {
    const { data } = await LOAApi.get('/api/crystals/treatments');
    return data;
};

export const createMaterial = async (nombre: string): Promise<CrystalMaterial> => {
    const { data } = await LOAApi.post('/api/crystals/materials', { nombre });
    return data;
};

export const createTreatment = async (nombre: string): Promise<CrystalTreatment> => {
    const { data } = await LOAApi.post('/api/crystals/treatments', { nombre });
    return data;
};
