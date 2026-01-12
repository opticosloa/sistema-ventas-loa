import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { FormValues } from "../types/ventasFormTypes";
import { useForm, useAuthStore } from "../hooks";
import { validatePrescriptionForm } from "../helpers";
import LOAApi from "../api/LOAApi";
import type { Cliente } from "../types/Cliente";

// Components
import { ClientForm } from "./components/ClientForm";
import { DoctorForm } from "./components/DoctorForm";
import { OpticSection } from "./components/OpticSection";
import { MultifocalForm } from "./components/MultifocalForm";
import { FrameSection } from "./components/FrameSection";
import { SalesItemsList, type CartItem } from "./components/SalesItemsList";
import { SupervisorAuthModal } from "../components/modals/SupervisorAuthModal";
import { PrescriptionCapture } from "./components/PrescriptionCapture";
import { useReactToPrint } from 'react-to-print';
import { TicketVenta } from "../ventas/components/TicketVenta";

const initialForm: FormValues = {
  clienteName: "",
  clienteApellido: "",
  clienteDomicilio: "",
  clienteFechaRecibido: new Date().toISOString().slice(0, 16),
  clienteTelefono: "",
  clienteFechaEntrega: new Date().toISOString().slice(0, 10),
  clienteDNI: "",
  clienteNameVendedor: "",
  clienteObraSocial: "",

  doctorMatricula: "",
  doctorNombre: "",

  lejos_OD_Esf: "",
  lejos_OD_Cil: "",
  lejos_OD_Eje: "",
  lejos_OD_Add: "",
  lejos_OI_Esf: "",
  lejos_OI_Cil: "",
  lejos_OI_Eje: "",
  lejos_OI_Add: "",
  lejos_DNP: "",
  lejos_Tipo: "",
  lejos_Color: "",

  armazon: "",

  cerca_OD_Esf: "",
  cerca_OD_Cil: "",
  cerca_OD_Eje: "",
  cerca_OI_Esf: "",
  cerca_OI_Cil: "",
  cerca_OI_Eje: "",
  cerca_DNP: "",
  cerca_Tipo: "",
  cerca_Color: "",

  multifocalTipo: "",
  DI_Lejos: "",
  DI_Cerca: "",
  Altura: "",
  Observacion: "",

  cantidadItems: "1",
};

