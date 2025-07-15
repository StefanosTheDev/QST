import databento as db
import pandas as pd

# Client with your key

# Step 1: Download raw trades for the first 5 minutes starting at 6:00 PM EDT (10:00 PM UTC) on May 7, 2025
data = client.timeseries.get_range(
    dataset='GLBX.MDP3',
    symbols=['MESM5'],
    schema='trades',
    start='2025-05-07T22:00:00Z',  # 6:00 PM EDT = 10:00 PM UTC
    end='2025-05-07T22:05:00Z',    # Up to 6:05 PM EDT = 10:05 PM UTC
    stype_in='raw_symbol'
)

# Convert to DataFrame
df_trades = data.to_df()
print(f"Downloaded {len(df_trades)} trades")

# Ensure ts_event is datetime
df_trades['ts_event'] = pd.to_datetime(df_trades['ts_event'])

# Step 2: Calculate delta with clear logic
def calculate_delta(row):
    if row['side'] == 'B':  # Buy aggressor (hit ask)
        return row['size']
    elif row['side'] == 'A':  # Sell aggressor (hit bid)
        return -row['size']
    else:
        print(f"Unknown side: {row['side']}")
        return 0

df_trades['delta'] = df_trades.apply(calculate_delta, axis=1)
df_trades['cvd'] = df_trades['delta'].cumsum()

# Optional: Save detailed trades if needed for debugging
# df_trades.to_csv('detailed_trades_5min.csv', index=False)

# Step 3: Aggregate to 1-min bars (will create up to 5 bars)
df_trades.set_index('ts_event', inplace=True)
bars = df_trades.resample('1min').agg({
    'price': ['first', 'max', 'min', 'last'],
    'size': 'sum',
    'delta': 'sum'
}).dropna()

bars.columns = ['open', 'high', 'low', 'close', 'volume', 'delta']
bars['cvd'] = bars['delta'].cumsum()  # Cumulative CVD across minutes

# Save the aggregated 1-min bars to CSV (one row per minute)
bars.to_csv('aggregated_1min_bars.csv')

print("\nAggregated 1-min bars saved to 'aggregated_1min_bars.csv':")
print(bars)
print(f"\nFinal CVD after 5 minutes: {bars['cvd'].iloc[-1]}")