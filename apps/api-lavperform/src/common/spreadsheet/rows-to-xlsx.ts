import * as ExcelJS from 'exceljs';

export type CustomerExportFormat = 'csv' | 'xlsx';

export function normalizeExportFormat(value?: string): CustomerExportFormat {
  const format = value?.trim().toLowerCase();
  if (format === 'xls' || format === 'xlsx') return 'xlsx';
  return 'csv';
}

export function exportFileMeta(format: CustomerExportFormat): {
  filename: string;
  type: string;
} {
  if (format === 'xlsx') {
    return {
      filename: 'clientes.xlsx',
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }

  return {
    filename: 'clientes.csv',
    type: 'text/csv; charset=utf-8',
  };
}

export async function buildXlsx(rows: string[][]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Clientes');
  sheet.addRows(rows);
  if (rows.length > 0) {
    sheet.getRow(1).font = { bold: true };
  }

  const data = await workbook.xlsx.writeBuffer();
  return Buffer.from(data);
}
