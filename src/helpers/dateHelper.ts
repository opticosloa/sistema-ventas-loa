
export const formatDateForInput = (dateString: string | Date | null | undefined, includeTime: boolean = false): string => {
    if (!dateString) return "";

    let date: Date;

    // Handle DD/MM/YYYY format (common in Argentina DNI)
    if (typeof dateString === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
        const [day, month, year] = dateString.split('/').map(Number);
        // Create date in UTC to avoid timezone shifts when just formatting simple date
        date = new Date(Date.UTC(year, month - 1, day));
        // If we just want YYYY-MM-DD, we can return it directly from the parsed parts to be safe
        if (!includeTime) {
            return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
    } else {
        // Handle ISO or existing Date object
        const dateStr = typeof dateString === 'string' && !dateString.endsWith('Z') && !dateString.includes('T') ? `${dateString}T00:00:00` : dateString;
        date = new Date(dateStr);
    }

    // Validate date
    if (isNaN(date.getTime())) return "";

    // For datetime-local (YYYY-MM-DDTHH:mm) or just YYYY-MM-DD
    const pad = (n: number) => String(n).padStart(2, '0');

    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());

    if (includeTime) {
        const hours = pad(date.getHours());
        const minutes = pad(date.getMinutes());
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    return `${year}-${month}-${day}`;
};
