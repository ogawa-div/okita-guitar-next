import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

type UpdateRepairEntry = {
    id: string; // ID to update
    date: string;
    customer_name: string;
    model: string;
    symptoms: string;
    work_items: { name: string; price: number }[];
    serial_number?: string;
    brand?: string;
    request_details?: string;
    proposal_content?: string;
};

export async function POST(request: Request) {
    try {
        const body: UpdateRepairEntry = await request.json();

        // Validation
        if (!body.id || !body.date || !body.customer_name || !body.model || !body.symptoms || !body.work_items.length) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const dataPath = path.join(process.cwd(), 'data', 'repair_history.json');

        if (!fs.existsSync(dataPath)) {
            return NextResponse.json({ error: 'Database not found' }, { status: 404 });
        }

        const fileContent = fs.readFileSync(dataPath, 'utf-8');
        let existingData = JSON.parse(fileContent);

        // Check if ID exists (filtering logic)
        const entriesToKeep = existingData.filter((item: any) => item.id !== body.id);

        if (entriesToKeep.length === existingData.length) {
            return NextResponse.json({ error: 'Item not found' }, { status: 404 });
        }

        // Reconstruct raw_text
        const brandLine = body.brand ? `Brand: ${body.brand}` : '';
        const serialLine = body.serial_number ? `Serial: ${body.serial_number}` : '';
        const requestLine = body.request_details ? `Request: ${body.request_details}` : '';
        const proposalLine = body.proposal_content ? `Proposal: ${body.proposal_content}` : '';

        const generatedRawText = `
Date: ${body.date}
Customer: ${body.customer_name} 様
${brandLine}
Model: ${body.model}
${serialLine}
Symptoms: ${body.symptoms}
${requestLine}
${proposalLine}
Work Items:
Work Items:
${body.work_items.map(w => `- ${w.name}: ${w.price}`).join('\n')}
Total: ${body.work_items.reduce((s, w) => s + w.price, 0)}
        `.trim();

        // Create new objects
        const newEntries = body.work_items.map(work => ({
            id: body.id, // Keep same ID
            category: '新規登録',
            categories: ['新規登録'],
            symptoms: body.symptoms,
            detailed_work: work.name,
            price: work.price,
            model: body.model,
            raw_text: generatedRawText,
            date: body.date,
            customer_name: body.customer_name,
            serial_number: body.serial_number || '',
            brand: body.brand || '',
            request_details: body.request_details || '',
            proposal_content: body.proposal_content || ''
        }));

        // Prepend (or maintain position logic if needed, but prepend is standard for us now)
        const updatedData = [...newEntries, ...entriesToKeep];

        // Write back
        fs.writeFileSync(dataPath, JSON.stringify(updatedData, null, 2));

        return NextResponse.json({ success: true, count: newEntries.length });

    } catch (error) {
        console.error('Failed to update repair entry:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
