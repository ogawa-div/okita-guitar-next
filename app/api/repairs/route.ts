import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Types
type PdfRepairCase = {
    id: string;
    category: string;
    categories: string[];
    symptoms: string;
    detailed_work: string;
    price: number;
    model: string;
    raw_text: string;
    date?: string;
    customer_name?: string;
    serial_number?: string;
    case_total_price?: number;
};

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
    serialNumber: string;
    categories: string[];
};

// Cache
let cachedGroupedData: CaseRecord[] | null = null;
let lastModified = 0;

function getGroupedData(): CaseRecord[] {
    const dataPath = path.join(process.cwd(), 'data', 'repair_history.json');
    try {
        if (!fs.existsSync(dataPath)) return [];

        const stats = fs.statSync(dataPath);
        if (!cachedGroupedData || stats.mtimeMs > lastModified) {
            console.log('Loading and grouping data...');
            const fileContent = fs.readFileSync(dataPath, 'utf-8');
            const rawData: PdfRepairCase[] = JSON.parse(fileContent);

            // Grouping Logic (Same as DatabaseView)
            const map = new Map<string, CaseRecord>();

            rawData.forEach(item => {
                const key = item.raw_text.length + "_" + item.raw_text.substring(0, 50);

                if (!map.has(key)) {
                    let customer = item.customer_name || '不明';
                    let date = item.date || '不明';
                    let serial = item.serial_number || '';

                    if (customer === '不明') {
                        const match = item.raw_text.match(/([^\n]+?)\s*様/);
                        if (match) customer = match[1].trim();
                    }
                    if (date === '不明') {
                        const dateMatch = item.raw_text.match(/\d{4}\.\d{1,2}\.\d{1,2}/);
                        if (dateMatch) date = dateMatch[0];
                    }
                    if (!serial) {
                        const serialMatch = item.raw_text.match(/Serial:\s*([^\n]+)/i);
                        if (serialMatch) serial = serialMatch[1].trim();
                    }

                    map.set(key, {
                        id: item.id,
                        date: date,
                        customerName: customer,
                        model: item.model,
                        symptoms: item.symptoms,
                        totalPrice: 0,
                        workItems: [],
                        rawText: item.raw_text,
                        isNewEntry: !!item.date, // If explicit date field exists, it's a new entry (or re-processed one)
                        serialNumber: serial,
                        categories: []
                    });
                }

                const record = map.get(key)!;
                record.workItems.push({ name: item.detailed_work, price: item.price });
                // Merge categories
                if (item.categories) {
                    item.categories.forEach(c => {
                        if (!record.categories.includes(c)) {
                            record.categories.push(c);
                        }
                    });
                }

                // Logic: If 'case_total_price' is present, use it as the source of truth for Total.
                // Otherwise, accumulate item prices.
                if (item.case_total_price && item.case_total_price > 0) {
                    // We just overwrite it (assuming all items in same case have same total, or at least one does)
                    // To be safe, we take the max found so far or just set it if not set? 
                    // Since extract_data.py sets it for ALL items in a block if found, overwrite is fine.
                    // But let's check if it's already set to non-zero to avoid potential issues (though unlikely with new logic).
                    record.totalPrice = item.case_total_price;
                } else if (record.totalPrice === 0 || !rawData.some(r => r.id === item.id && r.case_total_price)) {
                    // Only add if we haven't found a case_total_price-based value yet? 
                    // Wait, if we mix "add" and "set", it's risky.
                    // If ANY item in this group has case_total_price, we should rely on that.
                    // But we are iterating.
                    // Safe bet: Accumulate separate sum, and Keep track of explicitly set total.
                }
            });

            // Second Pass or just better logic inside loop?
            // Actually, let's keep it simple: 
            // If we detect case_total_price, we prioritize it. Since we can't easily know if "future" items have it, 
            // maybe we can just track "explicitTotal" separately.

            // Re-implementing loop body logic slightly differently:
            map.clear();
            rawData.forEach(item => {
                const key = item.raw_text.length + "_" + item.raw_text.substring(0, 50);
                if (!map.has(key)) {
                    // ... (init code) ...
                    let customer = item.customer_name || '不明';
                    let date = item.date || '不明';
                    let serial = item.serial_number || '';
                    if (customer === '不明') {
                        const match = item.raw_text.match(/([^\n]+?)\s*様/);
                        if (match) customer = match[1].trim();
                    }
                    if (date === '不明') {
                        const dateMatch = item.raw_text.match(/\d{4}\.\d{1,2}\.\d{1,2}/);
                        if (dateMatch) date = dateMatch[0];
                    }
                    if (!serial) {
                        const serialMatch = item.raw_text.match(/Serial:\s*([^\n]+)/i);
                        if (serialMatch) serial = serialMatch[1].trim();
                    }
                    map.set(key, {
                        id: item.id,
                        date, customerName: customer, model: item.model, symptoms: item.symptoms,
                        totalPrice: 0, workItems: [], rawText: item.raw_text, isNewEntry: !!item.date, serialNumber: serial, categories: []
                    });
                }
                const rec = map.get(key)!;
                rec.workItems.push({ name: item.detailed_work, price: item.price });
                // Merge categories
                if (item.categories) {
                    item.categories.forEach(c => {
                        if (!rec.categories.includes(c)) {
                            rec.categories.push(c);
                        }
                    });
                }

                // If this item has a case total, use it. 
                // Note: This overwrites valid sum if found. That is what we want because SUM might be wrong (sum of parts != tax included total).
                if (item.case_total_price && item.case_total_price > 0) {
                    rec.totalPrice = item.case_total_price;
                }
            });

            // Final pass: If totalPrice is still 0 (no case_total_price found), sum up work items?
            // The iteration above: if case_total_price is found, it sets totalPrice.
            // But if it is NOT found, we never added items!
            // We need to maintain a "sum" separately and fallback to it.

            for (const rec of map.values()) {
                if (rec.totalPrice === 0) {
                    rec.totalPrice = rec.workItems.reduce((acc, w) => acc + w.price, 0);
                }
            }


            cachedGroupedData = Array.from(map.values());
            lastModified = stats.mtimeMs;
            console.log(`Cached ${cachedGroupedData.length} grouped records.`);
        }
        return cachedGroupedData!;
    } catch (e) {
        console.error('Data loading error:', e);
        return [];
    }
}

