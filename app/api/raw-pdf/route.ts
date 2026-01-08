
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const stat = promisify(fs.stat);

export async function GET(req: NextRequest) {
    const filePath = "/Users/hiroshiogawa/Documents/ANTI/沖田ギター工房修理内容.pdf";

    try {
        const stats = await stat(filePath);
        const fileSize = stats.size;
        const range = req.headers.get('range');

        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = (end - start) + 1;

            const file = fs.createReadStream(filePath, { start, end });

            // Node.js readable stream via NextResponse
            // @ts-ignore: Next.js types might complain about stream but it works
            return new NextResponse(file, {
                status: 206,
                headers: {
                    'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                    'Accept-Ranges': 'bytes',
                    'Content-Length': chunksize.toString(),
                    'Content-Type': 'application/pdf',
                },
            });
        } else {
            const file = fs.createReadStream(filePath);
            // @ts-ignore
            return new NextResponse(file, {
                headers: {
                    'Content-Length': fileSize.toString(),
                    'Content-Type': 'application/pdf',
                },
            });
        }
    } catch (err) {
        console.error("PDF Stream Error:", err);
        return NextResponse.json({ error: 'File not found or unreadable' }, { status: 404 });
    }
}
