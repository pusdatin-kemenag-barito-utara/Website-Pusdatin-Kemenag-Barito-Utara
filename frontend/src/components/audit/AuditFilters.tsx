
import { Select } from "@/components/ui/Select";
import { Search, RotateCcw } from "lucide-react";

interface AuditFiltersProps {
  apps?: Array<{ id: string; name: string; schemaName?: string }>;
  selectedSchema: string;
  onSchemaChange: (val: string) => void;
  action: string;
  onActionChange: (val: string) => void;
  search: string;
  onSearchChange: (val: string) => void;
  onResetFilters?: () => void;
}

const actionOptions = [
  { value: "", label: "Semua Aksi" },
  { value: "INSERT", label: "INSERT (Tambah)" },
  { value: "UPDATE", label: "UPDATE (Ubah)" },
  { value: "DELETE", label: "DELETE (Hapus)" },
  { value: "LOGIN", label: "LOGIN" },
  { value: "LOGOUT", label: "LOGOUT" },
];

export function AuditFilters({
  apps = [],
  selectedSchema,
  onSchemaChange,
  action,
  onActionChange,
  search,
  onSearchChange,
  onResetFilters,
}: AuditFiltersProps) {
  const appOptions = [
    { value: "", label: "🌐 Semua Aplikasi (Global)" },
    ...apps.map((app) => ({
      value: app.schemaName || app.id,
      label: app.name,
    })),
  ];

  const hasActiveFilter = Boolean(selectedSchema || action || search);

  return (
    <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 w-full">
      <div className="flex flex-wrap items-center gap-3 flex-1">
        {/* App Selector Dropdown */}
        <div className="w-full sm:w-64">
          <Select
            id="auditAppSelector"
            options={appOptions}
            value={selectedSchema}
            onChange={(e) => onSchemaChange(e.target.value)}
            className="font-medium text-slate-800 dark:text-slate-200"
          />
        </div>

        {/* Action Selector */}
        <div className="w-full sm:w-48">
          <Select
            id="auditActionSelector"
            options={actionOptions}
            value={action}
            onChange={(e) => onActionChange(e.target.value)}
          />
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            id="auditSearchInput"
            placeholder="Cari target atau aktivitas..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-10 w-full rounded-lg border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-950 pl-10 pr-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:border-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/20 transition-all"
          />
        </div>
      </div>

      {/* Reset Filter Button */}
      {hasActiveFilter && onResetFilters && (
        <button
          type="button"
          onClick={onResetFilters}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800/60 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors whitespace-nowrap self-start sm:self-auto"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset Filter
        </button>
      )}
    </div>
  );
}