// Helper: Parse Date for Sort
const parseDate = (dateStr: string): number => {
    if (!dateStr || dateStr === '不明') return 0;
    try {
        let d = new Date(dateStr.replace(/\./g, '/')).getTime();
        if (!isNaN(d)) return d;
    } catch (e) { }
    return 0;
};

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '50', 10);
        const q = (searchParams.get('q') || '').toLowerCase().trim();
        const sortOrder = searchParams.get('sort') === 'asc' ? 'asc' : 'desc';

        let data = getGroupedData();

        // Filtering
        if (q) {
            data = data.filter(c =>
                c.customerName.toLowerCase().includes(q) ||
                c.model.toLowerCase().includes(q) ||
                c.symptoms.toLowerCase().includes(q) ||
                c.date.includes(q) ||
                c.serialNumber.toLowerCase().includes(q)
            );
        }

        // Sorting
        data.sort((a, b) => {
            const timeA = parseDate(a.date);
            const timeB = parseDate(b.date);

            // Should always put unknown dates at the bottom regardless of sort order
            if (timeA === 0 && timeB === 0) return 0;
            if (timeA === 0) return 1;
            if (timeB === 0) return -1;

            return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
        });

        // Pagination
        const total = data.length;
        const totalPages = Math.ceil(total / limit);
        const offset = (page - 1) * limit;
        const items = data.slice(offset, offset + limit);

        return NextResponse.json({
            items,
            total,
            totalPages,
            page,
            limit
        });

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
