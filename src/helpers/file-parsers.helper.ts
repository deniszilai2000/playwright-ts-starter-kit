import { Download } from '@playwright/test';
import fs from 'node:fs/promises';

export interface ParsedCsvContent {
  headers: string[];
  rows: Record<string, string>[];
  rawText: string;
}

/**
 * Utility toolkit to inspect and validate downloaded files (CSV, JSON, PDF, ZIP/XLSX)
 * so tests verify actual exported file contents rather than merely checking that a download occurred.
 */
export class FileDownloadInspector {
  /**
   * Reads a Playwright Download stream into a Buffer.
   */
  static async toBuffer(download: Download): Promise<Buffer> {
    const filePath = await download.path();
    if (!filePath) {
      throw new Error(`Failed to resolve local path for downloaded file: ${download.suggestedFilename()}`);
    }
    return fs.readFile(filePath);
  }

  /**
   * Parses a downloaded CSV file into headers and key-value row records.
   */
  static async parseCsv(download: Download, delimiter: string = ','): Promise<ParsedCsvContent> {
    const buffer = await this.toBuffer(download);
    const rawText = buffer.toString('utf-8').trim();
    const lines = rawText.split(/\r?\n/).filter((line) => line.trim().length > 0);

    if (lines.length === 0) {
      return { headers: [], rows: [], rawText };
    }

    const headers = lines[0].split(delimiter).map((h) => h.trim().replace(/^"|"$/g, ''));
    const rows = lines.slice(1).map((line) => {
      const values = line.split(delimiter).map((v) => v.trim().replace(/^"|"$/g, ''));
      const record: Record<string, string> = {};
      headers.forEach((header, index) => {
        record[header] = values[index] ?? '';
      });
      return record;
    });

    return { headers, rows, rawText };
  }

  /**
   * Verifies that a downloaded file has a valid PDF binary signature (`%PDF-`) and non-zero payload.
   */
  static async verifyPdfSignature(download: Download): Promise<{ byteLength: number; versionHeader: string }> {
    const buffer = await this.toBuffer(download);
    const header = buffer.subarray(0, 8).toString('ascii');
    if (!header.startsWith('%PDF-')) {
      throw new Error(`Invalid PDF signature "${header}" in download "${download.suggestedFilename()}"`);
    }
    return {
      byteLength: buffer.byteLength,
      versionHeader: header.trim(),
    };
  }

  /**
   * Verifies that a downloaded archive/spreadsheet (ZIP or XLSX) has the PK\x03\x04 magic bytes.
   */
  static async verifyZipOrXlsxSignature(download: Download): Promise<{ byteLength: number }> {
    const buffer = await this.toBuffer(download);
    const isPkZip =
      buffer.byteLength >= 4 &&
      buffer[0] === 0x50 &&
      buffer[1] === 0x4b &&
      buffer[2] === 0x03 &&
      buffer[3] === 0x04;

    if (!isPkZip) {
      throw new Error(`File "${download.suggestedFilename()}" does not have a valid ZIP/XLSX PK header`);
    }
    return { byteLength: buffer.byteLength };
  }
}
