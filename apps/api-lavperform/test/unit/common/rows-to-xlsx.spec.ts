import * as ExcelJS from 'exceljs';
import {
  buildXlsx,
  normalizeExportFormat,
} from 'src/common/spreadsheet/rows-to-xlsx';

describe('rows to xlsx', () => {
  it('aceita csv, xls e xlsx', () => {
    expect(normalizeExportFormat('csv')).toBe('csv');
    expect(normalizeExportFormat('xls')).toBe('xlsx');
    expect(normalizeExportFormat('xlsx')).toBe('xlsx');
    expect(normalizeExportFormat(undefined)).toBe('csv');
  });

  it('gera uma planilha com cabeçalho e cliente', async () => {
    const buffer = await buildXlsx([
      ['nome', 'telefone'],
      ['Ana', '11999999999'],
    ]);
    const workbook = new ExcelJS.Workbook();
    // Os tipos do exceljs declaram Buffer como ArrayBuffer; em runtime o Buffer do Node é aceito.
    await workbook.xlsx.load(
      buffer as unknown as Parameters<ExcelJS.Workbook['xlsx']['load']>[0],
    );

    const sheet = workbook.getWorksheet('Clientes');
    expect(sheet?.getRow(1).getCell(1).value).toBe('nome');
    expect(sheet?.getRow(2).getCell(1).value).toBe('Ana');
    expect(sheet?.getRow(2).getCell(2).value).toBe('11999999999');
  });
});
