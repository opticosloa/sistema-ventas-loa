import React, { useState, useMemo, useEffect } from 'react';
import { createBatchCristales } from '../services';
import { getMaterials, getTreatments, type CrystalMaterial, type CrystalTreatment } from '../services/crystals.api';
import Swal from 'sweetalert2';

// Cambiamos los tipos a string para permitir estados intermedios como "-" o ""
interface BatchForm {
    material: string;
    tratamiento: string;
    precio_usd: string;      // string para el input
    precio_costo: string;   // string para el input
    porcentaje_ganancia: string; // NEW
    esfera_min: string;     // string para el input
    esfera_max: string;     // string para el input
    cilindro_min: string;   // string para el input
    cilindro_max: string;   // string para el input
    stock_inicial: string;  // string para el input
    stock_minimo: string;   // string para el input
    ubicacion: string;
}

const initialForm: BatchForm = {
    material: '',
    tratamiento: '',
    precio_usd: '0',
    precio_costo: '0',
    porcentaje_ganancia: '0',
    esfera_min: '0.00',
    esfera_max: '0.00',
    cilindro_min: '0.00',
    cilindro_max: '0.00',
    stock_inicial: '0',
    stock_minimo: '2',
    ubicacion: ''
};

export const FormularioCristal: React.FC = () => {
    const [form, setForm] = useState<BatchForm>(initialForm);
    const [loading, setLoading] = useState(false);
    const [materials, setMaterials] = useState<CrystalMaterial[]>([]);
    const [treatments, setTreatments] = useState<CrystalTreatment[]>([]);
    const [isManualPrice, setIsManualPrice] = useState(false);

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const [mats, treats] = await Promise.all([getMaterials(), getTreatments()]);
                setMaterials(mats);
                setTreatments(treats);
            } catch (error) {
                console.error("Error loading crystal settings", error);
            }
        };
        loadSettings();
    }, []);

    // Calculator Logic
    useEffect(() => {
        if (isManualPrice) return;

        const costo = parseFloat(form.precio_costo);
        const margen = parseFloat(form.porcentaje_ganancia);

        if (!isNaN(costo) && !isNaN(margen)) {
            const venta = costo * (1 + margen / 100);
            setForm(prev => ({
                ...prev,
                precio_usd: venta.toFixed(2)
            }));
        }
    }, [form.precio_costo, form.porcentaje_ganancia, isManualPrice]);

    // Reverse Calculator Logic (Price -> Margin)
    useEffect(() => {
        if (!isManualPrice) return;

        const costo = parseFloat(form.precio_costo);
        const venta = parseFloat(form.precio_usd);

        if (!isNaN(costo) && costo > 0 && !isNaN(venta) && venta > 0) {
            const margen = ((venta / costo) - 1) * 100;
            setForm(prev => ({
                ...prev,
                porcentaje_ganancia: margen.toFixed(2)
            }));
        }
    }, [form.precio_usd, isManualPrice, form.precio_costo]);


    // Simplificamos el cambio: guardamos el valor tal cual viene del input
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        if (name === 'precio_usd') {
            setIsManualPrice(true);
        }

        setForm(prev => ({
            ...prev,
            [name]: value,
        }));
    };

    // Usamos parseFloat aquí solo para el cálculo visual
    const calculatedCrystals = useMemo(() => {
        const esfMin = parseFloat(form.esfera_min) || 0;
        const esfMax = parseFloat(form.esfera_max) || 0;
        const cilMin = parseFloat(form.cilindro_min) || 0;
        const cilMax = parseFloat(form.cilindro_max) || 0;

        const esfSteps = Math.abs((esfMax - esfMin) / 0.25) + 1;
        const cilSteps = Math.abs((cilMax - cilMin) / 0.25) + 1;
        return Math.floor(esfSteps * cilSteps);
    }, [form.esfera_min, form.esfera_max, form.cilindro_min, form.cilindro_max]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Convertimos a números reales justo antes de procesar
        const esfMinVal = parseFloat(form.esfera_min) || 0;
        const esfMaxVal = parseFloat(form.esfera_max) || 0;
        const cilMinVal = parseFloat(form.cilindro_min) || 0;
        const cilMaxVal = parseFloat(form.cilindro_max) || 0;

        // Lógica de Auto-ordenamiento con valores numéricos reales
        const [esfMin, esfMax] = [esfMinVal, esfMaxVal].sort((a, b) => a - b);
        const [cilMin, cilMax] = [cilMinVal, cilMaxVal].sort((a, b) => a - b);

        // Validations
        const stockInitial = parseInt(form.stock_inicial) || 0;
        const precioUsd = parseFloat(form.precio_usd) || 0;

        if (stockInitial <= 0) {
            return Swal.fire('Error', 'El Stock Inicial debe ser mayor a 0', 'error');
        }

        if (precioUsd <= 0) {
            return Swal.fire('Error', 'El Precio de Venta (USD) debe ser mayor a 0', 'error');
        }

        const finalPayload = {
            material: form.material,
            tratamiento: form.tratamiento,
            esfera_min: esfMin,
            esfera_max: esfMax,
            cilindro_min: cilMin,
            cilindro_max: cilMax,
            precio_usd: precioUsd,
            precio_costo: parseFloat(form.precio_costo) || 0,
            stock_inicial: stockInitial,
            stock_minimo: parseInt(form.stock_minimo) || 2,
            ubicacion: form.ubicacion
        };

        setLoading(true);
        try {
            await createBatchCristales(finalPayload as any);
            Swal.fire('Cristales creados correctamente', '', 'success');
            setForm(initialForm);
            setIsManualPrice(false); // Reset manual flag on submit
        } catch (error) {
            console.error(error);
            Swal.fire('Error al generar la matriz de cristales', '', 'error');
        } finally {
            setLoading(false);
        }
    };

    const inputClass = "w-full border border-white/30 bg-crema rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all";
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
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm text-crema mb-2">Material</label>
                            <select
                                required
                                name="material"
                                value={form.material}
                                onChange={handleChange}
                                className={inputClass}
                            >
                                <option value="" className="bg-crema text-gray-600">Seleccionar...</option>
                                {materials.map(m => (
                                    <option key={m.material_id} value={m.nombre} className="bg-crema text-gray-600">
                                        {m.nombre}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm text-crema mb-2">Tratamiento / Color</label>
                            <select
                                required
                                name="tratamiento"
                                value={form.tratamiento}
                                onChange={handleChange}
                                className={inputClass}
                            >
                                <option value="" className="bg-crema text-gray-600">Seleccionar...</option>
                                {treatments.map(t => (
                                    <option key={t.tratamiento_id} value={t.nombre} className="bg-crema text-gray-600">
                                        {t.nombre}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm text-gray-400 mb-2 font-bold text-yellow-400">Precio Costo (USD)</label>
                            <input
                                type="number" step="0.01"
                                required
                                name="precio_costo"
                                value={form.precio_costo}
                                onChange={handleChange}
                                className={`${inputClass} border-yellow-500/30 text-lg`}
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-gray-200 mb-2 font-bold text-blue-400">Margen de ganancia (%)</label>
                            <input
                                type="number" step="0.01"
                                required
                                name="porcentaje_ganancia"
                                value={form.porcentaje_ganancia}
                                onChange={handleChange}
                                className={`${inputClass} border-blue-500/30 text-lg`}
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-gray-400 mb-2 font-bold text-green-400">Precio Venta (USD)</label>
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

                    <div className="w-full md:w-1/3">
                        <label className="block text-sm text-blanco mb-2 font-bold">Stock Mínimo</label>
                        <input
                            type="number"
                            name="stock_minimo"
                            value={form.stock_minimo}
                            onChange={handleChange}
                            className={inputClass}
                        />
                        <p className="text-xs text-crema mt-1">Alerta cuando baje de este número.</p>
                    </div>

                    <div className="w-full md:w-1/3">
                        <label className="block text-sm text-blanco mb-2 font-bold">Ubicación</label>
                        <input
                            type="text"
                            name="ubicacion"
                            value={form.ubicacion}
                            onChange={handleChange}
                            placeholder="Ej: Cajón A3"
                            className={inputClass}
                        />
                    </div>
                </section>

                <section className="border border-white rounded-xl p-6 shadow-xl text-center items-center justify-center flex">
                    <div className="flex-1 bg-cyan-900/20 border border-cyan-500/20 rounded-lg p-4 w-full text-center max-w-lg">
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
                        {loading ? 'Procesando...' : 'Generar Matriz de Stock'}
                    </button>
                </div>

            </form>
        </div>
    );
};
