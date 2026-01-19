
import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import LOAApi from '../../api/LOAApi';
import type { MetodoPago, PagoParcial } from '../../types/Pago';
import type { ObraSocial } from '../../types/ObrasSociales';
import type { CartItem } from '../components/SalesItemsList';

export interface UsePaymentLogicReturn {
    ventaId: string | number | null;
    currentTotal: number;
    totalPagado: number;
    restante: number;
    pagos: (PagoParcial & { estado?: string })[];
    loading: boolean;
    saleItems: CartItem[];

    // Search
    dniSearch: string;
    setDniSearch: (val: string) => void;
    handleSearchDni: () => void;
    handleCancelSale: () => void;

    // Supervisor
    supervisorModalOpen: boolean;
    setSupervisorModalOpen: (val: boolean) => void;
    handleSupervisorSuccess: (name: string) => void;

    // Add Payment Form
    selectedMethod: MetodoPago | '';
    setSelectedMethod: (m: MetodoPago | '') => void;
    amountInput: string;
    setAmountInput: (val: string) => void;
    handleAddPayment: () => void;

    // Payment List Actions
    handleRemovePayment: (index: number) => void;

    // Submit
    onSubmit: (e?: React.FormEvent) => void;

    // MP Logic
    mpModalOpen: boolean;
    setMpModalOpen: (val: boolean) => void;
    mpAmount: number;
    pointDevices: any[];
    selectedDeviceId: string;
    setSelectedDeviceId: (id: string) => void;
    startMpQrFlow: (amount: number) => void;
    startMpPointFlow: (amount: number, deviceId: string) => void;


    // Async MP Status
    asyncPaymentStatus: 'IDLE' | 'WAITING_POINT' | 'SHOWING_QR';
    qrData: string | null;
    pointStatus: string;
    setAsyncPaymentStatus: (status: 'IDLE' | 'WAITING_POINT' | 'SHOWING_QR') => void;

    // Obras Sociales
    obrasSociales: ObraSocial[];
    selectedObraSocialId: number | '';
    setSelectedObraSocialId: (id: number | '') => void;
    nroOrden: string;
    setNroOrden: (val: string) => void;
    handleCoverInsurance: () => void;
}

