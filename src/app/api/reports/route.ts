import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/server/supabase';

// GET /api/reports?shop_id=...&role=...
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const shopId = searchParams.get('shop_id');
    const role = searchParams.get('role'); // super_admin이면 전체 조회

    let query = supabaseAdmin.from('reports').select('*');

    // super_admin이 아니면 shop_id 기준으로 필터링
    if (role !== 'super_admin') {
      if (!shopId) {
        return NextResponse.json(
          { error: 'shop_id is required for non super_admin' },
          { status: 400 },
        );
      }
      query = query.eq('shop_id', shopId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching reports', error);
      return NextResponse.json(
        { error: 'Failed to fetch reports' },
        { status: 500 },
      );
    }

    return NextResponse.json(data ?? [], { status: 200 });
  } catch (err) {
    console.error('Unexpected error in GET /api/reports', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// POST /api/reports
// body: { reports: ReportRow[] } 또는 [ReportRow, ...]
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const reports = Array.isArray(body) ? body : body.reports;

    if (!Array.isArray(reports) || reports.length === 0) {
      return NextResponse.json(
        { error: 'reports array is required' },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from('reports')
      .insert(reports)
      .select('*');

    if (error) {
      console.error('Error inserting reports', error);
      return NextResponse.json(
        { error: 'Failed to insert reports' },
        { status: 500 },
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error('Unexpected error in POST /api/reports', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// DELETE /api/reports
// body: { id: string }
export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 },
      );
    }

    const { error } = await supabaseAdmin
      .from('reports')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting report', error);
      return NextResponse.json(
        { error: 'Failed to delete report' },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error('Unexpected error in DELETE /api/reports', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// PATCH /api/reports
// body: { id: string; updates: Partial<ReportRow> }
export async function PATCH(req: NextRequest) {
  try {
    const { id, updates } = await req.json();

    if (!id || !updates || typeof updates !== 'object') {
      return NextResponse.json(
        { error: 'id and updates are required' },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from('reports')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating report', error);
      return NextResponse.json(
        { error: 'Failed to update report' },
        { status: 500 },
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    console.error('Unexpected error in PATCH /api/reports', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

