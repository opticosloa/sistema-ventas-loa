import React from 'react';

interface PaymentActionButtonsProps {
    loading: boolean;
    currentTotal: number;
    onPay: () => void;
    onAuthorize: () => void;
}

export const PaymentActionButtons: React.FC<PaymentActionButtonsProps> = ({
    loading,
    currentTotal,
    onPay,
    onAuthorize,
}) => {
    return (
        <div className="flex flex-col gap-3">
            <button
                onClick={onAuthorize}
                disabled={loading || currentTotal <= 0}
                className={`w-full py-3 rounded-lg font-bold text-lg transition-all ${!loading && currentTotal > 0
                    ? 'bg-orange-600 hover:bg-orange-500 text-white shadow-lg'
                    : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    }`}
            >
                Pagar al Retirar
            </button>

            <button
                onClick={onPay}
                disabled={loading || currentTotal <= 0}
                className={`w-full py-3 rounded-lg font-bold text-lg transition-all ${!loading && currentTotal > 0
                    ? 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/50'
                    : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    }`}
            >
                {loading ? 'Procesando...' : 'Generar sobre'}
            </button>
        </div>
    );
};
