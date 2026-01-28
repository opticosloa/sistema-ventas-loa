import { useEffect, useState, useRef } from 'react';
import Swal from 'sweetalert2';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import LOAApi from '../../api/LOAApi';
import type { MetodoPago, PagoParcial } from '../../types/Pago';
import type { CartItem } from '../components/SalesItemsList';
import { useAppSelector } from '../../hooks';
import type { ObraSocial } from '../../types/ObraSocial';

export interface UsePaymentLogicReturn {
    ventaId: string | number | null;
    currentTotal: number;
    totalPagado: number;
    restante: number;
    pagos: (PagoParcial & { estado?: string, referencia?: string })[];
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
    handlePayOnPickup: () => void;

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
    selectedObraSocialId: string | '';
    setSelectedObraSocialId: (id: string | '') => void;
    nroOrden: string;
    setNroOrden: (val: string) => void;
    handleCoverInsurance: () => void;
    isDirectSale: boolean;
    payOnPickupDisabled: boolean;
    coverageDetails: { totalCoverage: number; itemsDetail: { name: string; amount: number; reason: string }[] };
}

export const usePaymentLogic = (overrideVentaId?: string | number): UsePaymentLogicReturn => {
    const { ventaId: paramVentaId } = useParams<{ ventaId: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { uid, role } = useAppSelector(state => state.auth);

    const getHomePath = () => {
        if (role === 'ADMIN' || role === 'SUPERADMIN') return '/admin';
        if (role === 'EMPLEADO') return '/empleado';
        if (role === 'TALLER') return '/taller';
        return '/';
    };

    const stateVentaId = location.state?.ventaId;
    const stateTotal = location.state?.total;
    const isDirectSaleState = location.state?.isDirectSale || false;

    /* New States */
    const [ventaId, setVentaId] = useState<string | number | null>(overrideVentaId || paramVentaId || stateVentaId || null);
    const [clientId, setClientId] = useState<string | null>(null);

    // State
    const [pagos, setPagos] = useState<(PagoParcial & { estado?: string, referencia?: string })[]>([]);
    const [loading, setLoading] = useState(false);

    // Form State for new payment
    const [selectedMethod, setSelectedMethod] = useState<MetodoPago | ''>('');
    const [amountInput, setAmountInput] = useState<string>('');

    // Form State for Obras Sociales
    const [selectedObraSocialId, setSelectedObraSocialId] = useState<string | ''>('');
    const [nroOrden, setNroOrden] = useState<string>('');


    // Handlers
    const [mpModalOpen, setMpModalOpen] = useState(false);
    const [mpAmount, setMpAmount] = useState(0);

    // Update ventaId if override changes
    useEffect(() => {
        if (overrideVentaId) setVentaId(overrideVentaId);
    }, [overrideVentaId]);
    const [saleItems, setSaleItems] = useState<any[]>([]);
    const [dniSearch, setDniSearch] = useState("");
    const [currentTotal, setCurrentTotal] = useState<number>(stateTotal ? parseFloat(stateTotal) : 0);
    const [isDirectSale, setIsDirectSale] = useState(isDirectSaleState);

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

    // Calculations
    // Solo sumamos los confirmados para el "Pagado" real
    const totalPagado = pagos.reduce((acc, p) => acc + (p.confirmed ? (Number(p.monto) || 0) : 0), 0);
    const restante = Math.max(0, currentTotal - totalPagado);

    // LOGICA TAREA 1: Bloquear "Pagar al Retirar"
    // Bloquear si hay pagos parciales cargados O si hay una Obra Social seleccionada/cargada
    const hasPayments = pagos.length > 0;
    const hasOSActive = !!selectedObraSocialId || pagos.some(p => p.metodo === 'OBRA_SOCIAL');
    const payOnPickupDisabled = hasPayments || hasOSActive;


    const [coverageDetails, setCoverageDetails] = useState<{
        totalCoverage: number;
        itemsDetail: { name: string; amount: number; reason: string }[];
    }>({ totalCoverage: 0, itemsDetail: [] });

    // COMPLEX COVERAGE LOGIC
    useEffect(() => {
        if (selectedMethod === 'OBRA_SOCIAL' && selectedObraSocialId) {
            const os = obrasSociales.find(o => String(o.obra_social_id) === String(selectedObraSocialId));
            if (!os) return;

            // Caps
            const capCristal = Number(os.cobertura_cristal_max) || 0;
            const capArmazon = Number(os.cobertura_armazon_max) || 0;
            const capGlobal = Number(os.monto_cobertura_total) || 0;
            // Legacy percentages
            const pctCristal = os.cobertura?.porcentaje_cristales || 0;
            const pctArmazon = os.cobertura?.porcentaje_armazones || 0;

            let totalCalculated = 0;
            const details: { name: string; amount: number; reason: string }[] = [];

            // Helper to decide item coverage
            const calculateItemCoverage = (item: any) => {
                const price = item.producto.precio_venta * item.cantidad;
                const name = item.producto.nombre.toLowerCase();
                let covered = 0;
                let reason = '';

                const isCristal = name.includes('cristal') || name.includes('lente') || item.producto.nombre.includes('Cristal'); // Basic heuristic
                const isArmazon = name.includes('armazon') || name.includes('montura');

                // Priority 1: Specific Fixed Coverage
                if (isCristal && capCristal > 0) {
                    covered = Math.min(price, capCristal * item.cantidad); // Cap per unit or total? Usually per unit. Let's assume per unit * qty
                    reason = `Top Cristal ($${capCristal}/u)`;
                } else if (isArmazon && capArmazon > 0) {
                    covered = Math.min(price, capArmazon * item.cantidad);
                    reason = `Top Armazón ($${capArmazon}/u)`;
                }
                // Priority 3: Percentage (Fallback if no specific cap? Or if P1 didn't apply?)
                // Spec says: "Si no aplicó P1 ni P2...". Wait, P2 is Global.
                // Global is applied at the END.
                // So if P1 didn't apply, we check Percentage?
                else {
                    if (isCristal && pctCristal > 0) {
                        covered = price * (pctCristal / 100);
                        reason = `${pctCristal}% Cobertura`;
                    } else if (isArmazon && pctArmazon > 0) {
                        covered = price * (pctArmazon / 100);
                        reason = `${pctArmazon}% Cobertura`;
                    }
                }

                return { covered, reason };
            };

            // Iterar items
            saleItems.forEach(item => {
                // Dentro del loop: saleItems.forEach(item => {
                const name = item.producto.nombre.toLowerCase();
                const isCristal = name.includes('cristal') || name.includes('lente') || name.includes('organico') || name.includes('poly') || name.includes('mineral'); // Agregué keywords comunes temporalmente

                console.log(`🔍 DEBUG ITEM: ${name}`);
                console.log(`   - Detectado como Cristal? ${isCristal}`);
                console.log(`   - Tope Cristal Configurado: ${capCristal}`);
                // ... resto del código
                const { covered, reason } = calculateItemCoverage(item);
                if (covered > 0) {
                    totalCalculated += covered;
                    details.push({
                        name: item.producto.nombre,
                        amount: covered,
                        reason
                    });
                }
            });

            // Priority 2: Global Fija (Si no aplicó P1... wait, logic says "Si no aplicó la P1 y existe monto_cobertura_total")
            // This implies Global Cap serves as a fallback or a clamp?
            // "Si no aplicó la P1 y existe monto global > 0: Cobertura = MIN(remaining, monto_global)"
            // This is ambiguous. Does it replace everything?
            // "Prioridad 2... Si no aplicó la P1". Means if we didn't use Crystal/Frame caps?
            // Or does it mean "If total coverage so far is 0"?
            // Usually Global Cap is a generic "We cover up to $X for the whole receipt".
            // Let's assume if totalCalculated (from P1/P3) is 0, we check Global.

            if (totalCalculated === 0 && capGlobal > 0) {
                // Cover up to capGlobal
                const coverage = Math.min(currentTotal, capGlobal);
                totalCalculated = coverage;
                details.push({ name: 'Cobertura Global', amount: coverage, reason: `Tope Global $${capGlobal}` });
            }

            // Also, logic says "Si no aplicó P1 ni P2, usar porcentajes".
            // My code applied P1 OR P3 (Percentage) at item level.
            // Let's align strictly:
            // Loop Items:
            //   Check P1 (Specific Cap). If hit, use it.
            //   If miss P1, continue.
            // After Loop: 
            //   If total > 0, we used P1/P3 (mixed?).
            //   If total == 0 AND Global Cap > 0 -> Use Global Cap.
            //   If total == 0 AND Global Cap == 0 -> We might have used P3 in loop?

            // Re-reading T3:
            // "Iterar sobre los ítems... Prioridad 1... Si es Cristal y existe top... Si es Armazon y existe tope..."
            // "Prioridad 2 (Global): Si no aplicó la P1 y existe monto... Cobertura = MIN(restante, global)"
            // "Prioridad 3 (Porcentajes): Si no aplicó P1 ni P2..."

            // This suggests a per-item check? Or per-strategy?
            // "Iterar sobre los items" suggests P1 is item-based.
            // But P2 is "Global".
            // Maybe: Try P1 for all items. If we got something, that's it?
            // Or can we mix P1 for crystals and P3 for frames?
            // "Si no aplicó la P1" likely means "For this item" or "For the sale"?
            // "Cobertura es por íntem".
            // OK, so for EACH ITEM:
            //   Check P1. If hit, sum.
            //   If miss P1, check P2 (Global?? No, global is global).
            //   Maybe Global is "If NO specific caps exist for ANY item, use Global Cap for whole sale"?

            // Let's implement:
            // 1. Calculate P1 for all items.
            // 2. If Sum P1 > 0, use P1 result.
            // 3. If Sum P1 == 0:
            //    Check P2 (Global). If > 0, use MIN(total, Global).
            //    If P2 == 0:
            //       Calculate P3 (Percentages) for all items.

            // Corrected Implementation based on this interpretation:

            // Pass 1: Item Specific Caps
            let sumP1 = 0;
            const detailsP1: any[] = [];
            let p1Applied = false;

            saleItems.forEach(item => {
                const name = item.producto.nombre.toLowerCase();
                const isCristal = name.includes('cristal') || name.includes('lente');
                const isArmazon = name.includes('armazon') || name.includes('montura');
                const price = item.producto.precio_venta * item.cantidad;

                if (isCristal && capCristal > 0) {
                    const cov = Math.min(price, capCristal * item.cantidad);
                    sumP1 += cov;
                    detailsP1.push({ name: item.producto.nombre, amount: cov, reason: 'Tope Cristal' });
                    p1Applied = true;
                } else if (isArmazon && capArmazon > 0) {
                    const cov = Math.min(price, capArmazon * item.cantidad);
                    sumP1 += cov;
                    detailsP1.push({ name: item.producto.nombre, amount: cov, reason: 'Tope Armazón' });
                    p1Applied = true;
                }
            });

            if (p1Applied) {
                totalCalculated = sumP1;
                details.push(...detailsP1);
            } else {
                // Pass 2: Global Cap
                if (capGlobal > 0) {
                    totalCalculated = Math.min(currentTotal, capGlobal);
                    details.push({ name: 'Global', amount: totalCalculated, reason: 'Tope Global' });
                } else {
                    // Pass 3: Percentages
                    saleItems.forEach(item => {
                        const name = item.producto.nombre.toLowerCase();
                        const price = item.producto.precio_venta * item.cantidad;
                        const isCristal = name.includes('cristal') || name.includes('lente');
                        const isArmazon = name.includes('armazon') || name.includes('montura');

                        let cov = 0;
                        if (isCristal && pctCristal > 0) {
                            cov = price * (pctCristal / 100);
                            details.push({ name: item.producto.nombre, amount: cov, reason: `${pctCristal}%` });
                        } else if (isArmazon && pctArmazon > 0) {
                            cov = price * (pctArmazon / 100);
                            details.push({ name: item.producto.nombre, amount: cov, reason: `${pctArmazon}%` });
                        }
                        totalCalculated += cov;
                    });
                }
            }

            setCoverageDetails({
                totalCoverage: totalCalculated,
                itemsDetail: details
            });
            setAmountInput(totalCalculated.toFixed(2));

        } else {
            // Reset if not OS
            setCoverageDetails({ totalCoverage: 0, itemsDetail: [] });
            if (selectedMethod !== 'MP') { // MP handles its own?
                // Don't reset amountInput blindly if user is typing, but here we changed method.
            }
        }
    }, [selectedObraSocialId, selectedMethod, obrasSociales, currentTotal, saleItems]);

    // Sync with location state on mount
    useEffect(() => {
        const state = (location.state as any);
        if (state?.ventaId) {
            setVentaId(state.ventaId);
            if (state.total) setCurrentTotal(state.total);
            if (state.isDirectSale !== undefined) setIsDirectSale(state.isDirectSale);
        }
        if (state?.preSelectedObraSocialId) {
            setSelectedMethod('OBRA_SOCIAL'); // Auto-select method
            setSelectedObraSocialId(state.preSelectedObraSocialId);
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

                console.log("🔍 DEBUG FETCH SALE:", sale);
                if (sale) {

                    // Forzamos el parseo a número para evitar errores de concatenación de strings
                    const rawTotal = parseFloat(sale.total || 0);
                    const discountVal = parseFloat(sale.descuento || 0);

                    // Calculamos el Neto (Total - Descuento)
                    const finalTotal = Math.max(0, rawTotal - discountVal);

                    // IMPORTANTE: Seteamos el total neto para el cobro
                    setCurrentTotal(finalTotal);

                    // Setar Cliente (para crear ticket)
                    if (sale.cliente_id) setClientId(sale.cliente_id);

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
                        estado: p.estado, // Guardamos estado para UI
                        created_at: p.created_at // Needed for rejection detection logic
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
            navigate(getHomePath());
        } catch (error) {
            console.error(error);
            Swal.fire("Error", "Error cancelando venta", "error");
        }
    };

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

        let referenciaStr = '';
        if (selectedMethod === 'OBRA_SOCIAL') {
            referenciaStr = `ID_OS: ${selectedObraSocialId} | ORD: ${nroOrden}`;
        }

        setPagos([...pagos, {
            metodo: selectedMethod,
            monto: amount,
            confirmed: true,
            readonly: false,
            referencia: referenciaStr
        }]); // Manuales nuevos asumimos 'confirmed' visualmente para restar
        // Reset inputs
        setSelectedMethod('');
        // Reset OS specific
        if (selectedMethod === 'OBRA_SOCIAL') {
            setNroOrden('');
            setSelectedObraSocialId('');
        }
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

    // ACTIVE ID REF: To ignore any payment status update that isn't the one we just started
    const activePaymentId = useRef<string | null>(null);
    const pollingIntervalRef = useRef<any>(null);

    // Cleanup when ventaId changes or unmount
    useEffect(() => {
        return () => {
            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
        };
    }, []);

    // Reset Async State when Venta ID changes (prevents ghost polling)
    useEffect(() => {
        // Clear any running interval
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
        }

        // Reset states
        setAsyncPaymentStatus('IDLE');
        setQrData(null);
        setPointStatus("");
        activePaymentId.current = null;
    }, [ventaId]); // Strict dependency on ventaId

    // Polling Effect
    useEffect(() => {
        let safetyTimeout: any;

        if (asyncPaymentStatus !== 'IDLE' && ventaId) {
            // Clear previous if any (just in case)
            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);

            pollingIntervalRef.current = setInterval(() => {
                checkPaymentStatus();
            }, 3000);

            safetyTimeout = setTimeout(() => {
                setAsyncPaymentStatus((currentStatus) => {
                    if (currentStatus !== 'IDLE') {
                        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
                        setLoading(false);
                        Swal.fire("Tiempo agotado", "Tiempo de espera agotado. Verifique el dispositivo.", "warning");
                        return 'IDLE';
                    }
                    return currentStatus;
                });
            }, 600000); // 10 minutes
        } else {
            // If IDLE, stop polling
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
            }
        }

        return () => {
            if (safetyTimeout) clearTimeout(safetyTimeout);
            // We don't clear interval here because we want it to persist across re-renders unless status changes
            // But actually, if status changes (e.g. to IDLE), the effect re-runs and hits the 'else' block or the cleanup.
            // Safest to clear on unmount of effect if status changed away from meaningful.
            if (asyncPaymentStatus === 'IDLE' && pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
            }
        };
    }, [asyncPaymentStatus, ventaId]);

    const checkPaymentStatus = async () => {
        try {
            const { data } = await LOAApi.get(`/api/payments/${ventaId}`);
            if (data.success && data.result) {
                const { pagos: backendPagosList } = data.result;

                if (Array.isArray(backendPagosList)) {
                    // 1. BUSCAMOS SOLO EL PAGO QUE ESTAMOS ESPERANDO
                    if (activePaymentId.current) {
                        // STRICT STRING COMPARISON for IDs
                        const pagoActual = backendPagosList.find((p: any) =>
                            String(p.pago_id) === String(activePaymentId.current) ||
                            String(p.external_reference) === String(activePaymentId.current)
                        );

                        if (pagoActual) {
                            console.log(`📊 Monitoreando Pago Activo (${pagoActual.pago_id}): ${pagoActual.estado}`);

                            // 2. RECHAZADO / CANCELADO
                            if ((pagoActual.estado === 'RECHAZADO' || pagoActual.estado === 'CANCELLED') && asyncPaymentStatus !== 'IDLE') {
                                console.log("❌ El pago activo fue rechazado/cancelado.");
                                setAsyncPaymentStatus('IDLE');
                                setLoading(false);
                                activePaymentId.current = null; // Limpiamos
                                if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
                                Swal.fire("Pago No Realizado", "El pago fue rechazado o cancelado en la plataforma.", "error");
                                return;
                            }

                            // 3. APROBADO
                            // VALIDACION ESTRICTA: Solo si es approved/confirmed
                            if ((pagoActual.estado === 'APROBADO' || pagoActual.estado === 'CONFIRMADO') && asyncPaymentStatus !== 'IDLE') {
                                console.log("✅ El pago activo fue aprobado.");
                                fetchExistingPayments(ventaId); // Refrescar lista general
                                setAsyncPaymentStatus('IDLE');
                                setLoading(false);
                                activePaymentId.current = null; // Limpiamos
                                if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
                                Swal.fire("¡Éxito!", "Pago recibido correctamente.", "success");
                                return;
                            }
                        }
                        // Si no lo encontramos, seguimos esperando...
                    }

                    // --- MANTENER LOGICA DE REFRESCO GENERAL ---
                    const mapped = backendPagosList.map((p: any) => ({
                        metodo: p.metodo,
                        monto: parseFloat(p.monto),
                        confirmed: p.estado === 'APROBADO' || p.estado === 'CONFIRMADO',
                        readonly: true,
                        estado: p.estado,
                        created_at: p.created_at
                    }));

                    // Re-calculate totals from fresh data
                    const freshTotalPaid = mapped.reduce((acc: number, p: any) => acc + (p.confirmed ? p.monto : 0), 0);
                    if (freshTotalPaid !== totalPagado) {
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

        // Reglas de Negocio: Seña Mínima (30%)
        // 1. Calcular pagos "reales" (No Covertura OS)
        const pagosReales = pagos.filter(p => p.metodo !== 'OBRA_SOCIAL');
        const pagosOS = pagos.filter(p => p.metodo === 'OBRA_SOCIAL');

        const totalPagadoReal = pagosReales.reduce((acc, p) => acc + (p.confirmed ? (Number(p.monto) || 0) : 0), 0);
        const totalPagadoOS = pagosOS.reduce((acc, p) => acc + (p.confirmed ? (Number(p.monto) || 0) : 0), 0);


        // Base para Seña = Total de la Venta (Sin restar OS)
        const montoMinimo = currentTotal * 0.30;

        // El pago real + pago OS debe cubrir la seña
        const totalPagadoTotal = totalPagadoReal + totalPagadoOS;

        // Filter out already confirmed payments (MP, etc) for POST request
        const newPayments = pagos.filter(p => !p.confirmed || !p.readonly);

        const isFullyPaid = restante <= 0.01;
        const isMinimoCubierto = totalPagadoTotal >= (montoMinimo - 100); // Margen de error $100

        // Si es Venta Directa -> NO PERMITIR SEÑA (Debe ser pago total)
        if (isDirectSale) {
            if (!isFullyPaid) {
                Swal.fire({
                    title: 'Pago Incompleto',
                    text: 'Las ventas directas requieren el pago total de los productos.',
                    icon: 'warning',
                    confirmButtonText: 'Entendido'
                });
                return;
            }
        }

        // Si NO es venta directa, aplicar regla del 30%
        if (!isDirectSale && !isFullyPaid && !isMinimoCubierto) {
            // WARN but allow continue
            Swal.fire({
                title: 'Seña Insuficiente',
                html: `El pago mínimo sugerido es <b>$${Math.round(montoMinimo)}</b> (30%).<br>Pagado: $${totalPagadoReal}.<br><br>¿Qué desea hacer?`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Generar Orden (Sin/Baja Seña)',
                cancelButtonText: 'Volver a Pagos',
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#777'
            }).then((result) => {
                if (result.isConfirmed) {
                    processSale(newPayments);
                }
            });
            return;
        }

        if (newPayments.length === 0 && restante > 0.01 && !isMinimoCubierto) {
            // Caso borde: no agrega nada y debe plata
            Swal.fire("Info", "Agregue un pago o verifique el monto.", "info");
            return;
        }

        if (newPayments.length === 0 && restante <= 0.01) {
            // Caso: Ya está pagado todo (o cubierto por OS)
            // Simplemente navegar
            Swal.fire("Éxito", "Venta guardada correctamente.", "success");

            // Crear Ticket si corresponde (aunque si ya estaba paga, quizas ya se dio, pero no esta de mas validar en back)
            if (!isDirectSale && ventaId && clientId && uid) {
                try {
                    await LOAApi.post('/api/tickets', {
                        venta_id: ventaId,
                        cliente_id: clientId,
                        usuario_id: uid,
                        fecha_entrega_estimada: new Date(Date.now() + 10000).toISOString(),
                        notas: 'Ticket generado automáticamente al pagar'
                    });
                } catch (e) {
                    console.error("Error auto-generando ticket", e);
                }
            }

            // Intentar abrir PDF si corresponde -> MOVIDO A PAGO RESULTADO
            // if (!isDirectSale && ventaId) openLabOrderPdf(ventaId);
            return navigate(`/pago-resultado?venta_id=${ventaId}&isDirectSale=${isDirectSale}`);
        }

        // Si hay pagos nuevos, los guardamos (aun si es con deuda, si pasó la validación del 30% o fue autorizado externamente - wait, 
        // if supervisor authorizes, we need to SAVE the payments and proceed.
        // Currently `supervisorModalOpen` calls `handleSupervisorSuccess`.
        // We need `handleSupervisorSuccess` to triggering the SAVE.

        // Logic continues...
        processSale(newPayments);
    };

    const processSale = async (newPayments: any[]) => {
        if (newPayments.length === 0 && restante <= 0.01) {
            navigate(getHomePath());
            return;
        }

        setLoading(true);
        try {
            const payload = {
                venta_id: ventaId,
                pagos: newPayments.map(p => ({
                    metodo: p.metodo,
                    monto: p.monto,
                    referencia: p.referencia || ''
                }))
            };

            if (newPayments.length > 0) {
                await LOAApi.post('/api/payments/manual', payload);
                Swal.fire("Éxito", "Pagos registrados correctamente", "success");
            } else {
                Swal.fire("Éxito", "Venta registrada con deuda", "success");
            }

            // CREAR TICKET AUTOMÁTICAMENTE
            // Ensure we have clientId. If not set in state, fallback to fetching it? 
            // Usually fetchSaleDetails sets it.
            // CREAR TICKET AUTOMÁTICAMENTE
            if (!isDirectSale && ventaId) {
                let targetClientId = clientId;

                // Fallback: Si no tenemos clientId en estado, lo buscamos de la venta
                if (!targetClientId) {
                    try {
                        console.warn("⚠️ ClientId missing in state. Fetching from API...");
                        const { data: saleData } = await LOAApi.get(`/api/sales/${ventaId}`);
                        console.log(saleData)
                        const fetchedSale = saleData.result?.saleObj || (saleData.result?.rows ? saleData.result.rows[0] : saleData.result);
                        if (fetchedSale?.cliente_id) {
                            targetClientId = fetchedSale.cliente_id;
                            setClientId(targetClientId); // Synced for UI
                        }
                    } catch (err) {
                        console.error("Error fetching sale for clientId fallback", err);
                    }
                }

                console.log("🔍 Auto-Creating Ticket... Venta:", ventaId, "Cliente:", targetClientId, "UID:", uid);

                if (targetClientId && uid) {
                    await LOAApi.post('/api/tickets', {
                        venta_id: ventaId,
                        cliente_id: targetClientId,
                        usuario_id: uid,
                        fecha_entrega_estimada: new Date(Date.now() + 10000).toISOString(),
                        notas: 'Ticket generado automáticamente al pagar'
                    });
                } else {
                    console.warn("Skipping ticket creation: missing clientId or uid", { clientId: targetClientId, uid });
                    Swal.fire("Atención", "No se pudo generar el ticket de taller automáticamente (Falta Cliente o Usuario). Avise a soporte.", "warning");
                }
            }

            // ABRIR PDF AUTOMATICAMENTE -> MOVIDO A PAGO RESULTADO CON AGENTE
            // if (!isDirectSale && ventaId) openLabOrderPdf(ventaId);
            fetchExistingPayments(ventaId!.toString());
            setPagos([]);

            // Navigate or stay? Usually navigate to ticket
            navigate(`/pago-resultado?venta_id=${ventaId}&isDirectSale=${isDirectSale}`);


        } catch (error) {
            console.error(error);
            Swal.fire("Error", "Error registrando pagos", "error");
        } finally {
            setLoading(false);
        }
    }

    const startMpQrFlow = async (amount: number) => {
        setLoading(true);
        setPointStatus("");
        setLoading(true);
        setPointStatus("");
        // processStartTime.current = Date.now(); // REMOVED
        try {
            const { data } = await LOAApi.post('/api/payments/mercadopago/dynamic', {
                total: amount,
                sucursal_id: 'SUCURSAL_DEFAULT',
                venta_id: ventaId
            });

            if (data.success && data.result?.qr_data) {
                // GUARDAMOS EL ID ESPECÍFICO DE ESTE PAGO
                activePaymentId.current = data.result.external_reference || data.result.pago_id;

                setQrData(data.result.qr_data);
                setAsyncPaymentStatus('SHOWING_QR');
                // REMOVED: setAsyncPaymentStatus('IDLE');  <-- This was the bug causing instant close
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
        // processStartTime.current = Date.now(); // REMOVED
        try {
            if (!deviceId) {
                setLoading(false);
                return Swal.fire("Error", "Error: Falta ID de dispositivo", "error");
            }
            await LOAApi.post('/api/payments/mercadopago/point', {
                venta_id: ventaId,
                monto: amount,
                device_id: deviceId
            }).then((resp) => {
                if (resp.data.success) {
                    // GUARDAMOS EL ID ESPECÍFICO DE ESTE PAGO
                    activePaymentId.current = resp.data.pago_id;
                }
                return resp;
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
                observation: `AUTORIZADO CAJA SIN PAGO MINIMO POR: ${supervisorName}`
            });

            setSupervisorModalOpen(false);

            // 2. Proceder a guardar la venta (incluso con deuda)
            // Recalculamos los pagos pendientes basándonos en el estado actual 'pagos'
            // que está disponible en el closure. (React garantiza que si 'pagos' cambia, esta función se recrea si está en el dependency array correcto o si el componente se renderiza)
            const paymentsToSave = pagos.filter(p => !p.confirmed || !p.readonly);
            await processSale(paymentsToSave);

        } catch (error) {
            console.error("Error updating sale observation:", error);
            Swal.fire("Error", "Error al registrar autorización. Intente nuevamente.", "error");
            setLoading(false);
        }
    };

    const handlePayOnPickup = async () => {
        try {
            setLoading(true);
            // 1. Update observation (Optional, to mark it was withdrawn without full payment)
            // await LOAApi.put(`/api/sales/${ventaId}/observation`, {
            //     observation: `RETIRO SIN PAGO TOTAL (Auto-Autorizado)`
            // });

            // 2. Proceed to save
            const paymentsToSave = pagos.filter(p => !p.confirmed || !p.readonly);
            await processSale(paymentsToSave);

        } catch (error) {
            console.error("Error updating sale observation:", error);
            Swal.fire("Error", "Error al registrar retiro. Intente nuevamente.", "error");
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
        handlePayOnPickup,
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
        obrasSociales,
        selectedObraSocialId,
        setSelectedObraSocialId,
        nroOrden,
        setNroOrden,
        handleCoverInsurance,
        isDirectSale,
        payOnPickupDisabled,
        coverageDetails
    };
};
