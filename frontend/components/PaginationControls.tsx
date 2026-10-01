"use client";

import { Pagination } from "@/types";

export default function PaginationControls({
  page,
  setPage,
  pagination,
}: {
  page: number;
  setPage: (page: number) => void;
  pagination: Pagination;
}) {
  return (
    <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3 text-sm">
      <p className="text-slate-600">
        {pagination.total
          ? `Showing ${(page - 1) * pagination.per_page + 1}–${Math.min(
              page * pagination.per_page,
              pagination.total,
            )} of ${pagination.total}`
          : "No results"}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => setPage(page - 1)}
          className="rounded border border-slate-300 px-3 py-1.5 font-medium disabled:opacity-40"
        >
          Previous
        </button>
        <button
          type="button"
          disabled={page >= pagination.pages}
          onClick={() => setPage(page + 1)}
          className="rounded border border-slate-300 px-3 py-1.5 font-medium disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
