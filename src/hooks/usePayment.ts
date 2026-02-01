import { useState } from 'react';
import { createMercadoPagoPreference } from '../services';

export const usePayment = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const payWithMercadoPago = async (ventaId: string, monto: number, sucursal_id: string) => {
        try {
            setLoading(true);
            setError(null);

            const response = await createMercadoPagoPreference(ventaId, monto, sucursal_id);

            if (!response?.init_point) {
                throw new Error('No se pudo iniciar el pago');
            }

            // REDIRECCIÓN REAL
            window.location.href = response.init_point;
        } catch (err: any) {
            setError(err.message || 'Error al iniciar el pago');
        } finally {
            setLoading(false);
        }
    };

    return {
        payWithMercadoPago,
        loading,
        error
    };
};
