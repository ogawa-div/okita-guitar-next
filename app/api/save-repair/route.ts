import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Validation
        if (!body.date || !body.customer_name || !body.model || !body.symptoms || !body.work_items.length) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const dataPath = path.join(process.cwd(), 'data', 'repair_history.json');

        let existingData = [];
        if (fs.existsSync(dataPath)) {
            const fileContent = fs.readFileSync(dataPath, 'utf-8');
            existingData = JSON.parse(fileContent);
        }

        const id = uuidv4();

        // Construct raw_text for search/display capability
        // Include Serial Number if provided
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
${body.work_items.map((w: any) => `- ${w.name}: ${w.price}`).join('\n')}
Total: ${body.work_items.reduce((s: number, w: any) => s + (w.price || 0), 0)}
        `.trim();

        // Create entries (one per work item for compatibility with existing structure)
        const newEntries = body.work_items.map((work: any) => ({
            id,
            category: '新規登録', // Default category
            categories: ['新規登録'],
            symptoms: body.symptoms,
            detailed_work: work.name,
            price: work.price || 0,
            model: body.model,
            raw_text: generatedRawText,
            // Extended Metadata
            date: body.date,
            customer_name: body.customer_name,
            brand: body.brand || '',
            serial_number: body.serial_number || '',
            request_details: body.request_details || '',
            proposal_content: body.proposal_content || ''
        }));

        // Prepend new entries
        const updatedData = [...newEntries, ...existingData];

        fs.writeFileSync(dataPath, JSON.stringify(updatedData, null, 2));

        return NextResponse.json({ success: true, count: newEntries.length, id });

    } catch (error) {
        console.error('Failed to save repair entry:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
