import LOAApi from '../api/LOAApi';

// Re-defined Multifocal interface matching SP output
export interface Multifocal {
    multifocal_id: string;
    descripcion: string;
    marca: string;
    modelo: string;
    modelo_id?: string; // Relational link
    material: string;
    material_id?: string;
    tratamiento: string;
    tratamiento_id?: string;
    precio: number;
    costo?: number;
}

export interface MultifocalUpsertDTO {
    id?: string;
    modelo_id: string;
    material_id: string;
    tratamiento_id?: string;
    precio: number;
    costo?: number;
}

export interface MultifocalBrand {
    marca_id: string;
    nombre: string;
    activo: boolean;
}

export interface MultifocalModel {
    modelo_id: string;
    marca_id: string;
    nombre: string;
    activo: boolean;
}

// --- MARCAS ---
export const getBrands = async (): Promise<MultifocalBrand[]> => {
    const { data } = await LOAApi.get('/api/multifocales/brands');
    return data.result;
};

export const createBrand = async (nombre: string): Promise<MultifocalBrand> => {
    const { data } = await LOAApi.post('/api/multifocales/brands', { nombre });
    return data.result;
};

export const updateBrand = async (id: string, nombre: string, activo: boolean) => {
    const { data } = await LOAApi.put(`/api/multifocales/brands/${id}`, { nombre, activo });
    return data.result;
};

// --- MODELOS ---
export const getModels = async (marcaId?: string): Promise<MultifocalModel[]> => {
    const params = marcaId ? { marca_id: marcaId } : {};
    const { data } = await LOAApi.get('/api/multifocales/models', { params });
    return data.result;
};

export const createModel = async (marcaId: string, nombre: string): Promise<MultifocalModel> => {
    const { data } = await LOAApi.post('/api/multifocales/models', { marca_id: marcaId, nombre });
    return data.result;
};

export const updateModel = async (id: string, nombre: string, activo: boolean) => {
    const { data } = await LOAApi.put(`/api/multifocales/models/${id}`, { nombre, activo });
    return data.result;
};

/**
 * Searches for multifocals by query string (matches Brand, Model, or Material names).
 * Returns simplified list used for Autocomplete.
 */
export const searchMultifocales = async (query: string): Promise<Multifocal[]> => {
    const { data } = await LOAApi.get('/api/multifocales/search', { params: { q: query } });
    return data.result;
};

/**
 * Creates or Updates a Multifocal (Relational combination).
 */
export const upsertMultifocal = async (data: MultifocalUpsertDTO): Promise<string> => {
    const { data: response } = await LOAApi.post('/api/multifocales/upsert', data);
    return response.result;
};
