export type PaymentMethod = 'MP' | 'EFECTIVO' | 'DEBITO' | 'CREDITO' | 'TRANSFERENCIA' | 'OBRA_SOCIAL';
export type MetodoPago = PaymentMethod;

export type PaymentStatus = 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';

export interface Payment {
    pago_id?: string;
    venta_id: string;
    metodo: PaymentMethod | string;
    monto: number;
    estado?: PaymentStatus | string;
    mp_preference_id?: string;
    mp_payment_id?: string;
    mp_status?: string;
    created_at?: string;
    updated_at?: string;
}

export interface PagoParcial {
    metodo: MetodoPago | string;
    monto: number;
    confirmed?: boolean;
    readonly?: boolean;
}
