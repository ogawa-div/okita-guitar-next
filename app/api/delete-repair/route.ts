import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
    try {
        const { id } = await request.json();

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        const dataPath = path.join(process.cwd(), 'data', 'repair_history.json');

        if (!fs.existsSync(dataPath)) {
            return NextResponse.json({ error: 'Database not found' }, { status: 404 });
        }

        const fileContent = fs.readFileSync(dataPath, 'utf-8');
        const existingData = JSON.parse(fileContent);

        // Find the target item to get its raw_text (grouping key)
        const targetItem = existingData.find((item: any) => item.id === id);

        if (!targetItem) {
            return NextResponse.json({ error: 'Item not found' }, { status: 404 });
        }

        const targetRawText = targetItem.raw_text;

        // Filter out ALL items that have the same raw_text
        // This ensures we delete the entire "Case" even if it's split into multiple work items
        // For manual entries, raw_text is unique per case (contains ID usually or generated unique string), 
        // For imported entries, raw_text is the full original text block, which is shared by all items in that case.
        const updatedData = existingData.filter((item: any) => item.raw_text !== targetRawText);

        const deletedCount = existingData.length - updatedData.length;

        fs.writeFileSync(dataPath, JSON.stringify(updatedData, null, 2));

        return NextResponse.json({ success: true, count: deletedCount });

    } catch (error) {
        console.error('Failed to delete repair entry:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
