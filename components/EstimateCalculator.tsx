'use client';

import { useState } from 'react';
import {
    calculateEstimate,
    InstrumentType,
    PaintType,
    BindingType,
    JointWorkType,
    ConditionParams,
    WORK_ITEMS
} from '@/lib/estimation';

export default function EstimateCalculator() {
    const [instrumentType, setInstrumentType] = useState<InstrumentType>('acoustic');
    const [paint, setPaint] = useState<PaintType>('lacquer');
    const [binding, setBinding] = useState<BindingType>('none');
    const [jointWork, setJointWork] = useState<JointWorkType>('none');

    const [rustLevel, setRustLevel] = useState<ConditionParams['rustLevel']>(1);
    const [rescueCount, setRescueCount] = useState(1);
    const [repairTraceLevel, setRepairTraceLevel] = useState<ConditionParams['repairTraceLevel']>(1);
    const [isDirty, setIsDirty] = useState(false);

    const [selectedWorks, setSelectedWorks] = useState<string[]>([]);

    const handleWorkToggle = (id: string) => {
        setSelectedWorks(prev =>
            prev.includes(id) ? prev.filter(w => w !== id) : [...prev, id]
        );
    };

    // Calculate Result
    const result = calculateEstimate(
        instrumentType,
        { paint, binding, joint: 'bolt-on', jointWork }, // joint hardcoded for now or derived
        {
            rustLevel,
            repairTraceLevel,
            isDirty,
            rescueScrewCount: rustLevel === 4 ? rescueCount : undefined,
            replaceScrewCount: rustLevel === 5 ? rescueCount : undefined,
        },
        selectedWorks
    );

    const fmt = (n: number) => new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(n);

    return (
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
            <div className="p-6 bg-stone-900 text-white">
                <h2 className="text-xl font-bold">🛠 マニュアル詳細見積もり (Calculator)</h2>
                <p className="text-stone-400 text-sm">楽器の仕様と状態を選択して、ロジックに基づいた正確な見積もりを算出します。</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                {/* Left: Inputs */}
                <div className="p-6 space-y-8 border-r border-stone-100">

                    {/* 1. 楽器タイプ */}
                    <section>
                        <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider mb-3">1. 楽器タイプ</h3>
                        <select
                            value={instrumentType}
                            onChange={(e) => setInstrumentType(e.target.value as InstrumentType)}
                            className="w-full p-2 border border-stone-300 rounded-md"
                        >
                            <option value="acoustic">アコースティックギター (標準)</option>
                            <option value="electric">エレキギター (標準)</option>
                            <option value="bass">ベース (x1.2)</option>
                            <option value="ukulele">ウクレレ (x1.2)</option>
                            <option value="vintage">ヴィンテージ (x1.2)</option>
                            <option value="archtop">アーチトップ/変形 (x1.5)</option>
                        </select>
                    </section>

                    {/* 2. 仕様スペック */}
                    <section className="space-y-4">
                        <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider mb-1">2. 構造スペック</h3>

                        <div>
                            <label className="text-xs font-bold text-stone-500 block mb-1">塗装</label>
                            <div className="flex gap-2 text-sm">
                                {(['lacquer', 'poly', 'oil'] as PaintType[]).map(t => (
                                    <button key={t}
                                        onClick={() => setPaint(t)}
                                        className={`px-3 py-1.5 rounded border ${paint === t ? 'bg-stone-800 text-white border-stone-800' : 'bg-white text-stone-600 border-stone-200'}`}
                                    >
                                        {t === 'poly' ? 'ポリ (+1万 ※木工時)' : t === 'lacquer' ? 'ラッカー (基準)' : 'オイル'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-stone-500 block mb-1">バインディング</label>
                            <select
                                value={binding}
                                onChange={(e) => setBinding(e.target.value as BindingType)}
                                className="w-full p-2 border border-stone-300 rounded-md text-sm"
                            >
                                <option value="none">なし / 通常</option>
                                <option value="gibson">Gibson (セル山残し) [+20,000円 ※フレット交換時]</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-stone-500 block mb-1">ネック/ジョイント処理</label>
                            <select
                                value={jointWork}
                                onChange={(e) => setJointWork(e.target.value as JointWorkType)}
                                className="w-full p-2 border border-stone-300 rounded-md text-sm"
                            >
                                <option value="none">特になし</option>
                                <option value="okita">簡易角度調整(沖田式) [+40,000円]</option>
                                <option value="reset-angle">ネックリセット [+80,000円]</option>
                            </select>
                        </div>
                    </section>

                    {/* 3. コンディション */}
                    <section className="space-y-4">
                        <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider mb-1">3. 現在の状態</h3>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-stone-500 block">サビ・固着</label>
                            <input
                                type="range" min={1} max={5} value={rustLevel}
                                onChange={(e) => setRustLevel(Number(e.target.value) as any)}
                                className="w-full"
                            />
                            <div className="flex justify-between text-xs text-stone-500">
                                <span>Lv1:通常</span>
                                <span>Lv3:加熱</span>
                                <span>Lv5:交換</span>
                            </div>

                            {(rustLevel === 4 || rustLevel === 5) && (
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="text-xs font-bold">本数:</span>
                                    <input
                                        type="number" min={1} value={rescueCount}
                                        onChange={(e) => setRescueCount(Number(e.target.value))}
                                        className="w-16 p-1 border rounded"
                                    />
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-stone-500 block">過去の修理痕</label>
                            <div className="flex gap-2 text-sm">
                                <button onClick={() => setRepairTraceLevel(1)} className={`px-3 py-1 rounded border ${repairTraceLevel === 1 ? 'bg-stone-800 text-white' : 'bg-white'}`}>Lv1 純正</button>
                                <button onClick={() => setRepairTraceLevel(2)} className={`px-3 py-1 rounded border ${repairTraceLevel === 2 ? 'bg-yellow-100 text-yellow-800 border-yellow-300' : 'bg-white'}`}>Lv2 プロ (+1万)</button>
                                <button onClick={() => setRepairTraceLevel(3)} className={`px-3 py-1 rounded border ${repairTraceLevel === 3 ? 'bg-red-100 text-red-800 border-red-300' : 'bg-white'}`}>Lv3 素人 (x2倍)</button>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <input type="checkbox" id="dirty" checked={isDirty} onChange={e => setIsDirty(e.target.checked)} />
                            <label htmlFor="dirty" className="text-sm font-medium">激しい汚れ (+5,000円)</label>
                        </div>
                    </section>
                </div>

                {/* Right: Work Selection & Result */}
                <div className="p-6 bg-stone-50 flex flex-col h-full">

                    <div className="flex-1 mb-8">
                        <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider mb-3">4. 作業メニュー選択</h3>
                        <div className="bg-white rounded-lg border border-stone-200 overflow-hidden">
                            {WORK_ITEMS.map(item => (
                                <label key={item.id} className="flex items-center justify-between p-3 border-b border-stone-100 hover:bg-stone-50 cursor-pointer">
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            checked={selectedWorks.includes(item.id)}
                                            onChange={() => handleWorkToggle(item.id)}
                                            className="rounded text-stone-900 focus:ring-stone-500"
                                        />
                                        <span className="text-sm font-medium">{item.name}</span>
                                    </div>
                                    <span className="text-xs text-stone-400 tabular-nums">{fmt(item.basePrice)}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="mt-auto bg-white p-5 rounded-xl border border-stone-200 shadow-sm">
                        <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4">概算見積もり結果</h3>

                        <div className="space-y-2 mb-4">
                            {result.breakdown.map((line, i) => (
                                <div key={i} className="flex justify-between text-sm">
                                    <div className="flex flex-col">
                                        <span className="text-stone-700">{line.label}</span>
                                        {line.note && <span className="text-[10px] text-stone-400">{line.note}</span>}
                                    </div>
                                    <span className="font-mono text-stone-900">{fmt(line.amount)}</span>
                                </div>
                            ))}
                        </div>

                        <div className="border-t border-stone-100 pt-4 flex justify-between items-end">
                            <span className="text-sm font-bold text-stone-600">税抜合計</span>
                            <span className="text-2xl font-bold text-stone-900">{fmt(result.totalPrice)}</span>
                        </div>

                        {result.warnings.length > 0 && (
                            <div className="mt-4 p-3 bg-red-50 text-red-800 text-xs rounded border border-red-100">
                                {result.warnings.map((w, i) => <p key={i}>⚠ {w}</p>)}
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}
