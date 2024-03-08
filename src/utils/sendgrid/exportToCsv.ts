import * as XLSX from 'xlsx';

interface ExportableData {
    [key : string]: string;
}


export const exportToXlsx = async (key: string, records: Array<ExportableData>) => {
    const fileType =
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';

    // const data = prepareDataForExport(records, columns);

    const ws = XLSX.utils.json_to_sheet(records);
    const sheetName = key;
    const colWidth = [];
    // eslint-disable-next-line no-plusplus
    for (let i = 0; i < records.length; i++) {
        colWidth.push({wch: 20});
    }
    ws['!cols'] = [...colWidth];

    const wb = {
        Sheets: {[sheetName]: ws},
        SheetNames: [sheetName],
    };
    const excelBuffer = XLSX.write(wb, {
        bookType: 'xlsx',//type === 'excel' ? 'xlsx' : 'csv',
        type: 'array',
    });
    const blobDataToExport = new Blob([excelBuffer], {type: fileType});

    return await blobToBase64(blobDataToExport);
};

// function blobToBase64(blob: Blob) {
//     return new Promise((resolve, _) => {
//       const reader = new FileReader();
//       reader.onloadend = () => resolve(reader.result);
//       reader.readAsDataURL(blob);
//     });
// }
async function blobToBase64(data: Blob): Promise<string> {
    try {
      const base64String = Buffer.from(await data.arrayBuffer()).toString('base64');
      return base64String;
    } catch (error) {
      throw new Error(`Error converting blob to base64: ${error}`);
    }
  }
  