'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
// Import the JSON directly (Next.js supports this)
// Import removed to avoid large payload
// import repairHistoryData from '@/data/repair_history.json';
import PricingTable from '@/components/PricingTable';
import DatabaseView from '@/components/DatabaseView';

import EntryForm from '@/components/EntryForm';
import EstimateCalculator from '@/components/EstimateCalculator';

// Define the shape of our PDF data
type PdfRepairCase = {
  id: string;
  category: string;
  categories: string[];
  symptoms: string;
  detailed_work: string;
  price: number;
  model: string;
  raw_text: string;
  is_partial?: boolean;
  // Extended fields for new entries
  date?: string;
  customer_name?: string;
  serial_number?: string;
};

// ... (Estimator definition remains same) ...

export default function Home() {
  const [activeTab, setActiveTab] = useState<'simulator' | 'calculator' | 'pricing' | 'entry' | 'database'>('simulator');
  const router = useRouter();

  // Simple handler to refresh data after save
  // Since we import JSON directly, it might be cached by Next.js/Webpack.
  // Full reload might be needed to see changes in dev mode.
  const handleSaved = () => {
    // Force reload to fetch fresh JSON
    window.location.reload();
  };

  return (
    <main className="min-h-screen bg-stone-50 text-stone-900 pb-20 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-stone-200 bg-white/90 backdrop-blur">
        <div className="px-6 py-4 flex items-center justify-between max-w-5xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded bg-stone-900 flex items-center justify-center text-white font-serif font-bold">
              沖
            </div>
            <h1 className="text-xl font-bold tracking-tight">沖田ギター工房</h1>
          </div>

          {/* Tab Navigation */}
          <nav className="flex space-x-1 bg-stone-100 p-1 rounded-lg overflow-x-auto">
            <button
              onClick={() => setActiveTab('simulator')}
              className={`whitespace-nowrap px-4 py-1.5 text-xs font-bold rounded-md transition ${activeTab === 'simulator' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
            >
              AI見積もり
            </button>
            <button
              onClick={() => setActiveTab('calculator')}
              className={`whitespace-nowrap px-4 py-1.5 text-xs font-bold rounded-md transition ${activeTab === 'calculator' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
            >
              詳細計算 (Logic)
            </button>
            <button
              onClick={() => setActiveTab('pricing')}
              className={`whitespace-nowrap px-4 py-1.5 text-xs font-bold rounded-md transition ${activeTab === 'pricing' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
            >
              過去実績価格表
            </button>
            <button
              onClick={() => setActiveTab('database')}
              className={`whitespace-nowrap px-4 py-1.5 text-xs font-bold rounded-md transition ${activeTab === 'database' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
            >
              データベース
            </button>
            <button
              onClick={() => setActiveTab('entry')}
              className={`whitespace-nowrap px-4 py-1.5 text-xs font-bold rounded-md transition ${activeTab === 'entry' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
            >
              新規登録
            </button>
          </nav>
        </div>
      </header>

      <div className="max-w-5xl mx-auto py-10 px-6">
        <Suspense fallback={<div className="text-center p-10">Loading...</div>}>
          {activeTab === 'simulator' && <Estimator />}
          {activeTab === 'calculator' && <EstimateCalculator />}
          {activeTab === 'pricing' && <PricingTable />}
          {activeTab === 'database' && <DatabaseView />}
          {activeTab === 'entry' && <EntryForm onSaved={handleSaved} />}
        </Suspense>
      </div>
    </main>
  );
}

type AiEstimateResult = {
  estimate: {
    min: number;
    max: number;
    avg: number;
  } | null;
  similarCases: {
    id: string;
    date: string;
    model: string;
    symptoms: string;
    totalPrice: number;
    workItems: { name: string; price: number }[];
    matchScore: number;
    matchReasons: string[];
    categories: string[];
  }[];
};

function Estimator() {
  const searchParams = useSearchParams();
  const [symptoms, setSymptoms] = useState('');
  const [result, setResult] = useState<AiEstimateResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fmt = (n: number) => new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(n);

  const calculateEstimate = async (textOverride?: string) => {
    const text = textOverride ?? symptoms;
    if (!text.trim()) return;

    setIsSearching(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`/api/ai-estimate?q=${encodeURIComponent(text)}`);
      if (!res.ok) throw new Error('Failed to fetch estimate');
      const data = await res.json();
      setResult(data);
    } catch (e) {
      console.error(e);
      setError('見積もりの取得に失敗しました。時間をおいて再度お試しください。');
    } finally {
      setIsSearching(false);
    }
  };

  // Allow triggering from URL
  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setSymptoms(q);
      calculateEstimate(q);
    }
  }, [searchParams]);

  const runDemo = (demoText: string) => {
    setSymptoms(demoText);
    calculateEstimate(demoText);
  };

  return (
    <div className="space-y-8">
      {/* Search Input Area */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-stone-200 text-center">
        <h2 className="text-2xl font-bold text-stone-800 mb-2">AI 修理見積もりシミュレーター</h2>
        <p className="text-stone-500 mb-6 font-medium">過去の膨大な修理事例から、あなたの症状に似たケースを探し出し、費用を予測します。</p>

        <div className="max-w-xl mx-auto relative">
          <textarea
            className="w-full p-4 pr-12 text-lg border-2 border-stone-200 rounded-xl focus:border-stone-800 focus:outline-none transition shadow-inner bg-stone-50 min-h-[120px]"
            placeholder="症状を詳しく入力してください (例: アコギのネックが順反りして、12フレットの音が詰まる。サドルの高さも調整したい。)"
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                calculateEstimate();
              }
            }}
          />
          <div className="absolute bottom-3 right-3 text-xs text-stone-400 font-bold">
            cmd + enter
          </div>
        </div>

        <div className="mt-4">
          <button
            onClick={() => calculateEstimate()}
            disabled={isSearching || !symptoms.trim()}
            className="bg-stone-900 text-white px-8 py-3 rounded-full font-bold text-lg hover:bg-stone-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            {isSearching ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                過去の事例を検索中...
              </span>
            ) : '見積もりする'}
          </button>
        </div>

        {/* Automation / Demo Section */}
        <div className="mt-6 pt-6 border-t border-stone-100 flex justify-center gap-2">
          <span className="text-xs font-bold text-stone-400 uppercase tracking-widest self-center mr-2">Try Demo:</span>
          <button onClick={() => runDemo('ネック折れ')} className="text-xs bg-stone-100 hover:bg-stone-200 text-stone-600 px-3 py-1 rounded-full transition">ネック折れ</button>
          <button onClick={() => runDemo('フレット交換')} className="text-xs bg-stone-100 hover:bg-stone-200 text-stone-600 px-3 py-1 rounded-full transition">フレット交換</button>
          <button onClick={() => runDemo('ナット交換')} className="text-xs bg-stone-100 hover:bg-stone-200 text-stone-600 px-3 py-1 rounded-full transition">ナット交換</button>
        </div>
      </div>

      {/* Results Area */}
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-center font-bold">
          {error}
        </div>
      )}

      {result && (
        <div className="animate-fade-in space-y-8">
          {/* Estimate Summary */}
          {result.estimate && (
            result.estimate.avg > 0 ? (
              <div className="bg-stone-900 text-white p-8 rounded-2xl shadow-xl text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
                <h3 className="text-stone-300 font-bold mb-2 tracking-wider uppercase text-sm">AI 推定修理費用</h3>
                <div className="text-5xl font-bold mb-2 tracking-tight">
                  {fmt(result.estimate.min)} <span className="text-2xl font-normal text-stone-400">〜</span> {fmt(result.estimate.max)}
                </div>
                <p className="text-stone-400 text-sm">
                  類似した修理案件 ({result.similarCases.length}件) の平均: <span className="text-white font-bold">{fmt(result.estimate.avg)}</span>
                </p>
              </div>
            ) : (
              <div className="bg-stone-100 p-8 rounded-2xl text-center text-stone-600 border border-stone-200">
                <p className="font-bold text-lg mb-1">推定価格は算出できませんでした</p>
                <p className="text-sm">類似事例は見つかりましたが、正確な費用データが含まれていません。</p>
                <p className="text-xs text-stone-400 mt-2">（※古いデータは費用が0円と表示される場合があります）</p>
              </div>
            )
          )}

          {/* Similar Cases List */}
          {result.similarCases.length > 0 ? (
            <div>
              <h3 className="text-xl font-bold text-stone-800 mb-4 flex items-center gap-2">
                <span className="bg-stone-200 text-stone-600 px-2 py-1 rounded text-xs">REFERENCE</span>
                参考になった過去の修理事例
              </h3>
              <div className="grid gap-4">
                {result.similarCases.map((c, idx) => (
                  <div key={idx} className="bg-white border border-stone-200 rounded-xl p-5 hover:shadow-md transition">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center gap-2 text-xs text-stone-500 mb-1">
                          <span className="font-mono">{c.date}</span>
                          {c.model && <span className="bg-stone-100 px-1.5 py-0.5 rounded font-bold text-stone-700">{c.model}</span>}
                          <span className="text-green-600 font-bold bg-green-50 px-1.5 py-0.5 rounded">マッチ度: {c.matchScore}</span>
                        </div>
                        <div className="font-bold text-stone-800">{c.symptoms}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg text-stone-900">{fmt(c.totalPrice)}</div>
                      </div>
                    </div>

                    <div className="bg-stone-50 rounded-lg p-3 text-sm">
                      <h4 className="font-bold text-stone-500 text-xs mb-2 uppercase">実際の作業内容</h4>
                      <ul className="space-y-1">
                        {c.workItems.map((w, i) => (
                          <li key={i} className="flex justify-between text-stone-700">
                            <span>{w.name}</span>
                            <span className="font-mono text-stone-400">{fmt(w.price)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {c.categories && c.categories.map(cat => (
                        <span key={cat} className="text-[10px] bg-white border border-stone-200 text-stone-500 px-2 py-0.5 rounded-full">{cat}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-stone-100 p-8 rounded-2xl text-center text-stone-500">
              <p className="font-bold text-lg">該当する事例が見つかりませんでした。</p>
              <p className="text-sm">別のキーワードで試すか、より一般的な表現に変更してみてください。</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


