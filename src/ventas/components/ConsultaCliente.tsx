import React, { useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from '../../hooks/useDebounce';
import type { Cliente } from '../../types/Cliente';
import LOAApi from '../../api/LOAApi';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshButton } from '../../components/ui/RefreshButton';
import { HistorialPrescripciones } from './HistorialPrescripciones';

const ITEMS_PER_PAGE = 25;

const formatCurrency = (n?: number) =>
  n === undefined ? "-" : new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(n);

export const ConsultaCliente: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const q = useDebounce(query, 300);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Cliente | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Edit State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState<Partial<Cliente>>({});

  // History Modal State
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Consulta de clientes
  const { data: clientes = [], isLoading, isSuccess } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data } = await LOAApi.get<{ success: boolean; result: any }>('/api/clients');
      const listaClientes = data.result?.rows || data.result;
      return Array.isArray(listaClientes) ? listaClientes : [];
    }
  });

  const formatGraduacion = (data: any) => {
    if (!data || (!data.OD && !data.OI)) return "Sin graduación";

    const od = data.OD ? `OD: ${data.OD.esfera || '0'} / ${data.OD.cilindro || '0'} x ${data.OD.eje || '0'}°` : '';
    const oi = data.OI ? `OI: ${data.OI.esfera || '0'} / ${data.OI.cilindro || '0'} x ${data.OI.eje || '0'}°` : '';

    return `${od} ${oi}`.trim();
  };

  // Consulta de prescripciones del cliente seleccionado
  const { data: prescripciones = [], isLoading: isLoadingPrescripciones } = useQuery({
    queryKey: ['prescriptions', selected?.cliente_id],
    queryFn: async () => {
      if (!selected?.cliente_id) return [];
      const { data } = await LOAApi.get<{ success: boolean; result: any }>(`/api/prescriptions/client/${selected.cliente_id}`);
      const lista = data.result?.rows || data.result;
      return Array.isArray(lista) ? lista : [];
    },
    enabled: !!selected?.cliente_id, // Solo ejecuta si hay un cliente seleccionado
  });

  useEffect(() => {
    if (isSuccess && clientes.length === 0) {
      // alert("No se encontraron clientes (la tabla está vacía).");
    }
  }, [isSuccess, clientes]);

  // Filtrado cliente (nombre, dni, teléfono, email)
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return clientes;
    return clientes.filter((c: Cliente) =>
      c.nombre.toLowerCase().includes(term) ||
      (c.dni && c.dni.toString().includes(term)) ||
      (c.telefono ?? "").toLowerCase().includes(term) ||
      (c.email ?? "").toLowerCase().includes(term)
    );
  }, [q, clientes]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [totalPages, page]);

  const start = (page - 1) * ITEMS_PER_PAGE;
  const pageItems = filtered.slice(start, start + ITEMS_PER_PAGE);

  // Abrir modal y bloquear scroll; focus en close button
  useEffect(() => {
    if (showModal || showEditModal || showHistoryModal) {
      document.body.style.overflow = "hidden";
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          if (showHistoryModal) setShowHistoryModal(false);
          else if (showEditModal) setShowEditModal(false);
          else closeModal();
        }
      };
      window.addEventListener("keydown", onKey);
      return () => {
        window.removeEventListener("keydown", onKey);
        document.body.style.overflow = "";
      };
    }
  }, [showModal, showEditModal, showHistoryModal]);

  const openModal = (c: Cliente) => {
    setSelected(c);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelected(null);
  };

  const handleEditClick = () => {
    if (!selected) return;
    setEditData({ ...selected });
    setShowEditModal(true);
  }

  const handleUpdateClient = async () => {
    if (!editData.cliente_id || !editData.nombre || !editData.dni) {
      Swal.fire("Atención", "Nombre y DNI son obligatorios", "warning");
      return;
    }

    if (!editData.dni.toString().match(/^\d+$/)) {
      Swal.fire("Atención", "El DNI debe contener solo números", "warning");
      return;
    }

    try {
      await LOAApi.put(`/api/clients/${editData.cliente_id}`, editData);
      Swal.fire("Éxito", "Cliente actualizado correctamente", "success");

      // Actualizar estado local y cache
      setSelected(prev => ({ ...prev!, ...editData }));
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setShowEditModal(false);
    } catch (error) {
      console.error(error);
      Swal.fire("Error", "Error al actualizar cliente", "error");
    }
  }

  // CSV export
  const exportCSV = () => {
    const headers = ["ID", "Nombre", "DNI", "Teléfono", "Email", "Cuenta"];
    const rows = filtered.map((c: Cliente) => [
      c.cliente_id, c.nombre, c.dni, c.telefono ?? "", c.email ?? "", c.cuenta_corriente ?? 0
    ]);
    const csv = [headers, ...rows].map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clientes_export_page${page}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // keyboard handler for list items
  const onKeyActivate = (e: React.KeyboardEvent, c: Cliente) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openModal(c);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-semibold text-white">Consulta de Clientes</h2>
            <RefreshButton queryKey="clients" isFetching={isLoading} />
          </div>
          <p className="text-sm text-crema/80">Buscar y revisar detalles del cliente</p>
        </div>

        <div className="flex gap-2 items-center">
          <button onClick={exportCSV} className="btn-primary px-3 py-2 text-sm">Exportar CSV</button>
          <div className="text-sm text-crema/80">Resultados: <span className="font-medium text-white">{filtered.length}</span></div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-azul/10 border border-crema rounded-lg p-3 mb-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(1); }}
          placeholder="Buscar por nombre, DNI, teléfono o email..."
          className="input w-full md:w-2/3"
          aria-label="Buscar cliente"
        />

        <div className="flex gap-2 items-center">
          <div className="text-sm text-crema/80">Mostrando</div>
          <div className="text-sm font-medium text-white">{pageItems.length} / {filtered.length}</div>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary px-3 py-2 disabled:opacity-50">Anterior</button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-primary px-3 py-2 disabled:opacity-50">Siguiente</button>
          </div>
        </div>
      </div>

      {/* Mobile: cards */}
      <div className="grid gap-4 md:hidden">
        {pageItems.map((c: Cliente) => (
          <article key={c.cliente_id} role="button" tabIndex={0}
            onKeyDown={(e) => onKeyActivate(e, c)}
            onClick={() => openModal(c)}
            className="bg-white rounded-lg p-3 shadow-sm border hover:shadow-md focus:outline-none focus:ring-2 focus:ring-celeste cursor-pointer"
            aria-label={`Ver cliente ${c.nombre}`}
          >
            <div className="flex justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-semibold text-sm truncate">{c.nombre}</h3>
                <p className="text-xs text-gray-600 mt-1">DNI: {c.dni} • {c.telefono}</p>
                <p className="text-xs text-gray-500 mt-1 truncate">{c.email}</p>
              </div>

              <div className="flex flex-col items-end flex-shrink-0 whitespace-nowrap">
                <div className="text-xs text-crema/80">Cuenta</div>
                <div className="font-medium">{formatCurrency(c.cuenta_corriente)}</div>
                <button onClick={(e) => { e.stopPropagation(); openModal(c); }} className="mt-2 text-sm text-azul underline">Ver</button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden md:block overflow-x-auto bg-white rounded-lg shadow-sm border mt-2">
        <table className="min-w-full table-fixed">
          <colgroup>
            <col style={{ width: "28%" }} />
            <col style={{ width: "14%" }} />
            <col style={{ width: "20%" }} />
            <col style={{ width: "18%" }} />
            <col style={{ width: "20%" }} />
          </colgroup>

          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-3 text-left text-sm">Nombre</th>
              <th className="px-4 py-3 text-left text-sm">DNI</th>
              <th className="px-4 py-3 text-left text-sm">Dirección</th>
              <th className="px-4 py-3 text-left text-sm">Contacto</th>
              <th className="px-4 py-3 text-left text-sm">Cuenta / Acciones</th>
            </tr>
          </thead>

          <tbody>
            {pageItems.map((c: Cliente) => (
              <tr key={c.cliente_id} className="hover:bg-amber-50 focus-within:bg-amber-50">
                <td className="px-4 py-3 text-sm truncate max-w-xs">
                  <button onClick={() => openModal(c)} className="text-left w-full text-sm">
                    <div className="font-medium truncate">{c.nombre}</div>
                  </button>
                </td>

                <td className="px-4 py-3 text-sm whitespace-nowrap">{c.dni}</td>

                <td className="px-4 py-3 text-sm min-w-0">
                  <div className="truncate">
                    {c.direccion ?? "—"}
                  </div>
                </td>

                <td className="px-4 py-3 text-sm">
                  <div className="truncate">{c.telefono ?? "—"}</div>
                  <div className="truncate text-xs text-gray-500">{c.email ?? ""}</div>
                </td>

                <td className="px-4 py-3 text-sm whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="text-xs text-crema/80">Saldo</div>
                      <div className="font-medium">{formatCurrency(c.cuenta_corriente)}</div>
                    </div>

                    <div className="ml-auto flex gap-2">
                      <button onClick={() => openModal(c)} className="text-azul underline">Ver</button>
                      <button onClick={() => { setSelected(c); handleEditClick(); }} className="text-celeste">Editar</button>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination footer */}
      <div className="mt-4 flex items-center justify-between">
        <div className="text-sm text-crema/80">Página {page} de {totalPages}</div>
        <div className="flex gap-2">
          <button onClick={() => { setPage(1); }} className="btn-secondary px-3 py-2 disabled:opacity-50">Primera</button>
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary px-3 py-2 disabled:opacity-50">Anterior</button>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-primary px-3 py-2 disabled:opacity-50">Siguiente</button>
          <button onClick={() => { setPage(totalPages); }} className="btn-secondary px-3 py-2 disabled:opacity-50">Última</button>
        </div>
      </div>

      {/* Modal Detalle */}
      {showModal && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={closeModal} />
          <div role="dialog" aria-modal="true" aria-label={`Detalle cliente ${selected.nombre}`}
            className="relative bg-white rounded-lg shadow-lg w-full max-w-4xl p-6 z-50 overflow-y-auto max-h-[90vh]">
            <button aria-label="Cerrar" onClick={closeModal}
              className="absolute top-3 right-3 text-gray-500 hover:text-black hover:bg-gray-100 rounded-full w-8 h-8 flex items-center justify-center transition-colors">✕</button>

            <header className="mb-6 border-b pb-4">
              <h3 className="text-2xl font-bold text-gray-800">{selected.nombre}</h3>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 mt-1">
                <span><span className="font-semibold">DNI:</span> {selected.dni}</span>
                <span><span className="font-semibold">Tel:</span> {selected.telefono}</span>
                <span><span className="font-semibold">Email:</span> {selected.email || '-'}</span>
              </div>
              <div className="text-sm text-gray-500 mt-1"><span className="font-semibold">Dirección:</span> {selected.direccion || '-'}</div>
            </header>

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Columna Izquierda: Acciones e Información Financiera */}
              <div className="space-y-6">
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                  <h4 className="font-semibold text-gray-700 mb-2">Estado de Cuenta</h4>
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm text-gray-500">Saldo actual:</span>
                    <span className="text-2xl font-bold text-gray-800">{formatCurrency(selected.cuenta_corriente)}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    className="btn-primary w-full py-2.5 shadow-sm text-center justify-center"
                    onClick={() => navigate('/empleado/nueva-venta', { state: { client: selected } })}
                  >
                    + Nuevo Pedido
                  </button>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      className="btn-secondary w-full justify-center"
                      onClick={handleEditClick}
                    >
                      Editar Datos
                    </button>
                    <button
                      className="btn-secondary w-full justify-center"
                      onClick={() => setShowHistoryModal(true)}
                    >
                      Historial Completo
                    </button>
                  </div>
                </div>
              </div>

              {/* Columna Derecha: Historial de Prescripciones */}
              <div className="border-t lg:border-t-0 lg:border-l lg:pl-8 pt-6 lg:pt-0">
                <h4 className="font-semibold text-gray-800 mb-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span>Últimas 5 Prescripciones</span>
                    {isLoadingPrescripciones && <span className="w-3 h-3 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></span>}
                  </div>
                  <button onClick={() => setShowHistoryModal(true)} className="text-xs text-azul hover:underline">Ver Todas</button>
                </h4>

                <div className="space-y-3">
                  {!isLoadingPrescripciones && prescripciones.length === 0 && (
                    <div className="text-sm text-gray-500 italic py-4 text-center bg-gray-50 rounded">
                      Sin prescripciones registradas
                    </div>
                  )}

                  {prescripciones.slice(0, 5).map((p: any) => (
                    <div key={p.prescripcion_id} className="...">
                      <div className="flex justify-between items-start">
                        <span className="badge-fecha">{new Date(p.created_at).toLocaleDateString()}</span>
                        <span className="text-xs text-gray-500 font-bold uppercase">Dr. {p.doctor_nombre || 'S/D'}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mt-3">
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase">Lejos</p>
                          {/* ACCESO CORRECTO A LOS DATOS ANIDADOS */}
                          <p className="text-sm text-gray-700">
                            {p.lejos?.OD?.esfera || p.lejos?.OI?.esfera
                              ? formatGraduacion(p.lejos)
                              : '-'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase">Cerca</p>
                          <p className="text-sm text-gray-700">
                            {p.cerca?.OD?.esfera || p.cerca?.OI?.esfera
                              ? formatGraduacion(p.cerca)
                              : '-'}
                          </p>
                        </div>
                      </div>

                      {/* Mostrar Multifocal si existe */}
                      {p.multifocal?.tipo && (
                        <div className="mt-2 pt-2 border-t border-gray-100">
                          <p className="text-[10px] font-bold text-cyan-600 uppercase">Multifocal</p>
                          <p className="text-xs text-gray-600">{p.multifocal.tipo} - Alt: {p.multifocal.altura}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </div>
      )}

      {/* Modal Historial Completo */}
      {showHistoryModal && selected && (
        <HistorialPrescripciones
          cliente={selected}
          prescripciones={prescripciones}
          onClose={() => setShowHistoryModal(false)}
          formatGraduacion={formatGraduacion}
        />
      )}

      {/* Modal Editar */}
      {showEditModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60" onClick={() => setShowEditModal(false)} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md p-6 z-[70]">
            <h3 className="text-lg font-bold mb-4">Editar Cliente</h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-600">Nombre</label>
                <input className="input w-full" value={editData.nombre || ''} onChange={e => setEditData({ ...editData, nombre: e.target.value ?? '' })} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">DNI</label>
                <input className="input w-full" value={editData.dni || ''} onChange={e => setEditData({ ...editData, dni: e.target.value })} type="number" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">Teléfono</label>
                <input className="input w-full" value={editData.telefono || ''} onChange={e => setEditData({ ...editData, telefono: e.target.value ?? '' })} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">Dirección</label>
                <input className="input w-full" value={editData.direccion || ''} onChange={e => setEditData({ ...editData, direccion: e.target.value ?? '' })} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">Email</label>
                <input className="input w-full" value={editData.email || ''} onChange={e => setEditData({ ...editData, email: e.target.value ?? '' })} />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button className="btn-secondary" onClick={() => setShowEditModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleUpdateClient}>Guardar Cambios</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
