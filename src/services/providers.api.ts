import LOAApi from '../api/LOAApi';

export interface Provider {
    proveedor_id: string;
    nombre: string;
    telefono?: string;
    cuit?: string;
    iva?: string;
    contacto?: string;
    condiciones?: string;
}

export const getProviders = async (): Promise<Provider[]> => {
    const { data } = await LOAApi.get('/api/providers');
    return data.result;
};

export const createProvider = async (provider: Omit<Provider, 'proveedor_id'>): Promise<Provider> => {
    const { data } = await LOAApi.post('/api/providers', provider);
    return data.result;
};

export const updateProvider = async (id: string, provider: Partial<Provider>): Promise<Provider> => {
    const { data } = await LOAApi.put(`/api/providers/${id}`, provider);
    return data.result;
};

export const deleteProvider = async (id: string): Promise<void> => {
    await LOAApi.delete(`/api/providers/${id}`);
};

export const searchProviders = async (q: string): Promise<Provider[]> => {
    const { data } = await LOAApi.get(`/api/providers/search?q=${q}`);
    return data.result;
};
