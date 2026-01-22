import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Swal from 'sweetalert2';
import { useState, useEffect } from 'react';
import { useUiStore, useAppSelector } from '../../hooks';
import LOAApi from '../../api/LOAApi';
import type { TicketDetail } from '../../types/Ticket';
import { SupervisorAuthModal } from '../../components/modals/SupervisorAuthModal';
import type { MetodoPago } from '../../types/Pago';
import { QRCodeSVG } from 'qrcode.react';
import { usePaymentLogic } from '../../forms/hooks/usePaymentLogic';

// Definir estructura de respuesta de la API
interface TicketDetailResponse {
  success: boolean;
  result: TicketDetail;
}

export const TicketModal = () => {
  const { isItemModalOpen, selectedProduct, handlerTicketDetail } = useUiStore();
  const { uid } = useAppSelector(state => state.auth);
  const queryClient = useQueryClient();

  // ID del ticket seleccionado
  const ticketId = selectedProduct?.ticket_id;
  const ventaId = selectedProduct?.venta_id || ticketId;

  // Integrate Payment Logic
  // Pass ventaId to hook to enable polling and context
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
    pagos: hookPayments // To watch for changes
  } = usePaymentLogic(ventaId);

  const { data: ticket, isLoading, isError } = useQuery({
    queryKey: ['ticket', ticketId],
    queryFn: async () => {
      if (!ticketId) return null;
      const { data } = await LOAApi.get<TicketDetailResponse>(`/api/tickets/${ticketId}`);
      return data.result;
    },
    enabled: !!ticketId && isItemModalOpen,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, estado }: { id: string, estado: string }) => {
      return await LOAApi.put(`/api/tickets/${id}/status`, { estado });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
      Swal.fire("Éxito", "Estado actualizado correctamente", "success");
    }
  });

  const deliverMutation = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      return await LOAApi.post(`/api/tickets/${id}/deliver`, { usuario_id: uid });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
      Swal.fire("Éxito", "Ticket marcado como ENTREGADO", "success");
      handlerTicketDetail(null);
    }
  });

  const [clientDebt, setClientDebt] = useState<number>(0);
  const [supervisorModalOpen, setSupervisorModalOpen] = useState(false);

  // Payment Form States within Modal
  const [selectedMethod, setSelectedMethod] = useState<MetodoPago | 'MP_POINT' | 'MP_QR' | ''>('');
  const [amountInput, setAmountInput] = useState<string>('');
  const [loadingPayment, setLoadingPayment] = useState(false);

  // Sync Debt when Payments Change (Hook polling success)
  useEffect(() => {
    if (ticket?.cliente_id) {
      // Re-fetch debt if payments change (implying a successful payment)
      fetchDebt();
    }
  }, [hookPayments, ticket?.cliente_id]);

  const fetchDebt = async () => {
    if (ticket?.cliente_id) {
      try {
        const { data } = await LOAApi.get(`/api/clients/${ticket.cliente_id}/account-status`);
        if (data.success && data.result) {
          setClientDebt(data.result.cuenta_corriente || 0);
        }
      } catch (error) {
        console.error("Error fetching client debt", error);
      }
    }
  };

  // Initial fetch
  useEffect(() => {
    if (ticket) {
      fetchDebt();
      // If ticket opens, we might want to ensure amountInput is empty or set to debt
      // setAmountInput(clientDebt.toString()); // Optional
    }
  }, [ticket]);


  const handlePaymentSubmit = async () => {
    if (!ticket) return;
    if (!selectedMethod) {
      Swal.fire("Info", "Seleccione un método de pago", "info");
      return;
    }
    const amount = parseFloat(amountInput);
    if (isNaN(amount) || amount <= 0) {
      Swal.fire("Error", "Monto inválido", "error");
      return;
    }
    if (amount > clientDebt + 100) {
      Swal.fire("Error", "El pago excede la deuda actual", "error");
      return;
    }

    // AUTOMATED FLOWS
    if (selectedMethod === 'MP_POINT') {
      if (!selectedDeviceId) {
        Swal.fire("Info", "Seleccione una terminal Point", "info");
        return;
      }
      startMpPointFlow(amount, selectedDeviceId);
      return;
    }

    if (selectedMethod === 'MP_QR') {
      startMpQrFlow(amount);
      return;
    }

    // MANUAL FLOWS (Legacy)
    setLoadingPayment(true);
    try {
      await LOAApi.post('/api/payments/manual', {
        venta_id: ticket.venta_id || ticket.ticket_id,
        pagos: [{
          metodo: selectedMethod,
          monto: amount,
          referencia: 'Pago de Deuda al Entregar'
        }]
      });

      Swal.fire("Éxito", "Pago registrado. Deuda actualizada.", "success");
      setAmountInput('');
      setSelectedMethod('');
      fetchDebt(); // Update debt immediately

    } catch (error) {
      console.error(error);
      Swal.fire("Error", "Error al registrar pago", "error");
    } finally {
      setLoadingPayment(false);
    }
  };

  const handleSupervisorSuccess = async (supervisorName: string) => {
    if (!ticket) return;
    try {
      setSupervisorModalOpen(false);
      await LOAApi.put(`/api/sales/${ticket.venta_id || ticket.ticket_id}/observation`, {
        observation: `ENTREGA AUTORIZADA CON DEUDA ($${clientDebt}) POR: ${supervisorName}`
      });
      await deliverMutation.mutateAsync({ id: ticket.ticket_id });
    } catch (error) {
      console.error(error);
      Swal.fire("Error", "Error al autorizar entrega", "error");
    }
  };

  const handleComparirEstado = (nuevoEstado: string) => {
    if (!ticket) return;
    updateStatusMutation.mutate({ id: ticket.ticket_id, estado: nuevoEstado });
  }

  const handleEntregar = async () => {
    if (!ticket) return;
    if (clientDebt > 50) {
      Swal.fire("Atención", `El cliente posee una deuda de $${clientDebt}. Debe saldarla o solicitar autorización.`, "warning");
      return;
    }
    const result = await Swal.fire({
      title: '¿Confirmar entrega al cliente?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Entregar',
      cancelButtonText: 'Cancelar'
    });
    if (result.isConfirmed) {
      deliverMutation.mutate({ id: ticket.ticket_id });
    }
  }

  if (!isItemModalOpen || !selectedProduct) return null;


  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative flex flex-col">

        {/* Header */}
        <div className="bg-gradient-to-r from-[#006684] to-[#2db1c3] p-5 text-white flex justify-between items-center sticky top-0 z-10">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
              </svg>
              Orden de Trabajo #{ticketId?.substring(0, 8)}
            </h2>
            <p className="opacity-90 text-sm mt-1">Detalle completo de receta y estado</p>
          </div>
          <button
            onClick={() => handlerTicketDetail(null)}
            className="text-white/80 hover:text-white bg-white/20 hover:bg-white/30 rounded-full p-2 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 md:p-8 space-y-8 bg-slate-50 flex-1">

          {isLoading && (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
            </div>
          )}

          {isError && (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200">
              Error al cargar los detalles del ticket.
            </div>
          )}

          {ticket && (
            <>
              {/* Info Cliente y Estado */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <section className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                  <h3 className="text-gray-500 uppercase text-xs font-bold mb-3 tracking-wider">Cliente</h3>
                  <p className="text-xl font-bold text-gray-800">{ticket.cliente_nombre} {ticket.cliente_apellido}</p>
                  <div className="flex items-center gap-2 mt-2 text-gray-600">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                    </svg>
                    <span>{ticket.cliente_telefono || "Sin teléfono"}</span>
                  </div>
                </section>

                <section className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
                  <div>
                    <h3 className="text-gray-500 uppercase text-xs font-bold mb-3 tracking-wider">Estado Actual</h3>
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-bold px-3 py-1 rounded-full border ${ticket.estado === 'PENDIENTE' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                        ticket.estado === 'EN_TALLER' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          ticket.estado === 'LISTO' ? 'bg-green-50 text-green-700 border-green-200' :
                            'bg-gray-100 text-gray-700 border-gray-200'
                        }`}>
                        {ticket.estado}
                      </span>
                      <span className="text-xs text-gray-400">
                        Estimada: {new Date(ticket.fecha_entrega_estimada).toLocaleDateString()}
                      </span>
                    </div>
                  </div>



                  {/* Action Buttons */}
                  <div className="mt-4 flex flex-col gap-2">
                    {/* Debt Warning & Payment */}
                    {ticket.estado === 'LISTO' && clientDebt > 50 && (
                      <div className="mb-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-red-700 font-bold text-sm">⚠️ Deuda Pendiente: ${clientDebt.toLocaleString()}</span>
                          <button
                            onClick={() => setSupervisorModalOpen(true)}
                            className="text-xs bg-red-100 text-red-700 hover:bg-red-200 px-2 py-1 rounded"
                          >
                            Autorizar Entrega Forzosa
                          </button>
                        </div>

                        <hr className="border-red-200 my-2" />

                        {/* Payment UI */}

                        {/* ASYNC STATE: Waiting Point */}
                        {asyncPaymentStatus === 'WAITING_POINT' && (
                          <div className="flex flex-col items-center justify-center p-4 bg-yellow-50 rounded border border-yellow-200">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600 mb-2"></div>
                            <span className="text-yellow-700 font-bold text-center text-xs">{pointStatus || "Esperando terminal..."}</span>
                            <button
                              onClick={() => setAsyncPaymentStatus('IDLE')}
                              className="mt-2 text-xs text-red-500 underline"
                            >
                              Cancelar
                            </button>
                          </div>
                        )}

                        {/* ASYNC STATE: Showing QR */}
                        {asyncPaymentStatus === 'SHOWING_QR' && qrData && (
                          <div className="flex flex-col items-center justify-center p-4 bg-white rounded border border-gray-200">
                            <QRCodeSVG value={qrData} size={150} />
                            <span className="text-gray-600 font-medium mt-2 text-xs">Escanee para pagar</span>
                            <button
                              onClick={() => setAsyncPaymentStatus('IDLE')}
                              className="mt-2 text-xs text-red-500 underline"
                            >
                              Cancelar
                            </button>
                          </div>
                        )}

                        {/* IDLE STATE: Form */}
                        {asyncPaymentStatus === 'IDLE' && (
                          <div className="flex flex-col gap-2">
                            <span className="text-xs text-gray-600 font-medium">Saldar Deuda:</span>
                            <div className="flex flex-wrap gap-2 mb-1">
                              {/* Method Selection */}
                              {['EFECTIVO', 'TRANSFERENCIA', 'MP_POINT', 'MP_QR'].map(m => (
                                <button
                                  key={m}
                                  onClick={() => setSelectedMethod(m as any)}
                                  className={`px-2 py-1 text-[10px] rounded border uppercase font-bold transition ${selectedMethod === m
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                                    }`}
                                >
                                  {m.replace('MP_', 'MP ')}
                                </button>
                              ))}
                            </div>

                            {/* Point Device Selector */}
                            {selectedMethod === 'MP_POINT' && (
                              <select
                                className="input text-xs w-full py-1 mb-1"
                                value={selectedDeviceId}
                                onChange={(e) => setSelectedDeviceId(e.target.value)}
                              >
                                <option value="">Seleccione Terminal...</option>
                                {pointDevices.map((d: any) => (
                                  <option key={d.id} value={d.id}>{d.name || d.id}</option>
                                ))}
                              </select>
                            )}

                            <div className="flex gap-2">
                              <input
                                type="number"
                                className="input text-xs w-24 py-1"
                                placeholder="Monto"
                                value={amountInput}
                                onChange={e => setAmountInput(e.target.value)}
                              />
                              <button
                                onClick={handlePaymentSubmit}
                                disabled={loadingPayment || !selectedMethod}
                                className="btn-primary text-xs py-1 px-3 flex-1"
                              >
                                {loadingPayment
                                  ? '...'
                                  : selectedMethod === 'MP_POINT' ? 'Enviar a Terminal'
                                    : selectedMethod === 'MP_QR' ? 'Generar QR'
                                      : 'Registrar Pago'
                                }
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => window.open(`${LOAApi.defaults.baseURL}/api/sales/${ticket.venta_id || ticket.ticket_id}/laboratory-order`, '_blank')}
                        className="flex-none bg-indigo-600 text-white rounded-lg px-3 py-2 text-sm font-medium hover:bg-indigo-700 transition flex items-center gap-2"
                        title="Imprimir Orden de Taller (PDF)"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 001.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5Zm-3 0h.008v.008H15V10.5Z" />
                        </svg>
                        Orden Taller
                      </button>

                      {ticket.estado !== 'ENTREGADO' && ticket.estado !== 'CANCELADO' && (
                        <>
                          {ticket.estado === 'PENDIENTE' && (
                            <button
                              onClick={() => handleComparirEstado('EN_TALLER')}
                              disabled={updateStatusMutation.isPending}
                              className="flex-1 bg-blue-600 text-white rounded-lg px-3 py-2 text-sm font-medium hover:bg-blue-700 transition"
                            >
                              Pasar a Taller
                            </button>
                          )}
                          {ticket.estado === 'EN_TALLER' && (
                            <button
                              onClick={() => handleComparirEstado('LISTO')}
                              disabled={updateStatusMutation.isPending}
                              className="flex-1 bg-green-600 text-white rounded-lg px-3 py-2 text-sm font-medium hover:bg-green-700 transition"
                            >
                              Marcar Listo
                            </button>
                          )}
                          {ticket.estado === 'LISTO' && (
                            <div className="flex-1 flex gap-1">
                              <button
                                onClick={handleEntregar}
                                disabled={deliverMutation.isPending || clientDebt > 50}
                                className={`flex-1 text-white rounded-lg px-3 py-2 text-sm font-medium transition shadow-lg ${clientDebt > 50 ? 'bg-gray-400 cursor-not-allowed' : 'bg-cyan-600 hover:bg-cyan-700 shadow-cyan-200'}`}
                                title={clientDebt > 50 ? `Bloqueado por deuda: $${clientDebt}` : "Entregar"}
                              >
                                {clientDebt > 50 ? "BLOQUEADO (DEUDA)" : "ENTREGAR CLIENTE"}
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    <SupervisorAuthModal
                      actionName="Autorizar Entrega Forzosa"
                      isOpen={supervisorModalOpen}
                      onClose={() => setSupervisorModalOpen(false)}
                      onSuccess={handleSupervisorSuccess}
                    />
                  </div>
                </section>
              </div>


              {/* Receta */}
              <div className="space-y-4">
                <h3 className="text-slate-800 font-bold text-lg border-b pb-2">Detalle de Receta</h3>

                {['lejos', 'cerca', 'multifocal'].map((tipo) => {
                  const recetaData = ticket.receta?.[tipo as keyof typeof ticket.receta] as any;
                  if (!recetaData) return null;

                  return (
                    <div key={tipo} className="bg-white border rounded-xl overflow-hidden shadow-sm">
                      <div className="bg-gray-50 px-4 py-2 border-b text-xs font-bold uppercase text-gray-500 tracking-wider">
                        {tipo}
                      </div>
                      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Ojo Derecho */}
                        <div className="bg-blue-50/30 rounded-lg p-3 border border-blue-100">
                          <div className="text-center text-blue-800 font-bold text-sm mb-3">OJO DERECHO (OD)</div>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div>
                              <label className="text-[10px] text-gray-500 uppercase block">Esfera</label>
                              <div className="bg-white border rounded py-1 px-2 font-mono text-slate-800">{recetaData.OD?.esf || '-'}</div>
                            </div>
                            <div>
                              <label className="text-[10px] text-gray-500 uppercase block">Cilindro</label>
                              <div className="bg-white border rounded py-1 px-2 font-mono text-slate-800">{recetaData.OD?.cil || '-'}</div>
                            </div>
                            <div>
                              <label className="text-[10px] text-gray-500 uppercase block">Eje</label>
                              <div className="bg-white border rounded py-1 px-2 font-mono text-slate-800">{recetaData.OD?.eje || '-'}</div>
                            </div>
                          </div>
                        </div>

                        {/* Ojo Izquierdo */}
                        <div className="bg-cyan-50/30 rounded-lg p-3 border border-cyan-100">
                          <div className="text-center text-cyan-800 font-bold text-sm mb-3">OJO IZQUIERDO (OI)</div>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div>
                              <label className="text-[10px] text-gray-500 uppercase block">Esfera</label>
                              <div className="bg-white border rounded py-1 px-2 font-mono text-slate-800">{recetaData.OI?.esf || '-'}</div>
                            </div>
                            <div>
                              <label className="text-[10px] text-gray-500 uppercase block">Cilindro</label>
                              <div className="bg-white border rounded py-1 px-2 font-mono text-slate-800">{recetaData.OI?.cil || '-'}</div>
                            </div>
                            <div>
                              <label className="text-[10px] text-gray-500 uppercase block">Eje</label>
                              <div className="bg-white border rounded py-1 px-2 font-mono text-slate-800">{recetaData.OI?.eje || '-'}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                      {/* Otros datos comunes */}
                      {(recetaData.tipo || recetaData.color || recetaData.dnp) && (
                        <div className="px-4 py-3 bg-gray-50 border-t flex gap-4 text-sm text-gray-600">
                          {recetaData.tipo && <span><strong>Tipo:</strong> {recetaData.tipo}</span>}
                          {recetaData.color && <span><strong>Color:</strong> {recetaData.color}</span>}
                          {recetaData.dnp && <span><strong>DNP:</strong> {recetaData.dnp}</span>}
                        </div>
                      )}
                    </div>
                  )
                })}

                {ticket.notas && (
                  <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200 text-sm text-yellow-800">
                    <strong>Notas del Vendedor:</strong> {ticket.notas}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer Actions if needed, mostly redundant with internal buttons but good for close */}
        <div className="p-4 border-t bg-gray-50 rounded-b-2xl flex justify-end">
          <button
            onClick={() => handlerTicketDetail(null)}
            className="text-gray-500 hover:text-gray-800 font-medium px-4 py-2 transition"
          >
            Cerrar
          </button>
        </div>

      </div >
    </div >
  );
};
