

export interface ObraSocial {
    obra_social_id: string; // UUID
    nombre: string;
    plan?: string;
    sitio_web?: string;
    instrucciones?: string;
    activo: boolean;
    cobertura?: {
        porcentaje_cristales: number;
        porcentaje_armazones: number;
    };
}
