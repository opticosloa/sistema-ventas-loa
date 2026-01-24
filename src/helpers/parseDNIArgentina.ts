export const parseDNIArgentina = (rawData: string) => {
    // El formato estándar es separar por '@'
    const parts = rawData.split('@');

    // Validación básica: Si no tiene suficientes partes, no es un DNI válido
    // Estructura esperada puede variar, pero mínimamente necesitamos hasta la fecha de nacimiento (índice 6)
    if (parts.length < 7) {
        throw new Error("Formato de DNI no válido: Faltan campos");
    }

    // Mapeo de campos basado en el estándar y la solicitud:
    // [1] -> Apellido (ej: BISELLO)
    // [2] -> Nombre (ej: JUAN IGNACIO)
    // [4] -> DNI (ej: 42296278)
    // [6] -> Fecha de Nacimiento (ej: 15/12/1999)

    const apellido = parts[1]?.trim() || "";
    const nombre = parts[2]?.trim() || "";
    const dni = parts[4]?.trim() || "";
    const sexo = parts[3]?.trim() || "";
    const fechaNacimientoRaw = parts[6]?.trim() || "";

    let fechaNacimiento = "";
    if (fechaNacimientoRaw) {
        // Convertir fecha de DD/MM/YYYY a YYYY-MM-DD (Formato input date HTML)
        const [dia, mes, anio] = fechaNacimientoRaw.split('/');
        if (dia && mes && anio) {
            fechaNacimiento = `${anio}-${mes}-${dia}`;
        } else {
            // Si falla el split, devolvemos el raw o vacío para evitar errores en el input date
            console.warn("Formato de fecha de nacimiento inesperado:", fechaNacimientoRaw);
        }
    }

    return {
        nombre,
        apellido,
        dni,
        sexo,
        fechaNacimiento
    };
};
