export function cn(...inputs: unknown[]) {
  return inputs.filter(Boolean).join(" ");
}

export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions) {
  return new Date(date).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...options,
  });
}

export function formatRelativeDate(date: string | Date) {
  const now = new Date();
  const d = new Date(date);
  const diff = now.getTime() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Baru saja";
  if (minutes < 60) return `${minutes} menit lalu`;
  if (hours < 24) return `${hours} jam lalu`;
  if (days < 7) return `${days} hari lalu`;
  return formatDate(date);
}

export function statusColor(status: string) {
  switch (status) {
    case "online": return "text-emerald-600 bg-emerald-50";
    case "maintenance": return "text-amber-600 bg-amber-50";
    case "degraded": return "text-rose-600 bg-rose-50";
    case "active": return "text-emerald-600 bg-emerald-50";
    case "inactive": return "text-slate-500 bg-slate-100";
    default: return "text-slate-600 bg-slate-50";
  }
}

export function exportToCsv(filename: string, rows: any[][]) {
  const csvContent = rows
    .map((row) =>
      row
        .map((val) => {
          if (val === null || val === undefined) return '""';
          const str = String(val).replace(/"/g, '""');
          return `"${str}"`;
        })
        .join(",")
    )
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
