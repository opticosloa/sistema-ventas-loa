export interface Empleado {
  usuario_id: string;
  nombre: string;
  apellido: string;
  cuit: number;
  rol: string;
  telefono: string;
  last_conect: string;
  direccion: string;
  fecha_nacimiento: string;
  cuenta_corriente: number;
  email?: string; // Optional for list, required for creation
  password?: string; // Optional for list, required for creation
  sucursal_id?: string;
  sucursal_nombre?: string;
  max_descuento?: number;
}