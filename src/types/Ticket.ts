
export interface Ticket {
  ticket_id?: string;
  venta_id: string;
  cliente_id: string;
  usuario_id: string;
  fecha_entrega_estimada: string;
  fecha_entrega_real?: string;
  estado: string;
  notas?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PrescriptionData {
  OD: { esf: string; cil: string; eje: string; add?: string };
  OI: { esf: string; cil: string; eje: string; add?: string };
  tipo?: string;
  color?: string;
  dnp?: string;
}

export interface MultifocalData {
  OD: { esf: string; cil: string; eje: string; add: string };
  OI: { esf: string; cil: string; eje: string; add: string };
  tipo?: string;
  alto_indice?: boolean;
  fotocromatico?: boolean;
  tratamiento?: string;
}

export interface TicketDetail {
  ticket_id: string;
  venta_id: string;
  estado: 'PENDIENTE' | 'EN_TALLER' | 'LISTO' | 'ENTREGADO' | 'CANCELADO';
  fecha_entrega_estimada: string;
  fecha_entrada: string;
  notas: string;

  // Datos del Cliente (vienen del JOIN en el SP)
  cliente_id: string; // Add this
  cliente_nombre: string;
  cliente_apellido: string;
  cliente_telefono: string;

  // La Receta (esto viene de la venta asociada)
  receta: {
    lejos?: PrescriptionData;
    cerca?: PrescriptionData;
    multifocal?: MultifocalData;
    armazon?: string;
  };
}