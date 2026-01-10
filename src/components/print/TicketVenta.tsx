import { useEffect, useState, forwardRef } from 'react';
import LOAApi from '../../api/LOAApi';

interface TicketVentaProps {
    saleId: string | number;
}

interface SaleData {
    venta_id: number;
    fecha: string;
    total: number;
    descuento: number;
    saldo: number;
    cliente: {
        nombre: string;
        apellido: string;
        dni: string;
        direccion?: string;
        obra_social?: string;
    };
    items: Array<{
        producto_nombre?: string; // Puede venir como producto_nombre o descripcion
        nombre_producto?: string;
        cantidad: number;
        precio_unitario: number;
        producto?: {
            tipo: string;
            nombre: string;
        }
    }>;
    pagos: Array<{
        metodo: string; // Ojo: backend suele mandar 'metodo', no 'metodo_pago'
        monto: number;
    }>;
    vendedor?: string;
}

export const TicketVenta = forwardRef<HTMLDivElement, TicketVentaProps>(({ saleId }, ref) => {
    const [sale, setSale] = useState<SaleData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSaleDetails = async () => {
            try {
                // 1. Fetch Venta Header + Items
                const { data: saleRes } = await LOAApi.get(`/api/sales/${saleId}`);
                let saleData = Array.isArray(saleRes.result) ? saleRes.result[0] : saleRes.result;

                // 2. Fetch Pagos (si no vienen en el endpoint principal)
                if (!saleData.pagos) {
                    try {
                        const { data: pagosRes } = await LOAApi.get(`/api/payments/${saleId}`);
                        saleData.pagos = pagosRes.result?.pagos || [];
                    } catch (e) {
                        console.warn("No se pudieron cargar pagos", e);
                        saleData.pagos = [];
                    }
                }

                setSale(saleData);
            } catch (error) {
                console.error("Error loading ticket data", error);
            } finally {
                setLoading(false);
            }
        };

        if (saleId) fetchSaleDetails();
    }, [saleId]);

    if (loading) return <div className="p-4 text-center font-mono">Cargando datos...</div>;
    if (!sale) return <div className="p-4 text-center font-mono">Error al cargar venta.</div>;

    // Helper para nombre de producto robusto
    const getItemName = (item: any) => item.producto?.nombre || item.producto_nombre || item.nombre_producto || "Item s/n";
    const isCristal = (item: any) => item.producto?.tipo === 'CRISTAL' || getItemName(item).toLowerCase().includes('cristal');

    return (
        <div ref={ref} className="bg-white text-black p-2 mx-auto" style={{ width: '80mm', fontFamily: 'monospace', fontSize: '11px', lineHeight: '1.2' }}>

            {/* HEADER */}
            <div className="text-center mb-3">
                <h1 className="font-bold text-sm">ÓPTICA VISIÓN CLARA</h1>
                <p>Av. San Martín 1234, Luján</p>
                <p>CUIT: 30-12345678-9</p>
            </div>

            {/* INFO VENTA */}
            <div className="mb-2 border-b border-black border-dashed pb-1">
                <div className="flex justify-between">
                    <span>Fecha:</span>
                    <span>{new Date(sale.fecha).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                    <span>Ticket #:</span>
                    <span className="font-bold">{sale.venta_id}</span>
                </div>
                {sale.vendedor && <div>Vend: {sale.vendedor}</div>}
            </div>

            {/* CLIENTE */}
            <div className="mb-2 border-b border-black border-dashed pb-1">
                <p className="font-bold">CLIENTE:</p>
                <p>{sale.cliente?.nombre} {sale.cliente?.apellido}</p>
                <p>DNI: {sale.cliente?.dni}</p>
                {sale.cliente?.obra_social && <p>O.S.: {sale.cliente.obra_social}</p>}
            </div>

            {/* ITEMS */}
            <div className="mb-2 border-b border-black border-dashed pb-1">
                <div className="flex font-bold mb-1 border-b border-black pb-1">
                    <span className="w-6">Cant</span>
                    <span className="flex-1">Desc</span>
                    <span className="w-14 text-right">Total</span>
                </div>
                {sale.items?.map((item, idx) => (
                    <div key={idx} className="mb-1">
                        <div className="flex">
                            <span className="w-6 text-center">{item.cantidad}</span>
                            <span className="flex-1 text-xs">{getItemName(item)}</span>
                            <span className="w-14 text-right">${(Number(item.precio_unitario) * item.cantidad).toLocaleString()}</span>
                        </div>
                        {isCristal(item) && (
                            <div className="text-[10px] italic pl-6 text-gray-600">
                                (Ver Receta Adjunta)
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* TOTALES */}
            <div className="mb-2 flex flex-col items-end">
                <div className="flex justify-between w-full">
                    <span>Subtotal:</span>
                    <span>${(Number(sale.total) + Number(sale.descuento || 0)).toLocaleString()}</span>
                </div>
                {Number(sale.descuento) > 0 && (
                    <div className="flex justify-between w-full">
                        <span>Descuento:</span>
                        <span>-${Number(sale.descuento).toLocaleString()}</span>
                    </div>
                )}
                <div className="flex justify-between w-full font-bold text-sm mt-1 border-t border-black pt-1">
                    <span>TOTAL:</span>
                    <span>${Number(sale.total).toLocaleString()}</span>
                </div>
            </div>

            {/* PAGOS */}
            <div className="mb-2 border-t border-black border-dashed pt-1">
                <p className="font-bold mb-1 text-xs">PAGOS:</p>
                {sale.pagos?.map((pago, idx) => (
                    <div key={idx} className="flex justify-between text-xs">
                        <span>{pago.metodo || 'Pago'}</span>
                        <span>${Number(pago.monto).toLocaleString()}</span>
                    </div>
                ))}
            </div>

            {/* PIE */}
            <div className="text-center text-[10px] mt-4 pt-2 border-t border-black">
                <p>¡Gracias por elegirnos!</p>
                <p className="mt-1">Cambios dentro de los 30 días.</p>
                <p>Conserve este ticket.</p>
            </div>
        </div>
    );
});

TicketVenta.displayName = 'TicketVenta';