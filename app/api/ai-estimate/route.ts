import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Types
type RepairCase = {
    id: string;
    category: string;
    categories: string[];
    symptoms: string;
    detailed_work: string;
    price: number;
    case_total_price?: number; // Fallback for older data
    model: string;
    raw_text: string;
    date?: string;
    customer_name?: string;
};

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query) {
        return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    try {
        // 1. Load Data
        const dataPath = path.join(process.cwd(), 'data', 'repair_history.json');
        if (!fs.existsSync(dataPath)) {
            return NextResponse.json({ error: 'Database not found' }, { status: 404 });
        }
        const fileContent = fs.readFileSync(dataPath, 'utf-8');
        const allData: RepairCase[] = JSON.parse(fileContent);

        // 2. Tokenize/Keyword Extraction (Simple approach for now)
        // Split by spaces, commas, and dots. Filter out short/common particles if needed.
        const keywords = query.split(/[\s,、。./\-]+/).filter(k => k.length > 0);

        if (keywords.length === 0) {
            return NextResponse.json({ estimate: null, similarCases: [] });
        }

        // 3. Search & Score
        // We look for matches in symptoms, detailed_work, category, and model.
        // Group by 'raw_text' (or id) effectively to represent a "case".
        // Since our data is flat (one item per work), we need to regroup mentally or just find best matching items.
        // Challenge: detailed_work items are separate entries.
        // For "Estimation", we want to find *Similar Cases* (which contain multiple work items).

        // Grouping Strategy:
        // Recent data has 'id'. Old data might share 'raw_text'.
        // Let's first filter relevant items, then group them by ID (or raw_text hash).

        const scoredCases: Record<string, { score: number, items: RepairCase[], matchReasons: string[] }> = {};

        allData.forEach(item => {
            // Ensure fields exist before accessing
            const safeSymptoms = item.symptoms || '';
            const safeWork = item.detailed_work || '';
            const safeCategory = item.category || '';
            const safeModel = item.model || '';
            const safeRawText = item.raw_text || '';

            const textToSearch = `${safeSymptoms} ${safeWork} ${safeCategory} ${safeModel} ${safeRawText}`.toLowerCase();
            let score = 0;
            const reasons: string[] = [];

            keywords.forEach(k => {
                const lowerK = k.toLowerCase();
                if (textToSearch.includes(lowerK)) {
                    score += 10; // Base match
                    // Bonus for specific field matches
                    if (safeSymptoms.toLowerCase().includes(lowerK)) score += 5;
                    if (safeWork.toLowerCase().includes(lowerK)) score += 5;
                    reasons.push(k);
                }
            });

            if (score > 0) {
                // Use ID if available, otherwise raw_text snippet as key
                const key = item.id || item.raw_text.substring(0, 50);

                if (!scoredCases[key]) {
                    scoredCases[key] = { score: 0, items: [], matchReasons: [] };
                }
                scoredCases[key].items.push(item);
                // Accumulate score? Or Max score?
                // If a case has multiple matching items, it's very relevant.
                scoredCases[key].score += score;
                scoredCases[key].matchReasons = Array.from(new Set([...scoredCases[key].matchReasons, ...reasons]));
            }
        });

        // Convert to array and sort
        const topCases = Object.values(scoredCases)
            .sort((a, b) => b.score - a.score)
            .slice(0, 5); // Top 5

        if (topCases.length === 0) {
            return NextResponse.json({ estimate: null, similarCases: [] });
        }

        // 4. Calculate Estimate Range
        // Calculate total price for each case
        const caseTotals = topCases.map(c => {
            // Sum of prices of items in this case.
            // Warning: If we grouped by partial raw_text, we might get unrelated items. ID is safer.
            // For older data without IDs, raw_text grouping is the best bet.

            // Dedupe items if necessary? (Our data structure is 1 row = 1 work item)
            // Just sum price.
            let total = c.items.reduce((sum, i) => sum + (i.price || 0), 0);
            // Fallback for older data that doesn't split price but has case_total_price
            if (total === 0 && c.items[0].case_total_price) {
                total = c.items[0].case_total_price;
            }
            return total;
        });

        // Filter out zero or crazy outliers?
        const validTotals = caseTotals.filter(p => p > 0);

        let minPrice = 0;
        let maxPrice = 0;
        let avgPrice = 0;

        if (validTotals.length > 0) {
            minPrice = Math.min(...validTotals);
            maxPrice = Math.max(...validTotals);
            avgPrice = Math.floor(validTotals.reduce((a, b) => a + b, 0) / validTotals.length);
        }

        // 5. Structure Response
        const responseData = {
            estimate: {
                min: minPrice,
                max: maxPrice,
                avg: avgPrice
            },
            similarCases: topCases.map((c, idx) => {
                const representative = c.items[0];
                const total = caseTotals[idx]; // Use the calculated total with fallback
                return {
                    id: representative.id || 'unknown',
                    date: representative.date || '不明',
                    model: representative.model || 'Unknown Model',
                    symptoms: representative.symptoms || '詳細なし',
                    totalPrice: total,
                    categories: representative.categories || [],
                    workItems: c.items.map(i => ({ name: i.detailed_work, price: i.price })),
                    matchScore: c.score,
                    matchReasons: c.matchReasons
                };
            })
        };

        return NextResponse.json(responseData);

    } catch (error) {
        console.error('AI Estimate API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
