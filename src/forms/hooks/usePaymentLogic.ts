
import { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import LOAApi from '../../api/LOAApi';
import type { MetodoPago, PagoParcial } from '../../types/Pago';
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
                const sale = Array.isArray(data.result) ? data.result[0] : data.result;
                if (sale.total) setCurrentTotal(parseFloat(sale.total));
                if (sale.items) setSaleItems(sale.items || []);
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
        if (!dniSearch) return alert("Ingrese DNI");
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
                alert(`Venta encontrada: ID ${latest.venta_id} - Total $${latest.total}`);
            } else {
                alert("No se encontraron ventas pendientes para este DNI");
            }
        } catch (error) {
            console.error(error);
            alert("Error buscando ventas");
        }
    };

    const handleCancelSale = async () => {
        if (!ventaId) return;
        if (!window.confirm("¿Seguro que deseas cancelar esta venta?")) return;

        try {
            await LOAApi.put(`/api/sales/${ventaId}/cancel`);
            alert("Venta cancelada");
            navigate('/');
        } catch (error) {
            console.error(error);
            alert("Error cancelando venta");
        }
    };

    // State
    const [pagos, setPagos] = useState<(PagoParcial & { estado?: string })[]>([]);
    const [loading, setLoading] = useState(false);

    // Form State for new payment
    const [selectedMethod, setSelectedMethod] = useState<MetodoPago | ''>('');
    const [amountInput, setAmountInput] = useState<string>('');

    // Calculations
    // Solo sumamos los confirmados para el "Pagado" real
    const totalPagado = pagos.reduce((acc, p) => acc + (p.confirmed ? (Number(p.monto) || 0) : 0), 0);
    const restante = Math.max(0, currentTotal - totalPagado);

    // Handlers
    const [mpModalOpen, setMpModalOpen] = useState(false);
    const [mpAmount, setMpAmount] = useState(0);

    const handleAddPayment = () => {
        if (!selectedMethod) return alert("Seleccioná un método de pago");
        const amount = parseFloat(amountInput);
        if (isNaN(amount) || amount <= 0) return alert("Ingresá un monto válido");
        if (amount > restante + 0.01) return alert("El monto supera el restante");

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
            alert("No se puede eliminar un pago ya confirmado.");
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
                        alert("Tiempo de espera agotado. Verifique el dispositivo.");
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

                    const pagoRechazado = backendPagosList.find((p: any) =>
                        p.metodo === 'MP' &&
                        p.estado === 'RECHAZADO' &&
                        parseFloat(p.monto) === mpAmount // mpAmount es el estado local del monto que intentas cobrar
                    );

                    if (pagoRechazado && asyncPaymentStatus !== 'IDLE') {
                        setAsyncPaymentStatus('IDLE'); // Cerramos el modal de espera
                        setLoading(false);
                        alert("❌ El pago fue RECHAZADO por Mercado Pago. Intente con otro medio.");
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

                    const mpPaymentApproved = mapped.find(p => p.metodo === 'MP' && p.confirmed);

                    if (mpPaymentApproved && asyncPaymentStatus === 'SHOWING_QR') {
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
            alert("Agregue un pago o verifique el monto.");
            return;
        }

        if (newPayments.length === 0 && restante <= 0.01) {
            alert("Venta pagada correctamente.");
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

            alert('Pagos registrados correctamente');
            fetchExistingPayments(ventaId!.toString());
            setPagos([]);

        } catch (error) {
            console.error(error);
            alert('Error registrando pagos');
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
            } else {
                console.error("Respuesta inesperada QR Dinámico:", data);
                alert("Error generando QR Dinámico. Intente nuevamente.");
                setAsyncPaymentStatus('IDLE');
            }
        } catch (e) {
            console.error("MP QR Error:", e);
            alert("Error iniciando pago QR. Intente nuevamente.");
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
                return alert("Error: Falta ID de dispositivo");
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
            alert("Error iniciando pago Point. Intente nuevamente.");
            setAsyncPaymentStatus('IDLE');
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
            alert("Error al registrar autorización. Intente nuevamente.");
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
            nombre: item.producto_nombre || item.producto?.nombre || 'Producto',
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
        setAsyncPaymentStatus
    };
};
