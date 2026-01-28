import { useSearchParams, useNavigate } from 'react-router-dom';
import { useRef, useEffect } from 'react';
import { usePagoResultado, usePrintTicket } from '../../hooks';
import { useReactToPrint } from 'react-to-print';
import { TicketVenta } from '../../components/print/TicketVenta';
import LOAApi from '../../api/LOAApi';

export const PagoResultadoPage = () => {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const ventaId = params.get('venta_id');
    const isDirectSale = params.get('isDirectSale') === 'true';

    const { estado, loading } = usePagoResultado(ventaId);
    const { printTicket, isPrinting } = usePrintTicket();

    // Ticket Printing (Legacy HTML)
    const componentRef = useRef<HTMLDivElement>(null);
    const handleLegacyPrint = useReactToPrint({
        contentRef: componentRef,
        documentTitle: `Ticket_${ventaId}`,
    });

    // Auto-Print Logic via Agent
    const printedRef = useRef(false);
    useEffect(() => {
        if (!loading && (estado === 'PAGADA' || estado === 'PENDIENTE') && !printedRef.current && ventaId) {
            // Only auto-print for Optic Sales (as per previous logic)
            if (!isDirectSale) {
                printedRef.current = true;
                const pdfUrl = `${LOAApi.defaults.baseURL}/api/sales/${ventaId}/laboratory-order`;
                printTicket(pdfUrl);
            }
        }
    }, [loading, estado, ventaId, isDirectSale, printTicket]);

    // Manual Print Handler
    const handlePrintClick = () => {
        if (!ventaId) return;

        // If it's a direct sale, we might not have a PDF, so use legacy print?
        // Or if we want to enforce Agent for everything:
        if (isDirectSale) {
            handleLegacyPrint();
        } else {
            const pdfUrl = `${LOAApi.defaults.baseURL}/api/sales/${ventaId}/laboratory-order`;
            printTicket(pdfUrl);
        }
    };

    if (loading) {
        return <p className="text-center mt-10 text-white">Verificando pago…</p>;
    }

    if (estado === 'RECHAZADA') {
        return (
            <div className="flex flex-col items-center mt-10 text-red-400 gap-4 fade-in">
                <h2 className="text-xl font-bold">Pago rechazado</h2>
                <p>Intentá nuevamente o usá otro medio de pago.</p>
                <button
                    onClick={() => navigate('/empleado/nueva-venta/pago', { state: { ventaId } })}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
                >
                    Reintentar Pago
                </button>
            </div>
        );
    }

    const title = estado === 'PENDIENTE' ? 'Pago Pendiente / A Cuenta' : 'Pago Aprobado';
    const colorClass = estado === 'PENDIENTE' ? 'text-orange-500' : 'text-green-500';

    return (
        <div className={`flex flex-col items-center mt-10 gap-4 ${colorClass} fade-in`}>
            <h2 className="text-xl font-bold">{title}</h2>
            <p className="text-gray-300">La venta se registró correctamente.</p>

            {estado === 'PENDIENTE' && (
                <div className="bg-blue-900/50 border border-blue-500 text-blue-200 p-4 rounded-lg mt-4 max-w-md text-center">
                    <p className="font-semibold">⚠️ Orden de taller generada</p>
                    <p className="text-sm mt-1">Saldo pendiente sujeto a condiciones de la óptica.</p>
                </div>
            )}

            <div className="flex gap-4 mt-4">
                <button
                    onClick={handlePrintClick}
                    disabled={isPrinting}
                    className="flex items-center gap-2 px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition shadow-lg border border-gray-600"
                >
                    {isPrinting ? 'Enviando...' : '🖨️ Imprimir Ticket'}
                </button>

                <button
                    onClick={() => navigate('/ventas')}
                    className="px-6 py-3 bg-celeste text-white rounded-lg hover:bg-celeste/80 transition shadow-lg font-bold"
                >
                    Volver al Inicio
                </button>
            </div>

            {/* Hidden Ticket Component for Printing (Direct Sales / Fallback) */}
            <div style={{ display: 'none' }}>
                <TicketVenta ref={componentRef} saleId={ventaId || ''} />
            </div>
        </div>
    );
};
