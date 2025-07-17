// app/api/backtest/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { runCSVBacktest } from '@/app/_lib/algo/src/strategy/csvMain';
import { FormProp } from '@/app/types/types';
import { runBacktest } from '@/app/_lib/algo/src/main';
export async function POST(request: NextRequest) {
  try {
    // This is actually good because we have optional values.
    const formData: FormProp = await request.json();

    // Run the backtest

    await runBacktest(formData);
  } catch (error) {
    console.error('Backtest error:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}
