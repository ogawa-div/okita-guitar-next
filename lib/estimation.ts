export type InstrumentType = 'acoustic' | 'electric' | 'bass' | 'ukulele' | 'archtop' | 'vintage' | 'other';
export type PaintType = 'poly' | 'lacquer' | 'oil';
export type BindingType = 'none' | 'normal' | 'gibson';
export type JointType = 'bolt-on' | 'set-neck' | 'through-neck';
export type JointWorkType = 'none' | 'okita' | 'reset-angle'; // Specific to acoustic joint work

export type ConditionParams = {
    rustLevel: 1 | 2 | 3 | 4 | 5; // 1:Normal, 3:Heat, 4:Rescue, 5:Replace
    repairTraceLevel: 1 | 2 | 3; // 1:Normal, 2:Pro, 3:Amateur
    isDirty: boolean;
    rescueScrewCount?: number; // For Rust Lv4
    replaceScrewCount?: number; // For Rust Lv5
};

export type WorkItem = {
    id: string;
    name: string;
    basePrice: number;
    category: 'neck' | 'body' | 'electric' | 'other';
};

// Base Prices (Estimated from interview context + placeholders)
export const WORK_ITEMS: WorkItem[] = [
    { id: 'adjust_rod', name: 'トラスロッド調整', basePrice: 3000, category: 'neck' },
    { id: 'nut_exchange', name: 'ナット交換', basePrice: 10000, category: 'neck' },
    { id: 'saddle_exchange_acoustic', name: 'サドル交換 (アコギ)', basePrice: 5000, category: 'body' }, // From example
    { id: 'refret', name: 'フレット交換', basePrice: 40000, category: 'neck' }, // Assumed standard
    { id: 'fret_dress', name: 'フレットすり合わせ', basePrice: 8000, category: 'neck' },
    { id: 'jack_exchange', name: 'ジャック交換', basePrice: 3000, category: 'electric' },
    { id: 'neck_reset', name: 'ネックリセット', basePrice: 0, category: 'neck' }, // Base price allows add-ons
];

export type CalculationResult = {
    totalPrice: number;
    breakdown: {
        label: string;
        amount: number;
        note?: string;
    }[];
    warnings: string[];
};

