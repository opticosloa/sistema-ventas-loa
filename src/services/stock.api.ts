
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

export const createBatchCristales = async (payload: BatchCrystalPayload) => {
    const { data } = await LOAApi.post('/api/crystals/batch', payload);
    return data;
};
