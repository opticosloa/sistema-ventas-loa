import axios from 'axios';

export const createMercadoPagoPreference = async (
    venta_id: string,
    monto: number,
    sucursal_id: string
) => {
    const token = localStorage.getItem('token');
    const { data } = await axios.post(
        '/api/payments/mercadopago/preference',
        { venta_id, monto, sucursal_id },
        { headers: { Authorization: `Bearer ${token}` } }
    );

    return data;
};
