export const AdsenseConvert = (inputData) => {

    try {

        const headerNames = inputData?.headers?.map(header => header?.name);
        const extractValues = (cells) => cells?.reduce((obj, cell, index) => ({ ...obj, [headerNames?.[index]]: cell?.value }), {});

        return {
            total: inputData?.rows?.map((row, rowIndex) => ({
                id: `row-${rowIndex}`,
                ...extractValues(row?.cells),
            })),
        };
    } catch (error) {
        console.log("🚀 ~ file: AdsenseConvert.js:15 ~ AdsenseConvert ~ error:", error)
    }
}


// 2 version

// export const AdsenseConvert = (inputData) => {
//   const headerNames = inputData?.headers?.map(header => header?.name);

//   const total = inputData?.totals?.cells?.reduce((obj, cell, index) => {
//     obj[headerNames[index]] = cell?.value;

//     return obj;
//   }, {});

//   const report = inputData?.rows?.map(row => {
//     return row?.cells?.reduce((obj, cell, index) => {
//       obj[headerNames[index]] = cell?.value;

//       return obj;
//     }, {});
//   });

//   return { total, report }

// }

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
        console.log("🚀 ~ file: AdsenseConvert.js:AdManagerConvert ~ error:", error)
        return { total: [] };
    }
}





