import React, { useState } from 'react';
import { X, UserPlus, Stethoscope, Mail, Phone, Hash, Save } from 'lucide-react';
import LOAApi from '../../../api/LOAApi';
import type { Doctor } from '../../../types/Doctor';

interface DoctorCreateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (doctor: Doctor) => void;
    initialName?: string;
}

export const DoctorCreateModal: React.FC<DoctorCreateModalProps> = ({ isOpen, onClose, onSuccess, initialName = '' }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        nombre: initialName,
        matricula: '',
        especialidad: '',
        telefono: '',
        email: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.nombre || !formData.matricula) {
            alert("Nombre y Matrícula son obligatorios");
            return;
        }

        setLoading(true);
        try {
            const { data } = await LOAApi.post('/api/doctors', formData);

            if (data.success) {
                // Determine the result structure. The controller returns result.rows[0]
                const newDoctor = data.result;
                alert("Médico creado correctamente");
                onSuccess(newDoctor);
                onClose();
            } else {
                alert("Error al crear médico");
            }
        } catch (error: any) {
            console.error(error);
            const msg = error.response?.data?.error?.message || error.message || '';
            if (msg.includes('uq_doctores_matricula') || msg.includes('duplicate')) {
                alert("Esta matrícula ya pertenece a otro médico");
            } else {
                alert("Error al crear médico: " + msg);
            }
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white/10 backdrop-blur-xl border border-white/60 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-white/20 bg-cyan-900/40">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <UserPlus size={24} className="text-cyan-400" />
                        Nuevo Médico
                    </h3>
                    <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">

                    <div className="space-y-4">
                        {/* Nombre */}
                        <div className="group">
                            <label className="block text-sm font-medium text-cyan-100 mb-1 ml-1 flex items-center gap-2">
                                <UserPlus size={14} /> Nombre Completo *
                            </label>
                            <input
                                type="text"
                                name="nombre"
                                value={formData.nombre}
                                onChange={handleChange}
                                placeholder="Ej: Dr. Juan Perez"
                                className="w-full bg-slate-50 text-slate-900 rounded-lg p-2.5 border border-slate-300 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
                                required
                            />
                        </div>

                        {/* Matricula */}
                        <div className="group">
                            <label className="block text-sm font-medium text-cyan-100 mb-1 ml-1 flex items-center gap-2">
                                <Hash size={14} /> Matrícula *
                            </label>
                            <input
                                type="text"
                                name="matricula"
                                value={formData.matricula}
                                onChange={handleChange}
                                placeholder="Ej: MP-12345"
                                className="w-full bg-slate-50 text-slate-900 rounded-lg p-2.5 border border-slate-300 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
                                required
                            />
                        </div>

                        {/* Especialidad */}
                        <div className="group">
                            <label className="block text-sm font-medium text-cyan-100 mb-1 ml-1 flex items-center gap-2">
                                <Stethoscope size={14} /> Especialidad
                            </label>
                            <input
                                type="text"
                                name="especialidad"
                                value={formData.especialidad}
                                onChange={handleChange}
                                placeholder="Ej: Oftalmólogo"
                                className="w-full bg-slate-50 text-slate-900 rounded-lg p-2.5 border border-slate-300 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Telefono */}
                            <div className="group">
                                <label className="block text-sm font-medium text-cyan-100 mb-1 ml-1 flex items-center gap-2">
                                    <Phone size={14} /> Teléfono
                                </label>
                                <input
                                    type="text"
                                    name="telefono"
                                    value={formData.telefono}
                                    onChange={handleChange}
                                    className="w-full bg-slate-50 text-slate-900 rounded-lg p-2.5 border border-slate-300 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
                                />
                            </div>
                            {/* Email */}
                            <div className="group">
                                <label className="block text-sm font-medium text-cyan-100 mb-1 ml-1 flex items-center gap-2">
                                    <Mail size={14} /> Email
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="w-full bg-slate-50 text-slate-900 rounded-lg p-2.5 border border-slate-300 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg text-white hover:bg-white/10 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className={`
                                flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-white shadow-lg transition-transform active:scale-95
                                ${loading
                                    ? 'bg-gray-500 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500'
                                }
                            `}
                        >
                            {loading ? 'Guardando...' : (
                                <>
                                    <Save size={18} />
                                    Guardar Médico
                                </>
                            )}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
};
