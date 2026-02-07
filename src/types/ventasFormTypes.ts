export type FormValues = {
  // Cliente
  clienteName: string;
  clienteApellido: string;
  clienteDomicilio: string;
  clienteFechaRecibido: string; // guardo como ISO string para inputs
  clienteTelefono: string;
  clienteFechaEntrega: string;
  clienteDNI: string;
  clienteNameVendedor: string;
  clienteObraSocial: string;
  clienteFechaNacimiento?: string;
  clienteEmail?: string;

  // Doctor
  doctorMatricula: string;
  doctorNombre: string;
  doctor_id?: string; // UUID

  // Lejos (OD / OI)
  lejos_OD_Esf: string;
  lejos_OD_Cil: string;
  lejos_OD_Eje: string;
  lejos_OD_Add: string;

  lejos_OI_Esf: string;
  lejos_OI_Cil: string;
  lejos_OI_Eje: string;
  lejos_OI_Add: string;

  lejos_DNP: string;
  lejos_Tipo: string;
  lejos_Color: string;
  // lejos_Armazon: string; // Deprecated by unified armazon

  // Unified frame field
  armazon: string;
  lejos_armazon?: string;
  cerca_armazon?: string;
  multifocal_armazon?: string;

  // Cerca (OD / OI)
  cerca_OD_Esf: string;
  cerca_OD_Cil: string;
  cerca_OD_Eje: string;

  cerca_OI_Esf: string;
  cerca_OI_Cil: string;
  cerca_OI_Eje: string;

  cerca_DNP: string;
  cerca_Tipo: string;
  cerca_Color: string;
  // cerca_Armazon: string; // Deprecated

  // Multifocal / DI / Altura / Observaciones
  multifocalTipo: string;
  DI_Lejos: string;
  DI_Cerca: string;
  Altura: string;
  Observacion: string;

  // Venta Directa
  cantidadItems: string;
};