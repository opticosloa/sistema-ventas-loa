import { useEffect, useState } from 'react';
import { CashService, type CashSummary } from '../../services/cash.service';
import Swal from 'sweetalert2';
import { formatCurrency } from '../../helpers/currency';
import { DesgloseCobrosOS } from './DesgloseCobrosOS';

export const CierreCajaPanel = () => {
    const [summary, setSummary] = useState<CashSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [efectivoFisico, setEfectivoFisico] = useState<string>('');
    const [montoRemanente, setMontoRemanente] = useState<string>('');
    const [observaciones, setObservaciones] = useState('');
    const [calculating, setCalculating] = useState(false);

    useEffect(() => {
        fetchSummary();
    }, []);

    const fetchSummary = async () => {
        setLoading(true);
        try {
            const data = await CashService.getSummary();
            setSummary(data);
        } catch (error: any) {
            console.error(error);
            Swal.fire('Error', 'No se pudo obtener el resumen de caja', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = async () => {
        if (!summary) return;

        const efectivoFisicoNum = parseFloat(efectivoFisico) || 0;
        const remanenteNum = parseFloat(montoRemanente) || 0;

        // 1. Calculate Others (System)
        const totalOtros = Number(summary.total_electronico) + Number(summary.total_obra_social);

        // 2. Calculate Global Real (To be sent)
        // monto_real = Efectivo Físico + Otros Medios
        const montoRealGlobal = efectivoFisicoNum + totalOtros;

        // 3. Calculate Diff (Just for Alert/Validation locally)
        // Expected Cash = Cash Sales + (We don't know Initial Fund here easily unless we fetch it or user knows it)
        // Actually summary.total_efectivo is SYSTEM CASH SALES.
        // We probably shouldn't block, just warn.

        // Extracción Estimada
        const extraccion = efectivoFisicoNum - remanenteNum;

        const result = await Swal.fire({
            title: '¿Confirmar Cierre?',
            html: `
                <div class="text-left space-y-2">
                    <p><strong>Efectivo Físico:</strong> ${formatCurrency(efectivoFisicoNum)}</p>
                    <p><strong>Otros Medios:</strong> ${formatCurrency(totalOtros)}</p>
                    <hr/>
                    <p><strong>Total Global (Declarado):</strong> ${formatCurrency(montoRealGlobal)}</p>
                    <p class="text-blue-600 font-bold">Extracción Estimada: ${formatCurrency(extraccion)}</p> 
                    <p class="text-sm text-gray-500">Monto Remanente: ${formatCurrency(remanenteNum)}</p>
                </div>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, Cerrar Caja',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            setCalculating(true);
            try {
                // Send: monto_real, observaciones, monto_remanente, efectivo_fisico
                const response = await CashService.performClosing(
                    montoRealGlobal,
                    observaciones,
                    remanenteNum,
                    efectivoFisicoNum
                );

                // Create Blob URL for PDF
                const file = new Blob([response], { type: 'application/pdf' });
                const fileURL = URL.createObjectURL(file);
                window.open(fileURL, '_blank');

                await Swal.fire({
                    title: '¡Caja Cerrada!',
                    text: 'El reporte se ha generado correctamente.',
                    icon: 'success'
                });

                setSummary(null);
                setEfectivoFisico('');
                setMontoRemanente('');
                setObservaciones('');
                fetchSummary();
            } catch (error: any) {
                console.error(error);
                Swal.fire('Error', error?.response?.data?.error || 'No se pudo cerrar la caja', 'error');
            } finally {
                setCalculating(false);
            }
        }
    };

    if (loading) return <div className="p-10 text-center">Cargando resumen...</div>;
    if (!summary) return <div className="p-10 text-center">No hay datos disponibles</div>;

    const efectivoFisicoNum = parseFloat(efectivoFisico) || 0;
    const remanenteNum = parseFloat(montoRemanente) || 0;
    const extraccionEstimada = efectivoFisicoNum - remanenteNum;
    const otrosMedios = Number(summary.total_electronico) + Number(summary.total_obra_social);

    return (
        <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
            <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">Cierre de Caja</h1>

            {/* Cards Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border-l-4 border-blue-500">
                    <p className="text-gray-500 dark:text-gray-400 text-xs uppercase font-semibold">Efectivo (Sistema)</p>
                    <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">
                        {formatCurrency(summary.total_efectivo)}
                    </p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border-l-4 border-purple-500">
                    <p className="text-gray-500 dark:text-gray-400 text-xs uppercase font-semibold">Electrónicos</p>
                    <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">
                        {formatCurrency(summary.total_electronico)}
                    </p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border-l-4 border-orange-500">
                    <p className="text-gray-500 dark:text-gray-400 text-xs uppercase font-semibold">Obras Sociales</p>
                    <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">
                        {formatCurrency(summary.total_obra_social || 0)}
                    </p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border-l-4 border-green-500">
                    <p className="text-gray-500 dark:text-gray-400 text-xs uppercase font-semibold">Total General</p>
                    <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">
                        {formatCurrency(summary.total_general)}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Input Section */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg h-fit">
                    <h2 className="text-xl font-bold mb-4 text-gray-700 dark:text-gray-200">Arqueo de Caja</h2>

                    {/* Inputs Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-gray-700 dark:text-gray-300 font-bold mb-2">
                                Efectivo Físico
                            </label>
                            <input
                                type="number"
                                value={efectivoFisico}
                                onChange={(e) => setEfectivoFisico(e.target.value)}
                                className="w-full p-3 text-xl border rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                placeholder="0.00"
                            />
                        </div>

                        <div>
                            <label className="block text-gray-700 dark:text-gray-300 font-bold mb-2">
                                Monto Remanente
                            </label>
                            <input
                                type="number"
                                value={montoRemanente}
                                onChange={(e) => setMontoRemanente(e.target.value)}
                                className="w-full p-3 text-xl border rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                placeholder="Fondo prox. turno"
                            />
                        </div>
                    </div>


                    {/* Read Only Calculation */}
                    <div className="bg-gray-100 dark:bg-gray-700/50 p-4 rounded-lg mb-4 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Otros Medios (Sistema):</span>
                            <span className="font-semibold dark:text-gray-200">{formatCurrency(otrosMedios)}</span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-gray-300 dark:border-gray-600">
                            <span className="font-bold text-gray-700 dark:text-gray-200">Extracción Estimada:</span>
                            <span className={`text-xl font-bold ${extraccionEstimada < 0 ? 'text-red-500' : 'text-blue-600'}`}>
                                {formatCurrency(extraccionEstimada)}
                            </span>
                        </div>
                        <p className="text-xs text-center text-gray-500 mt-1 dark:text-gray-400">
                            (Efectivo Físico - Remanente)
                        </p>
                    </div>

                    <div className="mb-6">
                        <label className="block text-gray-700 dark:text-gray-300 font-bold mb-2">
                            Observaciones
                        </label>
                        <textarea
                            value={observaciones}
                            onChange={(e) => setObservaciones(e.target.value)}
                            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            rows={3}
                            placeholder="Comentarios adicionales..."
                        />
                    </div>

                    <button
                        onClick={handleClose}
                        disabled={calculating || summary.total_general === 0}
                        className={`w-full py-4 rounded-lg font-bold text-lg text-white transition-colors ${summary.total_general === 0
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-green-600 hover:bg-green-700 shadow-lg hover:shadow-xl'
                            }`}
                    >
                        {calculating ? 'Procesando Cierre...' : 'EJECUTAR CIERRE DE CAJA'}
                    </button>
                    {summary.total_general === 0 && (
                        <p className="text-center text-gray-500 mt-2 text-sm">No hay ventas pendientes de cierre.</p>
                    )}
                </div>

                {/* Sales List & OS Breakdown */}
                <div className="space-y-6">
                    {/* OS Breakdown */}
                    {summary.detalle_obras_sociales && summary.detalle_obras_sociales.length > 0 && (
                        <DesgloseCobrosOS data={summary.detalle_obras_sociales} />
                    )}

                    {/* Sales Table */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg overflow-hidden">
                        <h2 className="text-xl font-bold mb-4 text-gray-700 dark:text-gray-200">
                            Ventas Pendientes ({summary.detalle_ventas.length})
                        </h2>
                        <div className="overflow-y-auto max-h-[400px]">
                            <table className="w-full text-left">
                                <thead className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 uppercase text-xs">
                                    <tr>
                                        <th className="p-3">Hora</th>
                                        <th className="p-3">Cliente</th>
                                        <th className="p-3 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {summary.detalle_ventas.map((venta) => (
                                        <tr key={venta.venta_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                            <td className="p-3 text-sm text-gray-600 dark:text-gray-400">
                                                {new Date(venta.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td className="p-3 text-sm font-medium text-gray-800 dark:text-gray-200">
                                                {venta.cliente_nombre}
                                            </td>
                                            <td className="p-3 text-sm font-bold text-gray-800 dark:text-white text-right">
                                                {formatCurrency(venta.total)}
                                            </td>
                                        </tr>
                                    ))}
                                    {summary.detalle_ventas.length === 0 && (
                                        <tr>
                                            <td colSpan={3} className="p-4 text-center text-gray-500">
                                                Sin ventas pendientes.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
