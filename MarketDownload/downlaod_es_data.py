import databento as db
import pandas as pd

# Client with your key
client = db.Historical(key='db-UdLj4DAEvSPAxUjtFhT9qheWyxR4s')

# Step 1: Download raw trades for 6:00 PM EDT (10:00 PM UTC) on May 7, 2025
data = client.timeseries.get_range(
    dataset='GLBX.MDP3',
    symbols=['MESU5'],
    schema='trades',
 start='2025-07-14T13:40:00Z',  # UTC = 09:39 AM EDT
end='2025-07-14T13:41:00Z',    # UTC = 09:40 AM EDT
    stype_in='raw_symbol'
)

# Convert to DataFrame
df_trades = data.to_df()
print(f"Downloaded {len(df_trades)} trades")

# Debug: Check the data structure
print("\nFirst few rows:")
print(df_trades.head())
print("\nColumn names:")
print(df_trades.columns.tolist())
print("\nUnique sides:")
print(df_trades['side'].value_counts())

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

# Debug: Check delta calculations
print("\nDelta summary:")
print(f"Total positive delta (buys): {df_trades[df_trades['delta'] > 0]['delta'].sum()}")
print(f"Total negative delta (sells): {df_trades[df_trades['delta'] < 0]['delta'].sum()}")
print(f"Net delta: {df_trades['delta'].sum()}")
print(f"Final CVD: {df_trades['cvd'].iloc[-1]}")

# Save detailed trades
df_trades.to_csv('UpdateComparsionV10.csv', index=False)

# Step 3: Aggregate to 1-min bar (should be just one bar for 1 minute)
df_trades.set_index('ts_event', inplace=True)
bars = df_trades.resample('1min').agg({
    'price': ['first', 'max', 'min', 'last'],
    'size': 'sum',
    'delta': 'sum'
}).dropna()

bars.columns = ['open', 'high', 'low', 'close', 'volume', 'delta']
bars['cvd'] = bars['delta'].cumsum()

print("\nAggregated bar:")
print(bars)
print(f"\nFinal CVD for the minute: {bars['cvd'].iloc[-1]}")