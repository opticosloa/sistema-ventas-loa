import LOAApi from '../api/LOAApi';
import type { Producto } from '../types/Producto';

export const getProducts = async (tipo?: string): Promise<Producto[]> => {
    const params = tipo ? `?tipo=${tipo}` : '';
    const { data } = await LOAApi.get(`/api/products${params}`);
    return data.result;
};

export const createProduct = async (product: Omit<Producto, 'producto_id'>): Promise<any> => {
    const { data } = await LOAApi.post('/api/products', product);
    return data;
};

export const updateProduct = async (id: number, product: Partial<Producto>): Promise<any> => {
    const { data } = await LOAApi.put(`/api/products/${id}`, product);
    return data;
};

export const deleteProduct = async (id: number): Promise<any> => {
    const { data } = await LOAApi.delete(`/api/products/${id}`);
    return data;
};

export const updatePricesByBrand = async (marca_id: string, porcentaje: number): Promise<any> => {
    const { data } = await LOAApi.post('/api/products/update-prices-by-brand', {
        marca_id,
        porcentaje
    });
    return data;
};

export const bulkUpsertProducts = async (items: any[]): Promise<any> => {
    const { data } = await LOAApi.post('/api/products/bulk-upsert', { items });
    return data;
};

