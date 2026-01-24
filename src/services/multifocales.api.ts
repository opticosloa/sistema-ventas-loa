import LOAApi from '../api/LOAApi';

export interface Multifocal {
    multifocal_id: string;
    marca: string;
    modelo: string;
    material: string;
    tratamiento: string;
    esfera_desde: number;
    esfera_hasta: number;
    cilindro_desde: number;
    cilindro_hasta: number;
    rango_esfera?: string; // Para display en lista
    rango_cilindro?: string; // Para display en lista
    precio: number;
    costo: number;
    descripcion?: string;
    activo: boolean;
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

export const searchMultifocales = async (query: string): Promise<Multifocal[]> => {
    const { data } = await LOAApi.get('/api/multifocales/search', { params: { q: query } });
    return data.result;
};

export const upsertMultifocal = async (multifocal: Partial<Multifocal>): Promise<Multifocal> => {
    const { data } = await LOAApi.post('/api/multifocales/upsert', multifocal);
    return data.result;
};
