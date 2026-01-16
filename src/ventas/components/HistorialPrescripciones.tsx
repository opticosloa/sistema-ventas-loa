import React from 'react';
import type { Cliente } from '../../types/Cliente';

interface HistorialPrescripcionesProps {
    cliente: Cliente;
    prescripciones: any[];
    onClose: () => void;
    formatGraduacion: (data: any) => string;
}

export const HistorialPrescripciones: React.FC<HistorialPrescripcionesProps> = ({ cliente, prescripciones, onClose, formatGraduacion }) => {
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/60" onClick={onClose} />
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl p-6 z-[70] overflow-y-auto max-h-[90vh] flex flex-col">

                <header className="flex justify-between items-center mb-6 border-b pb-4">
                    <div>
                        <h3 className="text-2xl font-bold text-gray-800">Historial Completo de Prescripciones</h3>
                        <p className="text-sm text-gray-500">Cliente: <span className="font-semibold text-gray-700">{cliente.nombre}</span></p>
                    </div>
                    <button aria-label="Cerrar" onClick={onClose}
                        className="text-gray-500 hover:text-black hover:bg-gray-100 rounded-full w-8 h-8 flex items-center justify-center transition-colors text-xl">✕</button>
                </header>

                <div className="flex-1 overflow-y-auto pr-2">
                    {prescripciones.length === 0 ? (
                        <div className="text-center py-10 text-gray-500 italic">No hay historial de prescripciones.</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {prescripciones.map((p: any) => (
                                <div key={p.prescripcion_id} className="border rounded-xl p-4 bg-gray-50 hover:bg-white hover:shadow-md transition-all border-gray-200">
                                    <div className="flex justify-between items-start mb-3 border-b pb-2 border-gray-200">
                                        <span className="font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded text-xs">
                                            {new Date(p.created_at).toLocaleDateString()}
                                        </span>
                                        <span className="text-xs text-gray-500 font-bold uppercase">Dr. {p.doctor_nombre || 'S/D'}</span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Lejos</p>
                                            <p className="text-sm text-gray-700 font-medium bg-white p-1 rounded border border-gray-100">
                                                {p.lejos?.OD?.esfera || p.lejos?.OI?.esfera
                                                    ? formatGraduacion(p.lejos)
                                                    : '-'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Cerca</p>
                                            <p className="text-sm text-gray-700 font-medium bg-white p-1 rounded border border-gray-100">
                                                {p.cerca?.OD?.esfera || p.cerca?.OI?.esfera
                                                    ? formatGraduacion(p.cerca)
                                                    : '-'}
                                            </p>
                                        </div>
                                    </div>

                                    {p.multifocal?.tipo && (
                                        <div className="mt-3 pt-2 border-t border-gray-200 flex justify-between items-center text-xs">
                                            <span className="font-bold text-cyan-700 uppercase">Multifocal</span>
                                            <span className="text-gray-600 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-100">
                                                {p.multifocal.tipo} <span className="mx-1 text-gray-300">|</span> Alt: {p.multifocal.altura}
                                            </span>
                                        </div>
                                    )}

                                    {p.observaciones && (
                                        <div className="mt-3 text-xs text-gray-500 italic border-t pt-2">
                                            Obs: {p.observaciones}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="mt-6 flex justify-end">
                    <button className="btn-primary px-6 py-2" onClick={onClose}>Cerrar Historial</button>
                </div>

            </div>
        </div>
    );
};
