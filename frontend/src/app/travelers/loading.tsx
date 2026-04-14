export default function TravelersLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 p-4">
      <div className="mb-4 bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-800 rounded-xl p-4 h-24 animate-pulse" />
      <div className="mb-4 bg-white dark:bg-slate-800 rounded-xl h-14 animate-pulse" />
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden">
        <div className="h-12 bg-gradient-to-r from-teal-600 to-emerald-800 animate-pulse" />
        {[1,2,3,4,5,6,7,8,9,10].map(i => <div key={i} className="h-12 border-b border-gray-100 dark:border-slate-700 animate-pulse" />)}
      </div>
    </div>
  );
}
