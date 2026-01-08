import { useState, useEffect, useCallback } from 'react';

type CaseRecord = {
    id: string;
    date: string;
    customerName: string;
    model: string;
    symptoms: string;
    totalPrice: number;
    workItems: { name: string; price: number }[];
    rawText: string;
    isNewEntry: boolean;
    brand?: string;
    serialNumber: string;
    requestDetails?: string;
    proposalContent?: string;
};

type ApiResponse = {
    items: CaseRecord[];
    total: number;
    totalPages: number;
    page: number;
};

export default function DatabaseView() {
    // State
    const [cases, setCases] = useState<CaseRecord[]>([]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    // Filters & Pagination
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
    const itemsPerPage = 50;

    // Editing State
    const [editingCase, setEditingCase] = useState<CaseRecord | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // Fetch Data
    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                page: currentPage.toString(),
                limit: itemsPerPage.toString(),
                q: searchTerm,
                sort: sortOrder
            });
            const res = await fetch(`/api/repairs?${params.toString()}`);
            if (!res.ok) throw new Error('Failed to fetch');
            const data: ApiResponse = await res.json();

            setCases(data.items);
            setTotal(data.total);
            setTotalPages(data.totalPages);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, [currentPage, searchTerm, sortOrder]);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchData();
        }, 300);
        return () => clearTimeout(timer);
    }, [fetchData]);

    const fmt = (n: number) => new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(n);

    // Handlers
    const handleDelete = async (id: string, customer: string) => {
        if (!confirm(`「${customer}様」のデータを削除してもよろしいですか？\nこの操作は取り消せません。`)) return;

        setIsProcessing(true);
        try {
            const res = await fetch('/api/delete-repair', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
            if (!res.ok) throw new Error('Delete failed');
            alert('削除しました');
            fetchData(); // Refresh
        } catch (e) {
            alert('削除に失敗しました');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingCase) return;

        setIsProcessing(true);
        try {
            const body = {
                id: editingCase.id,
                date: editingCase.date,
                customer_name: editingCase.customerName,
                model: editingCase.model,
                symptoms: editingCase.symptoms,
                request_details: editingCase.requestDetails,
                proposal_content: editingCase.proposalContent,
                work_items: editingCase.workItems,
                brand: editingCase.brand,
                serial_number: editingCase.serialNumber
            };

            const res = await fetch('/api/update-repair', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (!res.ok) throw new Error('Update failed');

            alert('更新しました');
            setEditingCase(null);
            fetchData(); // Refresh

        } catch (e) {
            console.error(e);
            alert('更新に失敗しました');
        } finally {
            setIsProcessing(false);
        }
    };

    const updateEditingField = (field: keyof CaseRecord, value: any) => {
        if (!editingCase) return;
        setEditingCase({ ...editingCase, [field]: value });
    };

    const updateEditingWorkItem = (idx: number, field: 'name' | 'price', value: any) => {
        if (!editingCase) return;
        const newItems = [...editingCase.workItems];
        newItems[idx] = { ...newItems[idx], [field]: field === 'price' ? Number(value) : value };
        setEditingCase({ ...editingCase, workItems: newItems });
    };

    const addEditingWorkItem = () => {
        if (!editingCase) return;
        setEditingCase({ ...editingCase, workItems: [...editingCase.workItems, { name: '', price: 0 }] });
    };

    const removeEditingWorkItem = (idx: number) => {
        if (!editingCase) return;
        const newItems = [...editingCase.workItems];
        newItems.splice(idx, 1);
        setEditingCase({ ...editingCase, workItems: newItems });
    };

    return (
        <div className="space-y-6">
            {/* Edit Modal */}
            {editingCase && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => !isProcessing && setEditingCase(null)}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-stone-200">
                            <h3 className="text-xl font-bold">案件データの編集</h3>
                        </div>
                        <form onSubmit={handleUpdate} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-stone-500 mb-1">日付</label>
                                    <input type="date" className="w-full border p-2 rounded" value={editingCase.date} onChange={e => updateEditingField('date', e.target.value)} required />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-stone-500 mb-1">顧客名</label>
                                    <input type="text" className="w-full border p-2 rounded" value={editingCase.customerName} onChange={e => updateEditingField('customerName', e.target.value)} required />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-stone-500 mb-1">ブランド</label>
                                    <input type="text" className="w-full border p-2 rounded" value={editingCase.brand || ''} onChange={e => updateEditingField('brand', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-stone-500 mb-1">モデル名</label>
                                    <input type="text" className="w-full border p-2 rounded" value={editingCase.model} onChange={e => updateEditingField('model', e.target.value)} required />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-stone-500 mb-1">シリアルナンバー</label>
                                <input type="text" className="w-full border p-2 rounded" value={editingCase.serialNumber} onChange={e => updateEditingField('serialNumber', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-stone-500 mb-1">症状 (Symptom)</label>
                                <textarea className="w-full border p-2 rounded" rows={2} value={editingCase.symptoms} onChange={e => updateEditingField('symptoms', e.target.value)} required />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-stone-500 mb-1">依頼内容 (Request)</label>
                                <textarea className="w-full border p-2 rounded" rows={2} value={editingCase.requestDetails || ''} onChange={e => updateEditingField('requestDetails', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-stone-500 mb-1">提案内容 (Proposal)</label>
                                <textarea className="w-full border p-2 rounded bg-blue-50" rows={2} value={editingCase.proposalContent || ''} onChange={e => updateEditingField('proposalContent', e.target.value)} />
                            </div>

                            <div className="bg-stone-50 p-3 rounded border">
                                <label className="block text-xs font-bold text-stone-500 mb-2">作業項目</label>
                                {editingCase.workItems.map((w, i) => (
                                    <div key={i} className="flex gap-2 mb-2">
                                        <input type="text" className="flex-1 border p-1 rounded text-sm" value={w.name} onChange={e => updateEditingWorkItem(i, 'name', e.target.value)} placeholder="作業名" />
                                        <input type="number" className="w-24 border p-1 rounded text-sm text-right" value={w.price} onChange={e => updateEditingWorkItem(i, 'price', e.target.value)} placeholder="金額" />
                                        <button type="button" onClick={() => removeEditingWorkItem(i)} className="text-red-400 font-bold px-2">✕</button>
                                    </div>
                                ))}
                                <button type="button" onClick={addEditingWorkItem} className="text-blue-600 text-xs font-bold">+ 作業追加</button>
                            </div>

                            <div className="flex justify-end gap-2 pt-4 border-t">
                                <button type="button" onClick={() => setEditingCase(null)} className="px-4 py-2 text-stone-500 hover:bg-stone-100 rounded" disabled={isProcessing}>キャンセル</button>
                                <button type="submit" className="px-4 py-2 bg-stone-900 text-white rounded hover:bg-stone-700 font-bold" disabled={isProcessing}>
                                    {isProcessing ? '更新中...' : '更新を保存'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-stone-800">全データベース一覧 (全{total}件)</h3>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                            className="text-xs font-bold bg-stone-100 hover:bg-stone-200 text-stone-700 px-3 py-1.5 rounded flex items-center gap-1 transition"
                        >
                            <span>日付順: {sortOrder === 'desc' ? '新しい順 (降順)' : '古い順 (昇順)'}</span>
                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                    </div>
                </div>

                <input
                    type="text"
                    placeholder="顧客名、モデル、シリアル、症状、日付で検索..."
                    className="w-full border border-stone-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-500"
                    value={searchTerm}
                    onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                />
            </div>

            {isLoading ? (
                <div className="text-center py-20 text-stone-500">
                    <div className="animate-spin h-8 w-8 border-4 border-stone-300 border-t-stone-800 rounded-full mx-auto mb-4"></div>
                    <p>データを読み込んでいます...</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {cases.length > 0 ? cases.map((c, idx) => (
                        <div key={idx} className={`bg-white rounded-lg border p-4 hover:shadow-md transition ${c.isNewEntry ? 'border-blue-200 shadow-sm' : 'border-stone-200'}`}>
                            {c.isNewEntry && (
                                <div className="mb-2 flex justify-between items-center">
                                    <span className="text-[10px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded">NEW</span>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setEditingCase(c)}
                                            className="text-xs bg-stone-100 hover:bg-stone-200 text-stone-600 px-2 py-1 rounded transition"
                                        >
                                            編集
                                        </button>
                                        <button
                                            onClick={() => handleDelete(c.id, c.customerName)}
                                            className="text-xs bg-red-50 hover:bg-red-100 text-red-600 px-2 py-1 rounded transition"
                                        >
                                            削除
                                        </button>
                                    </div>
                                </div>
                            )}
                            <div className="flex justify-between items-start border-b border-stone-100 pb-2 mb-2">
                                <div>
                                    <div className="font-bold text-lg text-stone-800">{c.customerName} <span className="text-sm font-normal text-stone-500">様</span></div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs text-stone-500">{c.date}</span>
                                        <span className="text-stone-300">|</span>
                                        <span className="text-xs text-stone-700 font-bold">{c.brand ? `${c.brand} / ` : ''}{c.model}</span>
                                        {c.serialNumber && (
                                            <>
                                                <span className="text-stone-300">|</span>
                                                <span className="text-xs text-stone-500 font-mono">S/N: {c.serialNumber}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-stone-900 text-lg">{fmt(c.totalPrice)}</div>
                                    <div className="text-xs text-stone-400">総額(概算)</div>
                                </div>
                            </div>

                            <div className="mb-2">
                                <span className="text-xs font-bold text-stone-400 bg-stone-50 px-1 rounded mr-2">症状</span>
                                <span className="text-sm text-stone-700">{c.symptoms}</span>
                            </div>
                            {c.requestDetails && (
                                <div className="mb-2">
                                    <span className="text-xs font-bold text-blue-400 bg-blue-50 px-1 rounded mr-2">依頼</span>
                                    <span className="text-sm text-stone-700">{c.requestDetails}</span>
                                </div>
                            )}
                            {c.proposalContent && (
                                <div className="mb-2">
                                    <span className="text-xs font-bold text-green-600 bg-green-50 px-1 rounded mr-2">提案</span>
                                    <span className="text-sm text-stone-700">{c.proposalContent}</span>
                                </div>
                            )}

                            <details className="group">
                                <summary className="text-xs text-blue-600 font-bold cursor-pointer hover:underline flex items-center gap-1">
                                    作業内容 ({c.workItems.length})
                                </summary>
                                <div className="mt-2 pl-2 border-l-2 border-stone-200 space-y-1">
                                    {c.workItems.map((w, i) => (
                                        <div key={i} className="flex justify-between text-xs text-stone-600">
                                            <span>{w.name}</span>
                                            <span className="font-mono">{fmt(w.price)}</span>
                                        </div>
                                    ))}
                                    <div className="mt-2 pt-2 border-t border-stone-100">
                                        <span className="text-xs text-stone-400">Raw Data:</span>
                                        <pre className="text-[10px] text-stone-400 whitespace-pre-wrap mt-1 bg-stone-50 p-2 rounded">{c.rawText}</pre>
                                    </div>
                                </div>
                            </details>
                        </div>
                    )) : (
                        <div className="p-10 text-center text-stone-500 bg-stone-50 rounded-xl border border-stone-200">
                            <p className="mb-2 text-lg font-medium">該当するデータが見つかりませんでした。</p>
                        </div>
                    )}
                </div >
            )}

            {/* Pagination */}
            {
                totalPages > 1 && (
                    <div className="flex justify-center gap-2 py-4">
                        <button
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1 bg-white border rounded hover:bg-stone-50 disabled:opacity-50"
                        >
                            Prev
                        </button>
                        <span className="px-2 py-1 text-sm text-stone-600 self-center">{currentPage} / {totalPages}</span>
                        <button
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1 bg-white border rounded hover:bg-stone-50 disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                )
            }

        </div >
    );
}
