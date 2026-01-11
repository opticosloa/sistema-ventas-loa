import { forwardRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface TicketProps {
    venta: any; // Datos de la venta realizada
    detalles: any; // Items del carrito (cart)
    receta?: any; // Datos de la graduación
    cliente?: any;
}

export const TicketVenta = forwardRef<HTMLDivElement, TicketProps>(({ venta, detalles, receta, cliente }, ref) => {
    // Si no hay venta, no renderizamos nada (o un div vacío para que no rompa el ref)
    if (!venta) return <div ref={ref}></div>;

    const total = venta.total || 0;
    const fecha = new Date().toLocaleString('es-AR');

    return (
        <div style={{ display: 'none' }}> {/* Oculto en la UI, solo visible para la impresora via CSS de react-to-print si se configura, pero aqui lo ocultamos con hidden en el padre o style display none y react-to-print lo clona */}
            <div ref={ref} className="p-4 w-[80mm] bg-white text-black font-mono text-[12px] leading-tight print-container">
                <style type="text/css" media="print">
                    {`
                        @page { size: auto; margin: 0mm; }
                        @media print {
                           body { -webkit-print-color-adjust: exact; }
                           .print-container { width: 80mm; padding: 5mm; }
                        }
                    `}
                </style>

                {/* Encabezado */}
                <div className="text-center mb-4">
                    <h1 className="text-xl font-bold uppercase">Óptica LOA</h1>
                    <p>Av. Principal 123 - Luján</p>
                    <p>Tel: 2323-456789</p>
                    <p className="mt-2 text-[10px]">IVA Responsable Inscripto</p>
                    <div className="border-b border-dashed border-black my-2"></div>
                    <p className="font-bold">ORDEN DE VENTA</p>
                    <p>#{venta.venta_id?.toString().padStart(8, '0')}</p>
                    <p>{fecha}</p>
                </div>

                {/* Cliente */}
                <div className="mb-3">
                    <p><strong>CLIENTE:</strong> {cliente?.nombre} {cliente?.apellido}</p>
                    {cliente?.telefono && <p><strong>TEL:</strong> {cliente.telefono}</p>}
                </div>

                <div className="border-b border-dashed border-black my-2"></div>

                {/* RECETA ÓPTICA (Si existe) */}
                {receta && (receta.lejos_OD_Esf || receta.lejos_OI_Esf) && (
                    <div className="mb-3 text-[10px]">
                        <p className="text-center font-bold mb-1">DETALLE ÓPTICO</p>
                        <table className="w-full text-center border border-black">
                            <thead>
                                <tr className="border-b border-black">
                                    <th></th>
                                    <th>ESF</th>
                                    <th>CIL</th>
                                    <th>EJE</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="text-left font-bold">OD</td>
                                    <td>{receta.lejos_OD_Esf || '-'}</td>
                                    <td>{receta.lejos_OD_Cil || '-'}</td>
                                    <td>{receta.lejos_OD_Eje || '-'}</td>
                                </tr>
                                <tr>
                                    <td className="text-left font-bold">OI</td>
                                    <td>{receta.lejos_OI_Esf || '-'}</td>
                                    <td>{receta.lejos_OI_Cil || '-'}</td>
                                    <td>{receta.lejos_OI_Eje || '-'}</td>
                                </tr>
                            </tbody>
                        </table>
                        {receta.lejos_DNP && <p className="mt-1">DNP: {receta.lejos_DNP}</p>}
                    </div>
                )}

                <div className="border-b border-dashed border-black my-2"></div>

                {/* Productos */}
                <table className="w-full mb-2">
                    <thead>
                        <tr className="text-left border-b border-black">
                            <th>DESCRIPCION</th>
                            <th className="text-right">CANT</th>
                            <th className="text-right">SUBT</th>
                        </tr>
                    </thead>
                    <tbody>
                        {detalles.map((item: any, index: number) => (
                            <tr key={index}>
                                <td className="py-1 uppercase text-[10px]">{item.producto.nombre.substring(0, 20)}</td>
                                <td className="text-right">{item.cantidad}</td>
                                <td className="text-right">${item.subtotal.toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="border-b border-dashed border-black my-2"></div>

                {/* Totales */}
                <div className="space-y-1">
                    <div className="flex justify-between">
                        <span>SUBTOTAL:</span>
                        <span>${total.toLocaleString()}</span>
                    </div>
                    {venta.descuento > 0 && (
                        <div className="flex justify-between">
                            <span>DESCUENTO:</span>
                            <span>-${venta.descuento.toLocaleString()}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-lg font-bold">
                        <span>TOTAL:</span>
                        <span>${(total - (venta.descuento || 0)).toLocaleString()}</span>
                    </div>

                </div>

                <div className="border-b border-dashed border-black my-2"></div>

                {/* Pie de ticket */}
                <div className="text-center mt-4 flex flex-col items-center">
                    <QRCodeSVG value={`https://tu-optica.com/v/${venta.venta_id}`} size={80} />
                    <p className="mt-2 font-bold">¡GRACIAS POR TU COMPRA!</p>
                    <p className="text-[10px]">Conserve este ticket para retirar</p>
                    <p className="text-[9px] mt-2">v.1.0 - Sistema LOA</p>
                </div>
            </div>
        </div>
    );
});

TicketVenta.displayName = 'TicketVenta';