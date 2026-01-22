import { formatCurrency } from '../../helpers/currency';

interface OSBreakdownItem {
    nombre_os: string;
    total: number;
}

interface Props {
    data: OSBreakdownItem[];
}

export const DesgloseCobrosOS = ({ data }: Props) => {
    if (!data || data.length === 0) return null;

    const totalOS = data.reduce((acc, item) => acc + Number(item.total), 0);

    return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md border-l-4 border-orange-500 mt-6">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-3">
                Desglose Obras Sociales
            </h3>
            <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-left">
                    <thead className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                        <tr>
                            <th className="px-4 py-2">Obra Social</th>
                            <th className="px-4 py-2 text-right">Monto</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {data.map((item, index) => (
                            <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <td className="px-4 py-2 font-medium text-gray-700 dark:text-gray-200">
                                    {item.nombre_os}
                                </td>
                                <td className="px-4 py-2 text-right font-bold text-gray-800 dark:text-white">
                                    {formatCurrency(item.total)}
                                </td>
                            </tr>
                        ))}
                        <tr className="bg-gray-50 dark:bg-gray-700/30 font-bold">
                            <td className="px-4 py-2 text-gray-800 dark:text-white">TOTAL</td>
                            <td className="px-4 py-2 text-right text-orange-600 dark:text-orange-400">
                                {formatCurrency(totalOS)}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};
