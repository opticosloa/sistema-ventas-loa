import React, { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { useUiStore } from '../../hooks';
import type { Venta } from '../../types/Venta';
import LOAApi from '../../api/LOAApi';

// Extended interface to match the JOINed data returned by sp_ticket_get
interface Ticket extends Venta {
  cliente: string; // Nombre del cliente
  producto: string; // Nombre del producto principal
  empleado: string; // Nombre del vendedor
  fecha: string; // Alias for fecha_entrada or computed
}

const statusClasses = (estado: string) => {
  switch (estado) {
    case "Pendiente": return "bg-yellow-100 text-yellow-800";
    case "En taller": return "bg-orange-100 text-orange-800";
    case "Entregado": return "bg-green-100 text-green-800";
    case "Cancelado": return "bg-red-100 text-red-800";
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
        console.log(data);
        if (data.success && Array.isArray(data.result)) {
          setTickets(data.result);
          if (data.result.length === 0) {
            Swal.fire("Info", "No se encontraron tickets (la tabla está vacía).", "info");
          }
        }
      } catch (error) {
        console.error("Error fetching tickets:", error);
        Swal.fire("Error", "Error al cargar tickets.", "error");
      }
    };
    fetchTickets();
  }, []);

  const onKeyActivate = (e: React.KeyboardEvent, ticket: Ticket) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handlerTicketDetail(ticket);
    }
  };

  return (
    <div className="container mx-auto p-2">
      <h1 className="text-2xl font-bold mb-4 text-center">Lista de Tickets</h1>

      {/* ===== Mobile / sm: tarjetas apiladas ===== */}
      <div className="grid gap-4 w-fit md:hidden">
        {tickets.map((ticket) => (
          <article
            key={ticket.venta_id}
            role="button"
            tabIndex={0}
            onClick={() => handlerTicketDetail(ticket)}
            onKeyDown={(e) => onKeyActivate(e, ticket)}
            aria-label={`Ver detalles del ticket ${ticket.venta_id}`}
            className="px-2 py-3 bg-white rounded-lg shadow-sm border hover:shadow-md focus:outline-none focus:ring-2 focus:ring-celeste cursor-pointer"
          >
            <div className="flex items-start justify-between gap-4">
              {/* left: contenido principal con truncado (min-w-0 para que funcione) */}
              <div className="min-w-0">
                <h3 className="text-lg font-semibold truncate">{ticket.cliente}</h3>
                <p className="text-sm text-gray-600 mt-1 truncate">{ticket.producto}</p>
                <p className="text-xs text-gray-500 mt-2">Atendido por: {ticket.empleado}</p>
              </div>

              {/* right: fecha + precio, no deben envolver */}
              <div className="flex flex-col items-end flex-shrink-0 whitespace-nowrap">
                <span className="text-xs text-gray-600">{formatDate(ticket.fecha_entrada)}</span>
                <span className="text-base font-semibold mt-2">{formatCurrency(ticket.total)}</span>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${statusClasses(ticket.estado)}`}>
                {ticket.estado}
              </span>
              <span className="text-xs text-gray-400">#{ticket.venta_id.substring(0, 8)}</span>
            </div>
          </article>
        ))}
      </div>

      {/* ===== Desktop / md+: tabla con columnas fijas y truncado ===== */}
      <div className="hidden md:block overflow-x-auto mt-4">
        <table className="min-w-full bg-white border border-gray-300 table-fixed">
          <colgroup>
            <col className="w-1/4" />
            <col className="w-40" />
            <col className="w-1/6" />
            <col className="w-1/3" />
            <col className="w-28" />
            <col className="w-28" />
          </colgroup>

          <thead>
            <tr>
              <th className="py-2 px-4 border-b bg-gray-100 text-left">Cliente</th>
              <th className="py-2 px-4 border-b bg-gray-100 text-left">Fecha</th>
              <th className="py-2 px-4 border-b bg-gray-100 text-left">Empleado</th>
              <th className="py-2 px-4 border-b bg-gray-100 text-left">Producto</th>
              <th className="py-2 px-4 border-b bg-gray-100 text-left">Estado</th>
              <th className="py-2 px-4 border-b bg-gray-100 text-right">Total</th>
            </tr>
          </thead>

          <tbody>
            {tickets.map((ticket) => (
              <tr
                key={ticket.venta_id}
                onClick={() => handlerTicketDetail(ticket)}
                onKeyDown={(e) => onKeyActivate(e, ticket)}
                tabIndex={0}
                role="button"
                className="hover:bg-gray-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-celeste"
                aria-label={`Ver detalles del ticket ${ticket.venta_id}`}
              >
                <td className="py-2 px-4 border-b min-w-0">
                  <div className="truncate">{ticket.cliente}</div>
                </td>

                <td className="py-2 px-4 border-b whitespace-nowrap text-sm text-gray-600">
                  {formatDate(ticket.fecha_entrada)}
                </td>

                <td className="py-2 px-4 border-b text-sm text-gray-700">{ticket.empleado}</td>

                {/* producto debe poder truncar: min-w-0 + truncate */}
                <td className="py-2 px-4 border-b min-w-0">
                  <div className="truncate max-w-full">{ticket.producto}</div>
                </td>

                <td className="py-2 px-4 border-b">
                  <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${statusClasses(ticket.estado)}`}>
                    {ticket.estado}
                  </span>
                </td>

                <td className="py-2 px-4 border-b text-right whitespace-nowrap">
                  {formatCurrency(ticket.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
