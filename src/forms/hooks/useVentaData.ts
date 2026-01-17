import { useState, useEffect } from 'react';
import LOAApi from '../../api/LOAApi';
import { getObrasSociales } from '../../services/obrasSociales.api';
import { getMaterials, getTreatments } from '../../services/crystals.api';

export const useVentaData = () => {
    const [dolarRate, setDolarRate] = useState(0);
    const [availableCrystals, setAvailableCrystals] = useState<any[]>([]);
    const [obrasSociales, setObrasSociales] = useState<any[]>([]);
    const [materials, setMaterials] = useState<any[]>([]);
    const [treatments, setTreatments] = useState<any[]>([]);
    const [loadingData, setLoadingData] = useState(true);

    useEffect(() => {
        const loadAllData = async () => {
            setLoadingData(true);
            try {
                // 1. Dolar Rate
                const ratePromise = LOAApi.get('/api/currency/rate')
                    .then(res => res.data.result.rate || 0)
                    .catch(err => {
                        console.error("Error fetching dolar rate:", err);
                        return 0;
                    });

                // 2. Crystals
                const crystalsPromise = LOAApi.get('/api/products/type/CRISTAL')
                    .then(res => (Array.isArray(res.data.result) ? res.data.result : []))
                    .catch(err => {
                        console.error("Error fetching crystals:", err);
                        return [];
                    });

                // 3. Obras Sociales
                const osPromise = getObrasSociales()
                    .then(data => data.filter(os => os.activo))
                    .catch(err => {
                        console.error("Error loading Obras Sociales", err);
                        return [];
                    });

                // 4. Materials & Treatments
                const matTreatPromise = Promise.all([getMaterials(), getTreatments()])
                    .then(([matData, treatData]) => ({
                        materials: matData.filter(m => m.is_active),
                        treatments: treatData.filter(t => t.is_active)
                    }))
                    .catch(err => {
                        console.error("Error loading crystal data:", err);
                        return { materials: [], treatments: [] };
                    });

                const [rate, crystals, os, matTreat] = await Promise.all([
                    ratePromise,
                    crystalsPromise,
                    osPromise,
                    matTreatPromise
                ]);

                setDolarRate(rate);
                setAvailableCrystals(crystals);
                setObrasSociales(os);
                setMaterials(matTreat.materials);
                setTreatments(matTreat.treatments);

            } catch (error) {
                console.error("Error initializing sale form data", error);
            } finally {
                setLoadingData(false);
            }
        };

        loadAllData();
    }, []);

    return {
        dolarRate,
        availableCrystals,
        obrasSociales,
        materials,
        treatments,
        loadingData
    };
};
