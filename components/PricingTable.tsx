import { useState, useMemo, useEffect } from 'react';

// Define types (duplicated from page.tsx to avoid circular deps or need for shared types file for now)
// Match the type from API
type CaseRecord = {
    id: string;
    workItems: { name: string; price: number }[];
    totalPrice: number;
    categories: string[];
    model: string;
    rawText: string;
    customerName: string;
    symptoms: string;
};

type AggregatedWork = {
    name: string;
    minPrice: number;
    maxPrice: number;
    avgPrice: number;
    count: number;
    categories: Set<string>;
};

type ExampleRecord = {
    id: string;
    model: string;
    customerName: string;
    symptoms: string;
    price: number;
    categories: string[];
    detailed_work: string;
    raw_text: string;
};

export default function PricingTable() {
    const [repairData, setRepairData] = useState<CaseRecord[]>([]);

    const [loading, setLoading] = useState(true);
    const [aggregatedStats, setAggregatedStats] = useState<AggregatedWork[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [categories, setCategories] = useState<string[]>([]);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 100;

    // Detail View State
    const [selectedWork, setSelectedWork] = useState<AggregatedWork | null>(null);

    // Format currency
    const fmt = (n: number) => new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0 }).format(n);

    // Helper to clean work text (reused for filtering examples)
    const normalizeWorkName = (text: string) => {
        let name = text.replace(/^[●・\s]+/, '').trim();
        name = name.split(/＞＞＞|>>>/)[0].trim();
        return name;
    };

    useEffect(() => {
        // Fetch data from API
        const loadData = async () => {
            try {
                // Fetch all data (large limit)
                const res = await fetch('/api/repairs?limit=10000');
                const json = await res.json();
                if (json.items) {
                    setRepairData(json.items);
                }
            } catch (e) {
                console.error("Failed to load pricing data", e);
                setLoading(false);
            }
        };
        loadData();
    }, []);

    useEffect(() => {
        if (repairData.length === 0) return;

        // Heavy computation, run in timeout to unblock main thread
        setTimeout(() => {
            const stats: Record<string, { prices: number[]; cats: Set<string> }> = {};
            const allCats = new Set<string>();

            repairData.forEach(caseRecord => {
                caseRecord.workItems.forEach(work => {
                    const name = normalizeWorkName(work.name);
                    if (name.length < 2) return; // Skip garbage

                    if (!stats[name]) {
                        stats[name] = { prices: [], cats: new Set() };
                    }
                    stats[name].prices.push(work.price);

                    if (caseRecord.categories) {
                        caseRecord.categories.forEach(c => {
                            stats[name].cats.add(c);
                            allCats.add(c);
                        });
                    }
                });
            });

            const aggregated = Object.keys(stats).map(name => {
                const { prices, cats } = stats[name];

                // Calculate stats excluding 0 for price related metrics, but keep count
                const validPrices = prices.filter(p => p > 0);

                const min = validPrices.length ? Math.min(...validPrices) : 0;
                const max = validPrices.length ? Math.max(...validPrices) : 0;
                const sum = validPrices.reduce((a, b) => a + b, 0);
                const avg = validPrices.length ? Math.round(sum / validPrices.length) : 0;

                return {
                    name,
                    minPrice: min,
                    maxPrice: max,
                    avgPrice: avg,
                    count: prices.length, // Total count including 0 price occurrences
                    categories: cats
                };
            });

            // Sort by frequency by default
            aggregated.sort((a, b) => b.count - a.count);

            setAggregatedStats(aggregated);
            setCategories(['All', ...Array.from(allCats).sort()]);
            setLoading(false);
        }, 100);
    }, [repairData]);

    // Filter examples for selected work
    const selectedExamples = useMemo(() => {
        if (!selectedWork) return [];
        const examples: ExampleRecord[] = [];

        // Find cases that contain the selected work
        repairData.forEach(c => {
            c.workItems.forEach(w => {
                if (normalizeWorkName(w.name) === selectedWork.name) {
                    examples.push({
                        id: c.id,
                        model: c.model,
                        customerName: c.customerName,
                        symptoms: c.symptoms,
                        price: w.price,
                        categories: c.categories,
                        detailed_work: w.name,
                        raw_text: c.rawText
                    });
                }
            });
        });

        return examples.sort((a, b) => b.price - a.price);
    }, [selectedWork, repairData]);

    // Filtering
    const filteredItems = useMemo(() => {
        return aggregatedStats.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = selectedCategory === 'All' || item.categories.has(selectedCategory);
            return matchesSearch && matchesCategory;
        });
    }, [aggregatedStats, searchTerm, selectedCategory]);

    // Pagination logic
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    const paginatedItems = filteredItems.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Reset page when search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedCategory]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-stone-500 space-y-4">
                <div className="w-8 h-8 border-4 border-stone-200 border-t-stone-800 rounded-full animate-spin"></div>
                <p>過去10年分のデータを集計中...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Modal */}
            {selectedWork && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedWork(null)}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-stone-200 flex justify-between items-center bg-stone-50">
                            <div>
                                <h3 className="text-xl font-bold text-stone-900">{selectedWork.name}</h3>
                                <p className="text-sm text-stone-500 mt-1">
                                    実績件数: {selectedWork.count}件 / 平均単価: {selectedWork.avgPrice > 0 ? fmt(selectedWork.avgPrice) : '-'}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedWork(null)}
                                className="text-stone-400 hover:text-stone-600 p-2 rounded-full hover:bg-stone-200 transition"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="overflow-y-auto p-6 space-y-4">
                            <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">関連する修理事例 (FileMaker Data)</p>
                            {selectedExamples.slice(0, 50).map((ex, idx) => {
                                // Extract Customer Name (Simple heuristic: look for "様" and take preceding text)
                                // Often format is:
                                // Name 様
                                // or
                                // Name
                                // 様
                                // Name
                                // 様
                                const customerName = ex.customerName || '顧客名不明';

                                return (
                                    <div key={idx} className="border border-stone-200 rounded-lg overflow-hidden hover:shadow-sm transition">
                                        {/* Card Header: Model & Customer */}
                                        <div className="bg-stone-50 px-4 py-2 border-b border-stone-100 flex justify-between items-center text-sm">
                                            <div className="font-bold text-stone-800">
                                                {ex.model !== 'Unknown' ? ex.model : 'Model Unknown'}
                                            </div>
                                            <div className="text-stone-500 text-xs">
                                                {customerName} 様
                                            </div>
                                        </div>

                                        <div className="p-4">
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="font-bold text-stone-700 text-sm">
                                                    {ex.symptoms && ex.symptoms !== '詳細記載なし' ? ex.symptoms : '症状記載なし'}
                                                </div>
                                                <div className="font-mono font-bold text-stone-900 ml-4">
                                                    {ex.price > 0 ? fmt(ex.price) : <span className="text-stone-400">-</span>}
                                                </div>
                                            </div>

                                            <div className="text-xs text-stone-600 mb-3 space-y-1">
                                                <div className="flex gap-2">
                                                    <span className="font-bold text-stone-400 min-w-[4em]">Category:</span>
                                                    <span>{ex.categories.join(', ')}</span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <span className="font-bold text-stone-400 min-w-[4em]">Detail:</span>
                                                    <span>{ex.detailed_work}</span>
                                                </div>
                                            </div>

                                            <details className="group">
                                                <summary className="cursor-pointer text-blue-600 text-xs font-medium hover:underline flex items-center gap-1">
                                                    <span>▶ 詳細データ (Raw Text)</span>
                                                </summary>
                                                <div className="mt-2 p-3 bg-stone-100 rounded text-xs font-mono whitespace-pre-wrap text-stone-600 leading-relaxed border border-stone-200 h-32 overflow-y-auto">
                                                    {ex.raw_text}
                                                </div>
                                            </details>
                                        </div>
                                    </div>
                                );
                            })}
                            {selectedExamples.length > 50 && (
                                <div className="text-center text-stone-400 text-xs py-2">
                                    他 {selectedExamples.length - 50} 件を表示できません（パフォーマンス制限）...
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
                <h3 className="text-xl font-bold text-stone-800 mb-4">修理作業・価格実績一覧</h3>
                <p className="text-sm text-stone-600 mb-6">
                    過去の実績データから集計した、作業ごとの標準的な費用感です。<br />
                    頻度の高い作業順に表示しています。特殊なケースや難易度により価格は変動します。<br />
                    <span className="font-bold text-stone-900">※ 各行をクリックすると、詳細な修理事例データ（FileMaker情報）を確認できます。</span>
                </p>

                <div className="flex flex-col md:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1">
                        <input
                            type="text"
                            placeholder="作業名で検索 (例: ナット, フレット)..."
                            className="w-full border border-stone-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-500"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {/* Category Filter */}
                    <div className="w-full md:w-48">
                        <select
                            className="w-full border border-stone-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-500"
                            value={selectedCategory}
                            onChange={e => setSelectedCategory(e.target.value)}
                        >
                            {categories.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-stone-50 text-stone-500 font-medium border-b border-stone-200">
                            <tr>
                                <th className="px-6 py-3 w-1/2">作業内容</th>
                                <th className="px-6 py-3 text-right">平均単価 (参考)</th>
                                <th className="px-6 py-3 text-right">実績価格帯</th>
                                <th className="px-6 py-3 text-right">実績件数</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                            {paginatedItems.map((item, idx) => (
                                <tr
                                    key={idx}
                                    className="hover:bg-blue-50 transition cursor-pointer group"
                                    onClick={() => setSelectedWork(item)}
                                >
                                    <td className="px-6 py-3">
                                        <div className="font-bold text-stone-800 group-hover:text-blue-700 decoration-blue-500 underline-offset-2 group-hover:underline">{item.name}</div>
                                        <div className="flex gap-1 mt-1">
                                            {Array.from(item.categories).slice(0, 3).map(c => (
                                                <span key={c} className="text-[10px] bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded">
                                                    {c}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-6 py-3 text-right font-medium text-stone-900">
                                        {item.avgPrice > 0 ? fmt(item.avgPrice) : '-'}
                                    </td>
                                    <td className="px-6 py-3 text-right text-stone-500 font-mono text-xs">
                                        {item.maxPrice > 0 ? `${fmt(item.minPrice)} 〜 ${fmt(item.maxPrice)}` : '-'}
                                    </td>
                                    <td className="px-6 py-3 text-right text-stone-500">
                                        {item.count}件
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                <div className="px-6 py-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between">
                    <div className="text-xs text-stone-500">
                        全 {filteredItems.length} 件中 {paginatedItems.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} 〜 {Math.min(currentPage * itemsPerPage, filteredItems.length)} 件を表示
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1 text-xs font-bold bg-white border border-stone-300 rounded hover:bg-stone-100 disabled:opacity-50 disabled:hover:bg-white transition"
                        >
                            前のページ
                        </button>
                        <span className="flex items-center text-xs font-medium text-stone-600 px-2">
                            {currentPage} / {totalPages || 1}
                        </span>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage >= totalPages}
                            className="px-3 py-1 text-xs font-bold bg-white border border-stone-300 rounded hover:bg-stone-100 disabled:opacity-50 disabled:hover:bg-white transition"
                        >
                            次のページ
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
