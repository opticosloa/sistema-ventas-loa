import React, { useState, useEffect, useRef } from 'react';
import { Search, UserPlus, X, Stethoscope } from 'lucide-react';
import type { FormValues } from '../../types/ventasFormTypes';
import LOAApi from '../../api/LOAApi';
import type { Doctor } from '../../types/Doctor';
import { DoctorCreateModal } from './modals/DoctorCreateModal';

interface DoctorFormProps {
    formState: FormValues;
    onInputChange?: (e: any) => void;
    setFieldValue: (name: keyof FormValues, value: any) => void;
    // We modify handleSearchDoctor to be optional or unused internally if we use autocomplete
    // But keeping it for backward compatibility if parent passes it, though we might not use it directly in the new UI flow
    handleSearchDoctor?: () => void;
    loading?: boolean;
}

export const DoctorForm: React.FC<DoctorFormProps> = ({
    formState,
    setFieldValue,
}) => {
    // Autocomplete State
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState<Doctor[]>([]);
    const [showResults, setShowResults] = useState(false);
    const [isSearching, setIsSearching] = useState(false);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Refs
    const searchTimeout = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Initial value sync (if editing or loaded from stored sale)
    useEffect(() => {
        if (formState.doctorNombre && !searchTerm) {
            // Only set if we don't have a search term active to avoid overwriting user typing
            // However, strictly syncing might be annoying if they want to change it.
            // We'll trust the parent's doctorNombre as the "selected" display
        }
    }, [formState.doctorNombre]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setShowResults(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSearch = (term: string) => {
        setSearchTerm(term);

        if (searchTimeout.current) clearTimeout(searchTimeout.current);

        if (term.length < 2) {
            setResults([]);
            setShowResults(false);
            return;
        }

        setIsSearching(true);
        setShowResults(true);

        searchTimeout.current = setTimeout(async () => {
            try {
                // Search by name (autocomplete)
                const { data } = await LOAApi.get(`/api/doctors/search?q=${term}`);
                setResults(data.result || []);
            } catch (err) {
                console.error("Error searching doctors", err);
                setResults([]);
            } finally {
                setIsSearching(false);
            }
        }, 300); // 300ms debounce
    };

    const selectDoctor = (doc: Doctor) => {
        // Update Parent Form
        setFieldValue('doctorNombre', doc.especialidad ? `${doc.nombre} - ${doc.especialidad}` : doc.nombre);
        setFieldValue('doctorMatricula', doc.matricula || '');
        // We might also want to store doctor_id if form supports it, but currently it seems to rely on matricula string mostly?
        // Checking formState interface... usually has doctorMatricula.

        setSearchTerm(''); // Clear search or set to selected? Usually clear search input to show "Selected" state or fill it with name.
        // Let's clear search input and rely on the display of "Médico Seleccionado" below or inside.
        // But the requirements say "Modify the search input to work as Autocomplete".
        setSearchTerm(doc.nombre);
        setShowResults(false);
    };

    const clearSelection = () => {
        setFieldValue('doctorNombre', '');
        setFieldValue('doctorMatricula', '');
        setSearchTerm('');
    };

    const handleCreateSuccess = (newDoc: Doctor) => {
        selectDoctor(newDoc);
    };

    const isDoctorSelected = !!formState.doctorMatricula && !!formState.doctorNombre;

    return (
        <section className="bg-opacity-10 border border-blanco rounded-xl p-4 my-2 relative z-20" ref={containerRef}>
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-blanco font-medium flex items-center gap-2">
                    <Stethoscope size={18} className="text-cyan-400" />
                    Datos del Médico
                </h3>
                {isDoctorSelected && (
                    <button
                        type="button"
                        onClick={clearSelection}
                        className="text-xs text-red-300 hover:text-red-200 underline flex items-center gap-1"
                    >
                        <X size={12} /> Desvincular
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* Search / Autocomplete Input */}
                <div className="relative">
                    <label className="text-sm text-blanco mb-1 block">Buscar Médico (Nombre o Matrícula)</label>
                    <div className="relative">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => handleSearch(e.target.value)}
                            placeholder="Escriba para buscar..."
                            className="w-full bg-slate-50 text-slate-900 rounded-md py-2 pl-9 pr-4 border-none focus:ring-2 focus:ring-cyan-500"
                            disabled={isDoctorSelected} // Disable search if already selected? Or allow to change? 
                        // If selected, maybe show the selected name and a clear button.
                        // Better: If selected, this input shows the selected name.
                        />
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />

                        {isSearching && (
                            <div className="absolute right-3 top-2.5 w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                        )}
                    </div>

                    {/* Dropdown Results */}
                    {showResults && !isDoctorSelected && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 max-h-60 overflow-y-auto z-50">
                            {results.length > 0 ? (
                                results.map((doc) => (
                                    <button
                                        key={doc.doctor_id}
                                        type="button"
                                        onClick={() => selectDoctor(doc)}
                                        className="w-full text-left px-4 py-3 hover:bg-cyan-50 border-b border-gray-100 last:border-0 flex flex-col transition-colors"
                                    >
                                        <span className="font-bold text-slate-800">{doc.nombre}</span>
                                        <div className="text-xs text-slate-500 flex gap-2">
                                            <span>Mat: {doc.matricula}</span>
                                            {doc.especialidad && <span>• {doc.especialidad}</span>}
                                        </div>
                                    </button>
                                ))
                            ) : (
                                <div className="p-4 text-center">
                                    <p className="text-sm text-gray-500 mb-3">No se encontraron resultados.</p>
                                    <button
                                        type="button"
                                        onClick={() => { setShowResults(false); setIsModalOpen(true); }}
                                        className="text-sm text-cyan-600 font-bold hover:underline flex items-center justify-center gap-1 mx-auto"
                                    >
                                        <UserPlus size={16} /> Agregar nuevo médico
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Selected Info / Manual Input Fallback */}
                {/* 
                   We keep the readonly input or display card for the selected doctor 
                   so the user explicitly knows who is selected.
                */}
                <div className="bg-white/5 border border-white/10 rounded-lg p-3 flex flex-col justify-center">
                    <label className="text-xs text-white/50 mb-1">Médico Seleccionado</label>
                    {isDoctorSelected ? (
                        <div>
                            <div className="text-lg text-cyan-400 font-bold">{formState.doctorNombre}</div>
                            <div className="text-sm text-white/70">Mat: {formState.doctorMatricula}</div>
                        </div>
                    ) : (
                        <div className="text-sm text-white/30 italic">Ningún médico seleccionado</div>
                    )}
                </div>
            </div>

            <DoctorCreateModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={handleCreateSuccess}
                initialName={searchTerm}
            />
        </section>
    );
};

