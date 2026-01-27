import React, { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { useUiStore } from '../../hooks';
import LOAApi from '../../api/LOAApi';

// Interface matching the result of sp_ticket_listar
interface Ticket {
  ticket_id: string;
  codigo_visual: string;
  fecha_creacion: string;
  fecha_entrega_estimada: string;
  estado: string;
  cliente_nombre: string;
  dni: string;
  notas: string;
  venta_id: string;
  saldo_pendiente: number;
}

const statusClasses = (estado: string) => {
  switch (estado) {
    case "PENDIENTE": return "bg-yellow-100 text-yellow-800";
    case "EN_TALLER": return "bg-orange-100 text-orange-800";
    case "LISTO": return "bg-green-100 text-green-800 text-green-600 font-bold";
    case "ENTREGADO": return "bg-blue-100 text-blue-800";
    case "CANCELADO": return "bg-red-100 text-red-800";
    default: return "bg-gray-100 text-gray-800";
  }
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(amount);

export const TicketList: React.FC = () => {
  const { handlerTicketDetail } = useUiStore();
  const [tickets, setTickets] = useState<Ticket[]>([]);

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const { data } = await LOAApi.get<{ success: boolean; result: Ticket[] }>('/api/tickets');
        if (data.success && Array.isArray(data.result)) {
          setTickets(data.result);
          if (data.result.length === 0) {
            Swal.fire("Info", "No se encontraron tickets (la tabla está vacía).", "info");
          }
        }
      } catch (error) {
        console.error("Error fetching tickets:", error);
        // Do not show error alert on mount if it's just empty or initially loading, usually annoy users.
        // But if it fails, yes.
      }
    };
    fetchTickets();
  }, []);

  const handleRowClick = (ticket: Ticket) => {
    // Adapter to match what handlerTicketDetail expects (Venta-like structure) if needed.
    // Assuming handlerTicketDetail can handle partial data or we fetch detail inside.
    // For now, passing ID mostly matters.
    // If handlerTicketDetail requires strict Venta type, we might need to fetch Venta detail.
    // But 'handlerTicketDetail' usually opens TicketModal.
    // Let's pass the ticket object, assuming UI store logic handles it or we update it.
    // Actually, looking at usages, it likely just needs ticket info.
    // Casting to any to avoid strict "Venta" check if the store expects Venta, 
    // but ideally we should update the store type too.
    handlerTicketDetail(ticket as any);
  };

  const onKeyActivate = (e: React.KeyboardEvent, ticket: Ticket) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleRowClick(ticket);
    }
  };

  return (
    <div className="container mx-auto p-2">
      <h1 className="text-2xl text-blanco font-bold mb-4 text-center">Lista de Tickets</h1>

      {/* ===== Mobile / sm: tarjetas apiladas ===== */}
      <div className="grid gap-4 w-fit md:hidden">
        {tickets.map((ticket) => (
          <article
            key={ticket.ticket_id}
            role="button"
            tabIndex={0}
            onClick={() => handleRowClick(ticket)}
            onKeyDown={(e) => onKeyActivate(e, ticket)}
            className="px-2 py-3 bg-white rounded-lg shadow-sm border hover:shadow-md focus:outline-none focus:ring-2 focus:ring-celeste cursor-pointer"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-lg font-semibold truncate">{ticket.cliente_nombre}</h3>
                <p className="text-sm text-gray-600 mt-1 truncate">DNI: {ticket.dni || 'S/D'}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded ${statusClasses(ticket.estado)}`}>
                    {ticket.estado}
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-end flex-shrink-0 whitespace-nowrap">
                <span className="text-xs text-gray-500">Estimada</span>
                <span className="text-sm font-medium text-gray-800">{formatDate(ticket.fecha_entrega_estimada)}</span>
                <span className={`text-base font-bold mt-2 ${ticket.saldo_pendiente > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {ticket.saldo_pendiente > 0 ? `Debía: ${formatCurrency(ticket.saldo_pendiente)}` : 'Pagado'}
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2 text-right">#{ticket.codigo_visual}</p>
          </article>
        ))}
      </div>

      {/* ===== Desktop / md+: tabla con columnas fijas y truncado ===== */}
      <div className="hidden md:block overflow-x-auto mt-4">
        <table className="min-w-full bg-white border border-gray-300 table-fixed">
          <colgroup>
            <col className="w-1/4" />
            <col className="w-32" />
            <col className="w-40" />
            <col className="w-32" />
            <col className="w-32" />
          </colgroup>

          <thead>
            <tr>
              <th className="py-2 px-4 border-b bg-gray-100 text-left">Cliente</th>
              <th className="py-2 px-4 border-b bg-gray-100 text-left">DNI</th>
              <th className="py-2 px-4 border-b bg-gray-100 text-left">Fecha Estimada</th>
              <th className="py-2 px-4 border-b bg-gray-100 text-left">Estado</th>
              <th className="py-2 px-4 border-b bg-gray-100 text-right">Saldo</th>
            </tr>
          </thead>

          <tbody>
            {tickets.map((ticket) => (
              <tr
                key={ticket.ticket_id}
                onClick={() => handleRowClick(ticket)}
                onKeyDown={(e) => onKeyActivate(e, ticket)}
                tabIndex={0}
                role="button"
                className="hover:bg-gray-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-celeste"
              >
                <td className="py-2 px-4 border-b min-w-0">
                  <div className="truncate font-medium">{ticket.cliente_nombre}</div>
                  <div className="text-xs text-gray-400">#{ticket.codigo_visual}</div>
                </td>

                <td className="py-2 px-4 border-b text-sm text-gray-600">
                  {ticket.dni || '-'}
                </td>

                <td className="py-2 px-4 border-b text-sm text-gray-700">
                  {formatDate(ticket.fecha_entrega_estimada)}
                </td>

                <td className="py-2 px-4 border-b">
                  <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${statusClasses(ticket.estado)}`}>
                    {ticket.estado}
                  </span>
                </td>

                <td className="py-2 px-4 border-b text-right whitespace-nowrap">
                  <span className={`font-bold ${ticket.saldo_pendiente > 0 ? 'text-red-500' : 'text-green-600'}`}>
                    {formatCurrency(ticket.saldo_pendiente)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
