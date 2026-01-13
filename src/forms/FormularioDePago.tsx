import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import LOAApi from '../api/LOAApi';
import type { MetodoPago, PagoParcial } from '../types/Pago';
import { QRCodeSVG } from 'qrcode.react';
import { SupervisorAuthModal } from '../components/modals/SupervisorAuthModal';
import { SalesItemsList, type CartItem } from './components/SalesItemsList';

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

  const metodos: { id: MetodoPago; label: string; icon: string }[] = [
    { id: 'EFECTIVO', label: 'Efectivo', icon: '💵' },
    { id: 'TRANSFERENCIA', label: 'Transferencia', icon: '🏦' },
    { id: 'MP', label: 'Mercado Pago', icon: '📱' },
  ];

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

    // Pagos manuales se asumen confirmados al agregarse temporalmente (hasta submit)
    // Pero espera, el submit es el que los guarda.
    // Mientras estén en local state antes de guardar, los tratamos como "por confirmar" pero visible en la lista?
    // En la lógica anterior: onSubmit crea los manuales. 
    // Aquí los agregamos a la lista local. UI debe mostrarlos.
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

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

  const handleStartMpFlow = async (type: 'QR' | 'POINT', amount: number, deviceIdParam?: string) => {
    setLoading(true);
    setPointStatus("");
    try {
      if (type === 'QR') {
        // Use the new Dynamic QR endpoint
        const { data } = await LOAApi.post('/api/payments/mercadopago/dynamic', {
          total: amount,
          sucursal_id: 'SUCURSAL_DEFAULT' // You might want to make this dynamic later if needed
        });

        if (data.success && data.result?.qr_data) {
          setQrData(data.result.qr_data);
          setAsyncPaymentStatus('SHOWING_QR');
        } else {
          console.error("Respuesta inesperada QR Dinámico:", data);
          alert("Error generando QR Dinámico. Intente nuevamente.");
          setAsyncPaymentStatus('IDLE');
        }
      } else {
        // Point Flow
        if (!deviceIdParam) {
          setLoading(false);
          return alert("Error: Falta ID de dispositivo");
        }
        await LOAApi.post('/api/payments/mercadopago/point', {
          venta_id: ventaId,
          monto: amount,
          device_id: deviceIdParam
        });
        setPointStatus("Enviado a terminal. Espere...");
        setAsyncPaymentStatus('WAITING_POINT');
      }
    } catch (e) {
      console.error("MP Start Flow Error:", e);
      alert("Error iniciando pago MP. Intente nuevamente.");
      setAsyncPaymentStatus('IDLE');
      setQrData(null);
    } finally {
      if (type === 'QR') setLoading(false);
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

          {/* Reuse SalesItemsList in ReadOnly Mode */}
          <SalesItemsList
            items={displayItems}
            onItemsChange={() => { }}
            readonly={true}
          />
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
                        <p className={`text-xs ${pago.confirmed ? 'text-green-400' : 'text-yellow-500'}`}>
                          {pago.confirmed ? 'CONFIRMADO' : (pago.estado || 'Pendiente / Local')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-lg">${(pago.monto || 0).toLocaleString()}</span>
                      {!pago.readonly && ( // Only allow remove if not DB record (or implement DELETE logic)
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
              disabled={!selectedMethod || parseFloat(amountInput) <= 0 || currentTotal <= 0}
              className={`btn-secondary w-full mb-auto ${currentTotal <= 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Agregar Pago
            </button>

            <hr className="border-gray-700 my-6" />

            <div className="flex flex-col gap-3">
              <button
                onClick={() => setSupervisorModalOpen(true)}
                disabled={loading || currentTotal <= 0}
                className={`w-full py-3 rounded-lg font-bold text-lg transition-all ${!loading && currentTotal > 0
                  ? 'bg-orange-600 hover:bg-orange-500 text-white shadow-lg'
                  : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  }`}
              >
                Pagar al Retirar
              </button>

              <button
                onClick={onSubmit}
                disabled={loading || currentTotal <= 0} // Allow confirm even if partial? Maybe. "puedeConfirmar" logic was stricter.
                className={`w-full py-3 rounded-lg font-bold text-lg transition-all ${!loading && currentTotal > 0
                  ? 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/50'
                  : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  }`}
              >
                {loading ? 'Procesando...' : 'Pagar'}
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* Supervisor Modal */}
      <SupervisorAuthModal
        isOpen={supervisorModalOpen}
        onClose={() => setSupervisorModalOpen(false)}
        onSuccess={handleSupervisorSuccess}
        actionName="Autorizar Retiro Sin Pago"
      />

      {/* Warning if total is 0 */}
      {currentTotal <= 0 && (
        <div className="bg-red-900/50 border border-red-500 text-red-200 p-4 rounded-lg mb-6 flex items-center gap-3">
          <span className="text-3xl">⚠️</span>
          <div>
            <h3 className="font-bold text-lg">Error en la Venta</h3>
            <p>El total de la venta es $0. No se puede procesar el pago ni autorizar retiro.</p>
            <button onClick={() => navigate('/ventas')} className="underline mt-1 hover:text-white">
              Volver y revisar items
            </button>
          </div>
        </div>
      )}

      {/* MP Modal */}
      {mpModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 p-6 rounded-lg max-w-sm w-full text-center">
            <h3 className="text-xl font-bold mb-4 text-white">Mercado Pago</h3>
            <p className="mb-6 text-gray-300">Monto: ${mpAmount.toLocaleString()}</p>

            {/* Device Selector for Point */}
            <div className="mb-4 text-left">
              <label className="block text-sm text-gray-400 mb-1">Seleccionar Terminal Point:</label>
              <select
                value={selectedDeviceId}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
                className="input w-full text-sm bg-gray-900"
                disabled={pointDevices.length === 0}
              >
                {pointDevices.length === 0 ? (
                  <option value="">Cargando / No hay dispositivos...</option>
                ) : (
                  pointDevices.map((device: any) => (
                    // Muestra un nombre amigable si existe, o el ID cortado
                    <option key={device.id} value={device.id}>
                      {device.name || `Terminal ${device.id.slice(-6)}`}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="flex gap-4 justify-center mb-6">
              <button
                onClick={() => { setMpModalOpen(false); handleStartMpFlow('QR', mpAmount); }}
                className="flex-1 bg-blue-600 hover:bg-blue-500 py-3 rounded-lg flex flex-col items-center gap-2"
              >
                <span className="text-2xl">🖥️</span>
                <span className="text-sm font-bold">QR Pantalla</span>
              </button>
              <button
                onClick={() => {
                  if (!selectedDeviceId) return alert("Seleccione una terminal");
                  setMpModalOpen(false);
                  handleStartMpFlow('POINT', mpAmount, selectedDeviceId);
                }}
                disabled={pointDevices.length === 0 || !selectedDeviceId}
                className={`flex-1 py-3 rounded-lg flex flex-col items-center gap-2 ${pointDevices.length === 0 || !selectedDeviceId ? 'bg-gray-600 cursor-not-allowed' : 'bg-cyan-600 hover:bg-cyan-500'
                  }`}
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
                <p className="text-sm text-gray-500 mb-4">Escanea desde la App de Mercado Pago</p>
                <div className="flex items-center gap-2 animate-pulse text-blue-600 font-medium">
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                  Esperando confirmación...
                </div>
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
