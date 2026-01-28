
import LOAApi from '../api/LOAApi';

interface BatchCrystalPayload {
    material: string;
    tratamiento: string;
    esfera_min: number;
    esfera_max: number;
    cilindro_min: number;
    cilindro_max: number;
    precio_usd: number;
    precio_costo: number;
    stock_inicial: number;
    stock_minimo: number;
    ubicacion: string;
}


export interface StockFilter {
    esferaFrom?: string;
    esferaTo?: string;
    cilindroFrom?: string;
    cilindroTo?: string;
    material?: string;
}

export const createBatchCristales = async (payload: BatchCrystalPayload) => {
    const { data } = await LOAApi.post('/api/crystals/batch', payload);
    return data;
};

export const getCristalStock = async (filters: StockFilter) => {
    const params = new URLSearchParams();
    if (filters.esferaFrom) params.append('esferaFrom', filters.esferaFrom);
    if (filters.esferaTo) params.append('esferaTo', filters.esferaTo);
    if (filters.cilindroFrom) params.append('cilindroFrom', filters.cilindroFrom);
    if (filters.cilindroTo) params.append('cilindroTo', filters.cilindroTo);
    if (filters.material && filters.material !== 'ALL') params.append('material', filters.material);

    // Si no hay filtros, el usuario especificó que la API envie null (o vacio) para que el SP devuelva todo.
    // La implementación actual de params envía parametros vacíos si no están, lo cual es correcto.
    // Si params está vacio, el backend recibe query params undefined o vacios.

    const { data } = await LOAApi.get<{ success: boolean; result: any }>(`/api/crystals/search-range?${params.toString()}`);
    return Array.isArray(data.result) ? data.result : [];
};

export const printLabels = async (productIds: number[], config: { widthMm: number; heightMm: number; fontSize?: number }) => {
    const response = await LOAApi.post('/api/stock/labels',
        { productIds, config },
        { responseType: 'blob' }
    );
    return response.data;
};
