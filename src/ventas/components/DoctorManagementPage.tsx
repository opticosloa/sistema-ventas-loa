import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit2, Archive, ArchiveRestore } from 'lucide-react';
import { DoctorService } from '../../services/doctor.service';
import type { Doctor } from '../../types/Doctor';
import { useDebounce } from '../../hooks/useDebounce';
import { DoctorCreateModal } from '../../forms/components/modals/DoctorCreateModal';
import { RefreshButton } from '../../components/ui/RefreshButton';

const ITEMS_PER_PAGE = 25;

export const DoctorManagementPage: React.FC = () => {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");
    const debouncedSearch = useDebounce(searchTerm, 300);
    const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [page, setPage] = useState(1);

    // Query Doctors
    const { data: doctors = [], isLoading } = useQuery({
        queryKey: ['doctors', debouncedSearch],
        queryFn: async () => {
            if (debouncedSearch) {
                return await DoctorService.search(debouncedSearch);
            }
            return await DoctorService.getAll();
        }
    });

    // Pagination
    const totalPages = Math.max(1, Math.ceil(doctors.length / ITEMS_PER_PAGE));
    useEffect(() => { if (page > totalPages) setPage(totalPages); }, [totalPages, page]);

    const start = (page - 1) * ITEMS_PER_PAGE;
    const pageItems = doctors.slice(start, start + ITEMS_PER_PAGE);

    // Handlers
    const handleCreate = () => {
        setSelectedDoctor(null);
        setIsModalOpen(true);
    };

    const handleEdit = (doctor: Doctor) => {
        setSelectedDoctor(doctor);
        setIsModalOpen(true);
    };

    const handleToggleStatus = async (doctor: Doctor) => {
        const action = doctor.is_active ? 'Activar' : 'Desactivar';
        const result = await Swal.fire({
            title: `¿${action.charAt(0).toUpperCase() + action.slice(1)} médico?`,
            text: `¿Estás seguro de que deseas ${action} a ${doctor.nombre}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, confirmar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: doctor.is_active ? '#d33' : '#3085d6'
        });

        if (result.isConfirmed) {
            try {
                // Assuming backend supports DELETE for specific logic or we use generic update.
                // The task said "Llama al endpoint de borrado lógico (sp_doctor_desactivar)".
                // Usually this maps to DELETE /api/doctors/:id in standard REST if it's logical delete.
                await DoctorService.delete(doctor.doctor_id);

                queryClient.invalidateQueries({ queryKey: ['doctors'] });
                Swal.fire('Actualizado', `El médico ha sido ${action === 'Activar' ? 'activado' : 'desactivado'}.`, 'success');
            } catch (error) {
                console.error(error);
                Swal.fire('Error', 'No se pudo actualizar el estado del médico', 'error');
            }
        }
    };

    const handleSuccess = () => {
        queryClient.invalidateQueries({ queryKey: ['doctors'] });
        setIsModalOpen(false);
    };

    return (
        <div className="max-w-7xl mx-auto p-6 fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-white">Gestión de Médicos</h1>
                        <RefreshButton queryKey="doctors" isFetching={isLoading} />
                    </div>
                    <p className="text-slate-400 mt-1">Administra el padrón de médicos, matrículas y especialidades.</p>
                </div>
                <button
                    onClick={handleCreate}
                    className="btn-primary flex items-center gap-2 px-4 py-2"
                >
                    <Plus size={20} />
                    Nuevo Médico
                </button>
            </div>

            {/* Search */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 mb-6">
                <div className="relative">
                    <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, matrícula o especialidad..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-900 text-white border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-cyan-500 outline-none"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Nombre</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Matrícula</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Especialidad</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Contacto</th>
                                <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Estado</th>
                                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                        <div className="flex justify-center items-center gap-2">
                                            <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                                            Cargando médicos...
                                        </div>
                                    </td>
                                </tr>
                            ) : pageItems.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                        No se encontraron médicos registrados.
                                    </td>
                                </tr>
                            ) : (
                                pageItems.map((doc) => (
                                    <tr key={doc.doctor_id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{doc.nombre}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-500 font-mono bg-gray-100 px-2 py-0.5 rounded inline-block">
                                                {doc.matricula}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-500">{doc.especialidad || '-'}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{doc.telefono || '-'}</div>
                                            <div className="text-xs text-gray-500">{doc.email}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <span className={`
                                                px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full
                                                ${doc.is_active
                                                    ? 'bg-red-100 text-red-800'
                                                    : 'bg-green-100 text-green-800'
                                                }
                                            `}>
                                                {doc.is_active ? 'Inactivo' : 'Activo'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleEdit(doc)}
                                                    className="text-cyan-600 hover:text-cyan-900 p-1 hover:bg-cyan-50 rounded"
                                                    title="Editar"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleToggleStatus(doc)}
                                                    className={'p-1 rounded hover:bg-gray-100 text-red-500 hover:text-red-700'}
                                                    title={doc.is_active ? "Activar" : "Desactivar"}
                                                >
                                                    {doc.is_active ? <Archive size={18} /> : <ArchiveRestore size={18} />}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                        Mostrando {pageItems.length} de {doctors.length} resultados
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50"
                        >
                            Anterior
                        </button>
                        <span className="text-sm text-gray-600 self-center">
                            Página {page} de {totalPages}
                        </span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50"
                        >
                            Siguiente
                        </button>
                    </div>
                </div>
            </div>

            <DoctorCreateModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={handleSuccess}
                doctorToEdit={selectedDoctor}
            />
        </div>
    );
};
