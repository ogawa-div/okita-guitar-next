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

        // Filter out items with the given ID
        // Note: This removes ALL items for that case ID.
        const updatedData = existingData.filter((item: any) => item.id !== id);

        if (existingData.length === updatedData.length) {
            return NextResponse.json({ error: 'Item not found' }, { status: 404 });
        }

        fs.writeFileSync(dataPath, JSON.stringify(updatedData, null, 2));

        return NextResponse.json({ success: true, count: existingData.length - updatedData.length });

    } catch (error) {
        console.error('Failed to delete repair entry:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
