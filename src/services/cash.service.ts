import LOAApi from '../api/LOAApi';

const API_URL = '/api/cash';

export interface VentaCaja {
    venta_id: string;
    fecha: string;
    total: number;
    cliente_nombre: string;
    vendedor_id: string;
}

export interface CashSummary {
    total_efectivo: number;
    total_electronico: number;
    total_obra_social: number;
    total_general: number;
    detalle_ventas: VentaCaja[];
    detalle_obras_sociales: { nombre_os: string; total: number }[];
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

    performClosing: async (monto_real: number, observaciones?: string, monto_remanente?: number, efectivo_fisico?: number): Promise<Blob> => {
        const response = await LOAApi.post(`${API_URL}/close`, {
            monto_real,
            observaciones,
            monto_remanente,
            efectivo_fisico
        }, {
            responseType: 'blob'
        });
        return response.data;
    }
};
