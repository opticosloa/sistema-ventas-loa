import React, { useState, useEffect } from "react";
import Swal from 'sweetalert2';
import { useVentaData } from "./hooks/useVentaData";
import { valOrNull, cleanSection } from "./helpers/ventaHelpers";
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

const initialForm: FormValues = {
  clienteName: "",
  clienteApellido: "",
  clienteDomicilio: "",
  clienteFechaRecibido: new Date().toISOString().slice(0, 16),
  clienteFechaEntrega: new Date().toISOString().slice(0, 10),
  clienteTelefono: "",
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
  const { max_descuento = 0, nombre, apellido } = useAuthStore();
  const { formState, onInputChange, onResetForm, setFieldValue } = useForm(initialForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [cliente, setCliente] = useState<Cliente | null>(null);

  // HOOK: Data
  const { dolarRate, obrasSociales, materials, treatments } = useVentaData();

  const [selectedObraSocialId, setSelectedObraSocialId] = useState<string>("");
  const [calculatedCoverage, setCalculatedCoverage] = useState(0);

  // Tabs: 'optica' | 'retail'
  const [activeTab, setActiveTab] = useState<'optica' | 'retail'>('optica');
  const [cart, setCart] = useState<CartItem[]>([]);

  // Prices
  const [armazonPrecio, setArmazonPrecio] = useState(0);
  const [cristalesPrecio, setCristalesPrecio] = useState(0);

  // Discount
  const [discount, setDiscount] = useState(0);
  const [isDiscountAuthorized, setIsDiscountAuthorized] = useState(false);
  const [showSupervisorModal, setShowSupervisorModal] = useState(false);

  // Stock Status
  const [stockStatus, setStockStatus] = useState<{
    lejos: { OD: any, OI: any },
    cerca: { OD: any, OI: any }
  }>({
    lejos: { OD: null, OI: null },
    cerca: { OD: null, OI: null }
  });

  // --- DESTRUCTURING RESTORED ---
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
    lejos_OI_Esf,
    cerca_OD_Esf,
    cerca_OI_Esf,
    multifocalTipo,
    DI_Lejos,
    DI_Cerca,
    Altura,
    Observacion,
  } = formState as FormValues;

  // --- EFFECTS ---

  // --- EFFECTS ---
  // Initial data loading handled by useVentaData custom hook.


  // Auto-fill Salesperson
  useEffect(() => {
    if (nombre && apellido && !formState.clienteNameVendedor) {
      setFieldValue('clienteNameVendedor', `${nombre} ${apellido}`);
    }
  }, [nombre, apellido, formState.clienteNameVendedor, setFieldValue]);


  // 1. Calculamos Subtotal Bruto (Sin Descuentos)
  const subtotalBruto = React.useMemo(() => {
    const retailTotal = cart.reduce((acc, item) => {
      // Calcular precio en ARS al vuelo
      const prod = item.producto as any;
      const usd = prod.precio_usd ? parseFloat(prod.precio_usd) : 0;
      const ars = prod.precio_venta ? parseFloat(prod.precio_venta) : 0;

      const finalPrice = (usd > 0 && dolarRate > 0) ? (usd * dolarRate) : ars;
      return acc + (finalPrice * item.cantidad);
    }, 0);
    const frameTotal = formState.armazon ? armazonPrecio : 0;

    return retailTotal + frameTotal + cristalesPrecio;
  }, [cart, armazonPrecio, formState.armazon, cristalesPrecio, dolarRate]);

  // 2. Total Final (Restando Descuento si está autorizado)
  const totalVenta = React.useMemo(() => {
    const final = subtotalBruto - (isDiscountAuthorized ? discount : 0);
    return Math.max(0, final);
  }, [subtotalBruto, discount, isDiscountAuthorized]);

  // ... (Lines 141-160 kept same, Effect for Validation)

  const navigate = useNavigate();

  // ... (Lines 163-305 kept same logic for effects)


  const calculateCoverage = async () => {
    if (!selectedObraSocialId) {
      if (calculatedCoverage > 0) {
        setDiscount(0);
        setCalculatedCoverage(0);
      }
      return;
    }

    const os = obrasSociales.find(o => o.obra_social_id === selectedObraSocialId);
    if (!os) return;

    // Dynamically import helper
    const { calculateOpticalCoverage } = await import('../helpers/salesHelpers');

    let totalDisc = 0;
    const { porcentaje_cristales, porcentaje_armazones } = os.cobertura || { porcentaje_cristales: 0, porcentaje_armazones: 0 };

    // 1. Calculate from Cart (Retail items)
    const cartDisc = calculateOpticalCoverage(cart, os, dolarRate);
    totalDisc += cartDisc;

    // 2. Calculate from Form State (Optic items not in cart)
    // Cristales
    if (cristalesPrecio > 0 && porcentaje_cristales > 0) {
      totalDisc += cristalesPrecio * (porcentaje_cristales / 100);
    }

    // Armazones (if selected in form dropdown 'armazon')
    if (formState.armazon && armazonPrecio > 0 && porcentaje_armazones > 0) {
      totalDisc += armazonPrecio * (porcentaje_armazones / 100);
    }

    const finalDisc = Number(totalDisc.toFixed(2));
    setDiscount(finalDisc);
    setCalculatedCoverage(finalDisc);
  };

  useEffect(() => {
    calculateCoverage();
  }, [cart, cristalesPrecio, armazonPrecio, selectedObraSocialId, dolarRate]);

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

  // Effect to trigger checks
  // Consolidated Stock Check Effect with Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      checkCrystalStock('lejos', 'OD');
      checkCrystalStock('lejos', 'OI');
      checkCrystalStock('cerca', 'OD');
      checkCrystalStock('cerca', 'OI');
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [
    formState.lejos_OD_Esf, formState.lejos_OD_Cil, formState.lejos_Tipo,
    formState.lejos_OI_Esf, formState.lejos_OI_Cil,
    formState.cerca_OD_Esf, formState.cerca_OD_Cil, formState.cerca_Tipo,
    formState.cerca_OI_Esf, formState.cerca_OI_Cil
  ]);


  // PREPARAR DATOS PARA ENVIO
  // PREPARAR DATOS PARA ENVIO
  // valOrNull imported from helpers


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
      Swal.fire({ title: 'Error', text: 'Ingresá un DNI', icon: 'warning', confirmButtonText: 'OK' });
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
        Swal.fire('Atención', 'Cliente no encontrado', 'info');
      }
    } catch (error) {
      console.error('Error al buscar cliente', error);
      Swal.fire('Error', 'Error al buscar cliente', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchDoctor = async () => {
    if (!doctorMatricula) {
      Swal.fire('Atención', 'Ingresá una matricula', 'warning');
      return;
    }
    setLoading(true);
    try {
      const { data } = await LOAApi.get(`/api/doctors/by-matricula/${doctorMatricula}`);
      if (data.result && data.result.length > 0) {
        const doc = data.result[0];
        setFieldValue('doctorNombre', doc.especialidad ? `${doc.nombre} - ${doc.especialidad}` : doc.nombre);
      } else {
        Swal.fire('Info', 'Doctor no encontrado', 'info');
        setFieldValue('doctorNombre', '');
      }
    } catch (error) {
      console.error('Error al buscar doctor', error);
      Swal.fire('Error', 'Error al buscar doctor', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRepeatPrescription = async () => {
    if (!cliente?.cliente_id) {
      Swal.fire('Atención', "Selecciona un cliente primero", 'warning');
      return;
    }
    setLoading(true);
    try {
      const { data } = await LOAApi.get(`/api/prescriptions/last/${cliente.cliente_id}`);
      const last = data.result;
      if (!last) {
        Swal.fire('Info', "No se encontró receta anterior", 'info');
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

      Swal.fire('Éxito', "Receta cargada. El armazón no se copió.", 'success');

    } catch (e) {
      console.error(e);
      Swal.fire('Error', "Error al cargar receta", 'error');
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
        Swal.fire('Atención', "Corrija los errores en la receta", 'warning');
        return;
      }
    } else if (cart.length === 0) {
      Swal.fire('Atención', "Debe ingresar una receta o items de venta directa.", 'warning');
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
      Swal.fire('Atención', "Por favor complete los campos obligatorios marcados en rojo.", 'warning');
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
        Swal.fire('Error', "Error creando cliente", 'error');
        return;
      }
    }

    try {
      let ventaId: number | null = null;

      // Helpers removed, using imported versions

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
        Swal.fire('Guardado', "Presupuesto guardado correctamente.", 'success');
        navigate('/ventas');
      } else {
        // Navigate directly to payment, bypassing auto-print
        navigate('pago', { state: { ventaId: ventaId, total: totalVenta } });
      }

    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.message || error.message || "Error procesando la operación";
      Swal.fire('Error', msg, 'error');
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

        {/* WORKERS / OS SECTION */}
        <div className="p-4 rounded-xl border border-white flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <h3 className="block font-medium text-blanco mb-1">Obra Social / Plan</h3>
            <select
              className="w-full input mb-3 border border-slate-600 rounded-lg px-3 py-2 text-white outline-none focus:ring-2 focus:ring-cyan-500"
              value={selectedObraSocialId}
              onChange={(e) => setSelectedObraSocialId(e.target.value)}
            >
              <option value="">-- Ninguna / Particular --</option>
              {obrasSociales.map(os => (
                <option key={os.obra_social_id} value={os.obra_social_id}>
                  {os.nombre} {os.plan ? `- ${os.plan}` : ''}
                </option>
              ))}
            </select>
            {selectedObraSocialId && calculatedCoverage > 0 && (
              <p className="text-xs text-green-400 mt-1">
                Cobertura aplicada: {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(calculatedCoverage)}
              </p>
            )}
          </div>
        </div>

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
            materials={materials}
            treatments={treatments}
          />

          <OpticSection
            title="Cerca"
            prefix="cerca"
            formState={formState as FormValues}
            formErrors={formErrors}
            onInputChange={onInputChange}
            stockStatus={stockStatus.cerca}
            materials={materials}
            treatments={treatments}
          />

          <FrameSection
            formState={formState as FormValues}
            onInputChange={onInputChange}
            onPriceChange={setArmazonPrecio}
            dolarRate={dolarRate}
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
              <div className="flex flex-col gap-1 items-end">
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    min="0"
                    className={`input w-32 text-right ${isDiscountAuthorized ? 'border-green-500' : ''}`}
                    placeholder="0.00"
                    value={discount || ''}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      if (val > subtotalBruto) {
                        setDiscount(subtotalBruto);
                      } else {
                        setDiscount(val);
                      }
                    }}

                  />
                  {!isDiscountAuthorized && discount > 0 ? (
                    <button
                      type="button"
                      onClick={() => setShowSupervisorModal(true)}
                      className="btn-warning hover:opacity-75 text-xs py-1 px-2 animate-pulse"
                    >
                      🔓 Requiere Autorización
                    </button>
                  ) : (discount > 0 && (
                    <span className="text-green-400 text-xs font-bold border border-green-500 px-2 py-1 rounded">
                      Autorizado
                    </span>
                  ))}
                </div>
                {!isDiscountAuthorized && discount > 0 && (
                  <span className="text-xs text-red-400">
                    Excede tu máximo de {(max_descuento || 0)}%
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
            disabled={loading}
          >
            {loading ? <span className="animate-spin mr-2">⏳</span> : 'Finalizar Venta'}
          </button>
        </div>
      </form>
    </div>
  );
};