import { useState, useEffect } from 'react';
import LOAApi from '../../api/LOAApi';
import { getObrasSociales } from '../../services/obrasSociales.api';
import { getMaterials, getTreatments } from '../../services/crystals.api';

import { useBranch } from '../../context/BranchContext';

export const useVentaData = () => {
    const { currentBranch } = useBranch();
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

                // 2. Crystals (Now branch aware)
                // Use generic /api/products endpoint with tipo & sucursal_id
                const params = currentBranch?.sucursal_id
                    ? `?tipo=CRISTAL&sucursal_id=${currentBranch.sucursal_id}`
                    : `?tipo=CRISTAL`;

                const crystalsPromise = LOAApi.get(`/api/products${params}`) // Changed from /api/products/type/CRISTAL
                    .then(res => {
                        // The new endpoint returns { success: true, result: [...] } or { result: { rows: [] } } depending on backend wrapper
                        // ProductsController.getProducts returns res.json({ success: true, result: ... }) where result is rows or result.
                        // So res.data.result should be the array.
                        return Array.isArray(res.data.result) ? res.data.result : (res.data.result?.rows || []);
                    })
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

        if (currentBranch?.sucursal_id) {
            loadAllData();
        } else {
            // Maybe load generic if no branch? Or wait? 
            // Logic: If user is logged in, branch should be set. If not, maybe wait.
            loadAllData();
        }
    }, [currentBranch?.sucursal_id]);

    return {
        dolarRate,
        availableCrystals,
        obrasSociales,
        materials,
        treatments,
        loadingData
    };
};