export function calculateEstimate(
    instrumentType: InstrumentType,
    specs: {
        paint: PaintType;
        binding: BindingType;
        joint: JointType;
        jointWork: JointWorkType;
    },
    condition: ConditionParams,
    selectedWorkIds: string[]
): CalculationResult {
    const breakdown: { label: string; amount: number; note?: string }[] = [];
    let warnings: string[] = [];

    // 1. Identify active work items
    const works = WORK_ITEMS.filter(w => selectedWorkIds.includes(w.id));

    // 2. Base Costs Calculation with Modifiers
    let workSubtotal = 0;

    works.forEach(work => {
        let price = work.basePrice;
        let note = '';

        // Batch Discount Logic
        // Nut Exchange w/ Refret -> 8000 (Discount 2000)
        if (work.id === 'nut_exchange' && selectedWorkIds.includes('refret')) {
            price = 8000;
            note = 'セット割引適用 (フレット交換同時)';
        }
        // Fret Dress w/ Neck Reset -> Often needed? Logic says "Included/Resetted"?
        // Interview: "Neck Reset" includes "Fret Dress" logic or separate?
        // "Neck reset" item in interview: Okita(+40000) or Reset(+80000). 
        // We treat these as add-ons usually, but let's assume they are work items here.

        workSubtotal += price;
        breakdown.push({ label: work.name, amount: price, note });
    });

    // 3. Technical Add-ons (Fixed costs based on specs)
    // 3. Technical Add-ons (Fixed costs based on specs)
    // Paint
    if (specs.paint === 'poly') {
        const hasStructureWork = works.some(w => ['neck', 'body'].includes(w.category)) || specs.jointWork !== 'none';
        if (hasStructureWork) {
            breakdown.push({ label: '塗装割増 (ポリウレタン)', amount: 10000, note: '硬質塗装加工費' });
            workSubtotal += 10000;
        } else {
            breakdown.push({ label: '塗装割増 (ポリウレタン)', amount: 0, note: '※木工・塗装関連の作業時に加算' });
        }
    }

    // Binding
    // Gibson Nibs check
    if (specs.binding === 'gibson') {
        // Expanded to include Nut and Fret Dress as they interact with binding
        const hasBindingWork = selectedWorkIds.some(id => ['refret', 'fret_dress', 'nut_exchange'].includes(id));
        if (hasBindingWork) {
            breakdown.push({ label: 'バインディング (セル山残し)', amount: 20000, note: '高難易度加工' });
            workSubtotal += 20000;
        } else {
            breakdown.push({ label: 'バインディング (セル山残し)', amount: 0, note: '※フレット・ナット関連作業時に加算' });
        }
    }

    // Joint Work (Acoustic)
    if (specs.jointWork === 'okita') {
        breakdown.push({ label: '簡易角度調整 (沖田式)', amount: 40000 });
        workSubtotal += 40000;
    } else if (specs.jointWork === 'reset-angle') {
        breakdown.push({ label: 'ネックリセット (角度調整)', amount: 80000 });
        workSubtotal += 80000;
    }

    // 4. Condition Add-ons
    // Rust
    if (condition.rustLevel === 3) {
        breakdown.push({ label: '固着対応 (加熱処理)', amount: 1000, note: 'ヒートガン処理等' });
        workSubtotal += 1000;
    } else if (condition.rustLevel === 4) {
        const count = condition.rescueScrewCount || 1;
        breakdown.push({ label: 'ネジ救出オペ', amount: 2000 * count, note: `${count}本` });
        workSubtotal += 2000 * count;
    } else if (condition.rustLevel === 5) {
        const count = condition.replaceScrewCount || 1;
        breakdown.push({ label: 'ネジ全交換', amount: 3000 * count, note: `${count}本` });
        workSubtotal += 3000 * count;
    }

    // Repair Trace
    if (condition.repairTraceLevel === 2) {
        breakdown.push({ label: '修正工賃 (プロ施工痕)', amount: 10000 });
        workSubtotal += 10000;
    } else if (condition.repairTraceLevel === 3) {
        // Double the work subtotal so far!
        const penalty = workSubtotal; // Adding same amount = 2x
        breakdown.push({ label: '修正工賃 (素人/雑)', amount: penalty, note: '工数2倍適用' });
        workSubtotal += penalty;
        warnings.push('素人修理痕があるため、工賃が通常の2倍に設定されています。状態によってはお断りする可能性があります。');
    }

    // Dirt
    if (condition.isDirty) {
        breakdown.push({ label: '特別クリーニング', amount: 5000, note: 'ヤニ・汚れ除去' });
        workSubtotal += 5000;
    }

    // 5. Instrument Multiplier
    let multiplier = 1.0;
    if (['vintage', 'bass', 'ukulele'].includes(instrumentType)) {
        multiplier = 1.2;
    } else if (['archtop'].includes(instrumentType)) {
        multiplier = 1.5;
    }
    // Standard, Electric -> 1.0

    // Apply Multiplier to Work Subtotal
    let adjustedWorkTotal = workSubtotal * multiplier;
    if (multiplier !== 1.0) {
        const diff = adjustedWorkTotal - workSubtotal;
        breakdown.push({ label: `楽器特性補正 (x${multiplier})`, amount: diff, note: `${instrumentType} 係数適用` });
    }

    // 6. Mandatory Fixed Costs
    // Strings
    breakdown.push({ label: '弦代', amount: 1500 });
    let finalTotal = adjustedWorkTotal + 1500;

    // 7. Minimum Charge
    if (finalTotal < 3000) {
        const diff = 3000 - finalTotal;
        breakdown.push({ label: '最低工賃補正', amount: diff, note: '最低3,000円' });
        finalTotal = 3000;
    }

    // Rounding (100 yen)
    finalTotal = Math.ceil(finalTotal / 100) * 100;

    return {
        totalPrice: finalTotal,
        breakdown,
        warnings
    };
}
