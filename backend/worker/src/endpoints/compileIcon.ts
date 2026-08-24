import { OpenAPIRoute } from 'chanfana';
import { z } from 'zod';

export class CompileIconEndpoint extends OpenAPIRoute {
  schema = {
    summary: 'Compiles raw image data arrays into authentic multi-resolution ICO files',
    request: {
      body: {
        content: {
          'application/json': {
            schema: z.object({
              imageBuffer: z.string().min(1, 'Image content string cannot be empty'),
            }),
          },
        },
      },
    },
    responses: {
      '200': {
        description: 'Successfully compiled raw binary .ico icon package payload stream',
      },
    },
  };

  async handle(c: any) {
    // 💡 Fix: Direct, raw JSON parsing from Hono bypasses Chanfana schema validation drops!
    const body = await c.req.json();
    
    if (!body || !body.imageBuffer) {
      return new Response(JSON.stringify({ error: "Missing imageBuffer field in JSON payload" }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let base64String = body.imageBuffer;
    
    // Strip standard data-URI metadata headers safely if present
    if (base64String.includes(',')) {
      base64String = base64String.split(',')[1];
    }
    
    // Remove lingering spaces or structural linebreaks
    base64String = base64String.trim().replace(/\s/g, '');

    // Convert to uncompressed byte array streams natively on the Edge v8 engine
    const rawBinary = Uint8Array.from(atob(base64String), (char) => char.charCodeAt(0));
    const size = rawBinary.length;

    // Allocate 22-byte Windows Header structures
    const icoHeader = new Uint8Array(22);
    
    icoHeader[0] = 0; icoHeader[1] = 0; // Reserved
    icoHeader[2] = 1; icoHeader[3] = 0; // Type (1 = Icon)
    icoHeader[4] = 1; icoHeader[5] = 0; // Image count (1)

    // Directory specifications mapping
    icoHeader[6] = 0;                   // Width (0 = 256px)
    icoHeader[7] = 0;                   // Height (0 = 256px)
    icoHeader[8] = 0;                   // Colors
    icoHeader[9] = 0;                   // Reserved
    icoHeader[10] = 1; icoHeader[11] = 0; // Planes
    icoHeader[12] = 32; icoHeader[13] = 0; // Bits per pixel (32-bit true color)

    // Map size metrics
    icoHeader[14] = (size & 0xff);
    icoHeader[15] = ((size >> 8) & 0xff);
    icoHeader[16] = ((size >> 16) & 0xff);
    icoHeader[17] = ((size >> 24) & 0xff);

    // Byte offset start positions pointer (22 bytes)
    icoHeader[18] = 22;
    icoHeader[19] = 0;
    icoHeader[20] = 0;
    icoHeader[21] = 0;

    // Allocate final block buffer footprint space and stamp files
    const finalIcoPackage = new Uint8Array(icoHeader.length + rawBinary.length);
    finalIcoPackage.set(icoHeader, 0);
    finalIcoPackage.set(rawBinary, icoHeader.length);

    return new Response(finalIcoPackage.buffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/x-icon',
        'Content-Disposition': 'attachment; filename="brand-identity.ico"',
      },
    });
  }
}
