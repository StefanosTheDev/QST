import databento as db
import pandas as pd
from datetime import datetime, timezone
import pytz

# Client with your key
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

# Ensure ts_event is datetime with proper timezone handling
df_trades['ts_event'] = pd.to_datetime(df_trades['ts_event'], utc=True)

# Step 2: Calculate delta EXACTLY like TypeScript
def calculate_delta(row):
    if row['side'] == 'B':  # bid-hit = buy pressure
        return int(row['size'])  # Ensure integer
    elif row['side'] == 'A':  # ask-hit = sell pressure
        return -int(row['size'])  # Ensure integer
    else:  # 'N' or any other value
        return 0

df_trades['delta'] = df_trades.apply(calculate_delta, axis=1).astype(int)

# Calculate running CVD at trade level
df_trades['running_cvd'] = df_trades['delta'].cumsum()

# Step 3: Create minute buckets EXACTLY like TypeScript
# TypeScript: dt.setSeconds(0, 0) - sets seconds and milliseconds to 0
df_trades['minute_bucket'] = df_trades['ts_event'].dt.floor('1min')

# Debug: Show trades around minute boundaries
print("\n--- Checking minute boundary assignments ---")
boundary_trades = df_trades[
    (df_trades['ts_event'].dt.second == 0) | 
    (df_trades['ts_event'].dt.second == 59)
].head(10)
if not boundary_trades.empty:
    print(boundary_trades[['ts_event', 'minute_bucket', 'side', 'size', 'delta', 'running_cvd']])

# Aggregate to 1-min bars
bars = df_trades.groupby('minute_bucket').agg({
    'price': ['first', 'max', 'min', 'last'],
    'size': 'sum',
    'delta': 'sum',
    'running_cvd': 'last'  # Take the last CVD value in each minute
}).dropna()

# Flatten column names and ensure integer types
bars.columns = ['open', 'high', 'low', 'close', 'volume', 'delta', 'cvd']

# Ensure delta and cvd are integers
bars['delta'] = bars['delta'].astype(int)
bars['cvd'] = bars['cvd'].astype(int)
bars['volume'] = bars['volume'].astype(int)

# Add bar number for debugging
bars['bar_num'] = range(1, len(bars) + 1)

# Debug: Show bars where CVD might differ
print("\n--- First 20 bars with CVD ---")
for idx, (timestamp, row) in enumerate(bars.head(20).iterrows()):
    # Convert to ET for display
    et_time = timestamp.tz_convert('America/New_York').strftime('%H:%M')
    print(f"Bar {idx+1} ({et_time}): Delta={int(row['delta']):+6d}, CVD={int(row['cvd']):+6d}")

# Save the aggregated 1-min bars to CSV
bars.to_csv('aggregated-1MIN-FIXED-CVD.csv')

print(f"\nFinal CVD: {bars['cvd'].iloc[-1]}")

# Additional debugging for specific problem bars
problem_bars = [10, 35, 40, 55]  # Bars where differences were noted
print("\n--- Detailed info for problem bars ---")
for bar_idx in problem_bars:
    if bar_idx <= len(bars):
        bar = bars.iloc[bar_idx - 1]
        print(f"\nBar {bar_idx}: Delta={bar['delta']}, CVD={bar['cvd']}")
        
        # Show all trades in this minute
        minute_start = bars.index[bar_idx - 1]
        minute_end = minute_start + pd.Timedelta(minutes=1)
        minute_trades = df_trades[
            (df_trades['minute_bucket'] == minute_start)
        ]
        
        if len(minute_trades) > 0:
            print(f"  {len(minute_trades)} trades in this minute:")
            print(f"  Total buy volume: {int(minute_trades[minute_trades['side'] == 'B']['size'].sum())}")
            print(f"  Total sell volume: {int(minute_trades[minute_trades['side'] == 'A']['size'].sum())}")
            print(f"  Total neutral volume: {int(minute_trades[minute_trades['side'] == 'N']['size'].sum())}")

# Create a comparison DataFrame
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

# Also create a detailed trade-level CSV for the first few minutes for debugging
debug_trades = df_trades.head(1000).copy()
debug_trades['et_time'] = debug_trades['ts_event'].dt.tz_convert('America/New_York')
debug_trades[['ts_event', 'et_time', 'minute_bucket', 'price', 'size', 'side', 'delta', 'running_cvd']].to_csv('debug_trades.csv', index=False)