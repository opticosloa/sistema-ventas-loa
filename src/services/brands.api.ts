import LOAApi from '../api/LOAApi';

export interface Brand {
    marca_id: string;
    nombre: string;
    proveedor_id?: string;
}

export const getBrands = async (): Promise<Brand[]> => {
    const { data } = await LOAApi.get('/api/brands');
    return data.result.rows || data.result;
};

export const createBrand = async (brand: Omit<Brand, 'marca_id'>): Promise<Brand> => {
    const { data } = await LOAApi.post('/api/brands', brand);
    return data.result;
};

export const updateBrand = async (id: string, brand: Partial<Brand>): Promise<Brand> => {
    const { data } = await LOAApi.put(`/api/brands/${id}`, brand);
    return data.result;
};

export const deleteBrand = async (id: string): Promise<void> => {
    await LOAApi.delete(`/api/brands/${id}`);
};

export const searchBrands = async (q: string): Promise<Brand[]> => {
    const { data } = await LOAApi.get(`/api/brands/search?q=${q}`);
    return data.result;
};
