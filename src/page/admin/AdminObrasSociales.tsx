import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import LOAApi from '../../api/LOAApi';
import type { ObraSocial } from '../../types/ObrasSociales';

export const AdminObrasSociales: React.FC = () => {
    const [obras, setObras] = useState<ObraSocial[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingObra, setEditingObra] = useState<ObraSocial | null>(null);

    // Form State
    const [nombre, setNombre] = useState('');
    const [sitioWeb, setSitioWeb] = useState('');
    const [instrucciones, setInstrucciones] = useState('');
    const [activo, setActivo] = useState(true);

    useEffect(() => {
        fetchObras();
    }, []);

    const fetchObras = async () => {
        setLoading(true);
        try {
            const { data } = await LOAApi.get('/api/obras-sociales');
            setObras(data.result);
        } catch (error) {
            console.error("Error fetching obras sociales:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (obra?: ObraSocial) => {
        if (obra) {
            setEditingObra(obra);
            setNombre(obra.nombre);
            setSitioWeb(obra.sitio_web || '');
            setInstrucciones(obra.instrucciones || '');
            setActivo(obra.activo);
        } else {
            setEditingObra(null);
            setNombre('');
            setSitioWeb('');
            setInstrucciones('');
            setActivo(true);
        }
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setEditingObra(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!nombre.trim()) return Swal.fire("Atención", "El nombre es requerido", "warning");

        const payload: ObraSocial = {
            obra_social_id: editingObra?.obra_social_id,
            nombre,
            sitio_web: sitioWeb,
            instrucciones,
            activo
        };

        try {
            await LOAApi.post('/api/obras-sociales', payload);
            handleCloseModal();
            fetchObras();
        } catch (error) {
            console.error("Error saving obra social:", error);
            Swal.fire("Error", "Error al guardar", "error");
        }
    };

    const toggleActivo = async (obra: ObraSocial) => {
        // Quick toggle
        const payload = { ...obra, activo: !obra.activo };
        try {
            // Optimistic update
            setObras(prev => prev.map(o => o.obra_social_id === obra.obra_social_id ? payload : o));
            await LOAApi.post('/api/obras-sociales', payload);
        } catch (error) {
            console.error("Error toggling:", error);
            fetchObras(); // Revert on error
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto fade-in">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-white">Administración de Obras Sociales</h1>
                <button
                    onClick={() => handleOpenModal()}
                    className="bg-celeste hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded transition-colors"
                >
                    + Nueva Obra Social
                </button>
            </div>

            {loading && <p className="text-gray-400">Cargando...</p>}

            <div className="bg-gray-800 rounded-lg shadowoverflow-hidden overflow-x-auto">
                <table className="min-w-full leading-normal">
                    <thead>
                        <tr>
                            <th className="px-5 py-3 border-b-2 border-gray-700 bg-gray-900 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                                Nombre
                            </th>
                            <th className="px-5 py-3 border-b-2 border-gray-700 bg-gray-900 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                                Sitio Web
                            </th>
                            <th className="px-5 py-3 border-b-2 border-gray-700 bg-gray-900 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                                Estado
                            </th>
                            <th className="px-5 py-3 border-b-2 border-gray-700 bg-gray-900 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                                Acciones
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {obras.map((obra) => (
                            <tr key={obra.obra_social_id}>
                                <td className="px-5 py-5 border-b border-gray-700 bg-gray-800 text-sm">
                                    <p className="text-white whitespace-no-wrap">{obra.nombre}</p>
                                    {obra.instrucciones && <p className="text-gray-500 text-xs mt-1 truncate max-w-xs">{obra.instrucciones}</p>}
                                </td>
                                <td className="px-5 py-5 border-b border-gray-700 bg-gray-800 text-sm">
                                    {obra.sitio_web ? (
                                        <a href={obra.sitio_web} target="_blank" rel="noopener noreferrer" className="text-celeste hover:underline">
                                            Visitar
                                        </a>
                                    ) : <span className="text-gray-500">-</span>}
                                </td>
                                <td className="px-5 py-5 border-b border-gray-700 bg-gray-800 text-sm">
                                    <span
                                        onClick={() => toggleActivo(obra)}
                                        className={`cursor-pointer relative inline-block px-3 py-1 font-semibold leading-tight rounded-full transition-colors ${obra.activo ? 'bg-green-200 text-green-900' : 'bg-red-200 text-red-900'}`}
                                    >
                                        <span aria-hidden className="absolute inset-0 opacity-50 rounded-full"></span>
                                        <span className="relative">{obra.activo ? 'Activo' : 'Inactivo'}</span>
                                    </span>
                                </td>
                                <td className="px-5 py-5 border-b border-gray-700 bg-gray-800 text-sm">
                                    <button
                                        onClick={() => handleOpenModal(obra)}
                                        className="text-white hover:text-celeste font-medium"
                                    >
                                        Editar
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {obras.length === 0 && !loading && (
                            <tr>
                                <td colSpan={4} className="px-5 py-5 border-b border-gray-700 bg-gray-800 text-center text-gray-500">
                                    No hay obras sociales cargadas.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* MODAL */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={handleCloseModal}>
                            <div className="absolute inset-0 bg-gray-900 opacity-75"></div>
                        </div>

                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                        <div className="inline-block align-bottom bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full ring-1 ring-gray-700">
                            <form onSubmit={handleSubmit}>
                                <div className="bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                    <h3 className="text-lg leading-6 font-medium text-white mb-4">
                                        {editingObra ? 'Editar Obra Social' : 'Nueva Obra Social'}
                                    </h3>

                                    <div className="mb-4">
                                        <label className="block text-gray-300 text-sm font-bold mb-2">Nombre *</label>
                                        <input
                                            className="shadow appearance-none border border-gray-600 bg-gray-700 rounded w-full py-2 px-3 text-white leading-tight focus:outline-none focus:border-celeste"
                                            type="text"
                                            value={nombre}
                                            onChange={e => setNombre(e.target.value)}
                                            placeholder="Ej: PAMI, OSDE..."
                                            autoFocus
                                        />
                                    </div>

                                    <div className="mb-4">
                                        <label className="block text-gray-300 text-sm font-bold mb-2">Sitio Web (Portal Autorización)</label>
                                        <input
                                            className="shadow appearance-none border border-gray-600 bg-gray-700 rounded w-full py-2 px-3 text-white leading-tight focus:outline-none focus:border-celeste"
                                            type="text"
                                            value={sitioWeb}
                                            onChange={e => setSitioWeb(e.target.value)}
                                            placeholder="https://..."
                                        />
                                    </div>

                                    <div className="mb-4">
                                        <label className="block text-gray-300 text-sm font-bold mb-2">Instrucciones / Requisitos</label>
                                        <textarea
                                            className="shadow appearance-none border border-gray-600 bg-gray-700 rounded w-full py-2 px-3 text-white leading-tight focus:outline-none focus:border-celeste"
                                            rows={4}
                                            value={instrucciones}
                                            onChange={e => setInstrucciones(e.target.value)}
                                            placeholder="Ej: Solicitar credencial, verificar fecha de vigencia..."
                                        />
                                    </div>

                                    <div className="mb-4 flex items-center">
                                        <input
                                            id="activo"
                                            type="checkbox"
                                            checked={activo}
                                            onChange={e => setActivo(e.target.checked)}
                                            className="w-4 h-4 text-celeste bg-gray-700 border-gray-600 rounded focus:ring-celeste focus:ring-2"
                                        />
                                        <label htmlFor="activo" className="ml-2 text-sm font-medium text-gray-300">Activo</label>
                                    </div>

                                </div>
                                <div className="bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                    <button
                                        type="button"
                                        onClick={handleSubmit}
                                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-celeste text-base font-medium text-white hover:bg-cyan-600 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
                                    >
                                        Guardar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleCloseModal}
                                        className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-500 shadow-sm px-4 py-2 bg-gray-600 text-base font-medium text-white hover:bg-gray-500 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