export const usePaymentLogic = (): UsePaymentLogicReturn => {
    const { ventaId: paramVentaId } = useParams<{ ventaId: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const stateVentaId = location.state?.ventaId;
    const stateTotal = location.state?.total;

    /* New States */
    const [ventaId, setVentaId] = useState<string | number | null>(paramVentaId || stateVentaId || null);
    const [saleItems, setSaleItems] = useState<any[]>([]);
    const [dniSearch, setDniSearch] = useState("");
    const [currentTotal, setCurrentTotal] = useState<number>(stateTotal ? parseFloat(stateTotal) : 0);

    // States for Supervisor Auth
    const [supervisorModalOpen, setSupervisorModalOpen] = useState(false);

    // User asked to "Add state for pointDevices and selectedDeviceId".
    const [pointDevices, setPointDevices] = useState<any[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");

    useEffect(() => {
        const fetchDevices = async () => {
            try {
                const { data } = await LOAApi.get('/api/payments/mercadopago/devices');
                if (data.success && Array.isArray(data.result)) {
                    setPointDevices(data.result);
                    // Opcional: pre-seleccionar el primero si existe
                    if (data.result.length > 0) {
                        setSelectedDeviceId(data.result[0].id);
                    }
                }
            } catch (error) {
                console.error("Error cargando dispositivos Point:", error);
            }
        };
        fetchDevices();
    }, []);

    // Fetch Obras Sociales
    const [obrasSociales, setObrasSociales] = useState<ObraSocial[]>([]);
    useEffect(() => {
        const fetchOS = async () => {
            try {
                const { data } = await LOAApi.get('/api/obras-sociales');
                // Filter active ones
                const active = (data.result || []).filter((o: ObraSocial) => o.activo);
                setObrasSociales(active);
            } catch (error) {
                console.error("Error fetching Obras Sociales", error);
            }
        };
        fetchOS();
    }, []);

    // Sync with location state on mount
    useEffect(() => {
        const state = (location.state as any);
        if (state?.ventaId) {
            setVentaId(state.ventaId);
            if (state.total) setCurrentTotal(state.total);
        }
    }, [location]);

    // Fetch Details
    useEffect(() => {
        if (ventaId) {
            fetchSaleDetails(ventaId);
            fetchExistingPayments(ventaId);
        }
    }, [ventaId]);

    const fetchSaleDetails = async (id: any) => {
        try {
            const { data } = await LOAApi.get(`/api/sales/${id}`);

            if (data.success && data.result) {
                // Ajustamos para manejar si result es un objeto directo o tiene .rows
                const sale = data.result.saleObj || (data.result.rows ? data.result.rows[0] : data.result);

                if (sale) {
                    // Forzamos el parseo a número para evitar errores de concatenación de strings
                    const rawTotal = parseFloat(sale.total || 0);
                    const discountVal = parseFloat(sale.descuento || 0);

                    // Calculamos el Neto (Total - Descuento)
                    const finalTotal = Math.max(0, rawTotal - discountVal);

                    // IMPORTANTE: Seteamos el total neto para el cobro
                    setCurrentTotal(finalTotal);

                    console.log('Cálculo de Cobro:', { rawTotal, discountVal, finalTotal });

                    if (sale.items && Array.isArray(sale.items)) {
                        const mappedItems = sale.items.map((item: any) => ({
                            producto: {
                                producto_id: item.producto_id,
                                nombre: item.producto_nombre,
                                precio_venta: parseFloat(item.precio_unitario),
                                precio_usd: item.precio_usd || 0,
                            },
                            cantidad: Number(item.cantidad),
                            subtotal: Number(item.subtotal)
                        }));
                        setSaleItems(mappedItems);
                    }
                }
            }
        } catch (error) {
            console.error("Error fetching sale details", error);
        }
    };

    const fetchExistingPayments = async (id: any) => {
        try {
            const { data } = await LOAApi.get(`/api/payments/${id}`);
            if (data.success && data.result) {
                const { pagos: existingPagos, total } = data.result;

                // Update local total/paid if available
                if (total) setCurrentTotal(parseFloat(total));

                // Map existing payments to state
                if (Array.isArray(existingPagos)) {
                    const mapped: PagoParcial[] = existingPagos.map((p: any) => ({
                        metodo: p.metodo,
                        monto: parseFloat(p.monto),
                        confirmed: p.estado === 'APROBADO' || p.estado === 'CONFIRMADO', // Solo confirmado si aprobado
                        readonly: true,
                        estado: p.estado // Guardamos estado para UI
                    }));
                    setPagos(mapped);
                }
            }
        } catch (error) {
            console.error("Error fetching payments", error);
        }
    };

    const handleSearchDni = async () => {
        if (!dniSearch) return Swal.fire("Info", "Ingrese DNI", "info");
        try {
            // Endpoint returns LIST of pending sales
            const { data } = await LOAApi.get(`/api/sales/by-client-dni/${dniSearch}`);
            if (data.success && data.result && data.result.length > 0) {
                const sales = data.result;
                // Assume user wants the LATEST pending sale
                const latest = sales[0];
                setVentaId(latest.venta_id);
                setCurrentTotal(parseFloat(latest.total));
                fetchSaleDetails(latest.venta_id);
                fetchExistingPayments(latest.venta_id);
                Swal.fire("Encontrado", `Venta encontrada: ID ${latest.venta_id} - Total $${latest.total}`, "success");
            } else {
                Swal.fire("Info", "No se encontraron ventas pendientes para este DNI", "info");
            }
        } catch (error) {
            console.error(error);
            Swal.fire("Error", "Error buscando ventas", "error");
        }
    };

    const handleCancelSale = async () => {
        if (!ventaId) return;
        const result = await Swal.fire({
            title: '¿Cancelar venta?',
            text: "¿Seguro que deseas cancelar esta venta?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, cancelar',
            cancelButtonText: 'No'
        });

        if (!result.isConfirmed) return;

        try {
            await LOAApi.put(`/api/sales/${ventaId}/cancel`);
            Swal.fire("Cancelada", "Venta cancelada", "success");
            navigate('/');
        } catch (error) {
            console.error(error);
            Swal.fire("Error", "Error cancelando venta", "error");
        }
    };

    // State
    const [pagos, setPagos] = useState<(PagoParcial & { estado?: string })[]>([]);
    const [loading, setLoading] = useState(false);

    // Form State for new payment
    const [selectedMethod, setSelectedMethod] = useState<MetodoPago | ''>('');
    const [amountInput, setAmountInput] = useState<string>('');

    // Form State for Obras Sociales
    const [selectedObraSocialId, setSelectedObraSocialId] = useState<number | ''>('');
    const [nroOrden, setNroOrden] = useState<string>('');

    // Calculations
    // Solo sumamos los confirmados para el "Pagado" real
    const totalPagado = pagos.reduce((acc, p) => acc + (p.confirmed ? (Number(p.monto) || 0) : 0), 0);
    const restante = Math.max(0, currentTotal - totalPagado);

    // Handlers
    const [mpModalOpen, setMpModalOpen] = useState(false);
    const [mpAmount, setMpAmount] = useState(0);

    const handleAddPayment = () => {
        if (!selectedMethod) return Swal.fire("Info", "Seleccioná un método de pago", "info");
        const amount = parseFloat(amountInput);
        if (isNaN(amount) || amount <= 0) return Swal.fire("Error", "Ingresá un monto válido", "error");
        if (amount > restante + 0.01) return Swal.fire("Error", "El monto supera el restante", "error");

        if (selectedMethod === 'MP') {
            setMpAmount(amount);
            setMpModalOpen(true);
            return;
        }

        setPagos([...pagos, { metodo: selectedMethod, monto: amount, confirmed: true, readonly: false }]); // Manuales nuevos asumimos 'confirmed' visualmente para restar
        // Reset inputs
        setSelectedMethod('');
        setAmountInput((restante - amount).toFixed(2));
    };

    const handleRemovePayment = (index: number) => {
        if (pagos[index].readonly || (pagos[index].confirmed && pagos[index].readonly)) { // Only block if DB confirmed
            Swal.fire("Error", "No se puede eliminar un pago ya confirmado.", "error");
            return;
        }
        const removedAmount = pagos[index].monto;
        const newPagos = pagos.filter((_, i) => i !== index);
        setPagos(newPagos);
        setAmountInput((restante + removedAmount).toFixed(2));
    };

    /* New States for Async Payment (Point/QR) */
    const [asyncPaymentStatus, setAsyncPaymentStatus] = useState<'IDLE' | 'WAITING_POINT' | 'SHOWING_QR'>('IDLE');
    const [qrData, setQrData] = useState<string | null>(null);
    const [pointStatus, setPointStatus] = useState<string>("");

    // Polling Effect
    useEffect(() => {
        let interval: any;
        let safetyTimeout: any;

        if (asyncPaymentStatus !== 'IDLE' && ventaId) {
            interval = setInterval(() => {
                checkPaymentStatus();
            }, 3000);

            safetyTimeout = setTimeout(() => {
                setAsyncPaymentStatus((currentStatus) => {
                    if (currentStatus !== 'IDLE') {
                        clearInterval(interval);
                        setLoading(false);
                        Swal.fire("Tiempo agotado", "Tiempo de espera agotado. Verifique el dispositivo.", "warning");
                        return 'IDLE';
                    }
                    return currentStatus;
                });
            }, 600000);
        }

        return () => {
            if (interval) clearInterval(interval);
            if (safetyTimeout) clearTimeout(safetyTimeout);
        };
    }, [asyncPaymentStatus, ventaId]);

    const checkPaymentStatus = async () => {
        try {
            const { data } = await LOAApi.get(`/api/payments/${ventaId}`);
            if (data.success && data.result) {
                const { pagos: backendPagosList } = data.result;

                // REFRESH LIST
                if (Array.isArray(backendPagosList)) {
                    const now = new Date();

                    const pagoRechazadoReciente = backendPagosList.find((p: any) => {
                        if (p.estado !== 'RECHAZADO') return false;

                        const fechaPago = new Date(p.created_at);
                        const diferenciaSegundos = Math.abs(now.getTime() - fechaPago.getTime()) / 1000;

                        return diferenciaSegundos < 10; // Solo consideramos rechazos de los últimos 10s
                    });

                    // Si encontramos un rechazo reciente y el modal está abierto, lo cerramos
                    if (pagoRechazadoReciente && asyncPaymentStatus !== 'IDLE') {
                        setAsyncPaymentStatus('IDLE');
                        setLoading(false);
                        Swal.fire("Rechazado", "❌ El pago fue rechazado recientemente. Por favor, intente con otra tarjeta.", "error");
                        return;
                    }
                    // Check if we have a NEW confirmed payment
                    backendPagosList.some((p: any) =>
                        (p.estado === 'APROBADO' || p.estado === 'CONFIRMADO') &&
                        !pagos.some(local => local.confirmed && local.monto === parseFloat(p.monto) && local.metodo === p.metodo) // Weak check but sufficient for now
                    );

                    const mapped = backendPagosList.map((p: any) => ({
                        metodo: p.metodo,
                        monto: parseFloat(p.monto),
                        confirmed: p.estado === 'APROBADO' || p.estado === 'CONFIRMADO',
                        readonly: true,
                        estado: p.estado
                    }));

                    // Re-calculate totals from fresh data
                    const freshTotalPaid = mapped.reduce((acc: number, p: any) => acc + (p.confirmed ? p.monto : 0), 0);

                    const mpPaymentApproved = mapped.find(p => p.metodo.startsWith('MP') && p.confirmed);

                    if (mpPaymentApproved && (asyncPaymentStatus === 'SHOWING_QR' || asyncPaymentStatus === 'WAITING_POINT')) {
                        // ¡Éxito! Encontramos un pago MP aprobado mientras mostrábamos el QR
                        setPagos(mapped);
                        setAsyncPaymentStatus('IDLE');
                        setLoading(false);
                        // Opcional: Toast de éxito
                    } else if (freshTotalPaid !== totalPagado) {
                        // Si hubo cualquier cambio en los montos (ej: pago parcial en otra caja), actualizamos la UI
                        setPagos(mapped);
                    }
                }
            }
        } catch (e) {
            console.error("Error polling payment status", e);
        }
    };

    const onSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (loading) return;

        // Filter out already confirmed payments (MP, etc)
        const newPayments = pagos.filter(p => !p.confirmed || !p.readonly);

        if (newPayments.length === 0 && restante > 0.01) {
            Swal.fire("Info", "Agregue un pago o verifique el monto.", "info");
            return;
        }

        if (newPayments.length === 0 && restante <= 0.01) {
            Swal.fire("Éxito", "Venta pagada correctamente.", "success");
            navigate(`/ventas/${ventaId}`);
            return;
        }

        setLoading(true);
        try {
            const payload = {
                venta_id: ventaId,
                pagos: newPayments.map(p => ({
                    metodo: p.metodo,
                    monto: p.monto,
                    referencia: ''
                }))
            };

            await LOAApi.post('/api/payments/manual', payload);

            Swal.fire("Éxito", "Pagos registrados correctamente", "success");
            fetchExistingPayments(ventaId!.toString());
            setPagos([]);

        } catch (error) {
            console.error(error);
            Swal.fire("Error", "Error registrando pagos", "error");
        } finally {
            setLoading(false);
        }
    };

    const startMpQrFlow = async (amount: number) => {
        setLoading(true);
        setPointStatus("");
        try {
            const { data } = await LOAApi.post('/api/payments/mercadopago/dynamic', {
                total: amount,
                sucursal_id: 'SUCURSAL_DEFAULT',
                venta_id: ventaId
            });

            if (data.success && data.result?.qr_data) {
                setQrData(data.result.qr_data);
                setAsyncPaymentStatus('SHOWING_QR');
                setAsyncPaymentStatus('IDLE');
            }
        } catch (e) {
            console.error("MP QR Error:", e);
            Swal.fire("Error", "Error iniciando pago QR. Intente nuevamente.", "error");
            setAsyncPaymentStatus('IDLE');
            setQrData(null);
        } finally {
            setLoading(false);
        }
    };

    const startMpPointFlow = async (amount: number, deviceId: string) => {
        setLoading(true);
        setPointStatus("");
        try {
            if (!deviceId) {
                setLoading(false);
                return Swal.fire("Error", "Error: Falta ID de dispositivo", "error");
            }
            await LOAApi.post('/api/payments/mercadopago/point', {
                venta_id: ventaId,
                monto: amount,
                device_id: deviceId
            });
            setPointStatus("Enviado a terminal. Espere...");
            setAsyncPaymentStatus('WAITING_POINT');
        } catch (e) {
            console.error("MP Point Error:", e);
            Swal.fire("Error", "Error iniciando pago Point. Intente nuevamente.", "error");
            setAsyncPaymentStatus('IDLE');
        } finally {
            setLoading(false);
        }
    };

    const handleCoverInsurance = async () => {
        if (!ventaId || !selectedObraSocialId || !nroOrden) {
            Swal.fire("Info", "Faltan datos para la cobertura", "info");
            return;
        }
        setLoading(true);
        try {
            const { data } = await LOAApi.post('/api/sales/cover-insurance', {
                venta_id: ventaId,
                obra_social_id: selectedObraSocialId,
                nro_orden: nroOrden
            });

            if (data.success) {
                Swal.fire("Cobertura Aplicada", `Cobertura aplicada por $${data.covered_amount}`, "success");
                // Refresh payments
                fetchExistingPayments(ventaId);
                // Reset OS fields? Maybe keep them displayed contextually, but good to reset logic.
                // We don't reset method because user might want to see what happened.
            }
        } catch (error: any) {
            console.error("Error covering insurance:", error);
            Swal.fire("Error", error.response?.data?.error || "Error aplicando cobertura", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleSupervisorSuccess = async (supervisorName: string) => {
        try {
            setLoading(true);
            // 1. Update observation (Audit)
            await LOAApi.put(`/api/sales/${ventaId}/observation`, {
                observation: `AUTORIZADO RETIRO SIN PAGO POR: ${supervisorName}`
            });

            // 2. Navigate to result (Pending status is implicit)
            navigate(`/ventas/resultado?venta_id=${ventaId}`);

        } catch (error) {
            console.error("Error updating sale observation:", error);
            Swal.fire("Error", "Error al registrar autorización. Intente nuevamente.", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (restante > 0 && amountInput === '0.00' && !selectedMethod) {
            setAmountInput(restante.toFixed(2));
        }
    }, [restante]);

    // Transform saleItems for display
    const displayItems: CartItem[] = saleItems.map(item => ({
        producto: {
            nombre: item.producto_nombre || item.producto?.nombre || item.nombre || 'Producto',
            ...item.producto // Keep other props if available
        } as any,
        cantidad: Number(item.cantidad),
        subtotal: Number(item.subtotal || (item.precio_unitario * item.cantidad))
    }));

    return {
        ventaId,
        currentTotal,
        totalPagado,
        restante,
        pagos,
        loading,
        saleItems: displayItems,
        dniSearch,
        setDniSearch,
        handleSearchDni,
        handleCancelSale,
        supervisorModalOpen,
        setSupervisorModalOpen,
        handleSupervisorSuccess,
        selectedMethod,
        setSelectedMethod,
        amountInput,
        setAmountInput,
        handleAddPayment,
        handleRemovePayment,
        onSubmit,
        mpModalOpen,
        setMpModalOpen,
        mpAmount,
        pointDevices,
        selectedDeviceId,
        setSelectedDeviceId,
        startMpQrFlow,
        startMpPointFlow,
        asyncPaymentStatus,
        qrData,
        pointStatus,
        setAsyncPaymentStatus,
        // OS
        obrasSociales,
        selectedObraSocialId,
        setSelectedObraSocialId,
        nroOrden,
        setNroOrden,
        handleCoverInsurance
    };
};
