import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Swal from 'sweetalert2';
import { QRCodeSVG } from 'qrcode.react';

import LOAApi from '../api/LOAApi';
import { usePaymentLogic } from './hooks/usePaymentLogic';
import { QRScanner } from './components/QRScanner';
import { SupervisorAuthModal } from '../components/modals/SupervisorAuthModal';

import type { TicketDetail } from '../types/Ticket';
import { useAuthStore } from '../hooks';

export const FormularioDeEntregaTicket: React.FC = () => {
    const { uid } = useAuthStore();
    const queryClient = useQueryClient();

    // --- STATES ---
    const [searchTerm, setSearchTerm] = useState("");
    const [showScanner, setShowScanner] = useState(false);
    const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
    const [clientDebt, setClientDebt] = useState<number>(0);
    const [supervisorModalOpen, setSupervisorModalOpen] = useState(false);

    // --- QUERIES ---

    // 1. List Tickets (Ready to Deliver)
    const { data: tickets = [], isLoading: loadingTickets } = useQuery({
        queryKey: ['tickets', 'LISTO'],
        queryFn: async () => {
            const { data } = await LOAApi.get<{ success: boolean, result: TicketDetail[] }>('/api/tickets?estado=LISTO');
            return data.result || [];
        }
    });

    // 2. Fetch Selected Ticket Detail (to act as Single Source of Truth for detail view)
    const { data: selectedTicket, isLoading: loadingDetail } = useQuery({
        queryKey: ['ticket', selectedTicketId],
        queryFn: async () => {
            if (!selectedTicketId) return null;
            const { data } = await LOAApi.get<{ success: boolean, result: TicketDetail }>(`/api/tickets/${selectedTicketId}`);
            return data.result;
        },
        enabled: !!selectedTicketId
    });

    // 3. Client Debt (Only if ticket selected)
    const { data: debtData } = useQuery({
        queryKey: ['client-debt', selectedTicket?.cliente_id],
        queryFn: async () => {
            if (!selectedTicket?.cliente_id) return { cuenta_corriente: 0 };
            const { data } = await LOAApi.get(`/api/clients/${selectedTicket.cliente_id}/account-status`);
            return data.result;
        },
        enabled: !!selectedTicket?.cliente_id
    });

    useEffect(() => {
        if (debtData) {
            setClientDebt(Number(debtData.cuenta_corriente || 0));
        }
    }, [debtData]);


    // --- LOCAL FORM STATE ---
    const [localSelectedMethod, setLocalSelectedMethod] = useState<string>(''); // Local state to handle MP_POINT/QR options

    // --- HOOKS ---
    // Payment Logic - Linked to Selected Ticket's Sale
    const paymentLogic = usePaymentLogic(selectedTicket?.venta_id);
    const {
        asyncPaymentStatus,
        setAsyncPaymentStatus,
        qrData,
        pointStatus,
        pointDevices,
        selectedDeviceId,
        setSelectedDeviceId,
        startMpPointFlow,
        startMpQrFlow,
        amountInput,
        setAmountInput,
        pagos: hookPayments
    } = paymentLogic;

    // Refresh debt when payments change
    useEffect(() => {
        if (selectedTicket?.cliente_id) {
            queryClient.invalidateQueries({ queryKey: ['client-debt', selectedTicket.cliente_id] });
        }
    }, [hookPayments, selectedTicket?.cliente_id, queryClient]);


    // Validation Effect: If ticket selected and debt > 0, show Alert
    useEffect(() => {
        if (selectedTicket && debtData && Number(debtData.cuenta_corriente) > 0) {
            // Logic handled by UI rendering
        }
    }, [selectedTicket, debtData]);

    const handleSelectTicket = (ticket: TicketDetail) => {
        setSelectedTicketId(ticket.ticket_id);
        setLocalSelectedMethod(''); // Reset method
        // Force refresh of debt
        queryClient.invalidateQueries({ queryKey: ['client-debt', ticket?.cliente_id] });
    };

    // --- MUTATIONS ---
    const deliverMutation = useMutation({
        mutationFn: async (ticketId: string) => {
            return await LOAApi.post(`/api/tickets/${ticketId}/deliver`, { usuario_id: uid });
        },
        onSuccess: () => {
            Swal.fire("Entregado", "El pedido ha sido marcado como entregado.", "success");
            queryClient.invalidateQueries({ queryKey: ['tickets', 'LISTO'] });
            setSelectedTicketId(null);
            setClientDebt(0);
        },
        onError: (err: any) => {
            console.error(err);
            Swal.fire("Error", err.response?.data?.error || "Error al entregar", "error");
        }
    });


    // --- HANDLERS ---
    const handleSearchDni = async () => {
        if (!searchTerm) {
            // If empty, maybe reset list?
            return;
        }

        // 1. Search in Local LISTO list
        const foundLocal = tickets.find(t =>
            t.cliente_nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.cliente_apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.ticket_id === searchTerm ||
            t.venta_id === searchTerm
        );

        if (foundLocal) {
            handleSelectTicket(foundLocal);
            Swal.fire("Encontrado", `Ticket de ${foundLocal.cliente_nombre} cargado.`, "success");
            return;
        }

        // 2. Fallback: Search Server-side in ANY state
        try {
            Swal.showLoading();
            // Assuming endpoint supports 'search' param and we omit 'estado' to get all
            const { data } = await LOAApi.get<{ success: boolean, result: TicketDetail[] | TicketDetail }>(`/api/tickets?search=${searchTerm}`);
            Swal.close();

            let matches: TicketDetail[] = [];
            if (Array.isArray(data.result)) {
                matches = data.result;
            } else if (data.result) {
                matches = [data.result as TicketDetail];
            }

            if (matches.length > 0) {
                // Pick the most relevant? (e.g. latest, or the one matching input best)
                // For simplified UX, pick first or show list.
                const match = matches[0];

                if (match.estado === 'LISTO') {
                    // It should have been in the list, but maybe list is stale or paginated?
                    // Select it.
                    queryClient.invalidateQueries({ queryKey: ['tickets', 'LISTO'] }); // refresh list
                    handleSelectTicket(match);
                    Swal.fire("Encontrado", `Ticket cargado (Estado: LISTO)`, "success");
                } else {
                    Swal.fire({
                        title: `Pedido no está LISTO`,
                        text: `El pedido de ${match.cliente_nombre} se encuentra en estado: ${match.estado}.\nFecha Estimada: ${new Date(match.fecha_entrega_estimada).toLocaleDateString()}`,
                        icon: 'warning'
                    });
                    // Optionally show it anyway? Usually Delivery Page only for Ready items.
                    // We WON'T select it to avoid confusion, just warn.
                }
            } else {
                Swal.fire("Info", "No se encontró ningún pedido con ese criterio.", "info");
            }

        } catch (error) {
            console.error(error);
            Swal.close();
        }
    }

    const handleScanSuccess = async (decodedText: string) => {
        setShowScanner(false);
        // Assume decodedText is TicketID or VentaID
        // Try to find in current list
        const found = tickets.find(t => t.ticket_id === decodedText || t.venta_id === decodedText);

        if (found) {
            handleSelectTicket(found);
            Swal.fire("Encontrado", `Ticket #${found.ticket_id.substring(0, 8)} cargado.`, "success");
        } else {
            // Maybe fetch it individually in case it's not in the cached list (e.g. status change just happened)
            try {
                const { data } = await LOAApi.get<{ success: boolean, result: TicketDetail }>(`/api/tickets/${decodedText}`);
                if (data.success && data.result) {
                    if (data.result.estado === 'LISTO') {
                        // Add to list cache potentially? Or just select it.
                        // We can force select it even if not in list.
                        setSelectedTicketId(data.result.ticket_id);
                        Swal.fire("Encontrado", "Ticket cargado.", "success");
                    } else {
                        Swal.fire("Atención", `El ticket existe pero su estado es ${data.result.estado}`, "warning");
                    }
                } else {
                    Swal.fire("Error", "Ticket no encontrado", "error");
                }
            } catch (error) {
                Swal.fire("Error", "Error al buscar ticket escaneado", "error");
            }
        }
    }

    // Payment Handler
    const handlePaymentSubmit = async () => {
        if (!selectedTicket) return;
        if (!localSelectedMethod) return Swal.fire("Info", "Seleccione un método", "info");

        const amount = parseFloat(amountInput);
        if (isNaN(amount) || amount <= 0) return Swal.fire("Error", "Monto inválido", "error");
        if (amount > clientDebt + 100) return Swal.fire("Error", "El monto supera la deuda", "error");

        if (localSelectedMethod === 'MP_POINT') {
            if (!selectedDeviceId) return Swal.fire("Info", "Seleccione Terminal", "info");
            startMpPointFlow(amount, selectedDeviceId);
            return;
        }
        if (localSelectedMethod === 'MP_QR') {
            startMpQrFlow(amount);
            return;
        }

        // Manual
        try {
            await LOAApi.post('/api/payments/manual', {
                venta_id: selectedTicket.venta_id,
                pagos: [{
                    metodo: localSelectedMethod,
                    monto: amount,
                    referencia: 'Pago en Entrega'
                }]
            });
            Swal.fire("Pago Registrado", "La deuda ha sido actualizada.", "success");
            setAmountInput("");
            setLocalSelectedMethod("");
            // Refresh
            queryClient.invalidateQueries({ queryKey: ['client-debt', selectedTicket.cliente_id] });
            // We cannot call fetchExistingPayments directly from hook results if not exposed
            // But invalidating client-debt is enough for the button logic to update.
            // The hookPayments will auto-update on polling if needed, or we just trust the new state.
        } catch (error) {
            console.error(error);
            Swal.fire("Error", "Error registrando pago", "error");
        }
    };

    const handleConfirmDeliver = async () => {
        if (!selectedTicket) return;
        if (clientDebt > 0) {
            Swal.fire("Deuda Pendiente", "No se puede entregar con deuda pendiente.", "error");
            return;
        }

        const result = await Swal.fire({
            title: '¿Confirmar Entrega?',
            text: "El ticket pasará a estado ENTREGADO.",
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, Entregar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            deliverMutation.mutate(selectedTicket.ticket_id);
        }
    }

    const handlePrintReceipt = () => {
        if (!selectedTicket) return;
        // Assuming there is a receipt endpoint or we use the Lab Order one as a fallback/example
        // Prompt says "Recibo de entrega". Let's assume a new endpoint or the standard order.
        // For now, using standard order PDF as placeholder if specific receipt doesn't exist.
        // Or better: open a "Comprobante" window.
        window.open(`${LOAApi.defaults.baseURL}/api/sales/${selectedTicket.venta_id}/receipt`, '_blank');
    }

    const handleSupervisorSuccess = async (supervisorName: string) => {
        if (!selectedTicket) return;
        // Authorize delivery with debt
        try {
            setSupervisorModalOpen(false);
            // Add observation
            await LOAApi.put(`/api/sales/${selectedTicket.venta_id}/observation`, {
                observation: `ENTREGA AUTORIZADA CON DEUDA ($${clientDebt}) POR SUPERVISOR: ${supervisorName}`
            });
            // Deliver
            deliverMutation.mutate(selectedTicket.ticket_id);
        } catch (error) {
            Swal.fire("Error", "Fallo la autorización", "error");
        }
    }


    // --- UI HELPERS ---
    const filteredTickets = useMemo(() => {
        if (!searchTerm) return tickets;
        const lower = searchTerm.toLowerCase();
        return tickets.filter(t =>
            (t.cliente_nombre || '').toLowerCase().includes(lower) ||
            (t.ticket_id || '').toLowerCase().includes(lower) ||
            (t.venta_id || '').toLowerCase().includes(lower)
        );
    }, [tickets, searchTerm]);


    return (
        <div className="flex flex-col md:flex-row h-[calc(100vh-64px)] rounded-lg border border-blanco overflow-hidden">

            {/* LEFT COLUMN: LIST & SEARCH */}
            <div className="w-full md:w-1/3 min-w-[320px] border-r border-gray-200 flex flex-col">
                <div className="p-4 border-b border-gray-100 z-10">
                    <h2 className="text-xl font-bold text-crema mb-4 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                        </svg>
                        Entregas Pendientes
                    </h2>

                    <div className="flex gap-2 mb-2">
                        <div className="relative flex-1">
                            <input
                                type="text"
                                placeholder="Buscar Cliente o Ticket..."
                                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSearchDni()}
                            />
                            <button
                                onClick={handleSearchDni}
                                className="absolute left-1 top-1 bottom-1 p-1 hover:bg-gray-200 rounded text-crema"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </button>
                        </div>
                        <button
                            onClick={() => setShowScanner(true)}
                            className="bg-slate-800 hover:bg-black text-white p-2 rounded-lg transition shadow-sm"
                            title="Escanear QR"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 12v1m0 0v3m0-3h3m-3 0h-3m3 0v-5" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                    {loadingTickets ? (
                        <div className="text-center py-10 text-crema text-sm">Cargando tickets...</div>
                    ) : filteredTickets.length === 0 ? (
                        <div className="text-center py-10 text-crema text-sm">No hay pedidos listos.</div>
                    ) : (
                        filteredTickets.map(t => (
                            <div
                                key={t.ticket_id}
                                onClick={() => handleSelectTicket(t)}
                                className={`p-3 rounded-lg cursor-pointer border transition-all hover:shadow-md ${selectedTicketId === t.ticket_id
                                    ? 'bg-cyan-50 border-cyan-400 shadow-sm'
                                    : 'bg-white border-gray-100 hover:border-gray-300'
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-bold text-gray-800 text-sm">{t.cliente_nombre} {t.cliente_apellido}</span>
                                    <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">LISTO</span>
                                </div>
                                <div className="text-xs text-gray-500 mb-1">Ticket #{t.ticket_id.substring(0, 8)}</div>
                                <div className="text-[11px] text-crema flex items-center gap-1">
                                    <span>📅 Estimada: {new Date(t.fecha_entrega_estimada).toLocaleDateString()}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* RIGHT COLUMN: DETAILS */}
            <div className="flex-1 p-6 md:p-10 flex flex-col h-full overflow-y-auto">
                {loadingDetail ? (
                    <div className="flex flex-col items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mb-4"></div>
                        <p className="text-crema">Cargando detalle...</p>
                    </div>
                ) : !selectedTicket ? (
                    <div className="flex flex-col items-center justify-center h-full text-crema opacity-60">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                        <p className="text-lg">Seleccione un pedido para ver el detalle y entregar.</p>
                    </div>
                ) : (
                    <div className="max-w-4xl mx-auto w-full space-y-6">
                        {/* HEADER: CLIENTE & ACTIONS */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col md:flex-row justify-between md:items-center gap-4">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">{selectedTicket.cliente_nombre} {selectedTicket.cliente_apellido}</h1>
                                <p className="text-gray-500 text-sm flex items-center gap-2 mt-1">
                                    <span className="bg-gray-100 px-2 py-0.5 rounded text-xs border">DNI / ID: {selectedTicket.cliente_id.substring(0, 8)}</span>
                                    <span>📞 {selectedTicket.cliente_telefono || "Sin teléfono"}</span>
                                </p>
                            </div>
                            <div className="flex gap-3">
                                {/* Only show Print if Delivered? Usually before. Optional. */}
                                <button onClick={handlePrintReceipt} className="btn-secondary text-sm flex items-center gap-2">
                                    🖨️ Comprobante
                                </button>
                                <button
                                    onClick={handleConfirmDeliver}
                                    disabled={clientDebt > 0 || deliverMutation.isPending}
                                    className={`px-5 py-2 rounded-lg font-bold shadow-lg transition flex items-center gap-2 text-white
                                        ${clientDebt > 0
                                            ? 'bg-gray-400 cursor-not-allowed'
                                            : 'bg-green-600 hover:bg-green-700 shadow-green-200'
                                        }`}
                                >
                                    {deliverMutation.isPending ? 'Procesando...' : 'CONFIRMAR ENTREGA'}
                                    {clientDebt > 0 && '🔒'}
                                </button>
                            </div>
                        </div>

                        {/* DEBT ALERT & PAYMENT */}
                        {clientDebt > 0 && (
                            <div className="bg-red-50 border border-red-200 rounded-xl overflow-hidden animate-In">
                                <div className="bg-red-100/50 p-4 flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-red-100 text-red-600 p-2 rounded-full">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="text-red-800 font-bold">Deuda Pendiente Detectada</h3>
                                            <p className="text-red-600 text-sm">El cliente debe <span className="font-extrabold text-lg">${clientDebt.toLocaleString()}</span>. Cobre el saldo para habilitar la entrega.</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setSupervisorModalOpen(true)} className="text-xs text-red-600 underline hover:text-red-800">
                                        Autorizar Forzosamente
                                    </button>
                                </div>

                                <div className="p-4 bg-white border-t border-red-100">
                                    <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Registrar Pago Ahora</label>

                                    {/* ASYNC PAYMENT STATUS */}
                                    {asyncPaymentStatus === 'WAITING_POINT' && (
                                        <div className="flex items-center gap-3 p-4 bg-yellow-50 rounded-lg border border-yellow-200 justify-center">
                                            <div className="animate-spin h-5 w-5 border-2 border-yellow-600 rounded-full border-t-transparent"></div>
                                            <span className="text-yellow-700 font-medium text-sm">{pointStatus || "Esperando terminal..."}</span>
                                            <button onClick={() => setAsyncPaymentStatus('IDLE')} className="text-xs font-bold text-red-500 ml-4">CANCELAR</button>
                                        </div>
                                    )}

                                    {asyncPaymentStatus === 'SHOWING_QR' && qrData && (
                                        <div className="flex flex-col items-center p-4 bg-white border rounded-lg">
                                            <QRCodeSVG value={qrData} size={160} />
                                            <p className="text-xs text-gray-500 mt-2">Escanee para pagar</p>
                                            <button onClick={() => setAsyncPaymentStatus('IDLE')} className="text-xs font-bold text-red-500 mt-2">CANCELAR</button>
                                        </div>
                                    )}

                                    {asyncPaymentStatus === 'IDLE' && (
                                        <div className="flex flex-col md:flex-row gap-2 items-end">
                                            <div className="flex-1">
                                                <label className="text-[10px] text-crema">Método</label>
                                                <select
                                                    className="input w-full text-sm py-1.5"
                                                    value={localSelectedMethod}
                                                    onChange={(e) => setLocalSelectedMethod(e.target.value as any)}
                                                >
                                                    <option value="">Seleccione...</option>
                                                    <option value="EFECTIVO">Efectivo 💵</option>
                                                    <option value="TRANSFERENCIA">Transferencia 🏦</option>
                                                    <option value="DEBITO">Débito 💳</option>
                                                    <option value="CREDITO">Crédito 💳</option>
                                                    <option value="MP_QR">Mercado Pago QR 📱</option>
                                                    <option value="MP_POINT">Mercado Pago Point 📟</option>
                                                </select>
                                            </div>

                                            {localSelectedMethod === 'MP_POINT' && (
                                                <div className="flex-1">
                                                    <label className="text-[10px] text-crema">Terminal</label>
                                                    <select
                                                        className="input w-full text-sm py-1.5"
                                                        value={selectedDeviceId}
                                                        onChange={(e) => setSelectedDeviceId(e.target.value)}
                                                    >
                                                        <option value="">Seleccione Device...</option>
                                                        {pointDevices.map((d: any) => (
                                                            <option key={d.id} value={d.id}>{d.name || d.id}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}

                                            <div className="flex-1">
                                                <label className="text-[10px] text-crema">Monto</label>
                                                <div className="relative">
                                                    <span className="absolute left-2 top-1.5 text-crema">$</span>
                                                    <input
                                                        type="number"
                                                        className="input w-full pl-6 text-sm py-1.5"
                                                        value={amountInput}
                                                        onChange={(e) => setAmountInput(e.target.value)}
                                                        placeholder={clientDebt.toString()}
                                                    />
                                                </div>
                                            </div>

                                            <button
                                                onClick={handlePaymentSubmit}
                                                className="bg-slate-900 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-black transition shadow-sm"
                                            >
                                                Cobrar
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* TICKET DETAILS (RECIPE) */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="bg-gray-50 px-6 py-3 border-b border-gray-100">
                                <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wide">Detalle del Pedido</h3>
                            </div>
                            <div className="p-6">
                                {/* Armazon */}
                                {selectedTicket.receta?.armazon && (
                                    <div className="mb-6">
                                        <div className="text-xs text-gray-500 uppercase font-bold mb-1">Armazón / Modelo</div>
                                        <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-lg text-blue-900 font-medium">
                                            👓 {selectedTicket.receta.armazon}
                                        </div>
                                    </div>
                                )}

                                {/* Receta Grid */}
                                <div className="grid grid-cols-1 gap-6">
                                    {['lejos', 'cerca', 'multifocal'].map((tipo) => {
                                        const r = selectedTicket.receta?.[tipo as keyof typeof selectedTicket.receta] as any;
                                        if (!r) return null;
                                        return (
                                            <div key={tipo} className="border rounded-xl overflow-hidden">
                                                <div className="bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 uppercase text-center block w-full">{tipo}</div>
                                                <div className="grid grid-cols-2 divide-x divide-gray-100">
                                                    {['OD', 'OI'].map(ojo => (
                                                        <div key={ojo} className="p-4">
                                                            <div className="text-center font-bold text-cyan-700 mb-2">{ojo}</div>
                                                            <div className="space-y-1 text-sm text-center">
                                                                {r[ojo] ? (
                                                                    <>
                                                                        <div><span className="text-crema text-xs">ESF:</span> <span className="font-mono">{r[ojo].esf}</span></div>
                                                                        <div><span className="text-crema text-xs">CIL:</span> <span className="font-mono">{r[ojo].cil}</span></div>
                                                                        <div><span className="text-crema text-xs">EJE:</span> <span className="font-mono">{r[ojo].eje}°</span></div>
                                                                    </>
                                                                ) : <span className="text-gray-300">-</span>}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>

                    </div>
                )}
            </div>

            {/* SCANNER MODAL */}
            {showScanner && (
                <QRScanner
                    onScanSuccess={handleScanSuccess}
                    onClose={() => setShowScanner(false)}
                />
            )}

            {/* SUPERVISOR AUTH */}
            <SupervisorAuthModal
                actionName="Autorizar Entrega con Deuda"
                isOpen={supervisorModalOpen}
                onClose={() => setSupervisorModalOpen(false)}
                onSuccess={handleSupervisorSuccess}
            />

        </div>
    );
};