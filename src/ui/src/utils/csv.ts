/**
 * Encode a single field for CSV according to RFC 4180
 */
export function encodeCSVField(value: string): string {
    if (value === null || value === undefined) {
        return '';
    }

    if (/"|,|\r\n|\n|\r/.test(value)) {
        value = `"${value.replace(/"/g, '""')}"`;
    }

    return value;
}
