export const AdManagerConvert = (csvRows) => {
    try {
        if (!csvRows || csvRows.length === 0) return { total: [] };
        const headerNames = csvRows[0];
        const rows = csvRows.slice(1);
        const mapRow = (row, rowIndex) => {
            const obj = { id: `row-${rowIndex}` };
            headerNames.forEach((name, idx) => {
                obj[name] = row[idx];
            });
            return obj;
        };
        return { total: rows.map(mapRow) };
    } catch (error) {
        console.log("🚀 ~ file: AdManagerConvert.js:AdManagerConvert ~ error:", error)
        return { total: [] };
    }
}

