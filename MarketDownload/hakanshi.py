import databento as db
import pandas as pd
from datetime import datetime, timezone

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

# Ensure ts_event is datetime with proper timezone handling
df_trades['ts_event'] = pd.to_datetime(df_trades['ts_event'], utc=True)

# Step 2: Calculate delta
def calculate_delta(row):
    if row['side'] == 'B':  # bid-hit = buy pressure
        return int(row['size'])
    elif row['side'] == 'A':  # ask-hit = sell pressure
        return -int(row['size'])
    else:  # 'N' or any other value
        return 0

df_trades['delta'] = df_trades.apply(calculate_delta, axis=1).astype(int)

# Calculate running CVD at trade level
df_trades['running_cvd'] = df_trades['delta'].cumsum()

# Step 3: Create minute buckets
df_trades['minute_bucket'] = df_trades['ts_event'].dt.floor('1min')

# Get proper CVD OHLC values for each bar
def get_cvd_ohlc(group):
    """Get true OHLC values for CVD within a bar"""
    if len(group) == 0:
        return pd.Series({
            'cvd_open': 0, 'cvd_high': 0, 'cvd_low': 0, 'cvd_close': 0
        })
    
    cvd_values = group['running_cvd'].values
    
    return pd.Series({
        'cvd_open': cvd_values[0],    # First CVD value
        'cvd_high': cvd_values.max(),  # Highest CVD value
        'cvd_low': cvd_values.min(),   # Lowest CVD value
        'cvd_close': cvd_values[-1]    # Last CVD value
    })

# Calculate CVD OHLC for each bar
cvd_ohlc = df_trades.groupby('minute_bucket').apply(get_cvd_ohlc)

# Aggregate to 1-min bars for price
temp_bars = df_trades.groupby('minute_bucket').agg({
    'price': ['first', 'max', 'min', 'last'],
    'size': 'sum',
    'delta': 'sum'
}).dropna()

# Flatten column names
temp_bars.columns = ['open', 'high', 'low', 'close', 'volume', 'delta']

# Join the CVD OHLC
bars = temp_bars.join(cvd_ohlc)

# Convert types
bars[['delta', 'volume']] = bars[['delta', 'volume']].astype(int)

# Step 4: Compute Heikin Ashi candles for price and CVD
def compute_heikin_ashi(df, open_col='open', high_col='high', low_col='low', close_col='close'):
    """
    Compute Heikin Ashi values following the standard formula:
    HA-Close = (Open + High + Low + Close) / 4
    HA-Open = (Previous HA-Open + Previous HA-Close) / 2
    HA-High = Max(High, HA-Open, HA-Close)
    HA-Low = Min(Low, HA-Open, HA-Close)
    """
    ha = pd.DataFrame(index=df.index)
    
    # HA Close = (Open + High + Low + Close) / 4
    ha['close'] = (df[open_col] + df[high_col] + df[low_col] + df[close_col]) / 4
    
    # Initialize HA Open for first bar
    ha['open'] = 0.0
    ha.iloc[0, ha.columns.get_loc('open')] = (df[open_col].iloc[0] + df[close_col].iloc[0]) / 2
    
    # HA Open = (Previous HA Open + Previous HA Close) / 2
    for i in range(1, len(df)):
        ha.iloc[i, ha.columns.get_loc('open')] = (
            ha.iloc[i-1]['open'] + ha.iloc[i-1]['close']
        ) / 2
    
    # HA High = Max(High, HA Open, HA Close)
    ha['high'] = df[[high_col]].join(ha[['open', 'close']]).max(axis=1)
    
    # HA Low = Min(Low, HA Open, HA Close)
    ha['low'] = df[[low_col]].join(ha[['open', 'close']]).min(axis=1)
    
    return ha

# Compute Heikin Ashi for price
ha_price = compute_heikin_ashi(bars)
ha_price.columns = ['ha_open', 'ha_high', 'ha_low', 'ha_close']

# Compute Heikin Ashi for CVD
ha_cvd = compute_heikin_ashi(bars, 'cvd_open', 'cvd_high', 'cvd_low', 'cvd_close')
ha_cvd.columns = ['ha_cvd_open', 'ha_cvd_high', 'ha_cvd_low', 'ha_cvd_close']

# Combine all data
final_bars = pd.concat([bars, ha_price, ha_cvd], axis=1)

# Create clean output DataFrame with logical column ordering
output_df = pd.DataFrame({
    'timestamp': final_bars.index,
    # Regular price OHLC
    'open': final_bars['open'],
    'high': final_bars['high'],
    'low': final_bars['low'],
    'close': final_bars['close'],
    'volume': final_bars['volume'],
    # Regular CVD data
    'delta': final_bars['delta'],
    'cvd_open': final_bars['cvd_open'],
    'cvd_high': final_bars['cvd_high'],
    'cvd_low': final_bars['cvd_low'],
    'cvd_close': final_bars['cvd_close'],
    # Heikin Ashi Price
    'ha_open': final_bars['ha_open'],
    'ha_high': final_bars['ha_high'],
    'ha_low': final_bars['ha_low'],
    'ha_close': final_bars['ha_close'],
    # Heikin Ashi CVD
    'ha_cvd_open': final_bars['ha_cvd_open'],
    'ha_cvd_high': final_bars['ha_cvd_high'],
    'ha_cvd_low': final_bars['ha_cvd_low'],
    'ha_cvd_close': final_bars['ha_cvd_close']
})

# Save clean output
output_df.to_csv('mesu5_1min_bars_with_ha.csv', index=False)

# Print summary statistics
print(f"\nData Summary:")
print(f"Total bars: {len(output_df)}")
print(f"Time range: {output_df['timestamp'].iloc[0]} to {output_df['timestamp'].iloc[-1]}")
print(f"Final CVD: {output_df['cvd_close'].iloc[-1]}")
print(f"Total Volume: {output_df['volume'].sum():,}")
print(f"Net Delta: {output_df['delta'].sum()}")

# Display first few rows to verify
print("\nFirst 5 bars:")
print(output_df.head())

# Quick data validation
print("\nData Validation:")
print(f"CVD continuity check: {output_df['cvd_close'].iloc[-1] == output_df['delta'].sum()}")
print(f"HA Price smoothing: Avg |HA Close - Close| = {abs(output_df['ha_close'] - output_df['close']).mean():.2f}")
print(f"HA CVD smoothing: Avg |HA CVD Close - CVD Close| = {abs(output_df['ha_cvd_close'] - output_df['cvd_close']).mean():.2f}")