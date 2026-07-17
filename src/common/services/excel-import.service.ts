import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as XLSX from 'xlsx';

export interface ImportHeaderMap {
  [dtoField: string]: string[];
}

export interface ImportEnumMap {
  [fieldName: string]: Record<string, string>;
}

export interface ImportConfig {
  headerMap: ImportHeaderMap;
  requiredFields: string[];
  defaults: Record<string, any>;
  enumMaps?: ImportEnumMap;
  uniqueCheckFields?: string[];
  transformRow?: (row: Record<string, any>, rowIndex: number) => Record<string, any>;
}

export interface ImportRowError {
  rowNumber: number;
  status: 'imported' | 'skipped' | 'duplicate' | 'invalid';
  errors: string[];
  data?: Record<string, any>;
}

export interface ImportResult {
  total: number;
  imported: number;
  skipped: number;
  duplicates: number;
  invalid: number;
  rows: ImportRowError[];
}

@Injectable()
export class ExcelImportService {
  private readonly logger = new Logger(ExcelImportService.name);

  parseExcelBuffer(buffer: Buffer): {
    headers: string[];
    rows: Record<string, any>[];
    sheetName: string;
  } {
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new BadRequestException('Excel file contains no worksheets');
    }

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, {
      defval: '',
      raw: false,
    });

    if (jsonData.length === 0) {
      throw new BadRequestException(`Worksheet "${sheetName}" contains no data rows`);
    }

    const rawHeaders = Object.keys(jsonData[0]);
    const headers = rawHeaders.map((h) => h.trim());

    const rows = jsonData.map((row) => {
      const cleaned: Record<string, any> = {};
      for (const [key, value] of Object.entries(row)) {
        cleaned[key.trim()] = value;
      }
      return cleaned;
    });

    this.logger.log(
      `Parsed Excel: sheet="${sheetName}", rows=${rows.length}, headers=[${headers.join(', ')}]`,
    );

    return { headers, rows, sheetName };
  }

  mapHeaders(rawHeaders: string[], headerMap: ImportHeaderMap): { [dtoField: string]: string } {
    const normalizedMap: Record<string, string[]> = {};
    for (const [dtoField, aliases] of Object.entries(headerMap)) {
      normalizedMap[dtoField] = aliases.map((a) => this.normalizeHeader(a));
    }

    const mapping: Record<string, string> = {};
    for (const rawHeader of rawHeaders) {
      const normalized = this.normalizeHeader(rawHeader);
      for (const [dtoField, aliases] of Object.entries(normalizedMap)) {
        if (aliases.includes(normalized) && !mapping[dtoField]) {
          mapping[dtoField] = rawHeader;
        }
      }
    }

    this.logger.log(`Header mapping: ${JSON.stringify(mapping)}`);
    return mapping;
  }

  private normalizeHeader(header: string): string {
    return header
      .toLowerCase()
      .replace(/[\s_-]+/g, '')
      .replace(/[^a-z0-9]/g, '')
      .trim();
  }

  cleanValue(value: any): string {
    if (value === null || value === undefined) return '';

    if (value instanceof Date) {
      return value.toISOString().split('T')[0];
    }

    let str = String(value).trim();

    if (/^\d+(\.\d+)?[eE][+-]?\d+$/.test(str)) {
      const num = Number(str);
      if (!isNaN(num) && num > 0 && Number.isInteger(num)) {
        str = String(Math.round(num));
      }
    }

    str = str.replace(/\s+/g, ' ').trim();

    if (str === 'null' || str === 'undefined' || str === 'N/A' || str === '#N/A' || str === 'n/a') {
      return '';
    }

    return str;
  }

  cleanRowValues(row: Record<string, any>): Record<string, any> {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(row)) {
      cleaned[key] = this.cleanValue(value);
    }
    return cleaned;
  }

  mapRowToDto(row: Record<string, any>, mapping: Record<string, string>): Record<string, any> {
    const dto: Record<string, any> = {};
    for (const [dtoField, excelColumn] of Object.entries(mapping)) {
      if (excelColumn && row[excelColumn] !== undefined) {
        dto[dtoField] = row[excelColumn];
      }
    }
    return dto;
  }

  applyDefaults(dto: Record<string, any>, defaults: Record<string, any>): Record<string, any> {
    const result = { ...dto };
    for (const [key, defaultValue] of Object.entries(defaults)) {
      if (result[key] === undefined || result[key] === null || result[key] === '') {
        result[key] = defaultValue;
      }
    }
    return result;
  }

  applyEnumMaps(
    dto: Record<string, any>,
    enumMaps: ImportEnumMap,
  ): { dto: Record<string, any>; warnings: string[] } {
    const result = { ...dto };
    const warnings: string[] = [];

    for (const [fieldName, valueMap] of Object.entries(enumMaps)) {
      const rawValue = result[fieldName];
      if (rawValue === undefined || rawValue === null || rawValue === '') continue;

      const strValue = String(rawValue).trim();
      const normalizedValueMap: Record<string, string> = {};
      for (const [key, val] of Object.entries(valueMap)) {
        normalizedValueMap[key.toLowerCase().replace(/[\s_-]/g, '')] = val;
      }

      const normalizedInput = strValue.toLowerCase().replace(/[\s_-]/g, '');
      const mapped = normalizedValueMap[normalizedInput];

      if (mapped) {
        result[fieldName] = mapped;
      } else {
        const validValues = Object.values(valueMap).join(', ');
        warnings.push(
          `Unknown ${fieldName}: "${strValue}" — using default (valid: ${validValues})`,
        );
      }
    }

    return { dto: result, warnings };
  }

  validateRow(dto: Record<string, any>, requiredFields: string[], _rowIndex: number): string[] {
    const errors: string[] = [];

    for (const field of requiredFields) {
      const value = dto[field];
      if (value === undefined || value === null || value === '') {
        errors.push(`${field} is missing`);
      }
    }

    if (dto.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(dto.email))) {
      errors.push(`Invalid email format: "${dto.email}"`);
    }

    if (dto.mobile) {
      const mobileStr = String(dto.mobile).replace(/[\s\-()+\s]/g, '');
      if (!/^\d{7,15}$/.test(mobileStr)) {
        errors.push(`Invalid mobile: "${dto.mobile}" (must be 7-15 digits)`);
      }
      dto.mobile = mobileStr;
    }

    return errors;
  }

  checkDuplicates(
    dtos: Record<string, any>[],
    uniqueCheckFields: string[],
    existingValues?: Map<string, Set<string>>,
  ): Map<number, string[]> {
    const duplicates = new Map<number, string[]>();
    const seenMaps: Record<string, Set<string>> = {};

    for (const field of uniqueCheckFields) {
      seenMaps[field] = new Set<string>();
    }

    if (existingValues) {
      for (const [field, values] of existingValues) {
        if (seenMaps[field]) {
          for (const v of values) {
            seenMaps[field].add(v.toLowerCase());
          }
        }
      }
    }

    for (let i = 0; i < dtos.length; i++) {
      const dto = dtos[i];
      const errors: string[] = [];

      for (const field of uniqueCheckFields) {
        const value = dto[field];
        if (value === undefined || value === null || value === '') continue;

        const normalized = String(value).toLowerCase().trim();
        if (seenMaps[field].has(normalized)) {
          errors.push(`Duplicate ${field}: "${value}"`);
        } else {
          seenMaps[field].add(normalized);
        }
      }

      if (errors.length > 0) {
        duplicates.set(i, errors);
      }
    }

    return duplicates;
  }

  async processImport(
    buffer: Buffer,
    config: ImportConfig,
    processRow: (dto: Record<string, any>, rowIndex: number) => Promise<Record<string, any>>,
    checkExisting?: () => Promise<Map<string, Set<string>>>,
  ): Promise<ImportResult> {
    const { headers, rows } = this.parseExcelBuffer(buffer);

    const mapping = this.mapHeaders(headers, config.headerMap);

    const mappedRequired = config.requiredFields.filter((f) => mapping[f]);
    const missingRequired = config.requiredFields.filter((f) => !mapping[f]);
    const unmappedOptional = Object.keys(config.headerMap).filter(
      (f) => !mapping[f] && !config.requiredFields.includes(f),
    );

    this.logger.log(
      `Required fields mapped: ${mappedRequired.length}/${config.requiredFields.length}`,
    );
    if (missingRequired.length > 0) {
      this.logger.warn(`Missing required field columns: ${missingRequired.join(', ')}`);
    }
    if (unmappedOptional.length > 0) {
      this.logger.log(`Unmapped optional fields: ${unmappedOptional.join(', ')}`);
    }

    const existingValues = checkExisting ? await checkExisting() : undefined;

    const preProcessedDtos: Record<string, any>[] = [];

    for (let i = 0; i < rows.length; i++) {
      const rawRow = rows[i];
      const cleanedRow = this.cleanRowValues(rawRow);
      let dto = this.mapRowToDto(cleanedRow, mapping);

      if (Object.values(dto).every((v) => v === '' || v === undefined || v === null)) {
        continue;
      }

      dto = this.applyDefaults(dto, config.defaults);

      if (config.enumMaps) {
        const { dto: mappedDto } = this.applyEnumMaps(dto, config.enumMaps);
        dto = mappedDto;
      }

      if (config.transformRow) {
        dto = config.transformRow(dto, i);
      }

      preProcessedDtos.push({ __rowIndex: i, __rawRow: rawRow, ...dto });
    }

    const duplicateResults = config.uniqueCheckFields
      ? this.checkDuplicates(
          preProcessedDtos.map((d) => {
            const { __rowIndex, __rawRow, ...rest } = d;
            return rest;
          }),
          config.uniqueCheckFields,
          existingValues,
        )
      : new Map<number, string[]>();

    const result: ImportResult = {
      total: rows.length,
      imported: 0,
      skipped: 0,
      duplicates: 0,
      invalid: 0,
      rows: [],
    };

    const importedIndices = new Set<number>();

    for (let i = 0; i < preProcessedDtos.length; i++) {
      const preDto = preProcessedDtos[i];
      const originalRowIndex = (preDto.__rowIndex as number) + 2;
      const { __rowIndex, __rawRow, ...dto } = preDto;

      if (duplicateResults.has(i)) {
        result.duplicates++;
        result.rows.push({
          rowNumber: originalRowIndex,
          status: 'duplicate',
          errors: duplicateResults.get(i)!,
          data: dto,
        });
        continue;
      }

      const validationErrors = this.validateRow(dto, config.requiredFields, originalRowIndex);
      if (validationErrors.length > 0) {
        result.invalid++;
        result.rows.push({
          rowNumber: originalRowIndex,
          status: 'invalid',
          errors: validationErrors,
          data: dto,
        });
        continue;
      }

      try {
        const processed = await processRow(dto, originalRowIndex);
        result.imported++;
        importedIndices.add(i);
        result.rows.push({
          rowNumber: originalRowIndex,
          status: 'imported',
          errors: [],
          data: processed,
        });
      } catch (error: any) {
        result.invalid++;
        result.rows.push({
          rowNumber: originalRowIndex,
          status: 'invalid',
          errors: [error.message || 'Failed to import row'],
          data: dto,
        });
      }
    }

    const totalProcessed = result.imported + result.duplicates + result.invalid;
    result.skipped = rows.length - totalProcessed;

    this.logger.log(
      `Import complete: total=${result.total}, imported=${result.imported}, skipped=${result.skipped}, duplicates=${result.duplicates}, invalid=${result.invalid}`,
    );

    return result;
  }
}
