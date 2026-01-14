import React, { useState, useMemo } from 'react';
import { createBatchCristales } from '../services';

interface BatchForm {
    material: string;
    tratamiento: string;
    precio_usd: number;
    esfera_min: number;
    esfera_max: number;
    cilindro_min: number;
    cilindro_max: number;
    stock_inicial: number;
}

const initialForm: BatchForm = {
    material: '',
    tratamiento: '',
    precio_usd: 0,
    esfera_min: 0.00,
    esfera_max: 0.00,
    cilindro_min: 0.00,
    cilindro_max: 0.00,
    stock_inicial: 0
};

export const FormularioCristal: React.FC = () => {
    const [form, setForm] = useState<BatchForm>(initialForm);
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setForm(prev => ({
            ...prev,
            [name]: name === 'material' || name === 'tratamiento'
                ? value
                : parseFloat(value) || 0,
        }));
    };

    const calculatedCrystals = useMemo(() => {
        const esfSteps = Math.abs((form.esfera_max - form.esfera_min) / 0.25) + 1;
        const cilSteps = Math.abs((form.cilindro_max - form.cilindro_min) / 0.25) + 1;
        return Math.floor(esfSteps * cilSteps);
    }, [form.esfera_min, form.esfera_max, form.cilindro_min, form.cilindro_max]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validación de rangos
        if (form.esfera_min > form.esfera_max) {
            return alert('Error: Esfera Mínima no puede ser mayor que Esfera Máxima');
        }
        if (form.cilindro_max > form.cilindro_min) { // Nota: Cilíndros suelen ser negativos, pero validamos valor numérico simple
            return alert('Error: Revisa los rangos de Cilindro (Min <= Max)');
            // Corrección lógica: si cilindro es negativo (ej -2), -2 < 0.
            // Si el user pone min: -2 y max: 0, está bien.
            // Si pone min: 0 y max: -2, está mal numéricamente.
        }

        setLoading(true);
        try {
            await createBatchCristales(form);
            alert(`Matriz generada exitosamente. Se procesaron ${calculatedCrystals} cristales.`);
            setForm(initialForm);
        } catch (error) {
            console.error(error);
            alert('Error al generar la matriz de cristales');
        } finally {
            setLoading(false);
        }
    };

    const inputClass = "w-full bg-white/10 border border-white/30 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all";

    return (
        <div className="w-full max-w-5xl mx-auto p-4 sm:p-6 fade-in text-white">
            <div className="flex items-center justify-between gap-3 mb-6">
                <div>
                    <h2 className="text-2xl font-semibold">Carga y creacion de Cristales</h2>
                    <p className="text-gray-400 text-sm">Define rangos y precios en USD para generar el stock automáticamenente.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">

                {/* DEFINICIÓN DEL LOTE */}
                <section className="border border-white rounded-xl p-6 shadow-xl">
                    <h3 className="text-lg font-medium text-crema mb-4 border-b border-white/10 pb-2">1. Definición de Lote</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm text-crema mb-2">Material</label>
                            <select
                                required
                                name="material"
                                value={form.material}
                                onChange={handleChange}
                                className={inputClass}
                            >
                                <option value="" className="bg-azul">Seleccionar...</option>
                                <option value="Organico" className="bg-azul">Orgánico</option>
                                <option value="Policarbonato" className="bg-azul">Policarbonato</option>
                                <option value="Mineral" className="bg-azul">Mineral</option>
                                <option value="Alto Indice" className="bg-azul">Alto Índice</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm text-crema mb-2">Tratamiento / Color</label>
                            <input
                                required
                                name="tratamiento"
                                value={form.tratamiento}
                                onChange={handleChange}
                                placeholder="Ej: Antirreflex, Blue Cut"
                                className={inputClass}
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-gray-400 mb-2 font-bold text-green-400">Precio Unitario (USD)</label>
                            <input
                                type="number" step="0.01"
                                required
                                name="precio_usd"
                                value={form.precio_usd}
                                onChange={handleChange}
                                className={`${inputClass} border-green-500/30 text-lg`}
                            />
                        </div>
                    </div>
                </section>

                {/* DEFINICIÓN DE RANGOS */}
                <section className="border border-white rounded-xl p-6 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                        <svg className="w-32 h-32 text-cyan-500" fill="currentColor" viewBox="0 0 24 24"><path d="M3 3h18v18H3V3zm2 2v14h14V5H5zm2 2h2v2H7V7zm4 0h2v2h-2V7zm4 0h2v2h-2V7z" /></svg>
                    </div>

                    <h3 className="text-lg font-medium text-crema mb-4 border-b border-white/10 pb-2">2. Definición de Rangos (Step 0.25)</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Esfera */}
                        <div className="bg-white/5 p-4 rounded-lg">
                            <label className="block text-center text-blanco font-bold mb-3">Rango Esférico (Esf)</label>
                            <div className="flex items-center gap-2">
                                <div className="flex-1">
                                    <label className="text-xs text-crema mb-1 block">Desde (Min)</label>
                                    <input
                                        type="number" step="0.25"
                                        name="esfera_min"
                                        value={form.esfera_min}
                                        onChange={handleChange}
                                        className={inputClass}
                                    />
                                </div>
                                <span className="text-crema pt-5">➜</span>
                                <div className="flex-1">
                                    <label className="text-xs text-crema mb-1 block">Hasta (Max)</label>
                                    <input
                                        type="number" step="0.25"
                                        name="esfera_max"
                                        value={form.esfera_max}
                                        onChange={handleChange}
                                        className={inputClass}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Cilindro */}
                        <div className="bg-white/5 p-4 rounded-lg">
                            <label className="block text-center text-blanco font-bold mb-3">Rango Cilíndrico (Cil)</label>
                            <div className="flex items-center gap-2">
                                <div className="flex-1">
                                    <label className="text-xs text-crema mb-1 block">Desde (Min)</label>
                                    <input
                                        type="number" step="0.25"
                                        name="cilindro_min"
                                        value={form.cilindro_min}
                                        onChange={handleChange}
                                        className={inputClass}
                                    />
                                </div>
                                <span className="text-crema pt-5">➜</span>
                                <div className="flex-1">
                                    <label className="text-xs text-crema mb-1 block">Hasta (Max)</label>
                                    <input
                                        type="number" step="0.25"
                                        name="cilindro_max"
                                        value={form.cilindro_max}
                                        onChange={handleChange}
                                        className={inputClass}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* STOCK Y RESUMEN */}
                <section className="border border-white rounded-xl p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="w-full md:w-1/3">
                        <label className="block text-sm text-blanco mb-2 font-bold">Stock Inicial por Graduación</label>
                        <input
                            type="number"
                            name="stock_inicial"
                            value={form.stock_inicial}
                            onChange={handleChange}
                            className={inputClass}
                        />
                        <p className="text-xs text-crema mt-1">Cantidad a agregar en cada combinación.</p>
                    </div>

                    <div className="flex-1 bg-cyan-900/20 border border-cyan-500/20 rounded-lg p-4 w-full text-center">
                        <span className="block text-sm text-cyan-400 uppercase tracking-wider mb-1">Total Cristales a Generar</span>
                        <span className="text-4xl font-bold text-white">{isNaN(calculatedCrystals) ? 0 : calculatedCrystals}</span>
                        <span className="block text-xs text-gray-400 mt-1">Combinaciones Esfera x Cilindro</span>
                    </div>
                </section>

                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-cyan-900/30 active:scale-95 w-full md:w-auto text-lg"
                    >
                        {loading ? 'Procesando...' : '🚀 Generar Matriz de Stock'}
                    </button>
                </div>

            </form>
        </div>
    );
};
