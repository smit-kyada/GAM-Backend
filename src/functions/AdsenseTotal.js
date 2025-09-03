
export const AdsenseTotal = (inputData) => {
  
  try {

    const headerNames = inputData?.headers?.map(header => header?.name);
    const extractValues = (cells) => cells?.reduce((obj, cell, index) => ({ ...obj, [headerNames?.[index]]: cell?.value }), {});

    return { total: extractValues(inputData?.totals?.cells) };

  } catch (error) {
    console.log("🚀 ~ file: AdsenseTotal.js:12 ~ AdsenseTotal ~ error:", error)
  }
}
