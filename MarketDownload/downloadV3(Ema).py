import databento as db
import pandas as pd
import numpy as np  # For NaN handling if needed

# Client with your key
client = db.Historical(key='db-UdLj4DAEvSPAxUjtFhT9qheWyxR4s')

# Parameters
warmup_minutes = 60  # Adjust as needed (e.g., 21 min minimum)
alpha_21 = 2 / (21 + 1)  # Smoothing factor for 21 EMA
alpha_50 = 2 / (50 + 1)  # Smoothing factor for 50 EMA (new)

# Step 1: Download raw trades with warmup
open_time = pd.Timestamp('2025-07-14T13:30:00Z')  # 9:30 AM UTC
start_time = open_time - pd.Timedelta(minutes=warmup_minutes)
data = client.timeseries.get_range(
    dataset='GLBX.MDP3',
    symbols=['MESU5'],
    schema='trades',
    start=start_time.isoformat(),
    end='2025-07-14T17:00:00Z',  # 1:00 PM EDT
    stype_in='raw_symbol'
)

# Convert to DataFrame
df_trades = data.to_df()
print(f"Downloaded {len(df_trades)} trades")

# Ensure ts_event is datetime and sort
df_trades['ts_event'] = pd.to_datetime(df_trades['ts_event'])
df_trades.sort_values('ts_event', inplace=True)

# Step 2: Calculate per-trade delta (same as before)
def calculate_delta(row):
    if row['side'] == 'B':
        return row['size']
    elif row['side'] == 'A':
        return -row['size']
    else:
        print(f"Unknown side: {row['side']}")
        return 0

df_trades['delta'] = df_trades.apply(calculate_delta, axis=1)

# Step 3: Simulate live aggregation and updates (incremental)
# Group by 1-min intervals
groups = df_trades.groupby(pd.Grouper(key='ts_event', freq='1min'))

# Initialize lists for bars and running totals
bar_data = []
running_cvd = 0
prev_ema_21 = None  # For 21 EMA
prev_ema_50 = None  # For 50 EMA (new)

for timestamp, group in groups:
    if group.empty:
        continue  # Skip empty minutes (or forward-fill if desired in live)
    
    # Aggregate bar
    open_price = group['price'].iloc[0]
    high = group['price'].max()
    low = group['price'].min()
    close = group['price'].iloc[-1]
    volume = group['size'].sum()
    bar_delta = group['delta'].sum()
    
    # Update running CVD
    running_cvd += bar_delta
    
    # Update 21 EMA incrementally
    if prev_ema_21 is None:
        ema_21 = close
    else:
        ema_21 = (alpha_21 * close) + ((1 - alpha_21) * prev_ema_21)
    prev_ema_21 = ema_21
    
    # Update 50 EMA incrementally (new)
    if prev_ema_50 is None:
        ema_50 = close
    else:
        ema_50 = (alpha_50 * close) + ((1 - alpha_50) * prev_ema_50)
    prev_ema_50 = ema_50
    
    # Append bar
    bar_data.append({
        'timestamp': timestamp,
        'open': open_price,
        'high': high,
        'low': low,
        'close': close,
        'volume': volume,
        'delta': bar_delta,
        'cvd': running_cvd,
        'ema_21': ema_21,
        'ema_50': ema_50  # New column
    })

# Convert to DataFrame
bars = pd.DataFrame(bar_data).set_index('timestamp')

# Optional: Filter to post-open bars (live would start decisions here)
bars = bars[bars.index >= open_time]

# Save to CSV
bars.to_csv('aggregated_1min_bars-July14_live_sim_with_emas.csv')

print("\nAggregated 1-min bars saved to 'aggregated_1min_bars-July14_live_sim_with_emas.csv' (with 21 and 50 EMAs):")
print(bars)
print(f"\nFinal CVD: {bars['cvd'].iloc[-1]}")
print(f"\nFinal 21 EMA: {bars['ema_21'].iloc[-1]:.2f}")
print(f"\nFinal 50 EMA: {bars['ema_50'].iloc[-1]:.2f}")