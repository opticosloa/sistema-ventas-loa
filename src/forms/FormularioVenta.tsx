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

  // Crystal Data
  const [availableCrystals, setAvailableCrystals] = useState<any[]>([]);

  useEffect(() => {
    // Fetch Crystals on mount with type filter
    const fetchCrystals = async () => {
      try {
        const { data } = await LOAApi.get('/api/products', { params: { tipo: 'CRISTAL' } });
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
      const p = (item.producto as any).precio_venta ? parseFloat((item.producto as any).precio_venta) : 0;
      return acc + (p * item.cantidad);
    }, 0);
    const frameTotal = formState.armazon ? armazonPrecio : 0;

    // SUMAMOS CRISTALES y RESTAMOS DESCUENTO
    return retailTotal + frameTotal + cristalesPrecio - (isDiscountAuthorized ? discount : 0);
  }, [cart, armazonPrecio, formState.armazon, cristalesPrecio, discount, isDiscountAuthorized]);

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

  const checkCrystalStock = async (prefix: 'lejos' | 'cerca', ojo: 'OD' | 'OI') => {
    const esf = formState[`${prefix}_${ojo}_Esf` as keyof FormValues];
    const cil = formState[`${prefix}_${ojo}_Cil` as keyof FormValues];
    const tipo = formState[`${prefix}_Tipo` as keyof FormValues];
    const color = formState[`${prefix}_Color` as keyof FormValues];

    if (!esf || !cil || !tipo) return;

    try {
      const { data } = await LOAApi.get(`/api/crystals/check-stock`, {
        params: {
          esfera: esf,
          cilindro: cil,
          material: tipo,
          tratamiento: color || 'Blanco'
        }
      });

      setStockStatus(prev => ({
        ...prev,
        [prefix]: {
          ...prev[prefix],
          [ojo]: data.result
        }
      }));

    } catch (error) {
      console.error("Stock check failed", error);
    }
  };

  // --- CORRECCIÓN 2: Lógica de Precio Unificada y bien cerrada ---
  useEffect(() => {
    let totalCalculado = 0;
    let foundStock = false;

    const addFn = (item: any) => {
      if (item && item.precio_venta) {
        totalCalculado += Number(item.precio_venta);
        foundStock = true;
      }
    };

    // Sumar stock encontrado
    addFn(stockStatus.lejos.OD);
    addFn(stockStatus.lejos.OI);
    addFn(stockStatus.cerca.OD);
    addFn(stockStatus.cerca.OI);

    if (foundStock) {
      // Si hay stock, usamos ese precio
      setCristalesPrecio(totalCalculado);
    } else {
      // Si NO hay stock, calculamos precio de laboratorio basado en el Tipo (usando availableCrystals)
      let labPrice = 0;

      const getPrice = (name: string) => {
        const c = availableCrystals.find(x => x.nombre === name);
        return c ? Number(c.precio_venta) : 0;
      };

      // Lejos (Par) - Multiplicamos x2 porque precio unitario
      if (formState.lejos_Tipo) {
        labPrice += getPrice(formState.lejos_Tipo) * 2;
      }

      // Cerca (Par) - Multiplicamos x2
      if (formState.cerca_Tipo) {
        labPrice += getPrice(formState.cerca_Tipo) * 2;
      }

      // Multifocal (Unidad/Par según criterio) - Asumimos precio par en DB o unitario*2? 
      // USER PROMPT: "Suma este precio al total". 
      // User anterior dijo "multiplicar por 2 Lejos y Cerca". Multifocal suele ser por par en lista, pero si es unitario, x2.
      // Vamos a asumir par x1 si es multifocal, o x2 si es lente de contacto. 
      // Por consistencia con Lejos/Cerca, si es "Lente", es x2. Pero Multifocal suele venderse el par.
      // Dejamos x1 por defecto o x2 si el user no especificó.
      // REVISIT: Previous prompt said "multiplicar por 2 Lejos y Cerca".
      if (formState.multifocalTipo) {
        labPrice += getPrice(formState.multifocalTipo);
      }

      setCristalesPrecio(labPrice);
    }
  }, [stockStatus, formState.lejos_Tipo, formState.cerca_Tipo, formState.multifocalTipo, availableCrystals]);


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
  const lejos = {
    OD: {
      esfera: formState.lejos_OD_Esf || null,
      cilindro: formState.lejos_OD_Cil || null,
      eje: formState.lejos_OD_Eje || null,
      add: formState.lejos_OD_Add || null,
    },
    OI: {
      esfera: formState.lejos_OI_Esf || null,
      cilindro: formState.lejos_OI_Cil || null,
      eje: formState.lejos_OI_Eje || null,
      add: formState.lejos_OI_Add || null,
    },
    dnp: formState.lejos_DNP || null,
    tipo: formState.lejos_Tipo || null,
    color: formState.lejos_Color || null,
    armazon: formState.armazon || null,
  };

  const cerca = {
    OD: {
      esfera: formState.cerca_OD_Esf || null,
      cilindro: formState.cerca_OD_Cil || null,
      eje: formState.cerca_OD_Eje || null,
    },
    OI: {
      esfera: formState.cerca_OI_Esf || null,
      cilindro: formState.cerca_OI_Cil || null,
      eje: formState.cerca_OI_Eje || null,
    },
    dnp: formState.cerca_DNP || null,
    tipo: formState.cerca_Tipo || null,
    color: formState.cerca_Color || null,
    armazon: formState.armazon || null,
  };

  const multifocal = {
    tipo: multifocalTipo || null,
    di_lejos: DI_Lejos || null,
    di_cerca: DI_Cerca || null,
    altura: Altura || null,
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

    // Cliente Validation
    let finalClienteId = cliente?.cliente_id;
    if (!finalClienteId) {
      if (!clienteName || !clienteApellido) {
        alert("Cliente requerido");
        return;
      }
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

      if (createPrescription) {
        // Create Prescription + Sale
        let imageUrl: string | null = null;
        if (file) {
          const formData = new FormData();
          formData.append('file', file);
          const uploadRes = await LOAApi.post('/api/prescriptions/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
          imageUrl = uploadRes.data.imageUrl;
        }

        const payload = {
          cliente_id: finalClienteId,
          cliente: undefined,
          obraSocial: clienteObraSocial || null,
          doctor_id: null,
          matricula: doctorMatricula,
          fecha: clienteFechaRecibido,
          lejos,
          cerca,
          multifocal,
          observaciones: Observacion || null,
          image_url: imageUrl,
          descuento: isDiscountAuthorized ? discount : 0
        };

        const res = await LOAApi.post('/api/prescriptions', payload);
        ventaId = res.data.venta_id;

      } else {
        // Direct Sale Only
        const salePayload = {
          cliente_id: finalClienteId,
          urgente: false,
          descuento: isDiscountAuthorized ? discount : 0
        };
        const saleRes = await LOAApi.post('/api/sales', salePayload);
        ventaId = saleRes.data.venta_id;
      }

      if (!ventaId) throw new Error("No se pudo crear la venta");

      // Add Cart Items
      if (cart.length > 0) {
        for (const item of cart) {
          await LOAApi.post('/api/sales-items', {
            venta_id: ventaId,
            producto_id: item.producto.producto_id,
            cantidad: item.cantidad,
            precio_unitario: (item.producto as any).precio_venta || 0
          });
        }
      }

      // If Budget
      if (isBudget) {
        await LOAApi.put(`/api/sales/${ventaId}/budget`);
        alert("Presupuesto guardado correctamente.");
        navigate('/ventas');
      } else {
        // Proceed to Pay - Pass Calculated Total
        navigate('pago', { state: { ventaId, total: totalVenta } });
      }

    } catch (error) {
      console.error(error);
      alert("Error procesando la operación");
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
            handleSearchDoctor={handleSearchDoctor}
            loading={loading}
          />

          <section className="bg-opacity-10 border border-blanco rounded-xl p-4 my-2">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <span className="text-lg text-blanco">Subir imagen de receta</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="input w-64"
              />
            </div>
          </section>

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

          <div className="bg-gray-800 p-4 rounded-xl border border-gray-600 mt-4 flex items-center justify-between">
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
        </div>

        {/* SECTION: DISCOUNT & TOTAL (Shared) */}
        <div className="bg-gray-800 p-4 rounded-xl border border-gray-600 mt-4">
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
                    className="btn-warning text-xs py-1 px-2"
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
              <span className="text-xl text-white font-bold">Total a Pagar: </span>
              <span className="text-2xl text-celeste font-bold">${totalVenta.toLocaleString()}</span>
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
          <SalesItemsList items={cart} onItemsChange={setCart} />
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
            className="btn-secondary"
          >
            Limpiar
          </button>

          <button
            type="button"
            onClick={onBudget}
            className="bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-2 px-4 rounded"
          >
            Guardar Presupuesto
          </button>

          <button
            type="submit"
            className="btn-primary min-w-[200px]"
          >
            Finalizar Venta
          </button>
        </div>
      </form>
    </div>
  );
};