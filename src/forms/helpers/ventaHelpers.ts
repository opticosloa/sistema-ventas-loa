
/**
 * Converts empty strings, undefined, or null to null.
 */
export const valOrNull = (val: any) => (val === "" || val === undefined || val === null) ? null : val;

/**
 * Recursively sanitizes an object, converting empty strings to null.
 */
export const sanitizeValue = (val: any): any => {
    if (val === "") return null;
    if (val && typeof val === 'object' && !Array.isArray(val)) {
        const cleaned: any = {};
        Object.keys(val).forEach(key => {
            cleaned[key] = sanitizeValue(val[key]);
        });
        return cleaned;
    }
    return val;
};

/**
 * Checks if a section object has any meaningful data (non-null values).
 * Specialized logic for "Lejos", "Cerca" sections which have OD/OI sub-objects.
 */
export const sectionHasData = (s: any) => {
    if (s.tipo || s.armazon || s.dnp || s.color) return true;
    // Check if OD/OI have any non-null (meaningful) values
    if (s.OD && Object.values(s.OD).some(v => v !== null)) return true;
    if (s.OI && Object.values(s.OI).some(v => v !== null)) return true;

    return false;
};

/**
 * Clean section: send {} if empty, otherwise return sanitized object.
 */
export const cleanSection = (section: any) => {
    // First sanitize the section to ensure "" -> null
    const sanitized = sanitizeValue(section);

    if (sectionHasData(sanitized)) return sanitized;
    return {};
};
