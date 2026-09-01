
import { Table } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { formatRelativeDate } from "@/lib/utils";
import type { AuditLog } from "@/types";

const actionVariant: Record<string, "success" | "danger" | "warning"> = {
  INSERT: "success",
  DELETE: "danger",
  UPDATE: "warning",
};

interface AuditTableProps {
  data: AuditLog[];
  loading?: boolean;
  onRowClick?: (log: AuditLog) => void;
  selectedIds?: string[];
  onToggleSelect?: (id: string) => void;
  onToggleSelectAll?: () => void;
}

export function AuditTable({
  data,
  loading,
  onRowClick,
  selectedIds = [],
  onToggleSelect,
  onToggleSelectAll,
}: AuditTableProps) {
  const isAllSelected = data.length > 0 && data.every((item) => selectedIds.includes(item.id));
  const isSomeSelected = data.some((item) => selectedIds.includes(item.id)) && !isAllSelected;

  return (
    <Table<AuditLog>
      columns={[
        {
          key: "select",
          header: onToggleSelectAll ? (
            <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
              <input
                type="checkbox"
                aria-label="Pilih Semua Log"
                checked={isAllSelected}
                ref={(input) => {
                  if (input) input.indeterminate = isSomeSelected;
                }}
                onChange={onToggleSelectAll}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:checked:bg-emerald-600 cursor-pointer transition-colors"
              />
            </div>
          ) : "",
          className: "w-10 px-3",
          render: (log) =>
            onToggleSelect ? (
              <div
                className="flex items-center"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="checkbox"
                  aria-label={`Pilih log ${log.id}`}
                  checked={selectedIds.includes(log.id)}
                  onChange={() => onToggleSelect(log.id)}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:checked:bg-emerald-600 cursor-pointer transition-colors"
                />
              </div>
            ) : null,
        },
        {
          key: "timestamp",
          header: "Waktu",
          sortable: true,
          render: (log) => (
            <span className="text-slate-600 dark:text-slate-400 text-xs font-medium">
              {formatRelativeDate(log.timestamp)}
            </span>
          ),
        },
        {
          key: "action",
          header: "Aksi",
          render: (log) => (
            <Badge variant={actionVariant[log.action]}>{log.action}</Badge>
          ),
        },
        {
          key: "target",
          header: "Target",
          sortable: true,
          render: (log) => (
            <div>
              <p className="font-medium text-slate-700 dark:text-slate-300">{log.target}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">{log.targetSchema}</p>
            </div>
          ),
        },
        {
          key: "performedBy",
          header: "Oleh",
          sortable: true,
          render: (log) => (
            <span className="text-slate-700 dark:text-slate-300 text-xs font-medium">
              {log.performedBy || "Sistem"}
            </span>
          ),
        },
        {
          key: "id",
          header: "Detail",
          render: (log) => (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRowClick?.(log);
              }}
              className="text-emerald-600 dark:text-emerald-400 text-xs font-semibold hover:underline"
            >
              Lihat detail
            </button>
          ),
        },
      ]}
      data={data}
      keyExtractor={(l) => l.id}
      onRowClick={onRowClick}
      loading={loading}
      emptyMessage="Belum ada log audit"
    />
  );
}
