import databento as db
import pandas as pd
from datetime import datetime, timezone
import pytz

# Connect to Databento
client = db.Historical(key='db-UdLj4DAEvSPAxUjtFhT9qheWyxR4s')

# Step 1: Download raw trades
data = client.timeseries.get_range(
    dataset='GLBX.MDP3',
    symbols=['MESU5'],
    schema='trades',
    start='2025-07-14T13:30:00Z',  # 9:30 AM EDT
    end='2025-07-14T17:00:00Z',    # 1:00 PM EDT
    stype_in='raw_symbol'
)

# Convert to DataFrame
df_trades = data.to_df()
print(f"Downloaded {len(df_trades)} trades")

# Debug: Check for neutral trades
neutral_count = (df_trades['side'] == 'N').sum()
print(f"Neutral trades found: {neutral_count}")

# Ensure proper datetime parsing
df_trades['ts_event'] = pd.to_datetime(df_trades['ts_event'], utc=True)

# Step 2: Calculate delta EXACTLY like TS (fix applied!)
def calculate_delta(row):
    if row['side'] == 'B':
        return int(row['size'])  # Buy = +size
    elif row['side'] == 'A':
        return -int(row['size'])  # Sell = -size
    else:
        return 0  # Neutral or unknown

# ✅ FIX: Ensure Python int to avoid uint64 overflow
df_trades['delta'] = df_trades.apply(calculate_delta, axis=1).astype(int)

# Step 3: Calculate per-trade running CVD
df_trades['running_cvd'] = df_trades['delta'].cumsum()

# Step 4: Assign each trade to a minute bucket like TS
df_trades['minute_bucket'] = df_trades['ts_event'].dt.floor('1min')

# Debug: Check trades near minute boundaries
print("\n--- Checking minute boundary assignments ---")
boundary_trades = df_trades[
    (df_trades['ts_event'].dt.second == 0) | 
    (df_trades['ts_event'].dt.second == 59)
].head(10)
if not boundary_trades.empty:
    print(boundary_trades[['ts_event', 'minute_bucket', 'side', 'size', 'delta', 'running_cvd']])

# Step 5: Aggregate to 1-min bars
bars = df_trades.groupby('minute_bucket').agg({
    'price': ['first', 'max', 'min', 'last'],
    'size': 'sum',
    'delta': 'sum',
    'running_cvd': 'last'
}).dropna()

# Flatten MultiIndex
bars.columns = ['open', 'high', 'low', 'close', 'volume', 'delta', 'cvd']

# Force integer types to avoid float weirdness
bars['volume'] = bars['volume'].astype(int)
bars['delta'] = bars['delta'].astype(int)
bars['cvd'] = bars['cvd'].astype(int)
bars['bar_num'] = range(1, len(bars) + 1)

# Display first 20 bars for inspection
print("\n--- First 20 bars with CVD ---")
for idx, (timestamp, row) in enumerate(bars.head(20).iterrows()):
    et_time = timestamp.tz_convert('America/New_York').strftime('%H:%M')
print(f"Bar {idx+1:2d} ({et_time}): Delta={int(row['delta']):+6d}, CVD={int(row['cvd']):+6d}")

# Save to CSV
bars.to_csv('aggregated-1MIN-FIXED-CVD.csv')
print(f"\nFinal CVD: {bars['cvd'].iloc[-1]}")

# Step 6: Debug known problem bars
problem_bars = [10, 35, 40, 55]
print("\n--- Detailed info for problem bars ---")
for bar_idx in problem_bars:
    if bar_idx <= len(bars):
        bar = bars.iloc[bar_idx - 1]
        print(f"\nBar {bar_idx}: Delta={bar['delta']}, CVD={bar['cvd']}")
        minute_start = bars.index[bar_idx - 1]
        minute_trades = df_trades[df_trades['minute_bucket'] == minute_start]
        if len(minute_trades) > 0:
            print(f"  Trades: {len(minute_trades)}")
            print(f"  Buy vol: {int(minute_trades[minute_trades['side'] == 'B']['size'].sum())}")
            print(f"  Sell vol: {int(minute_trades[minute_trades['side'] == 'A']['size'].sum())}")
            print(f"  Neutral vol: {int(minute_trades[minute_trades['side'] == 'N']['size'].sum())}")

# Step 7: Save comparison CSV
print("\n--- Creating comparison file ---")
comparison_df = pd.DataFrame({
    'timestamp': bars.index,
    'open': bars['open'],
    'high': bars['high'], 
    'low': bars['low'],
    'close': bars['close'],
    'volume': bars['volume'],
    'delta': bars['delta'],
    'cvd': bars['cvd']
})
comparison_df.to_csv('cvd_comparison_python.csv', index=False)

# Optional: Save debug trade file for early bars
debug_trades = df_trades.head(1000).copy()
debug_trades['et_time'] = debug_trades['ts_event'].dt.tz_convert('America/New_York')
debug_trades[['ts_event', 'et_time', 'minute_bucket', 'price', 'size', 'side', 'delta', 'running_cvd']].to_csv('debug_trades.csv', index=False)
