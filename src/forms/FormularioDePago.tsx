import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import LOAApi from '../api/LOAApi';
import type { MetodoPago, PagoParcial } from '../types/Pago';
import { QRCodeSVG } from 'qrcode.react';

export const FormularioDePago: React.FC = () => {
  const { ventaId: paramVentaId } = useParams<{ ventaId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  // State from navigation (FormularioVenta)
  const stateVentaId = location.state?.ventaId;
  const stateTotal = location.state?.total;

  /* New States */
  const [ventaId, setVentaId] = useState<string | number | null>(paramVentaId || stateVentaId || null);
  const [saleItems, setSaleItems] = useState<any[]>([]);
  const [dniSearch, setDniSearch] = useState("");
  const [currentTotal, setCurrentTotal] = useState<number>(stateTotal ? parseFloat(stateTotal) : 0);

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
            confirmed: true,
            readonly: true
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
  const [pagos, setPagos] = useState<PagoParcial[]>([]);
  const [loading, setLoading] = useState(false);

  // Form State for new payment
  const [selectedMethod, setSelectedMethod] = useState<MetodoPago | ''>('');
  const [amountInput, setAmountInput] = useState<string>('');

  const metodos: { id: MetodoPago; label: string; icon: string }[] = [
    { id: 'EFECTIVO', label: 'Efectivo', icon: '💵' },
    { id: 'DEBITO', label: 'Débito', icon: '💳' },
    { id: 'CREDITO', label: 'Crédito', icon: '💳' },
    { id: 'TRANSFERENCIA', label: 'Transferencia', icon: '🏦' },
    { id: 'MP', label: 'Mercado Pago', icon: '📱' },
  ];

  // Calculations
  const totalPagado = pagos.reduce((acc, p) => acc + (Number(p.monto) || 0), 0);
  const restante = Math.max(0, currentTotal - totalPagado);
  // const puedeConfirmar = Math.abs(restante) < 0.01 || pagos.length > 0; // Allow partial payments confirmation if needed

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

    setPagos([...pagos, { metodo: selectedMethod, monto: amount }]);
    // Reset inputs
    setSelectedMethod('');
    setAmountInput((restante - amount).toFixed(2));
  };

  const handleRemovePayment = (index: number) => {
    if (pagos[index].readonly || pagos[index].confirmed) {
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

        // Logic: Has the paid amount increased to cover our mpAmount? 
        // Or simply: Do we see the new payment in the list?
        // Let's assume if backendPagado >= totalPagado (our local total including pending MP), it's done.
        // But better: Just rely on fetching existing payments which we do next steps.

        // If we are polling, we just want to know if "something happened". 
        // Simplest check: if backendPagado > (totalPagado - mpAmount).
        // Actually, let's just refresh the whole list.

        // REFRESH LIST
        if (Array.isArray(backendPagosList)) {
          const mapped: PagoParcial[] = backendPagosList.map((p: any) => ({
            metodo: p.metodo,
            monto: parseFloat(p.monto),
            confirmed: true,
            readonly: true
          }));

          // Calculate total from mapped
          const newTotalPaid = mapped.reduce((acc, p) => acc + p.monto, 0);

          // If newTotalPaid is greater than what we had before (excluding the pending MP which wasn't in list yet?),
          // wait, we didn't add the pending MP to 'pagos' yet.
          // So if newTotalPaid > totalPagado (current confirmed/local items), then we have success!

          if (newTotalPaid > totalPagado) {
            setPagos(mapped); // Update list
            setAsyncPaymentStatus('IDLE');
            setLoading(false);
            alert("¡Pago con Mercado Pago confirmado!");
          }
        }
      }
    } catch (e) {
      console.error("Error polling payment status", e);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    // Filter out already confirmed payments (MP, etc)
    const newPayments = pagos.filter(p => !p.confirmed);

    if (newPayments.length === 0 && restante > 0.01) {
      // If no new payments but still money due? 
      // User can confirm manual payments.
      // If totally due, and no payments added, alert.
      alert("Agregue un pago o verifique el monto.");
      return;
    }

    if (newPayments.length === 0 && restante <= 0.01) {
      // Fully paid logic handled by 'Finalizar' button usually, but if user clicks submit?
      // Just redirect.
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
          referencia: '' // Add refs if needed
        }))
      };

      await LOAApi.post('/api/payments/manual', payload);

      alert('Pagos registrados correctamente');

      // Refresh to confirm states
      fetchExistingPayments(ventaId!.toString());
      setPagos([]); // Clear local provisional list? Or keep them and re-fetch?
      // Better to fetch.

    } catch (error) {
      console.error(error);
      alert('Error registrando pagos');
    } finally {
      setLoading(false);
    }
  };



  const handleStartMpFlow = async (type: 'QR' | 'POINT', amount: number) => {
    setLoading(true);
    try {
      if (type === 'QR') {
        const { data } = await LOAApi.post('/api/payments/mercadopago/qr', {
          venta_id: ventaId,
          monto: amount,
          title: `Venta #${ventaId}`
        });
        if (data.qr_data) {
          setQrData(data.qr_data);
          setAsyncPaymentStatus('SHOWING_QR');
        }
      } else {
        await LOAApi.post('/api/payments/mercadopago/point', {
          venta_id: ventaId,
          monto: amount
        });
        setPointStatus("Enviado a terminal. Espere...");
        setAsyncPaymentStatus('WAITING_POINT');
      }
    } catch (e) {
      console.error(e);
      alert("Error iniciando pago MP");
      setLoading(false);
    }
  };

  useEffect(() => {
    if (restante > 0 && amountInput === '0.00' && !selectedMethod) {
      setAmountInput(restante.toFixed(2));
    }
  }, [restante]);

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 text-blanco">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-white text-2xl font-semibold">Finalizar Pago</h2>
        <div className="flex gap-2">
          {/* Search Input handled by handleSearchDni */}
          <div className="flex gap-1">
            <input
              className="input py-1 px-2 w-32"
              placeholder="Buscar DNI"
              value={dniSearch}
              onChange={(e) => setDniSearch(e.target.value)}
            />
            <button type="button" onClick={handleSearchDni} className="btn-secondary text-xs px-2">
              Buscar
            </button>
          </div>
          {ventaId && (
            <button type="button" onClick={handleCancelSale} className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 ml-2">
              Cancelar Venta
            </button>
          )}
        </div>
      </div>

      {ventaId && (
        <div className="bg-gray-800 p-4 rounded-lg mb-4 text-white">
          <div className="flex justify-between mb-2">
            <span className="font-bold">Venta #{ventaId}</span>
            <span className="text-xl font-bold text-celeste">${currentTotal.toLocaleString()}</span>
          </div>
          {saleItems.length > 0 ? (
            <div className="text-sm text-gray-300">
              <ul className="list-disc pl-5">
                {saleItems.map((item, idx) => (
                  <li key={idx}>
                    {item.cantidad}x {item.producto_nombre || item.producto?.nombre || 'Item'} - ${item.subtotal || item.precio_unitario * item.cantidad}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-xs text-gray-500">Sin detalles de items...</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Summary */}
          <div className="bg-gray-800 bg-opacity-50 p-6 rounded-xl border border-gray-700 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-center sm:text-left">
              <p className="text-gray-400 text-sm">Total a Pagar</p>
              <p className="text-3xl font-bold">${currentTotal.toLocaleString()}</p>
            </div>
            <div className="flex gap-8">
              <div className="text-center">
                <p className="text-gray-400 text-sm">Pagado</p>
                <p className="text-xl text-green-400 font-medium">${totalPagado.toLocaleString()}</p>
              </div>
              <div className="text-center">
                <p className="text-gray-400 text-sm">Restante</p>
                <p className={`text-xl font-medium ${restante > 0 ? 'text-red-400' : 'text-gray-500'}`}>
                  ${restante.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* List */}
          <div className="bg-gray-900 bg-opacity-30 p-4 rounded-xl min-h-[150px]">
            <h3 className="text-lg font-medium mb-3">Pagos Agregados</h3>
            {pagos.length === 0 ? (
              <p className="text-gray-500 text-center py-6">No hay pagos registrados aún.</p>
            ) : (
              <div className="space-y-2">
                {pagos.map((pago, idx) => (
                  <div key={idx} className={`flex items-center justify-between bg-gray-800 p-3 rounded-lg border border-gray-700 ${pago.confirmed ? 'border-green-800 bg-green-900/10' : ''}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{metodos.find(m => m.id === pago.metodo)?.icon || '💰'}</span>
                      <div>
                        <p className="font-medium">{metodos.find(m => m.id === pago.metodo)?.label || pago.metodo}</p>
                        <p className="text-xs text-gray-400">
                          {pago.confirmed ? 'CONFIRMADO' : 'Pendiente'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-lg">${(pago.monto || 0).toLocaleString()}</span>
                      {!pago.readonly && (
                        <button
                          onClick={() => handleRemovePayment(idx)}
                          className="text-red-400 hover:text-red-300 transition p-1"
                        >
                          ✕
                        </button>
                      )}
                      {pago.confirmed && <span className="text-green-500">✓</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-gray-800 bg-opacity-50 p-6 rounded-xl border border-gray-700 h-full flex flex-col">
            <h3 className="text-lg font-medium mb-4">Agregar Método</h3>
            <div className="grid grid-cols-2 gap-2 mb-6">
              {metodos.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setSelectedMethod(m.id);
                    if (restante > 0) setAmountInput(restante.toFixed(2));
                  }}
                  className={`p-3 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all ${selectedMethod === m.id
                    ? 'bg-celeste text-negro border-celeste scale-105 shadow-md'
                    : 'bg-transparent border-gray-600 hover:border-celeste hover:text-celeste'
                    }`}
                >
                  <span className="text-2xl">{m.icon}</span>
                  <span className="text-xs font-medium">{m.label}</span>
                </button>
              ))}
            </div>

            <div className="mb-6">
              <label className="block text-sm text-gray-400 mb-1">Monto</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                <input
                  type="number"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  className="input pl-8 w-full text-lg font-bold"
                  placeholder="0.00"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleAddPayment}
              disabled={!selectedMethod || parseFloat(amountInput) <= 0}
              className="btn-secondary w-full mb-auto"
            >
              Agregar Pago
            </button>

            <hr className="border-gray-700 my-6" />

            <button
              onClick={onSubmit}
              disabled={loading} // Allow confirm even if partial? Maybe. "puedeConfirmar" logic was stricter.
              className={`w-full py-3 rounded-lg font-bold text-lg transition-all ${!loading
                ? 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/50'
                : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                }`}
            >
              {loading ? 'Procesando...' : 'Finalizar Venta'}
            </button>

          </div>
        </div>
      </div>

      {/* MP Modal */}
      {mpModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 p-6 rounded-lg max-w-sm w-full text-center">
            <h3 className="text-xl font-bold mb-4 text-white">Mercado Pago</h3>
            <p className="mb-6 text-gray-300">Monto: ${mpAmount.toLocaleString()}</p>
            <div className="flex gap-4 justify-center mb-6">
              <button
                onClick={() => { setMpModalOpen(false); handleStartMpFlow('QR', mpAmount); }}
                className="flex-1 bg-blue-600 hover:bg-blue-500 py-3 rounded-lg flex flex-col items-center gap-2"
              >
                <span className="text-2xl">🖥️</span>
                <span className="text-sm font-bold">QR Pantalla</span>
              </button>
              <button
                onClick={() => { setMpModalOpen(false); handleStartMpFlow('POINT', mpAmount); }}
                className="flex-1 bg-cyan-600 hover:bg-cyan-500 py-3 rounded-lg flex flex-col items-center gap-2"
              >
                <span className="text-2xl">💳</span>
                <span className="text-sm font-bold">Terminal Point</span>
              </button>
            </div>
            <button onClick={() => setMpModalOpen(false)} className="text-gray-400 underline hover:text-white">Cancelar</button>
          </div>
        </div>
      )}

      {/* Async Status Modal */}
      {asyncPaymentStatus !== 'IDLE' && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
          <div className="bg-white text-black p-8 rounded-xl max-w-md w-full flex flex-col items-center text-center">
            {asyncPaymentStatus === 'SHOWING_QR' && qrData && (
              <>
                <h3 className="text-2xl font-bold mb-4">Escaneá el QR</h3>
                <div className="p-4 border-2 border-dashed border-gray-300 rounded mb-4">
                  <QRCodeSVG value={qrData} size={256} />
                </div>
                <p className="animate-pulse text-blue-600 font-medium">Esperando confirmación...</p>
              </>
            )}
            {asyncPaymentStatus === 'WAITING_POINT' && (
              <>
                <div className="text-6xl mb-4">💳</div>
                <h3 className="text-2xl font-bold mb-2">Procesando en Terminal</h3>
                <p className="text-gray-600 mb-6">{pointStatus || "Siga las instrucciones en el dispositivo"}</p>
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              </>
            )}
            <button onClick={() => setAsyncPaymentStatus('IDLE')} className="mt-8 text-sm text-gray-500 hover:text-red-500 underline">
              Cerrar / Cancelar (No cancela en terminal)
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
