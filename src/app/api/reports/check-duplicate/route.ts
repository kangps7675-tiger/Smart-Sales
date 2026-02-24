import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/server/supabase';

/**
 * 판매일보 업로드 중복 체크 API
 *
 * body: { file_hash: string; shop_id: string }
 *
 * 동작:
 * - report_uploads 테이블에서 동일 shop_id + file_hash 존재 여부 확인
 * - 존재하면 duplicate: true (409)
 * - 존재하지 않으면 새 row insert 후 duplicate: false (200)
 *
 * 참고:
 * - Supabase에 다음 구조의 테이블이 있어야 완전 동작합니다.
 *   report_uploads (id uuid, shop_id text, file_hash text, uploaded_at timestamptz)
 */

export async function POST(req: NextRequest) {
  try {
    const { file_hash, shop_id } = await req.json();

    if (!file_hash || !shop_id) {
      return NextResponse.json(
        { error: 'file_hash and shop_id are required' },
        { status: 400 },
      );
    }

    // 중복 여부 조회
    const { data, error } = await supabaseAdmin
      .from('report_uploads')
      .select('id')
      .eq('file_hash', file_hash)
      .eq('shop_id', shop_id)
      .maybeSingle();

    // 테이블이 없거나 기타 오류인 경우, 중복 체크는 건너뛰되 업로드는 막지 않음
    if (error && !data) {
      console.error('Error checking duplicate report upload', error);
      return NextResponse.json(
        { duplicate: false, dedupeDisabled: true },
        { status: 200 },
      );
    }

    if (data) {
      return NextResponse.json(
        { duplicate: true },
        { status: 409 },
      );
    }

    const { error: insertError } = await supabaseAdmin
      .from('report_uploads')
      .insert({
        shop_id,
        file_hash,
        uploaded_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error('Error recording report upload', insertError);
      return NextResponse.json(
        { error: 'Failed to record upload', duplicate: false },
        { status: 500 },
      );
    }

    return NextResponse.json({ duplicate: false }, { status: 200 });
  } catch (err) {
    console.error('Unexpected error in check-duplicate route', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

