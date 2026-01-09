import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface RefreshButtonProps {
    queryKey: string | string[];
    isFetching?: boolean;
    className?: string;
}

export const RefreshButton: React.FC<RefreshButtonProps> = ({ queryKey, isFetching = false, className = '' }) => {
    const queryClient = useQueryClient();
    const [localSpin, setLocalSpin] = useState(false);

    const handleRefresh = async () => {
        if (isFetching || localSpin) return;

        setLocalSpin(true);
        // Minimo tiempo de spin para feedback visual
        setTimeout(() => setLocalSpin(false), 1000);

        await queryClient.invalidateQueries({ queryKey: Array.isArray(queryKey) ? queryKey : [queryKey] });
    };

    const spinning = isFetching || localSpin;

    return (
        <button
            onClick={handleRefresh}
            disabled={spinning}
            title="Actualizar datos"
            className={`
        p-2 rounded-full 
        bg-white/10 hover:bg-white/20 text-white 
        border border-white/20 
        transition-all duration-200 
        disabled:opacity-50 disabled:cursor-not-allowed
        flex items-center justify-center
        w-10 h-10
        ${className}
      `}
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className={`w-5 h-5 ${spinning ? 'animate-spin' : ''}`}
            >
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
        </button>
    );
};
