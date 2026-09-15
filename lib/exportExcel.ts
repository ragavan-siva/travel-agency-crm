"use client";

import * as XLSX from "xlsx";

type ExcelRow = Record<string, unknown>;

function autoSizeColumns(rows: ExcelRow[]) {
  if (!rows.length) return [];

  const headers = Object.keys(rows[0]);

  return headers.map((header) => {
    const maxLength = Math.max(
      header.length,
      ...rows.map((row) => String(row[header] ?? "").length)
    );

    return {
      wch: Math.min(Math.max(maxLength + 2, 12), 35),
    };
  });
}

export function downloadExcel(
  rows: ExcelRow[],
  sheetName: string,
  fileName: string
) {
  if (!rows.length) {
    throw new Error("No data available to export.");
  }

  const worksheet = XLSX.utils.json_to_sheet(rows);

  worksheet["!cols"] = autoSizeColumns(rows);

  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    sheetName.slice(0, 31)
  );

  XLSX.writeFile(workbook, fileName);
}