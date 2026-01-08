export type RepairItem = {
    name: string;
    priceMin: number;
    priceMax: number;
    desc: string;
    keywords: string[]; // Synonyms and related symptoms
};

export type RepairCategory = {
    category: string;
    items: RepairItem[];
};

export const REPAIR_MENU: RepairCategory[] = [
    {
        category: "ナット交換 (Nut)",
        items: [
            { name: "牛骨 (Bone)", priceMin: 8800, priceMax: 13000, desc: "最も一般的。バランスの良い音色。", keywords: ["ナット", "nut", "牛骨", "開放弦", "ビビリ", "チューニング"] },
            { name: "人工象牙 (TUSQ)", priceMin: 11000, priceMax: 11000, desc: "高音域の倍音が豊か。", keywords: ["tusq", "タスク", "ナット"] },
            { name: "ブラス (真鍮)", priceMin: 16500, priceMax: 18700, desc: "サステインが長く、煌びやか。", keywords: ["ブラス", "真鍮", "メタル", "サステイン"] },
            { name: "ロックナット加工", priceMin: 16500, priceMax: 22000, desc: "フロイドローズ等の取り付け。", keywords: ["ロックナット", "フロイド", "アーミング"] }
        ]
    },
    {
        category: "フレット交換 (Refret)",
        items: [
            { name: "スタンダード (Rosewood/Ebony指板)", priceMin: 38500, priceMax: 58000, desc: "一般的な指板。指板調整含む。", keywords: ["フレット", "fret", "打ち替え", "減り", "凹み"] },
            { name: "メイプル指板 (塗装あり)", priceMin: 71500, priceMax: 91000, desc: "指板面の再塗装が必要なため高額。", keywords: ["メイプル", "maple", "塗装"] },
            { name: "バインディング付き", priceMin: 43500, priceMax: 69000, desc: "セルバインディングの処理工賃含む。", keywords: ["バインディング", "セル"] },
            { name: "ステンレスフレット変更", priceMin: 48500, priceMax: 69000, desc: "硬度が高く減りにくい。加工難易度高。", keywords: ["ステンレス", "錆びない"] }
        ]
    },
    {
        category: "ネック折れ (Neck Break)",
        items: [
            { name: "接着のみ (タッチアップ)", priceMin: 22000, priceMax: 33000, desc: "強度は保証外。見た目も傷が残る可能性あり。", keywords: ["折れ", "ひび", "割れ", "クラック", "倒した"] },
            { name: "補強なし (オーバーコート)", priceMin: 44000, priceMax: 49500, desc: "塗装で傷を目立たなくする。", keywords: ["折れ", "補強なし"] },
            { name: "補強あり (完全修復)", priceMin: 66000, priceMax: 100000, desc: "ボリュート加工などで強度を高める。", keywords: ["折れ", "補強", "ヘッド"] }
        ]
    },
    {
        category: "全体調整 (Setup)",
        items: [
            { name: "基本セットアップ", priceMin: 5000, priceMax: 10000, desc: "ネック調整、弦高、オクターブ、クリーニング。", keywords: ["調整", "セットアップ", "弦高", "弾きにくい", "高い", "低い", "オクターブ"] },
            { name: "すり合わせ (Fret Leveling)", priceMin: 8000, priceMax: 15000, desc: "特定のビビリを除去。全体的なバランス調整。", keywords: ["すり合わせ", "ビビリ", "詰まり", "音詰まり", "特定のポジション"] }
        ]
    },
    {
        category: "電装系 (Electronics)",
        items: [
            { name: "ジャック交換", priceMin: 2000, priceMax: 4000, desc: "ガリや接触不良の修理。", keywords: ["ジャック", "ガリ", "ノイズ", "接触不良", "音が出ない", "途切れる"] },
            { name: "PU交換 (1個)", priceMin: 3000, priceMax: 6000, desc: "配線工賃のみ。パーツ代別。", keywords: ["ピックアップ", "pu", "マイク", "交換"] },
            { name: "全配線引き直し", priceMin: 8000, priceMax: 15000, desc: "ポット、スイッチ等の交換含む場合あり。", keywords: ["配線", "回路", "ポッド", "スイッチ", "セレクター", "トーン", "ボリューム"] }
        ]
    },
    {
        category: "ブリッジ周辺 (Bridge)",
        items: [
            { name: "ブリッジ剥がれ接着", priceMin: 15000, priceMax: 30000, desc: "アコースティックギターの定番修理。", keywords: ["ブリッジ", "浮き", "剥がれ", "隙間", "紙が入る"] },
            { name: "サドル作成 (牛骨)", priceMin: 5000, priceMax: 8000, desc: "弦高調整に合わせて新規作成。", keywords: ["サドル", "弦高"] }
        ]
    }
];
