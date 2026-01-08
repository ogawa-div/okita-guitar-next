import { useState } from 'react';

type WorkItem = {
    name: string;
    price: string; // Keep as string for input handling, convert to number on submit
};

export default function EntryForm({ onSaved }: { onSaved?: () => void }) {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [customerName, setCustomerName] = useState('');
    const [model, setModel] = useState('');
    const [brand, setBrand] = useState('');
    const [serialNumber, setSerialNumber] = useState('');
    const [symptoms, setSymptoms] = useState('');
    const [requestDetails, setRequestDetails] = useState('');
    const [proposal, setProposal] = useState('');
    const [workItems, setWorkItems] = useState<WorkItem[]>([{ name: '', price: '' }]);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const addWorkItem = () => {
        setWorkItems([...workItems, { name: '', price: '' }]);
    };

    const removeWorkItem = (index: number) => {
        const newItems = [...workItems];
        newItems.splice(index, 1);
        setWorkItems(newItems);
    };

    const handleWorkItemChange = (index: number, field: keyof WorkItem, value: string) => {
        const newItems = [...workItems];
        newItems[index][field] = value;
        setWorkItems(newItems);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        // Basic validation
        if (!customerName || !model || !symptoms) {
            setMessage({ type: 'error', text: '必須項目を入力してください' });
            return;
        }

        const validWorkItems = workItems.filter(w => w.name.trim() !== '');
        if (validWorkItems.length === 0) {
            setMessage({ type: 'error', text: '少なくとも1つの作業項目を入力してください' });
            return;
        }

        setIsSubmitting(true);

        try {
            const body = {
                date,
                customer_name: customerName,
                model,
                brand,
                serial_number: serialNumber,
                symptoms,
                request_details: requestDetails,
                proposal_content: proposal,
                work_items: validWorkItems.map(w => ({
                    name: w.name,
                    price: w.price ? parseInt(w.price, 10) : 0
                }))
            };

            const res = await fetch('/api/save-repair', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!res.ok) throw new Error('Failed to save');

            setMessage({ type: 'success', text: '登録しました！' });

            // Reset form
            setCustomerName('');
            setModel('');
            setBrand('');
            setSerialNumber('');
            setSymptoms('');
            setRequestDetails('');
            setProposal('');
            setWorkItems([{ name: '', price: '' }]);

            if (onSaved) onSaved();

        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: '保存に失敗しました。' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
                <h3 className="text-xl font-bold text-stone-800 mb-6 border-b border-stone-100 pb-2">新規修理案件登録</h3>

                {message && (
                    <div className={`p-4 mb-6 rounded-md text-sm font-bold ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-stone-700 mb-1">日付</label>
                            <input
                                type="date"
                                required
                                className="w-full border border-stone-300 rounded px-3 py-2 focus:ring-2 focus:ring-stone-500 outline-none"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-stone-700 mb-1">顧客名</label>
                            <input
                                type="text"
                                required
                                placeholder="例: 山田 太郎"
                                className="w-full border border-stone-300 rounded px-3 py-2 focus:ring-2 focus:ring-stone-500 outline-none"
                                value={customerName}
                                onChange={e => setCustomerName(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-stone-700 mb-1">ブランド名 (任意)</label>
                            <input
                                type="text"
                                placeholder="例: Martin"
                                className="w-full border border-stone-300 rounded px-3 py-2 focus:ring-2 focus:ring-stone-500 outline-none"
                                value={brand}
                                onChange={e => setBrand(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-stone-700 mb-1">ギターモデル名</label>
                            <input
                                type="text"
                                required
                                placeholder="例: D-28"
                                className="w-full border border-stone-300 rounded px-3 py-2 focus:ring-2 focus:ring-stone-500 outline-none"
                                value={model}
                                onChange={e => setModel(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-stone-700 mb-1">シリアルナンバー (任意)</label>
                            <input
                                type="text"
                                placeholder="例: NR00571"
                                className="w-full border border-stone-300 rounded px-3 py-2 focus:ring-2 focus:ring-stone-500 outline-none"
                                value={serialNumber}
                                onChange={e => setSerialNumber(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-stone-700 mb-1">症状 (Symptom)</label>
                        <textarea
                            required
                            rows={2}
                            placeholder="例: ネックが順反りしている、音が詰まる..."
                            className="w-full border border-stone-300 rounded px-3 py-2 focus:ring-2 focus:ring-stone-500 outline-none"
                            value={symptoms}
                            onChange={e => setSymptoms(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-stone-700 mb-1">具体的な依頼内容 (Request)</label>
                        <textarea
                            rows={2}
                            placeholder="例: 弦高を下げて弾きやすくしてほしい..."
                            className="w-full border border-stone-300 rounded px-3 py-2 focus:ring-2 focus:ring-stone-500 outline-none"
                            value={requestDetails}
                            onChange={e => setRequestDetails(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-stone-700 mb-1">作業提案内容 (Proposal)</label>
                        <textarea
                            rows={3}
                            placeholder="例: ロッド調整で直らなければ、ネックアイロン修正を提案します..."
                            className="w-full border border-stone-300 rounded px-3 py-2 focus:ring-2 focus:ring-stone-500 outline-none bg-blue-50/50"
                            value={proposal}
                            onChange={e => setProposal(e.target.value)}
                        />
                    </div>

                    <div className="bg-stone-50 p-4 rounded-lg border border-stone-200">
                        <label className="block text-sm font-bold text-stone-700 mb-3">作業項目と費用</label>
                        <div className="space-y-3">
                            {workItems.map((item, index) => (
                                <div key={index} className="flex gap-2 items-start">
                                    <div className="flex-1">
                                        <input
                                            type="text"
                                            placeholder="作業内容 (例: フレットすり合わせ)"
                                            className="w-full border border-stone-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-stone-500 outline-none"
                                            value={item.name}
                                            onChange={e => handleWorkItemChange(index, 'name', e.target.value)}
                                        />
                                    </div>
                                    <div className="w-28 relative">
                                        <input
                                            type="number"
                                            placeholder="金額"
                                            className="w-full border border-stone-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-stone-500 outline-none text-right pr-6"
                                            value={item.price}
                                            onChange={e => handleWorkItemChange(index, 'price', e.target.value)}
                                        />
                                        <span className="absolute right-2 top-2 text-stone-400 text-xs font-bold">円</span>
                                    </div>
                                    {workItems.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeWorkItem(index)}
                                            className="text-stone-400 hover:text-red-500 p-2"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                        <button
                            type="button"
                            onClick={addWorkItem}
                            className="mt-3 text-sm font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                            + 作業項目を追加
                        </button>

                        <div className="mt-4 pt-3 border-t border-stone-200 text-right font-bold text-stone-800">
                            合計: {workItems.reduce((sum, item) => sum + (parseInt(item.price || '0', 10)), 0).toLocaleString()} 円
                        </div>
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-stone-900 text-white font-bold py-3 rounded-lg hover:bg-stone-700 transition disabled:opacity-50"
                        >
                            {isSubmitting ? '保存中...' : '案件を登録する'}
                        </button>
                    </div>
                </form>
            </div >
        </div >
    );
}
