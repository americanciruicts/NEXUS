export default function JobsLoading() {
  return (
    <div className="px-2 py-4">
      <div className="bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-800 rounded-2xl p-5 mb-5 h-40 animate-pulse" />
      <div className="bg-white dark:bg-slate-800 rounded-xl h-12 mb-4 animate-pulse" />
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg overflow-hidden">
        <div className="h-12 bg-gradient-to-r from-teal-600 to-emerald-800 animate-pulse" />
        {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="h-14 border-b border-gray-100 dark:border-slate-700 animate-pulse" />)}
      </div>
    </div>
  );
}
