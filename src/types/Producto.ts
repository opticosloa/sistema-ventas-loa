

export interface Producto {
  producto_id: string;
  nombre: string;
  descripcion: string;
  tipo: string;
  marca_id: string;
  precio_costo: number;
  precio_venta: number;
  iva: number;
  stock: number;
  stock_minimo: number;
  ubicacion: string;
  codigo_qr: string;
  ultima_venta: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  precio_usd: number;

};