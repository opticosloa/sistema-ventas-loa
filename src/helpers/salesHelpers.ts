
import type { ObraSocial } from '../types/ObraSocial';

interface CartItem {
    producto: {
        producto_id?: string;
        nombre: string;
        categoria?: string;
        precio_usd?: string | number;
        precio_venta?: string | number;
        [key: string]: any;
    };
    cantidad: number;
    subtotal?: number;
}

/**
 * Calculates the total coverage discount based on the selected Obra Social and cart items.
 * 
 * @param cart The list of items in the cart
 * @param obraSocial The selected Obra Social (with coverage percentages)
 * @param dolarRate The current USD to ARS exchange rate
 * @returns The total discount amount in ARS
 */
export const calculateOpticalCoverage = (
    cart: CartItem[],
    obraSocial: ObraSocial | null,
    dolarRate: number
): number => {
    if (!obraSocial || !obraSocial.cobertura) return 0;

    let totalDiscount = 0;

    const { porcentaje_cristales, porcentaje_armazones } = obraSocial.cobertura;

    for (const item of cart) {
        const prod = item.producto;

        // 1. Determine Price in ARS
        const usd = prod.precio_usd ? Number(prod.precio_usd) : 0;
        const ars = prod.precio_venta ? Number(prod.precio_venta) : 0;

        // Priority: USD * Rate -> ARS. If 0, use ARS price.
        const unitPriceArs = (usd > 0 && dolarRate > 0)
            ? (usd * dolarRate)
            : ars;

        const totalItemPrice = unitPriceArs * item.cantidad;

        // 2. Apply Percentage based on Category
        // Note: Check actual category strings in your DB/App
        const category = (prod.categoria || '').toUpperCase();

        let percentage = 0;

        if (category === 'CRISTAL' || category === 'CRISTALES') {
            percentage = porcentaje_cristales;
        } else if (category === 'ARMAZON' || category === 'ARMAZONES' || category === 'MARCO') {
            percentage = porcentaje_armazones;
        }

        if (percentage > 0) {
            totalDiscount += totalItemPrice * (percentage / 100);
        }
    }

    return Number(totalDiscount.toFixed(2));
};
