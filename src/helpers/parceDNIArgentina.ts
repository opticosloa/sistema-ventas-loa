export const parseDNIArgentina = (rawData: string) => {
    // El formato estándar es separar por '@'
    const parts = rawData.split('@');

    // Validación básica: Si no tiene suficientes partes, no es un DNI válido
    if (parts.length < 8) {
        throw new Error("Formato de DNI no válido");
    }

    // Mapeo de campos según tu ejemplo:
    // 0: Trámite (00382180390)
    // 1: Apellido (BISELLO)
    // 2: Nombre (JUAN IGNACIO)
    // 3: Sexo (M)
    // 4: DNI (42296278)
    // 5: Ejemplar (A)
    // 6: Fecha Nacimiento (15/12/1999)
    // 7: Fecha Emisión (28/06/2015)

    const apellido = parts[1].trim();
    const nombre = parts[2].trim();
    const dni = parts[4].trim();
    const sexo = parts[3].trim();
    const fechaNacimientoRaw = parts[6].trim();

    // Convertir fecha de DD/MM/YYYY a YYYY-MM-DD (Formato input date HTML)
    const [dia, mes, anio] = fechaNacimientoRaw.split('/');
    const fechaNacimiento = `${anio}-${mes}-${dia}`;

    return {
        nombre,
        apellido,
        dni,
        sexo,
        fechaNacimiento
    };
};