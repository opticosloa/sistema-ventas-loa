import { useEffect, useState } from 'react';
import { CashService, type CashSummary } from '../../services/cash.service';
import Swal from 'sweetalert2';
import { formatCurrency } from '../../helpers/currency';

export const CierreCajaPanel = () => {
    const [summary, setSummary] = useState<CashSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [efectivoReal, setEfectivoReal] = useState<string>(''); // String to handle empty input
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

        const efectivoNum = parseFloat(efectivoReal) || 0;
        const totalToSend = efectivoNum + Number(summary.total_electronico);
        const diferencia = efectivoNum - Number(summary.total_efectivo);

        const result = await Swal.fire({
            title: '¿Confirmar Cierre?',
            html: `
                <p class="text-left"><strong>Sistema Efectivo:</strong> ${formatCurrency(summary.total_efectivo)}</p>
                <p class="text-left"><strong>Real Efectivo:</strong> ${formatCurrency(efectivoNum)}</p>
                <p class="text-left text-lg font-bold ${diferencia < 0 ? 'text-red-500' : 'text-green-500'}">
                    Diferencia: ${formatCurrency(diferencia)}
                </p>
                <br/>
                <p class="text-sm text-gray-500">Se guardará el cierre y se reiniciará la caja.</p>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, Cerrar Caja',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            setCalculating(true);
            try {
                const response = await CashService.performClosing(totalToSend, observaciones);
                await Swal.fire({
                    title: '¡Caja Cerrada!',
                    text: `Diferencia total registrada: ${formatCurrency(response.diferencia)}`,
                    icon: 'success'
                });
                setSummary(null);
                setEfectivoReal('');
                setObservaciones('');
                fetchSummary(); // Refresh (should be empty now)
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

    const efectivoNum = parseFloat(efectivoReal) || 0;
    const diffEfectivo = efectivoNum - Number(summary.total_efectivo);

    return (
        <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
            <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">Cierre de Caja</h1>

            {/* Cards Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border-l-4 border-blue-500">
                    <p className="text-gray-500 dark:text-gray-400 text-sm uppercase font-semibold">Total Efectivo (Sistema)</p>
                    <p className="text-3xl font-bold text-gray-800 dark:text-white mt-2">
                        {formatCurrency(summary.total_efectivo)}
                    </p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border-l-4 border-purple-500">
                    <p className="text-gray-500 dark:text-gray-400 text-sm uppercase font-semibold">Total Electrónicos</p>
                    <p className="text-3xl font-bold text-gray-800 dark:text-white mt-2">
                        {formatCurrency(summary.total_electronico)}
                    </p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border-l-4 border-green-500">
                    <p className="text-gray-500 dark:text-gray-400 text-sm uppercase font-semibold">Total General (Sistema)</p>
                    <p className="text-3xl font-bold text-gray-800 dark:text-white mt-2">
                        {formatCurrency(summary.total_general)}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Input Section */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                    <h2 className="text-xl font-bold mb-4 text-gray-700 dark:text-gray-200">Arqueo de Caja</h2>

                    <div className="mb-4">
                        <label className="block text-gray-700 dark:text-gray-300 font-bold mb-2">
                            Efectivo Real en Caja
                        </label>
                        <input
                            type="number"
                            value={efectivoReal}
                            onChange={(e) => setEfectivoReal(e.target.value)}
                            className="w-full p-4 text-2xl border rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            placeholder="0.00"
                        />
                    </div>

                    <div className={`p-4 rounded-lg mb-6 ${diffEfectivo < 0 ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'}`}>
                        <div className="flex justify-between items-center">
                            <span className="font-semibold">Diferencia (Contra Efectivo Sistema):</span>
                            <span className="text-2xl font-bold">{diffEfectivo > 0 ? '+' : ''}{formatCurrency(diffEfectivo)}</span>
                        </div>
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
                            : 'bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl'
                            }`}
                    >
                        {calculating ? 'Procesando Cierre...' : 'EJECUTAR CIERRE DE CAJA'}
                    </button>
                    {summary.total_general === 0 && (
                        <p className="text-center text-gray-500 mt-2 text-sm">No hay ventas pendientes de cierre.</p>
                    )}
                </div>

                {/* Sales List */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg overflow-hidden">
                    <h2 className="text-xl font-bold mb-4 text-gray-700 dark:text-gray-200">
                        Ventas Pendientes ({summary.detalle_ventas.length})
                    </h2>
                    <div className="overflow-y-auto max-h-[500px]">
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
                                    <tr key={venta.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
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
    );
};
