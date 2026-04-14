export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-teal-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 p-4">
      <div className="mb-4 bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-800 rounded-xl p-4 shadow-xl h-32 animate-pulse" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {[1,2,3,4].map(i => <div key={i} className="bg-white dark:bg-slate-800 rounded-xl h-24 animate-pulse" />)}
      </div>
      <div className="bg-white dark:bg-slate-800 rounded-xl h-96 animate-pulse" />
    </div>
  );
}
