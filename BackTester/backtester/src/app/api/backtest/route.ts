// /src/app/api/backtest/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { runBacktest } from '@/app/_lib/algo/src/main'; // adjust path if needed

export async function POST(request: NextRequest) {
  try {
    const formData = await request.json();
    console.log(formData);
    await runBacktest(formData);
    return NextResponse.json({ message: 'Backtest started' }, { status: 200 });
  } catch (err: any) {
    console.error('Backtest error:', err);
    return NextResponse.json(
      { error: err.message || 'Something went wrong' },
      { status: 500 }
    );
  }
}
