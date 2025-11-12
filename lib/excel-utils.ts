import * as XLSX from 'xlsx';

export interface ExcelColumn {
  header: string;
  key: string;
  example?: string;
}

export function downloadExcelTemplate(
  filename: string,
  columns: ExcelColumn[]
) {
  const headers = columns.map(col => col.header);
  const examples = columns.map(col => col.example || '');

  const worksheet = XLSX.utils.aoa_to_sheet([headers, examples]);

  const colWidths = columns.map(col => ({
    wch: Math.max(col.header.length, col.example?.length || 10) + 5
  }));
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');

  XLSX.writeFile(workbook, filename);
}

export function parseExcelFile<T>(
  file: File,
  columns: ExcelColumn[]
): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          header: columns.map(col => col.key),
          range: 1
        });

        resolve(jsonData as T[]);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(reader.error);
    reader.readAsBinaryString(file);
  });
}

export function exportToExcel<T extends Record<string, any>>(
  filename: string,
  data: T[],
  columns: ExcelColumn[]
) {
  const headers = columns.map(col => col.header);

  const rows = data.map(item =>
    columns.map(col => {
      const value = item[col.key];
      if (value === null || value === undefined) return '';
      if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
      if (Array.isArray(value)) return value.join(', ');
      return value;
    })
  );

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  const colWidths = columns.map(col => ({
    wch: Math.max(col.header.length, 20)
  }));
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Dados');

  XLSX.writeFile(workbook, filename);
}
