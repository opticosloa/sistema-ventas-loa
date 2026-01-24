
export const formatDateForInput = (dateString: string | Date | null | undefined): string => {
    if (!dateString) return "";

    // Si la fecha viene sin zona horaria (ej: del toISOString().slice(0,16)), asumimos que es UTC
    // para poder restarle el offset y mostrar la hora local.
    // Ojo: si ya tiene Z, perfecto. Si no, se la agregamos para que new Date() la tome como UTC.
    const dateStr = typeof dateString === 'string' && !dateString.endsWith('Z') ? `${dateString}Z` : dateString;
    const date = new Date(dateStr);

    // Validate date
    if (isNaN(date.getTime())) return "";

    // Obtenemos el offset en minutos (ej: 180 para UTC-3)
    const offsetMinutes = new Date().getTimezoneOffset();
    // Restamos el offset para "bajar" de UTC a Local en la representación numérica
    const timeInLocalParams = date.getTime() - (offsetMinutes * 60000);

    // Al convertir de nuevo a ISO, mostrará los números correspondientes a la hora local
    return new Date(timeInLocalParams).toISOString().slice(0, 16);
};
