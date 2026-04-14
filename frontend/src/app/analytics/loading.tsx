export default function AnalyticsLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-teal-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 p-4">
      <div className="mb-4 bg-gradient-to-br from-indigo-600 via-purple-700 to-violet-800 rounded-xl p-4 h-28 animate-pulse" />
      <div className="mb-4 bg-white dark:bg-slate-800 rounded-xl h-12 animate-pulse" />
      <div className="bg-white dark:bg-slate-800 rounded-xl h-96 animate-pulse" />
    </div>
  );
}
