import React, { useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import { useDebounce } from '../../hooks/useDebounce';
import type { Empleado } from '../../types/Empleado';
import LOAApi from '../../api/LOAApi';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SecurityPinModal } from './SecurityPinModal';
import { useAuthStore } from '../../hooks';
import { ProfileEditModal } from './ProfileEditModal';
import { MaxDiscountModal } from './MaxDiscountModal';

const ITEMS_PER_PAGE = 25;

const formatDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleString() : "-";

const formatCurrency = (n?: number) =>
  n === undefined ? "-" : new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(n);

const getAvailableRoles = (currentUserRole?: string | null) => {
  if (currentUserRole === 'SUPERADMIN') {
    return ['ADMIN', 'EMPLEADO', 'TALLER'];
  }
  if (currentUserRole === 'ADMIN') {
    return ['EMPLEADO', 'TALLER'];
  }
  return [];
};

export const ListaEmpleados: React.FC = () => {
  const queryClient = useQueryClient();
  const { role: userRole, email: userEmail, sucursal_id } = useAuthStore();

  const { data: empleados = [], isSuccess } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await LOAApi.get<{ success: boolean; result: any }>('/api/users');
      const listaEmpleados = data.result?.rows || data.result;
      return Array.isArray(listaEmpleados) ? listaEmpleados : [];
    }
  });

  const createUserMutation = useMutation({
    mutationFn: async (newEmp: Empleado) => {
      // Map 'password' from form to 'password_hash' for backend
      const payload = {
        ...newEmp,
        password_hash: newEmp.password,
        sucursal_id: sucursal_id, // Default sucursal
        is_active: true
      };
      console.log(payload);
      return await LOAApi.post('/api/users', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowForm(false);
      setNewEmpleado({
        usuario_id: 0,
        nombre: '',
        apellido: '',
        cuit: 0,
        rol: '',
        telefono: '',
        last_conect: new Date().toISOString(),
        direccion: '',
        fecha_nacimiento: '',
        cuenta_corriente: 0,
        email: '',
        password: '',
        max_descuento: 0
      });
    },
    onError: (error) => {
      console.error("Error creating user:", error);
      Swal.fire("Error", "Error al crear empleado", "error");
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: number) => {
      return await LOAApi.delete(`/api/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      closeModal();
      Swal.fire("Éxito", "Empleado eliminado correctamente", "success");
    },
    onError: (error) => {
      console.error("Error deleting user:", error);
      Swal.fire("Error", "Error al eliminar empleado", "error");
    }
  });

  useEffect(() => {
    if (isSuccess && empleados.length === 0) {
      Swal.fire("Info", "No se encontraron empleados (la tabla está vacía).", "info");
    }
  }, [isSuccess, empleados]);

  const [query, setQuery] = useState("");
  const q = useDebounce(query, 300);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Empleado | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showProfileEditModal, setShowProfileEditModal] = useState(false);
  const [showMaxDiscountModal, setShowMaxDiscountModal] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newEmpleado, setNewEmpleado] = useState<Empleado>({
    usuario_id: 0,
    nombre: '',
    apellido: '',
    cuit: 0,
    rol: '',
    telefono: '',
    last_conect: new Date().toISOString(),
    direccion: '',
    fecha_nacimiento: '',
    cuenta_corriente: 0,
    email: '',
    password: '',
    max_descuento: 0
  });

  // Filtrado de empleados (nombre, apellido, cuit, telefono)
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return empleados.slice();
    return empleados.filter((e) =>
      e.nombre.toLowerCase().includes(term) ||
      e.apellido.toLowerCase().includes(term) ||
      e.cuit.toString().includes(term) ||
      e.telefono.toString().includes(term)
    );
  }, [q, empleados]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [totalPages, page]);

  const start = (page - 1) * ITEMS_PER_PAGE;
  const pageItems = filtered.slice(start, start + ITEMS_PER_PAGE);

  // Abrir modal y bloquear scroll; focus en close button
  useEffect(() => {
    if (showModal || showForm) {
      document.body.style.overflow = "hidden";
      const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setShowModal(false); setShowForm(false); } };
      window.addEventListener("keydown", onKey);
      return () => {
        window.removeEventListener("keydown", onKey);
        document.body.style.overflow = "";
      };
    }
  }, [showModal, showForm]);

  const openModal = (e: Empleado) => {
    setSelected(e);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelected(null);
  };

  const openForm = () => setShowForm(true);
  const closeForm = () => setShowForm(false);

  const addEmpleado = () => {
    if (
      newEmpleado.cuit &&
      newEmpleado.rol &&
      newEmpleado.telefono &&
      newEmpleado.fecha_nacimiento &&
      newEmpleado.email &&
      newEmpleado.password
    ) {
      createUserMutation.mutate(newEmpleado);
    } else {
      Swal.fire("Atención", "Por favor, completa todos los campos obligatorios.", "warning");
    }
  };

  // keyboard handler for list items
  const onKeyActivate = (e: React.KeyboardEvent, emp: Empleado) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openModal(emp);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewEmpleado(prev => ({ ...prev, [name]: name === 'cuit' || name === 'telefono' || name === 'cuenta_corriente' || name === 'max_descuento' ? (parseFloat(value) || 0) : value }));
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-white text-2xl font-semibold">Lista de Empleados</h2>
          <p className="text-sm text-crema/80">Buscar y revisar detalles de empleados</p>
        </div>

        <div className="flex gap-2 items-center">
          {(userRole === 'SUPERADMIN' || userRole === 'ADMIN') && (
            <button onClick={openForm} className="btn-primary px-3 py-2 text-sm">Agregar Nuevo</button>
          )}
          <div className="text-sm text-crema/80">Resultados: <span className="font-medium text-white">{filtered.length}</span></div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-azul/10 border border-crema rounded-lg p-3 mb-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(1); }}
          placeholder="buscar empleado: En desarrollo - NO USAR"
          className="input w-full md:w-2/3"
          aria-label="Buscar empleado"
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
        {pageItems.map(emp => (
          <article key={emp.usuario_id} role="button" tabIndex={0}
            onKeyDown={(e) => onKeyActivate(e, emp)}
            onClick={() => openModal(emp)}
            className="bg-white rounded-lg p-3 shadow-sm border hover:shadow-md focus:outline-none focus:ring-2 focus:ring-celeste cursor-pointer"
            aria-label={`Ver empleado ${emp.nombre} ${emp.apellido}`}
          >
            <div className="flex justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-semibold text-sm truncate">{emp.nombre} {emp.apellido}</h3>
                <p className="text-xs text-gray-600 mt-1">CUIT: {emp.cuit} • Rol: {emp.rol}</p>
                <p className="text-xs text-gray-500 mt-1 truncate">Tel: {emp.telefono}</p>
              </div>

              <div className="flex flex-col items-end flex-shrink-0 whitespace-nowrap">
                <div className="text-xs text-crema/80">Cuenta</div>
                <div className="font-medium">{formatCurrency(emp.cuenta_corriente)}</div>
                <button onClick={(e) => { e.stopPropagation(); openModal(emp); }} className="mt-2 text-sm text-azul underline">Ver</button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden md:block overflow-x-auto bg-white rounded-lg shadow-sm border mt-2">
        <table className="min-w-full table-fixed">
          <colgroup>
            <col style={{ width: "20%" }} />
            <col style={{ width: "15%" }} />
            <col style={{ width: "15%" }} />
            <col style={{ width: "15%" }} />
            <col style={{ width: "15%" }} />
            <col style={{ width: "20%" }} />
          </colgroup>

          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-3 text-left text-sm">Nombre y Apellido</th>
              <th className="px-4 py-3 text-left text-sm">CUIT</th>
              <th className="px-4 py-3 text-left text-sm">Rol</th>
              <th className="px-4 py-3 text-left text-sm">Teléfono</th>
              <th className="px-4 py-3 text-left text-sm">Última Conexión</th>
              <th className="px-4 py-3 text-left text-sm">Cuenta / Acciones</th>
            </tr>
          </thead>

          <tbody>
            {pageItems.map(emp => (
              <tr key={emp.usuario_id} className="hover:bg-amber-50 focus-within:bg-amber-50">
                <td className="px-4 py-3 text-sm truncate max-w-xs">
                  <button onClick={() => openModal(emp)} className="text-left w-full text-sm">
                    <div className="font-medium truncate">{emp.nombre} {emp.apellido}</div>
                    <div className="text-xs text-gray-500">{emp.direccion}</div>
                  </button>
                </td>

                <td className="px-4 py-3 text-sm whitespace-nowrap">{emp.cuit}</td>

                <td className="px-4 py-3 text-sm whitespace-nowrap">{emp.rol}</td>

                <td className="px-4 py-3 text-sm whitespace-nowrap">{emp.telefono}</td>

                <td className="px-4 py-3 text-sm min-w-0">
                  <div className="truncate">{formatDate(emp.updated_at)}</div>
                </td>

                <td className="px-4 py-3 text-sm whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="text-xs text-crema/80">Saldo</div>
                      <div className="font-medium">{formatCurrency(emp.cuenta_corriente)}</div>
                    </div>

                    <div className="ml-auto flex gap-2">
                      <button onClick={() => openModal(emp)} className="text-azul underline">Ver</button>
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

      {/* Modal detalle empleado */}
      {showModal && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={closeModal} />
          <div role="dialog" aria-modal="true" aria-label={`Detalle empleado ${selected.nombre} ${selected.apellido}`}
            className="relative bg-white rounded-lg shadow-lg w-[95%] max-w-4xl p-6 z-50">
            <button aria-label="Cerrar" onClick={closeModal}
              className="absolute top-3 right-3 text-gray-500 hover:text-black">✕</button>

            <header className="mb-4">
              <h3 className="text-xl font-semibold">{selected.nombre} {selected.apellido}</h3>
              <div className="text-sm text-gray-600">CUIT: {selected.cuit} • Rol: {selected.rol}</div>
              <div className="text-xs text-gray-500 mt-1">Dirección: {selected.direccion}</div>
              {selected.max_descuento !== undefined && (
                <div className="mt-2 inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-semibold">
                  Desc. Max: {selected.max_descuento}%
                </div>
              )}
            </header>

            <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Datos personales */}
              <div>
                <h4 className="font-medium mb-2">Datos Personales</h4>
                <div className="border rounded p-3">
                  <div className="text-sm">
                    <div><strong>Teléfono:</strong> {selected.telefono}</div>
                    <div><strong>Fecha de Nacimiento:</strong> {new Date(selected.fecha_nacimiento).toLocaleDateString()}</div>
                    <div><strong>Última Conexión:</strong> {formatDate(selected.last_conect)}</div>
                  </div>
                </div>
              </div>

              {/* Cuenta y acciones */}
              <div>
                <h4 className="font-medium mb-2">Cuenta & Acciones</h4>
                <div className="border rounded p-3 space-y-2">
                  <div className="text-sm"><strong>Cuenta Corriente:</strong> {formatCurrency(selected.cuenta_corriente)}</div>

                  <div className="flex flex-wrap gap-2 mt-3">
                    {/* Botón Editar: Solo si es el propio usuario */}
                    {selected.email === userEmail && (
                      <button
                        className="btn-primary"
                        onClick={() => setShowProfileEditModal(true)}
                      >
                        Editar perfil
                      </button>
                    )}

                    {/* Botón Config PIN: Solo si es el propio usuario y tiene rol de admin/superadmin */}
                    {(selected.rol === "ADMIN" || selected.rol === "SUPERADMIN") && selected.email === userEmail && (
                      <button
                        className="bg-gray-100 text-gray-700 hover:bg-gray-200 px-4 py-2 rounded-lg font-medium transition-colors"
                        onClick={() => setShowPinModal(true)}
                      >
                        Config. PIN
                      </button>
                    )}

                    {/* Botón Config Descuento Max: Solo para ADMIN/SUPERADMIN */}
                    {(userRole === "ADMIN" || userRole === "SUPERADMIN") && (
                      <button
                        className="bg-blue-100 text-blue-700 hover:bg-blue-200 px-4 py-2 rounded-lg font-medium transition-colors"
                        onClick={() => setShowMaxDiscountModal(true)}
                      >
                        Desc. Max
                      </button>
                    )}

                    {/* Botón Eliminar: Logic de visibilidad granular */}
                    {(() => {
                      const targetRole = selected.rol;
                      const myRole = userRole;

                      // 1. Nadie puede eliminar a un SUPERADMIN
                      if (targetRole === 'SUPERADMIN') return null;

                      // 2. Si soy SUPERADMIN, puedo eliminar a cualquiera (salvo SUPERADMIN, chequeado arriba)
                      if (myRole === 'SUPERADMIN') {
                        return (
                          <button
                            className="bg-red-100 text-red-700 hover:bg-red-200 px-4 py-2 rounded-lg font-medium transition-colors"
                            onClick={async () => {
                              const result = await Swal.fire({
                                title: '¿Estás seguro?',
                                text: `Se eliminará a ${selected.nombre} ${selected.apellido}`,
                                icon: 'warning',
                                showCancelButton: true,
                                confirmButtonColor: '#d33',
                                cancelButtonColor: '#3085d6',
                                confirmButtonText: 'Sí, eliminar',
                                cancelButtonText: 'Cancelar'
                              });
                              if (result.isConfirmed) {
                                deleteUserMutation.mutate(selected.usuario_id);
                              }
                            }}
                          >
                            Eliminar
                          </button>
                        );
                      }

                      // 3. Si soy ADMIN, puedo eliminar solo a EMPLEADO y TALLER
                      // (Es decir, NO puedo eliminar a ADMIN ni SUPERADMIN)
                      if (myRole === 'ADMIN') {
                        if (targetRole === 'EMPLEADO' || targetRole === 'TALLER') {
                          return (
                            <button
                              className="bg-red-100 text-red-700 hover:bg-red-200 px-4 py-2 rounded-lg font-medium transition-colors"
                              onClick={async () => {
                                const result = await Swal.fire({
                                  title: '¿Estás seguro?',
                                  text: `Se eliminará a ${selected.nombre} ${selected.apellido}`,
                                  icon: 'warning',
                                  showCancelButton: true,
                                  confirmButtonColor: '#d33',
                                  cancelButtonColor: '#3085d6',
                                  confirmButtonText: 'Sí, eliminar',
                                  cancelButtonText: 'Cancelar'
                                });
                                if (result.isConfirmed) {
                                  deleteUserMutation.mutate(selected.usuario_id);
                                }
                              }}
                            >
                              Eliminar
                            </button>
                          );
                        }
                      }

                      return null;
                    })()}

                    <button className="btn-secondary" onClick={() => console.log("Historial", selected.usuario_id)}>Historial</button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      )}

      {/* Profile Edit Modal */}
      {showProfileEditModal && selected && (
        <ProfileEditModal
          onClose={() => setShowProfileEditModal(false)}
          targetEmail={selected.email}
        />
      )}

      {/* Max Discount Modal */}
      {showMaxDiscountModal && selected && (
        <MaxDiscountModal
          userId={selected.usuario_id}
          initialDiscount={selected.max_descuento || 0}
          onClose={() => setShowMaxDiscountModal(false)}
          onSuccess={() => {
            setShowMaxDiscountModal(false);
            queryClient.invalidateQueries({ queryKey: ['users'] });
            closeModal(); // Option: close detail modal or just refresh list. User might want to keep detail open?
            // The instruction implies modifying the discount, so refreshing and maybe re-opening detail would be nice, 
            // strictly invalidating queries and keeping detail open might show stale data unless we refetch detail or update 'selected'.
            // For simplicity, let's just close modal for now or assuming the list refresh updates.
            // Actually, 'selected' is local state, so it won't auto-update. Let's just invalidate and maybe close detail to avoid confusion. or update selected manually.
            closeModal();
          }}
        />
      )}

      {/* Modal agregar empleado */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={closeForm} />
          <div role="dialog" aria-modal="true" aria-label="Agregar nuevo empleado"
            className="relative bg-white rounded-lg shadow-lg w-[95%] max-w-4xl p-6 z-50">
            <button aria-label="Cerrar" onClick={closeForm}
              className="absolute top-3 right-3 text-gray-500 hover:text-black">✕</button>

            <header className="mb-4">
              <h3 className="text-xl font-semibold">Agregar Nuevo Empleado</h3>
              <p className="text-sm text-gray-600">Completa los campos obligatorios <span className='text-red-600'>*</span></p>
            </header>

            <form onSubmit={(e) => { e.preventDefault(); addEmpleado(); }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex flex-col gap-1">
                <span className="text-sm text-black">Nombre <span className='text-red-600'>*</span></span>
                <input
                  type="text"
                  name="nombre"
                  placeholder="Nombre"
                  value={newEmpleado.nombre}
                  onChange={handleInputChange}
                  className="input"
                  required
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-sm text-black">Apellido <span className='text-red-600'>*</span></span>
                <input
                  type="text"
                  name="apellido"
                  placeholder="Apellido"
                  value={newEmpleado.apellido}
                  onChange={handleInputChange}
                  className="input"
                  required
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-sm text-black">CUIT <span className='text-red-600'>*</span></span>
                <input
                  type="number"
                  name="cuit"
                  placeholder="CUIT"
                  value={newEmpleado.cuit}
                  onChange={handleInputChange}
                  className="input"
                  required
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-sm text-black">Rol <span className='text-red-600'>*</span></span>
                <select
                  name="rol"
                  value={newEmpleado.rol}
                  onChange={handleInputChange}
                  className="input"
                  required
                >
                  <option value="">Seleccionar un rol</option>
                  {getAvailableRoles(userRole).map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-sm text-black">Email <span className='text-red-600'>*</span></span>
                <input
                  type="email"
                  name="email"
                  placeholder="correo@ejemplo.com"
                  value={newEmpleado.email || ''}
                  onChange={handleInputChange}
                  className="input"
                  required
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-sm text-black">Contraseña <span className='text-red-600'>*</span></span>
                <input
                  type="password"
                  name="password"
                  placeholder="******"
                  value={newEmpleado.password || ''}
                  onChange={handleInputChange}
                  className="input"
                  required
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-sm text-black">Teléfono <span className='text-red-600'>*</span></span>
                <input
                  type="tel"
                  name="telefono"
                  placeholder="Ej: 11 1234 5678"
                  value={newEmpleado.telefono}
                  onChange={handleInputChange}
                  className="input"
                  required
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-sm text-black">Dirección</span>
                <input
                  type="text"
                  name="direccion"
                  placeholder="Dirección"
                  value={newEmpleado.direccion}
                  onChange={handleInputChange}
                  className="input"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-sm text-black">Fecha de Nacimiento <span className='text-red-600'>*</span></span>
                <input
                  type="date"
                  name="fecha_nacimiento"
                  placeholder="Fecha de Nacimiento"
                  value={newEmpleado.fecha_nacimiento}
                  onChange={handleInputChange}
                  className="input"
                  required
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-sm text-black">Max. Descuento (%)</span>
                <div className="relative">
                  <input
                    type="number"
                    name="max_descuento"
                    placeholder="0"
                    min="0"
                    max="100"
                    step="0.1"
                    value={newEmpleado.max_descuento ?? 0}
                    onChange={(e) => {
                      let val = parseFloat(e.target.value);
                      if (val < 0) val = 0;
                      if (val > 100) val = 100;
                      setNewEmpleado({ ...newEmpleado, max_descuento: val });
                    }}
                    className="input w-full pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                </div>
              </label>


              <label className="flex flex-col gap-1">
                <span className="text-sm text-black">Cuenta Corriente</span>
                <input
                  type="number"
                  name="cuenta_corriente"
                  placeholder="Cuenta Corriente"
                  value={newEmpleado.cuenta_corriente}
                  onChange={handleInputChange}
                  className="input"
                />
              </label>

              <div className="flex gap-3 mt-2 md:col-span-2">
                <button type="button" onClick={closeForm} className="btn-secondary w-1/3">Cancelar</button>
                <button type="submit" className="btn-primary w-2/3">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Security Pin Modal */}
      {showPinModal && selected && (
        <SecurityPinModal
          userId={selected.usuario_id}
          userName={`${selected.nombre} ${selected.apellido}`}
          onClose={() => setShowPinModal(false)}
          onSuccess={() => {
            setShowPinModal(false);
            // Optional: show a toast or keep the details modal open
          }}
        />
      )}
    </div>
  );
};