import Shell from "@/components/Shell";

const recentUploads = [
  { id: 1, name: "portfolio-march.csv", date: "2026-03-18", rows: 37 },
  { id: 2, name: "my-holdings.csv", date: "2026-03-10", rows: 28 },
  { id: 3, name: "initial-seed.csv", date: "2026-02-25", rows: 15 },
];

export default function UploadPage() {
  return (
    <Shell>
      <header className="rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-slate-900">Upload Data</h1>
        <p className="mt-2 text-slate-600">Add portfolio files for analysis and tracking.</p>
      </header>

      <section className="rounded-2xl bg-white p-8 shadow-sm">
        <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
          <div className="text-lg font-semibold text-slate-800">Upload your portfolio CSV</div>
          <p className="mt-2 text-sm text-slate-500">CSV format: symbol,shares,price</p>
          <button className="mt-4 rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800">
            Choose a file
          </button>
          <p className="mt-2 text-xs text-slate-500">Mock mode: file selection is not connected yet.</p>
        </div>

        <div className="mt-8">
          <h2 className="text-xl font-semibold text-slate-800">Recent Uploads</h2>
          <div className="mt-3 space-y-3">
            {recentUploads.map((upload) => (
              <div key={upload.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex justify-between text-sm text-slate-700">
                  <span className="font-medium text-slate-900">{upload.name}</span>
                  <span>{upload.date}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{upload.rows} rows imported</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </Shell>
  );
}