export const FormularioVenta: React.FC = () => {
  const { nombre, apellido } = useAuthStore();
  const { formState, onInputChange, onResetForm, setFieldValue } = useForm(initialForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [cliente, setCliente] = useState<Cliente | null>(null);

  // Ticket Printing
  const ticketRef = React.useRef<HTMLDivElement>(null);
  const [ticketData, setTicketData] = useState<any>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = useReactToPrint({
    contentRef: ticketRef,
    onAfterPrint: () => {
      setIsPrinting(false);
      // Navigate after printing (or if canceled)
      if (ticketData) {
        navigate('pago', { state: { ventaId: ticketData.venta.venta_id, total: ticketData.venta.total } });
      }
    },
    onPrintError: () => setIsPrinting(false)
  });

  useEffect(() => {
    if (ticketData) {
      setIsPrinting(true);
      handlePrint();
    }
  }, [ticketData]);

  // Crystal Data
  const [availableCrystals, setAvailableCrystals] = useState<any[]>([]);

  // Dolar Rate
  const [dolarRate, setDolarRate] = useState(0);

  useEffect(() => {
    const fetchRate = async () => {
      try {
        const { data } = await LOAApi.get('/api/currency/rate');
        setDolarRate(data.result.rate || 0);
      } catch (error) {
        console.error("Error fetching dolar rate:", error);
      }
    };
    fetchRate();

    // Fetch Crystals on mount with type filter
    const fetchCrystals = async () => {
      try {
        const { data } = await LOAApi.get('/api/products/type/CRISTAL');
        // Backend returns { success: true, result: [...] }
        const crystals = Array.isArray(data.result) ? data.result : [];
        setAvailableCrystals(crystals);
      } catch (error) {
        console.error("Error fetching crystals:", error);
      }
    };
    fetchCrystals();
  }, []);

  // Tabs: 'optica' | 'retail'
  const [activeTab, setActiveTab] = useState<'optica' | 'retail'>('optica');

  const [cart, setCart] = useState<CartItem[]>([]);

  // Price State
  const [armazonPrecio, setArmazonPrecio] = useState(0);
  const [cristalesPrecio, setCristalesPrecio] = useState(0);

  // Discount State
  const [discount, setDiscount] = useState(0);
  const [isDiscountAuthorized, setIsDiscountAuthorized] = useState(false);
  const [showSupervisorModal, setShowSupervisorModal] = useState(false);

  // Actualizá el useMemo del total
  const totalVenta = React.useMemo(() => {
    const retailTotal = cart.reduce((acc, item) => {
      // Calcular precio en ARS al vuelo
      const prod = item.producto as any;
      const usd = prod.precio_usd ? parseFloat(prod.precio_usd) : 0;
      const ars = prod.precio_venta ? parseFloat(prod.precio_venta) : 0;

      const finalPrice = (usd > 0 && dolarRate > 0) ? (usd * dolarRate) : ars;
      return acc + (finalPrice * item.cantidad);
    }, 0);
    const frameTotal = formState.armazon ? armazonPrecio : 0;

    // SUMAMOS CRISTALES y RESTAMOS DESCUENTO
    return retailTotal + frameTotal + cristalesPrecio - (isDiscountAuthorized ? discount : 0);
  }, [cart, armazonPrecio, formState.armazon, cristalesPrecio, discount, isDiscountAuthorized, dolarRate]);

  const navigate = useNavigate();

  useEffect(() => {
    if (nombre && apellido) {
      setFieldValue('clienteNameVendedor', `${nombre} ${apellido}`);
    }
  }, [nombre, apellido]);

  // Destructure for logic use
  const {
    clienteName,
    clienteApellido,
    clienteDomicilio,
    clienteFechaRecibido,
    clienteTelefono,
    clienteDNI,
    clienteObraSocial,
    doctorMatricula,
    lejos_OD_Esf,
    lejos_OD_Add,
    lejos_OD_Cil,
    lejos_OD_Eje,
    lejos_OI_Esf,
    lejos_OI_Add,
    lejos_OI_Cil,
    lejos_OI_Eje,
    cerca_OD_Esf,
    cerca_OI_Esf,
    multifocalTipo,
    DI_Lejos,
    DI_Cerca,
    Altura,
    Observacion,
  } = formState as FormValues;

  // --- CORRECCIÓN 1: Array de dependencias cerrado correctamente ---
  useEffect(() => {
    // OD Calculation
    if (lejos_OD_Add && lejos_OD_Esf) {
      const esf = parseFloat(lejos_OD_Esf);
      const add = parseFloat(lejos_OD_Add);
      if (!isNaN(esf) && !isNaN(add)) {
        setFieldValue('cerca_OD_Esf', (esf + add).toString());
        if (lejos_OD_Cil) setFieldValue('cerca_OD_Cil', lejos_OD_Cil);
        if (lejos_OD_Eje) setFieldValue('cerca_OD_Eje', lejos_OD_Eje);
      }
    }

    // OI Calculation
    if (lejos_OI_Add && lejos_OI_Esf) {
      const esf = parseFloat(lejos_OI_Esf);
      const add = parseFloat(lejos_OI_Add);
      if (!isNaN(esf) && !isNaN(add)) {
        setFieldValue('cerca_OI_Esf', (esf + add).toString());
        if (lejos_OI_Cil) setFieldValue('cerca_OI_Cil', lejos_OI_Cil);
        if (lejos_OI_Eje) setFieldValue('cerca_OI_Eje', lejos_OI_Eje);
      }
    }
  }, [
    lejos_OD_Esf, lejos_OD_Add, lejos_OD_Cil, lejos_OD_Eje,
    lejos_OI_Esf, lejos_OI_Add, lejos_OI_Cil, lejos_OI_Eje
  ]);

  // SYNC TYPE LEJOS/CERCA
  useEffect(() => {
    if (formState.lejos_Tipo && formState.lejos_Tipo !== formState.cerca_Tipo) {
      setFieldValue('cerca_Tipo', formState.lejos_Tipo);
    }
  }, [formState.lejos_Tipo]);

  useEffect(() => {
    if (formState.cerca_Tipo && formState.cerca_Tipo !== formState.lejos_Tipo) {
      setFieldValue('lejos_Tipo', formState.cerca_Tipo);
    }
  }, [formState.cerca_Tipo]);

  // Crystal Stock State
  const [stockStatus, setStockStatus] = useState<{
    lejos: { OD: any, OI: any },
    cerca: { OD: any, OI: any }
  }>({
    lejos: { OD: null, OI: null },
    cerca: { OD: null, OI: null }
  });

  // 1. Nueva lógica de verificación de stock y advertencia
  const checkCrystalStock = async (prefix: 'lejos' | 'cerca', ojo: 'OD' | 'OI') => {
    const esf = formState[`${prefix}_${ojo}_Esf` as keyof FormValues];
    const cil = formState[`${prefix}_${ojo}_Cil` as keyof FormValues];
    const tipoNombre = formState[`${prefix}_Tipo` as keyof FormValues]; // El nombre seleccionado en el select

    if (!esf || !cil || !tipoNombre) return;

    try {
      // Buscamos si existe la graduación exacta para ese material/tipo
      const { data } = await LOAApi.get(`/api/crystals/check-stock`, {
        params: {
          esfera: esf,
          cilindro: cil,
          material: tipoNombre,
          // El color/tratamiento ya suele estar implícito en el nombre del tipo de producto CRISTAL
        }
      });

      setStockStatus(prev => ({
        ...prev,
        [prefix]: {
          ...prev[prefix],
          [ojo]: data.result // data.result es el objeto producto del stock o null
        }
      }));

    } catch (error) {
      console.error("Error al verificar stock físico:", error);
    }
  };

  // 2. Lógica de Precio Unificada con prioridad de Stock
  useEffect(() => {
    let labPrice = 0;

    // Función auxiliar para obtener el precio base de un cristal del catálogo (convertido a pesos si es necesario)
    const getCatalogPrice = (name: string) => {
      const product = availableCrystals.find(x => x.nombre === name);
      if (!product) return 0;

      const usdPrice = product.precio_usd ? Number(product.precio_usd) : 0;
      if (usdPrice > 0 && dolarRate > 0) return usdPrice * dolarRate;
      return Number(product.precio_venta) || 0;
    };

    // --- PROCESAR LEJOS ---
    if (formState.lejos_Tipo) {
      const basePrice = getCatalogPrice(formState.lejos_Tipo);

      // Ojo Derecho Lejos
      const stockOD = stockStatus.lejos.OD;
      const priceOD = stockOD ? Number(stockOD.precio_venta) : basePrice;

      // Ojo Izquierdo Lejos
      const stockOI = stockStatus.lejos.OI;
      const priceOI = stockOI ? Number(stockOI.precio_venta) : basePrice;

      labPrice += (priceOD + priceOI);
    }

    // --- PROCESAR CERCA ---
    if (formState.cerca_Tipo) {
      const basePrice = getCatalogPrice(formState.cerca_Tipo);

      // Ojo Derecho Cerca
      const stockOD = stockStatus.cerca.OD;
      const priceOD = stockOD ? Number(stockOD.precio_venta) : basePrice;

      // Ojo Izquierdo Cerca
      const stockOI = stockStatus.cerca.OI;
      const priceOI = stockOI ? Number(stockOI.precio_venta) : basePrice;

      labPrice += (priceOD + priceOI);
    }

    // --- PROCESAR MULTIFOCAL ---
    if (formState.multifocalTipo) {
      labPrice += getCatalogPrice(formState.multifocalTipo); // Generalmente multifocal se vende por par
    }

    setCristalesPrecio(labPrice);

  }, [stockStatus, formState.lejos_Tipo, formState.cerca_Tipo, formState.multifocalTipo, availableCrystals, dolarRate]);

  // Effect to trigger checks
  useEffect(() => {
    checkCrystalStock('lejos', 'OD');
  }, [formState.lejos_OD_Esf, formState.lejos_OD_Cil, formState.lejos_Tipo, formState.lejos_Color]);

  useEffect(() => {
    checkCrystalStock('lejos', 'OI');
  }, [formState.lejos_OI_Esf, formState.lejos_OI_Cil, formState.lejos_Tipo, formState.lejos_Color]);

  useEffect(() => {
    checkCrystalStock('cerca', 'OD');
  }, [formState.cerca_OD_Esf, formState.cerca_OD_Cil, formState.cerca_Tipo, formState.cerca_Color]);

  useEffect(() => {
    checkCrystalStock('cerca', 'OI');
  }, [formState.cerca_OI_Esf, formState.cerca_OI_Cil, formState.cerca_Tipo, formState.cerca_Color]);


  // PREPARAR DATOS PARA ENVIO
  const valOrNull = (val: any) => (val === "" || val === undefined || val === null) ? null : val;

  const lejos = {
    OD: {
      esfera: valOrNull(formState.lejos_OD_Esf),
      cilindro: valOrNull(formState.lejos_OD_Cil),
      eje: valOrNull(formState.lejos_OD_Eje),
      add: valOrNull(formState.lejos_OD_Add),
    },
    OI: {
      esfera: valOrNull(formState.lejos_OI_Esf),
      cilindro: valOrNull(formState.lejos_OI_Cil),
      eje: valOrNull(formState.lejos_OI_Eje),
      add: valOrNull(formState.lejos_OI_Add),
    },
    dnp: valOrNull(formState.lejos_DNP),
    tipo: valOrNull(formState.lejos_Tipo),
    color: valOrNull(formState.lejos_Color),
    armazon: valOrNull(formState.armazon),
  };

  const cerca = {
    OD: {
      esfera: valOrNull(formState.cerca_OD_Esf),
      cilindro: valOrNull(formState.cerca_OD_Cil),
      eje: valOrNull(formState.cerca_OD_Eje),
    },
    OI: {
      esfera: valOrNull(formState.cerca_OI_Esf),
      cilindro: valOrNull(formState.cerca_OI_Cil),
      eje: valOrNull(formState.cerca_OI_Eje),
    },
    dnp: valOrNull(formState.cerca_DNP),
    tipo: valOrNull(formState.cerca_Tipo),
    color: valOrNull(formState.cerca_Color),
    armazon: valOrNull(formState.armazon),
  };

  const multifocal = {
    tipo: valOrNull(multifocalTipo),
    di_lejos: valOrNull(DI_Lejos),
    di_cerca: valOrNull(DI_Cerca),
    altura: valOrNull(Altura),
  };

  const handleSearchClick = async () => {
    if (!clienteDNI) {
      alert('Ingresá un DNI');
      return;
    }
    setLoading(true);
    try {
      const { data } = await LOAApi.get(`/api/clients/by-dni/${clienteDNI}`);
      const clienteData = data.result.rows?.[0] || data.result[0] || data.result;

      if (clienteData) {
        setCliente(clienteData);
        setFieldValue('clienteName', clienteData.nombre);
        setFieldValue('clienteApellido', clienteData.apellido);
        setFieldValue('clienteTelefono', clienteData.telefono ?? '');
        setFieldValue('clienteDomicilio', clienteData.direccion ?? '');
      } else {
        alert('Cliente no encontrado');
      }
    } catch (error) {
      console.error('Error al buscar cliente', error);
      alert('Cliente no encontrado');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchDoctor = async () => {
    if (!doctorMatricula) {
      alert('Ingresá una matricula');
      return;
    }
    setLoading(true);
    try {
      const { data } = await LOAApi.get(`/api/doctors/by-matricula/${doctorMatricula}`);
      if (data.result && data.result.length > 0) {
        const doc = data.result[0];
        setFieldValue('doctorNombre', doc.especialidad ? `${doc.nombre} - ${doc.especialidad}` : doc.nombre);
      } else {
        alert('Doctor no encontrado');
        setFieldValue('doctorNombre', '');
      }
    } catch (error) {
      console.error('Error al buscar doctor', error);
      alert('Error al buscar doctor');
    } finally {
      setLoading(false);
    }
  };

  const handleRepeatPrescription = async () => {
    if (!cliente?.cliente_id) {
      alert("Selecciona un cliente primero");
      return;
    }
    setLoading(true);
    try {
      const { data } = await LOAApi.get(`/api/prescriptions/last/${cliente.cliente_id}`);
      const last = data.result;
      if (!last) {
        alert("No se encontró receta anterior");
        return;
      }

      const lastLejos = last.lejos || {};
      const lastCerca = last.cerca || {};
      const lastMultifocal = last.multifocal || {};

      const safeSet = (field: keyof FormValues, val: any) => {
        if (val !== undefined && val !== null) setFieldValue(field, val.toString());
      };

      if (lastLejos.OD) {
        safeSet('lejos_OD_Esf', lastLejos.OD.esfera);
        safeSet('lejos_OD_Cil', lastLejos.OD.cilindro);
        safeSet('lejos_OD_Eje', lastLejos.OD.eje);
        safeSet('lejos_OD_Add', lastLejos.OD.add);
      }
      if (lastLejos.OI) {
        safeSet('lejos_OI_Esf', lastLejos.OI.esfera);
        safeSet('lejos_OI_Cil', lastLejos.OI.cilindro);
        safeSet('lejos_OI_Eje', lastLejos.OI.eje);
        safeSet('lejos_OI_Add', lastLejos.OI.add);
      }
      safeSet('lejos_DNP', lastLejos.dnp);
      safeSet('lejos_Tipo', lastLejos.tipo);
      safeSet('lejos_Color', lastLejos.color);
      // NO armazon

      if (lastCerca.OD) {
        safeSet('cerca_OD_Esf', lastCerca.OD.esfera);
        safeSet('cerca_OD_Cil', lastCerca.OD.cilindro);
        safeSet('cerca_OD_Eje', lastCerca.OD.eje);
      }
      if (lastCerca.OI) {
        safeSet('cerca_OI_Esf', lastCerca.OI.esfera);
        safeSet('cerca_OI_Cil', lastCerca.OI.cilindro);
        safeSet('cerca_OI_Eje', lastCerca.OI.eje);
      }
      safeSet('cerca_DNP', lastCerca.dnp);
      safeSet('cerca_Tipo', lastCerca.tipo);
      safeSet('cerca_Color', lastCerca.color);
      // NO armazon

      safeSet('multifocalTipo', lastMultifocal.tipo);
      safeSet('DI_Lejos', lastMultifocal.di_lejos);
      safeSet('DI_Cerca', lastMultifocal.di_cerca);
      safeSet('Altura', lastMultifocal.altura);

      safeSet('Observacion', last.observaciones);
      safeSet('doctorMatricula', last.matricula);

      handleSearchDoctor();

      setFieldValue('armazon', '');

      alert("Receta cargada. El armazón no se copió.");

    } catch (e) {
      console.error(e);
      alert("Error al cargar receta");
    } finally {
      setLoading(false);
    }
  };

  const processSale = async (isBudget: boolean = false) => {
    let createPrescription = false;

    // Check if meaningful optical data exists
    if (lejos_OD_Esf || cerca_OD_Esf || multifocalTipo || formState.armazon) {
      createPrescription = true;
    }

    if (createPrescription) {
      const { isValid, errors } = validatePrescriptionForm(formState);
      setFormErrors(errors);
      if (!isValid) {
        alert("Corrija los errores en la receta");
        return;
      }
    } else if (cart.length === 0) {
      alert("Debe ingresar una receta o items de venta directa.");
      return;
    }

    // --- VALIDATION LOGIC START ---
    const newErrors: Record<string, string> = {};

    // 1. Validate Client
    if (!cliente?.cliente_id && (!clienteName || !clienteApellido || !clienteDNI)) {
      if (!clienteName) newErrors.clienteName = 'Requerido';
      if (!clienteApellido) newErrors.clienteApellido = 'Requerido';
      if (!clienteDNI) newErrors.clienteDNI = 'Requerido';
    }

    // 2. Validate Optic Data if Prescribing
    if (createPrescription) {
      // Validate Doctor
      if (!doctorMatricula || !formState.doctorNombre) {
        newErrors.doctorNombre = 'Médico requerido';
      }

      // Validate Crystals (At least one eye needs Esf + Type)
      // Check Lejos
      const hasLejosOD = !!lejos_OD_Esf;
      const hasLejosOI = !!lejos_OI_Esf;
      if (hasLejosOD || hasLejosOI) {
        if (hasLejosOD && !formState.lejos_Tipo) newErrors.lejos_Tipo = 'Requerido';
        if (hasLejosOI && !formState.lejos_Tipo) newErrors.lejos_Tipo = 'Requerido';
      }

      // Check Cerca
      const hasCercaOD = !!cerca_OD_Esf;
      const hasCercaOI = !!cerca_OI_Esf;
      if (hasCercaOD || hasCercaOI) {
        if (hasCercaOD && !formState.cerca_Tipo) newErrors.cerca_Tipo = 'Requerido';
        if (hasCercaOI && !formState.cerca_Tipo) newErrors.cerca_Tipo = 'Requerido';
      }

      // General Prescription check (if it's not armazon only)
      const hasOpticalData = hasLejosOD || hasLejosOI || hasCercaOD || hasCercaOI || multifocalTipo;

      // If no optical data and no armazon, why are we here? (already checked above)
      if (hasOpticalData && !formState.lejos_Tipo && !formState.cerca_Tipo && !multifocalTipo) {
        // If they filled esf/cil/eje but NO Tipo, error
        newErrors.general = "Debe seleccionar Tipo de Cristal";
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setFormErrors(newErrors);
      alert("Por favor complete los campos obligatorios marcados en rojo.");
      return;
    }
    setFormErrors({});
    // --- VALIDATION LOGIC END ---

    // Cliente Validation (Create if new)
    let finalClienteId = cliente?.cliente_id;
    if (!finalClienteId) {
      try {
        const newClientPayload = {
          nombre: clienteName,
          apellido: clienteApellido,
          dni: clienteDNI,
          telefono: clienteTelefono,
          direccion: clienteDomicilio,
          fecha_nacimiento: null
        };
        const createClientRes = await LOAApi.post('/api/clients', newClientPayload);
        if (createClientRes.data.success) {
          finalClienteId = createClientRes.data.result.rows[0].cliente_id;
        }
      } catch (e) {
        console.error(e);
        alert("Error creando cliente");
        return;
      }
    }

    try {
      let ventaId: number | null = null;

      (obj: any) => Object.values(obj).some(x => x !== null && x !== "");

      const sanitizeValue = (val: any): any => {
        if (val === "") return null;
        if (val && typeof val === 'object' && !Array.isArray(val)) {
          const cleaned: any = {};
          Object.keys(val).forEach(key => {
            cleaned[key] = sanitizeValue(val[key]);
          });
          return cleaned;
        }
        return val;
      };

      // Helper to clean section: send {} if empty, otherwise return sanitized object
      const cleanSection = (section: any) => {
        // First sanitize the section to ensure "" -> null
        const sanitized = sanitizeValue(section);

        // Check if it has any meaningful data
        // For Lejos: OD, OI, dnp, tipo, color
        // We check if "sanitized" has any non-null fields relevant
        // Logic: Check if OD/OI have any non-null values
        const sectionHasData = (s: any) => {
          if (s.tipo || s.armazon || s.dnp || s.color) return true;
          // Check if OD/OI have any non-null (meaningful) values
          if (s.OD && Object.values(s.OD).some(v => v !== null)) return true;
          if (s.OI && Object.values(s.OI).some(v => v !== null)) return true;

          return false;
        };

        if (sectionHasData(sanitized)) return sanitized;
        return {};
      };

      if (createPrescription) {
        // Create Prescription + Sale
        let imageUrl: string | null = null;
        if (file) {
          const formData = new FormData();
          formData.append('file', file);
          const uploadRes = await LOAApi.post('/api/prescriptions/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
          imageUrl = uploadRes.data.imageUrl;
        }


        console.log("🛒 Cart before payload:", JSON.stringify(cart, null, 2));

        const getUnitPrice = (item: CartItem) => {
          // Prioritize calculated unit price if available, otherwise division
          if (item.subtotal && item.cantidad) return item.subtotal / item.cantidad;
          return (item.producto as any).precio_venta || 0;
        };

        const payload = {
          cliente_id: finalClienteId || null,
          cliente: undefined,
          obraSocial: clienteObraSocial || null,
          doctor_id: valOrNull((formState as any).doctor_id) || null,
          matricula: valOrNull(doctorMatricula),
          fecha: clienteFechaRecibido ? clienteFechaRecibido.split('T')[0] : null,
          lejos: cleanSection(lejos),
          cerca: cleanSection(cerca),
          multifocal: (multifocal.tipo && multifocal.tipo !== "") ? multifocal : {},
          observaciones: Observacion || null,
          image_url: imageUrl,
          items: cart.map(item => ({
            producto_id: item.producto.producto_id,
            cantidad: item.cantidad,
            precio_unitario: getUnitPrice(item)
          })),
          descuento: isDiscountAuthorized ? discount : 0
        };

        console.log("🚀 Payload Final:", JSON.stringify(payload, null, 2));
        const res = await LOAApi.post('/api/prescriptions', payload);
        ventaId = res.data.venta_id;

      } else {
        // Direct Sale Only
        const salePayload = {
          cliente_id: finalClienteId,
          urgente: false,
          descuento: isDiscountAuthorized ? discount : 0,
          items: cart.map(item => ({
            producto_id: item.producto.producto_id,
            cantidad: item.cantidad,
            precio_unitario: (item.subtotal && item.cantidad ? item.subtotal / item.cantidad : ((item.producto as any).precio_venta || 0))
          }))
        };
        const saleRes = await LOAApi.post('/api/sales', salePayload);
        ventaId = saleRes.data.venta_id;
      }

      if (!ventaId) throw new Error("No se pudo crear la venta");

      if (isBudget) {
        await LOAApi.put(`/api/sales/${ventaId}/budget`);
        alert("Presupuesto guardado correctamente.");
        navigate('/ventas');
      } else {
        // Prepare Ticket Data for printing
        setTicketData({
          venta: {
            venta_id: ventaId,
            total: totalVenta,
            descuento: isDiscountAuthorized ? discount : 0,
            cotizacion_dolar: dolarRate
          },
          detalles: cart.map(item => ({
            producto: item.producto,
            cantidad: item.cantidad,
            subtotal: ((item.producto as any).precio_usd && dolarRate > 0 ? Number((item.producto as any).precio_usd) * dolarRate : Number((item.producto as any).precio_venta)) * item.cantidad
          })),
          receta: createPrescription ? {
            ...formState,
          } : null,
          cliente: {
            nombre: clienteName,
            apellido: clienteApellido,
            telefono: clienteTelefono
          }
        });

        // Navigation will happen in onAfterPrint
      }

    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.message || error.message || "Error procesando la operación";
      alert(`Error: ${msg}`);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log(e)
    processSale(false);
  };

  const onBudget = async () => {
    processSale(true);
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-4 sm:p-6 fade-in">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-white text-2xl font-semibold">Panel de Venta</h2>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">

        {/* SECTION: CLIENT (Common) */}
        <ClientForm
          formState={formState as FormValues}
          onInputChange={onInputChange}
          handleSearchClick={handleSearchClick}
          loading={loading}
          formErrors={formErrors}
        />

        {/* SECTION: TABS */}
        <div className="flex border-b border-gray-700 mb-4">
          <button
            type="button"
            className={`py-2 px-4 font-medium transition-colors ${activeTab === 'optica' ? 'border-b-2 border-celeste text-celeste' : 'text-gray-400 hover:text-white'}`}
            onClick={() => setActiveTab('optica')}
          >
            A. Venta Óptica (Receta)
          </button>
          <button
            type="button"
            className={`py-2 px-4 font-medium transition-colors ${activeTab === 'retail' ? 'border-b-2 border-celeste text-celeste' : 'text-gray-400 hover:text-white'}`}
            onClick={() => setActiveTab('retail')}
          >
            B. Venta Directa (Productos)
          </button>
        </div>

        {/* SECTION: TAB CONTENT */}
        <div className={activeTab === 'optica' ? 'block' : 'hidden'}>
          <DoctorForm
            formState={formState as FormValues}
            onInputChange={onInputChange}
            setFieldValue={setFieldValue}
            handleSearchDoctor={handleSearchDoctor}
            loading={loading}
            formErrors={formErrors}
          />

          <PrescriptionCapture
            file={file}
            setFile={setFile}
          />

          <OpticSection
            title="Lejos"
            prefix="lejos"
            formState={formState as FormValues}
            formErrors={formErrors}
            onInputChange={onInputChange}
            stockStatus={stockStatus.lejos}
            availableCrystals={availableCrystals}
          />

          <OpticSection
            title="Cerca"
            prefix="cerca"
            formState={formState as FormValues}
            formErrors={formErrors}
            onInputChange={onInputChange}
            stockStatus={stockStatus.cerca}
            availableCrystals={availableCrystals}
          />

          <FrameSection
            formState={formState as FormValues}
            onInputChange={onInputChange}
            onPriceChange={setArmazonPrecio}
          />

          <MultifocalForm
            formState={formState as FormValues}
            onInputChange={onInputChange}
          />

          <div className="flex justify-end mt-2">
            <button
              type="button"
              onClick={handleRepeatPrescription}
              className="btn-secondary"
              disabled={!cliente || loading}
            >
              {loading ? "Cargando..." : "↻ Repetir Última Receta"}
            </button>
          </div>

          <div className="p-4 rounded-xl border border-blanco mt-4 flex items-center justify-between ">
            <label className="text-white font-bold">Precio Laboratorio / Cristales ($):</label>
            <input
              type="number"
              min="0"
              className="input w-48 text-right text-lg font-bold text-celeste"
              placeholder="0.00"
              value={cristalesPrecio || ''}
              onChange={(e) => setCristalesPrecio(parseFloat(e.target.value) || 0)}
            />
          </div>

          <SalesItemsList items={cart} onItemsChange={setCart} dolarRate={dolarRate} />

        </div>

        {/* SECTION: DISCOUNT & TOTAL (Shared) */}
        <div className="p-4 rounded-xl border border-blanco mt-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-white font-bold">Descuento ($):</label>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  min="0"
                  disabled={!isDiscountAuthorized}
                  className={`input w-32 text-right ${!isDiscountAuthorized ? 'opacity-50 cursor-not-allowed' : ''}`}
                  placeholder="0.00"
                  value={discount || ''}
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                />
                {!isDiscountAuthorized ? (
                  <button
                    type="button"
                    onClick={() => setShowSupervisorModal(true)}
                    className="btn-warning hover:opacity-75 text-xs py-1 px-2"
                  >
                    🔓 Autorizar
                  </button>
                ) : (
                  <span className="text-green-400 text-xs font-bold border border-green-500 px-2 py-1 rounded">
                    ✅ Autorizado
                  </span>
                )}
              </div>
            </div>
            <div>
              <span className="text-xl text-white font-bold">Total a Pagar (ARS): </span>
              <span className="text-2xl text-crema font-bold">
                {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(totalVenta)}
              </span>
            </div>
          </div>
        </div>

        <SupervisorAuthModal
          isOpen={showSupervisorModal}
          onClose={() => setShowSupervisorModal(false)}
          onSuccess={(name) => {
            setIsDiscountAuthorized(true);
            alert(`Descuento autorizado por: ${name}`);
          }}
          actionName="Aplicar Descuento a Venta"
        />

        <div className={activeTab === 'retail' ? 'block' : 'hidden'}>
          <SalesItemsList items={cart} onItemsChange={setCart} dolarRate={dolarRate} />
        </div>

        {/* ACTIONS */}
        <hr className="border-gray-700 my-4" />
        <div className="flex gap-3 justify-end items-center">
          <span className="text-gray-400 text-sm mr-auto">
            {(cart.length > 0 && activeTab === 'optica') ? `⚠️ Tiene ${cart.length} items en el carrito.` : ''}
          </span>

          <button
            type="button"
            onClick={onResetForm}
            className="btn-secondary ml-auto"
            disabled={loading}
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={onBudget}
            className="btn-secondary"
            disabled={loading}
          >
            Imprimir Presupuesto
          </button>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading || isPrinting}
          >
            {loading || isPrinting ? <span className="animate-spin mr-2">⏳</span> : 'Finalizar e Imprimir'}
          </button>
        </div>
      </form>

      {/* Hidden Ticket Component */}
      <div style={{ display: 'none' }}>
        <TicketVenta
          ref={ticketRef}
          venta={ticketData?.venta}
          detalles={ticketData?.detalles || []}
          receta={ticketData?.receta}
          cliente={ticketData?.cliente}
        />
      </div>
    </div>
  );
};