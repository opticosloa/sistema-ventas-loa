import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import LOAApi from '../api/LOAApi';
import { useAppSelector } from '../hooks/useAppDispatch';
import type { Sucursal } from '../types/Sucursal';

interface BranchContextType {
    currentBranch: Sucursal | null;
    branches: Sucursal[];
    isLoading: boolean;
    setCurrentBranch: (branch: Sucursal) => void;
    refreshBranches: () => Promise<Sucursal[]>;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

export const useBranch = () => {
    const context = useContext(BranchContext);
    if (!context) {
        throw new Error("useBranch must be used within a BranchProvider");
    }
    return context;
};

interface BranchProviderProps {
    children: ReactNode;
}

export const BranchProvider: React.FC<BranchProviderProps> = ({ children }) => {
    const { uid, sucursal_id } = useAppSelector((state: any) => state.auth);
    const [currentBranch, setCurrentBranchState] = useState<Sucursal | null>(null);
    const [branches, setBranches] = useState<Sucursal[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    const setCurrentBranch = (branch: Sucursal) => {
        setCurrentBranchState(branch);
    };

    const refreshBranches = async (): Promise<Sucursal[]> => {
        try {
            const { data } = await LOAApi.get<{ success: boolean; result: any }>('/api/tenants');
            if (data.success) {
                // Robust extraction: rows (PG) or result (direct array)
                const loadedBranches = data.result.rows || data.result || [];
                setBranches(loadedBranches);
                return loadedBranches;
            }
        } catch (error) {
            console.error("Error fetching branches:", error);
        }
        return [];
    };

    useEffect(() => {
        const initBranch = async () => {
            if (!uid) {
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            const loadedBranches = await refreshBranches();

            // 1. Try to find the branch assigned in Redux (DB Source of Truth)
            let targetBranch = loadedBranches.find(b => b.sucursal_id === sucursal_id);

            // 2. Fallback: If not found or null, use first available branch
            if (!targetBranch && loadedBranches.length > 0) {
                targetBranch = loadedBranches[0];
            }

            setCurrentBranchState(targetBranch || null);
            setIsLoading(false);
        };

        initBranch();
    }, [uid, sucursal_id]);

    return (
        <BranchContext.Provider value={{ currentBranch, branches, isLoading, setCurrentBranch, refreshBranches }}>
            {children}
        </BranchContext.Provider>
    );
};
