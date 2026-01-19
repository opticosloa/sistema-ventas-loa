import LOAApi from '../api/LOAApi';

const API_URL = '/api/cash';

export interface VentaCaja {
    id: string;
    fecha: string;
    total: number;
    cliente_nombre: string;
    vendedor_id: string;
}

export interface CashSummary {
    total_efectivo: number;
    total_electronico: number;
    total_general: number;
    detalle_ventas: VentaCaja[];
}

export interface CloseResponse {
    cierre_id: string;
    monto_sistema: number;
    diferencia: number;
    fecha_cierre: string;
}

export const CashService = {
    getSummary: async (): Promise<CashSummary> => {
        const response = await LOAApi.get(`${API_URL}/summary`);
        return response.data.result;
    },

    performClosing: async (monto_real: number, observaciones?: string): Promise<CloseResponse> => {
        const response = await LOAApi.post(`${API_URL}/close`, {
            monto_real,
            observaciones
        });
        return response.data.result;
    }
};
