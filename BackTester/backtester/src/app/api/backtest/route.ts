// app/api/backtest/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { runCSVBacktest } from '@/app/_lib/algo/src/strategy/csvMain';
import { FormConfig } from '@/app/_lib/algo/src/config/constants';
export async function POST(request: NextRequest) {
  try {
    const formData: FormConfig = await request.json();

    // Capture console output
    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (...args: any[]) => {
      logs.push(args.join(' '));
      originalLog(...args);
    };

    // Run the backtest
    await runCSVBacktest(formData);

    // Restore console.log
    console.log = originalLog;

    // Parse the logs to extract statistics
    const statsStartIndex = logs.findIndex((log) =>
      log.includes('Trade Statistics:')
    );
    const statistics =
      statsStartIndex >= 0
        ? logs.slice(statsStartIndex).join('\n')
        : 'No statistics available';

    return NextResponse.json({
      success: true,
      logs: logs,
      statistics: statistics,
      timestamp: new Date().toISOString(),
    });
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
