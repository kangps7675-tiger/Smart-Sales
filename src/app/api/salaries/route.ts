import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/server/supabase';

/** GET /api/salaries?shop_id=...&sales_person=...&period_start=...&period_end=...
 *  급여 이력 조회. tenant_admin/super_admin: shop_id 필수. staff: 본인 shop_id, sales_person=본인 이름만.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const shopId = searchParams.get('shop_id');
    const role = searchParams.get('role');
    const salesPerson = searchParams.get('sales_person');
    const periodStart = searchParams.get('period_start');
    const periodEnd = searchParams.get('period_end');

    if (!shopId) {
      return NextResponse.json(
        { error: 'shop_id is required' },
        { status: 400 },
      );
    }

    let query = supabaseAdmin
      .from('salary_snapshots')
      .select('*')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false });

    if (salesPerson) query = query.eq('sales_person', salesPerson);
    if (periodStart) query = query.gte('period_end', periodStart);
    if (periodEnd) query = query.lte('period_start', periodEnd);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching salary_snapshots', error);
      return NextResponse.json(
        { error: 'Failed to fetch salary history' },
        { status: 500 },
      );
    }

    return NextResponse.json(data ?? [], { status: 200 });
  } catch (err) {
    console.error('Unexpected error in GET /api/salaries', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/** POST /api/salaries
 *  body: { shop_id, period_start, period_end, rows: [{ salesPerson, count, totalMargin, totalSupport, calculatedSalary }] }
 *  super_admin / tenant_admin만 호출 가능. x-user-role 헤더로 검사.
 */
export async function POST(req: NextRequest) {
  try {
    const role = req.headers.get('x-user-role');
    if (role !== 'super_admin' && role !== 'tenant_admin') {
      return NextResponse.json(
        { error: 'Only store owner or super admin can save salary snapshots' },
        { status: 403 },
      );
    }

    const body = await req.json();
    const { shop_id, period_start, period_end, rows } = body;

    if (!shop_id || !period_start || !period_end || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: 'shop_id, period_start, period_end, and rows array are required' },
        { status: 400 },
      );
    }

    const inserts = rows.map((r: {
      salesPerson: string;
      count: number;
      totalMargin: number;
      totalSupport: number;
      calculatedSalary: number;
    }) => ({
      shop_id,
      sales_person: String(r.salesPerson ?? '').trim() || '(미지정)',
      period_start: String(period_start).slice(0, 10),
      period_end: String(period_end).slice(0, 10),
      sale_count: Number(r.count) || 0,
      total_margin: Number(r.totalMargin) || 0,
      total_support: Number(r.totalSupport) || 0,
      calculated_salary: Number(r.calculatedSalary) || 0,
    }));

    const { data, error } = await supabaseAdmin
      .from('salary_snapshots')
      .insert(inserts)
      .select('*');

    if (error) {
      console.error('Error inserting salary_snapshots', error);
      return NextResponse.json(
        { error: 'Failed to save salary snapshot. Ensure table salary_snapshots exists.' },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, saved: data }, { status: 201 });
  } catch (err) {
    console.error('Unexpected error in POST /api/salaries', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
