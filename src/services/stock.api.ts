
import LOAApi from '../api/LOAApi';

interface BatchCrystalPayload {
    material: string;
    tratamiento: string;
    esfera_min: number;
    esfera_max: number;
    cilindro_min: number;
    cilindro_max: number;
    precio_usd: number;
    stock_inicial: number;
}

export const createBatchCristales = async (payload: BatchCrystalPayload) => {
    const { data } = await LOAApi.post('/stock/cristales/batch', payload);
    return data;
};
