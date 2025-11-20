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
    console.log('Starting to parse Excel file:', file.name, 'Size:', file.size);

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        console.log('File loaded, processing...');
        const data = e.target?.result;

        if (!data) {
          throw new Error('No data read from file');
        }

        const workbook = XLSX.read(data, { type: 'binary' });
        console.log('Workbook sheets:', workbook.SheetNames);

        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[];
        console.log('Raw data rows:', rawData.length);
        console.log('First row (headers):', rawData[0]);

        if (rawData.length < 2) {
          throw new Error('Arquivo Excel vazio ou sem dados');
        }

        const headers = rawData[0] as string[];
        console.log('Detected headers:', headers);

        const headerMap = new Map<string, string>();
        columns.forEach(col => {
          const headerIndex = headers.findIndex(h =>
            h && h.toString().toLowerCase().trim() === col.header.toLowerCase().trim()
          );
          if (headerIndex >= 0) {
            headerMap.set(headers[headerIndex], col.key);
          } else {
            console.log(`⚠️  Column not found: "${col.header}" (looking for key: ${col.key})`);
          }
        });

        console.log('Header mapping created:', Object.fromEntries(headerMap));
        console.log('Total headers found:', headers.length, 'Total mapped:', headerMap.size);

        const jsonData: any[] = [];
        for (let i = 1; i < rawData.length; i++) {
          const row = rawData[i] as any[];
          const obj: any = {};

          headers.forEach((header, index) => {
            const key = headerMap.get(header);
            if (key) {
              const value = row[index] !== undefined && row[index] !== null ? row[index] : null;
              obj[key] = value;

              if (i === 1 && (key === 'work_routine' || key === 'aerobic_frequency' || key === 'strength_frequency')) {
                console.log(`  Mapping header "${header}" -> key "${key}" = value:`, value, `(type: ${typeof value})`);
              }
            }
          });

          if (Object.keys(obj).length > 0) {
            jsonData.push(obj);
          }
        }

        console.log('Parsed data rows:', jsonData.length);
        console.log('First parsed row:', jsonData[0]);

        resolve(jsonData as T[]);
      } catch (error) {
        console.error('Error parsing Excel file:', error);
        reject(error);
      }
    };

    reader.onerror = () => {
      console.error('FileReader error:', reader.error);
      reject(reader.error);
    };

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
