export type ReportColumn<T> = { label: string; value: (row: T) => unknown };

const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char] || char));

export function printTableReport<T>(title: string, rows: T[], columns: ReportColumn<T>[]) {
  const popup = window.open('', '_blank', 'width=1200,height=850');
  if (!popup) return;
  popup.document.write(`<!doctype html><html><head><title>${escapeHtml(title)}</title><style>@page{size:landscape;margin:14mm}body{font-family:Arial,sans-serif;color:#172033}h1{color:#20288f;margin:0 0 18px}small{color:#667085}table{width:100%;border-collapse:collapse;margin-top:20px;font-size:11px}th{background:#20288f;color:#fff;text-align:left;padding:9px}td{padding:8px;border-bottom:1px solid #dfe3eb}tr:nth-child(even){background:#f7f8fb}.brand{font-weight:800;letter-spacing:1px;color:#20288f}</style></head><body><div class="brand">PAS ALERT · INSURANCE TECH</div><h1>${escapeHtml(title)}</h1><small>Generado el ${new Date().toLocaleString('es-AR')}</small><table><thead><tr>${columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${columns.map((column) => `<td>${escapeHtml(column.value(row))}</td>`).join('')}</tr>`).join('')}</tbody></table><script>window.onload=()=>{window.print();setTimeout(()=>window.close(),500)}</script></body></html>`);
  popup.document.close();
}
