// Lightweight CSV helpers for client-side exports.

/**
 * Escapes a single CSV field per RFC 4180: wrap in double quotes when the value
 * contains a comma, quote, or newline, and double up any embedded quotes.
 */
const escapeCsvField = (value: unknown): string => {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

/**
 * Builds a CSV string from a list of rows and a column definition.
 */
export const toCsv = <T>(
  rows: T[],
  columns: { header: string; accessor: (row: T) => unknown }[]
): string => {
  const headerLine = columns.map((c) => escapeCsvField(c.header)).join(',');
  const dataLines = rows.map((row) =>
    columns.map((c) => escapeCsvField(c.accessor(row))).join(',')
  );
  return [headerLine, ...dataLines].join('\r\n');
};

/**
 * Triggers a browser download of the given CSV content.
 */
export const downloadCsv = (filename: string, csv: string): void => {
  // Prepend a BOM so Excel opens UTF-8 content (e.g. ₹) correctly.
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
