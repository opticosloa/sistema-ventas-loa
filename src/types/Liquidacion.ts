export type EstadoLiquidacion = 'BORRADOR' | 'PRESENTADA' | 'PAGADA' | 'RECHAZADA';

export interface Liquidacion {
    liquidacion_id: string; // UUID
    obra_social_id: number;
    obra_social?: string; // Nombre from join
    fecha_generacion: string;
    fecha_desde: string;
    fecha_hasta: string;
    total_declarado: number;
    estado: EstadoLiquidacion;
    observaciones?: string;
    cant_items?: number;
}

export interface ItemLiquidacion {
    pago_id: string; // UUID of pagos_venta
    venta_id: string; // UUID
    fecha: string;
    monto: number;
    nro_orden?: string;
    paciente?: string;
    liquidacion_id?: string;
    selected?: boolean; // For UI selection
}
