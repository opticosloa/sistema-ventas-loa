export interface Sucursal {
    sucursal_id?: string;
    nombre: string;
    encargado?: string | null;      // UUID del usuario encargado
    direccion?: string | null;
    telefono?: string | null;
    email?: string | null;
    is_active?: boolean;
    created_at?: string;            // ISO Date string

    // Campos de Configuración y MP
    mp_public_key?: string | null;
    mp_access_token?: string | null;
    mp_user_id?: string | null;
    color_identificativo?: string | null;
    updated_at?: string;

    // Campo calculado (Solo lectura)
    nombre_encargado?: string | null; // Viene del JOIN
}