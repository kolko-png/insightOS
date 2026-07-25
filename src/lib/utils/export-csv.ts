export function downloadCsv(filename: string, rows: Record<string, string | number>[]) {
  if (rows.length === 0) return;

  // Non-null: guarded by the length check above, so index 0 always
  // exists — `noUncheckedIndexedAccess` can't narrow on `.length`.
  const headers = Object.keys(rows[0]!);
  const escape = (v: string | number | undefined) => {
    // A row can legitimately be missing a key another row has (the
    // `Record<...>[]` type promises a uniform shape but doesn't
    // enforce it at runtime) — export an empty cell rather than the
    // literal string "undefined".
    if (v === undefined) return '';
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const csv = [
    headers.join(','),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(',')),
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}