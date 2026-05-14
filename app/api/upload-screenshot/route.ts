import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';

const s3 = new S3Client({
  region: process.env.AWS_REGION ?? 'us-east-1',
  credentials: {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = 'screenshotstrading321';

export async function POST(req: NextRequest) {
  // Verify the caller is authenticated via Supabase JWT
  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Use service-role client to validate token & get email
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Folder = sanitised email, e.g. "john_doe_gmail_com"
  const folder = (user.email ?? user.id)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_');

  // Receive the image as raw bytes
  const contentType = req.headers.get('content-type') ?? 'image/jpeg';
  const arrayBuffer = await req.arrayBuffer();
  if (!arrayBuffer.byteLength) {
    return NextResponse.json({ error: 'Empty body' }, { status: 400 });
  }

  const key = `${folder}/${Date.now()}.jpg`;

  try {
    await s3.send(new PutObjectCommand({
      Bucket:      BUCKET,
      Key:         key,
      Body:        Buffer.from(arrayBuffer),
      ContentType: contentType,
    }));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'S3 upload failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const url = `https://${BUCKET}.s3.us-east-1.amazonaws.com/${key}`;
  return NextResponse.json({ url });
}
