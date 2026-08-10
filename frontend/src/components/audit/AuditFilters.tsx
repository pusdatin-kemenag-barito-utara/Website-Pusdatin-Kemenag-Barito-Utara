"use client";

import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Search } from "lucide-react";

interface AuditFiltersProps {
  action: string;
  search: string;
  onActionChange: (val: string) => void;
  onSearchChange: (val: string) => void;
}

const actionOptions = [
  { value: "", label: "Semua Aksi" },
  { value: "INSERT", label: "INSERT" },
  { value: "UPDATE", label: "UPDATE" },
  { value: "DELETE", label: "DELETE" },
];

export function AuditFilters({
  action,
  search,
  onActionChange,
  onSearchChange,
}: AuditFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative w-full max-w-xs">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          placeholder="Cari target..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-10 w-full rounded-lg border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-950 pl-10 pr-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:border-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/20"
        />
      </div>
      <Select
        options={actionOptions}
        value={action}
        onChange={(e) => onActionChange(e.target.value)}
        className="w-36"
      />
    </div>
  );
}
