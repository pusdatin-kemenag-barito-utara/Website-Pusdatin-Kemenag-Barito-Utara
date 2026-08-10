import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-slate-400 text-3xl font-bold">
          404
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Halaman Tidak Ditemukan</h1>
        <p className="mt-3 text-slate-600">
          Halaman yang Anda cari tidak tersedia atau telah dipindahkan.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex items-center rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
        >
          Kembali ke Dashboard
        </Link>
      </div>
    </div>
  );
}
