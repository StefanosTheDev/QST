import databento as db
import pandas as pd
from datetime import datetime, timezone
import numpy as np

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

# Step 4: Compute Heikin Ashi candles
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

# Combine HA data with volume and delta
ha_bars = pd.concat([ha_price, ha_cvd, bars[['volume', 'delta']]], axis=1)

# Step 5: Calculate ADX for Heikin Ashi bars
def calculate_adx_ha(df, period=14):
    """
    Calculate ADX indicator for Heikin Ashi bars
    Returns: +DI, -DI, and ADX values
    """
    # Calculate True Range (TR) using HA values
    df['h_l'] = df['ha_high'] - df['ha_low']
    df['h_pc'] = abs(df['ha_high'] - df['ha_close'].shift(1))
    df['l_pc'] = abs(df['ha_low'] - df['ha_close'].shift(1))
    df['tr'] = df[['h_l', 'h_pc', 'l_pc']].max(axis=1)
    
    # Calculate Directional Movement using HA values
    df['high_diff'] = df['ha_high'] - df['ha_high'].shift(1)
    df['low_diff'] = df['ha_low'].shift(1) - df['ha_low']
    
    # +DM and -DM
    df['+dm'] = np.where((df['high_diff'] > df['low_diff']) & (df['high_diff'] > 0), df['high_diff'], 0)
    df['-dm'] = np.where((df['low_diff'] > df['high_diff']) & (df['low_diff'] > 0), df['low_diff'], 0)
    
    # Smooth TR, +DM, -DM using Wilder's smoothing (EMA with alpha = 1/period)
    df['atr'] = df['tr'].ewm(alpha=1/period, adjust=False).mean()
    df['+dm_smooth'] = df['+dm'].ewm(alpha=1/period, adjust=False).mean()
    df['-dm_smooth'] = df['-dm'].ewm(alpha=1/period, adjust=False).mean()
    
    # Calculate +DI and -DI
    df['ha_+di'] = 100 * df['+dm_smooth'] / df['atr']
    df['ha_-di'] = 100 * df['-dm_smooth'] / df['atr']
    
    # Calculate DX
    df['di_diff'] = abs(df['ha_+di'] - df['ha_-di'])
    df['di_sum'] = df['ha_+di'] + df['ha_-di']
    df['dx'] = 100 * df['di_diff'] / df['di_sum']
    
    # Calculate ADX (smoothed DX)
    df['ha_adx'] = df['dx'].ewm(alpha=1/period, adjust=False).mean()
    
    # Clean up temporary columns
    temp_cols = ['h_l', 'h_pc', 'l_pc', 'tr', 'high_diff', 'low_diff', 
                 '+dm', '-dm', 'atr', '+dm_smooth', '-dm_smooth', 
                 'di_diff', 'di_sum', 'dx']
    df.drop(columns=temp_cols, inplace=True)
    
    return df

# Calculate ADX for HA bars
ha_bars = calculate_adx_ha(ha_bars.copy())

# Step 6: Calculate EMAs for Heikin Ashi bars
ema_periods = [8, 9, 13, 21, 22, 50, 100, 200]

# Calculate EMAs for HA close price
for period in ema_periods:
    ha_bars[f'ha_ema_{period}'] = ha_bars['ha_close'].ewm(span=period, adjust=False).mean()

# Calculate EMAs for HA CVD close
for period in ema_periods:
    ha_bars[f'ha_cvd_ema_{period}'] = ha_bars['ha_cvd_close'].ewm(span=period, adjust=False).mean()

# Create output DataFrame with logical column ordering
output_df = pd.DataFrame({
    'timestamp': ha_bars.index,
    # Heikin Ashi price OHLC
    'ha_open': ha_bars['ha_open'],
    'ha_high': ha_bars['ha_high'],
    'ha_low': ha_bars['ha_low'],
    'ha_close': ha_bars['ha_close'],
    'volume': ha_bars['volume'],
    # Heikin Ashi CVD data
    'delta': ha_bars['delta'],
    'ha_cvd_open': ha_bars['ha_cvd_open'],
    'ha_cvd_high': ha_bars['ha_cvd_high'],
    'ha_cvd_low': ha_bars['ha_cvd_low'],
    'ha_cvd_close': ha_bars['ha_cvd_close'],
    # ADX indicators for HA
    'ha_+di': ha_bars['ha_+di'],
    'ha_-di': ha_bars['ha_-di'],
    'ha_adx': ha_bars['ha_adx'],
    # HA Price EMAs
    'ha_ema_8': ha_bars['ha_ema_8'],
    'ha_ema_9': ha_bars['ha_ema_9'],
    'ha_ema_13': ha_bars['ha_ema_13'],
    'ha_ema_21': ha_bars['ha_ema_21'],
    'ha_ema_22': ha_bars['ha_ema_22'],
    'ha_ema_50': ha_bars['ha_ema_50'],
    'ha_ema_100': ha_bars['ha_ema_100'],
    'ha_ema_200': ha_bars['ha_ema_200'],
    # HA CVD EMAs
    'ha_cvd_ema_8': ha_bars['ha_cvd_ema_8'],
    'ha_cvd_ema_9': ha_bars['ha_cvd_ema_9'],
    'ha_cvd_ema_13': ha_bars['ha_cvd_ema_13'],
    'ha_cvd_ema_21': ha_bars['ha_cvd_ema_21'],
    'ha_cvd_ema_22': ha_bars['ha_cvd_ema_22'],
    'ha_cvd_ema_50': ha_bars['ha_cvd_ema_50'],
    'ha_cvd_ema_100': ha_bars['ha_cvd_ema_100'],
    'ha_cvd_ema_200': ha_bars['ha_cvd_ema_200']
})

# Save Heikin Ashi bars output
output_df.to_csv('mesu5_heikin_ashi_1min_with_emas_adx.csv', index=False)

# Print summary statistics
print(f"\nHeikin Ashi Bars Summary:")
print(f"Total bars: {len(output_df)}")
print(f"Time range: {output_df['timestamp'].iloc[0]} to {output_df['timestamp'].iloc[-1]}")
print(f"Total Volume: {output_df['volume'].sum():,}")
print(f"Net Delta: {output_df['delta'].sum()}")

# Display first few rows
print("\nFirst 5 HA bars with EMAs and ADX:")
print(output_df[['timestamp', 'ha_close', 'ha_ema_8', 'ha_ema_21', 'ha_+di', 'ha_-di', 'ha_adx']].head())

# ADX Analysis for HA
print("\nHA ADX Trend Strength Analysis:")
last_bar = output_df.iloc[-1]
print(f"Current HA ADX: {last_bar['ha_adx']:.2f}")
print(f"HA +DI: {last_bar['ha_+di']:.2f}")
print(f"HA -DI: {last_bar['ha_-di']:.2f}")

# Interpret ADX
if last_bar['ha_adx'] < 20:
    adx_strength = "No Trend (Ranging)"
elif last_bar['ha_adx'] < 25:
    adx_strength = "Weak Trend"
elif last_bar['ha_adx'] < 50:
    adx_strength = "Strong Trend"
else:
    adx_strength = "Very Strong Trend"

trend_direction = "Bullish" if last_bar['ha_+di'] > last_bar['ha_-di'] else "Bearish"
print(f"HA Trend Strength: {adx_strength}")
print(f"HA Trend Direction: {trend_direction}")

# HA smoothing analysis
print("\nHeikin Ashi Smoothing Effect:")
print(f"HA Price Range: {output_df['ha_close'].min():.2f} to {output_df['ha_close'].max():.2f}")
print(f"HA CVD Range: {output_df['ha_cvd_close'].min():.0f} to {output_df['ha_cvd_close'].max():.0f}")

# EMA convergence check for HA
print(f"\nHA Price - Current: {last_bar['ha_close']:.2f}")
print(f"  HA EMA 8: {last_bar['ha_ema_8']:.2f} (Diff: {last_bar['ha_close'] - last_bar['ha_ema_8']:.2f})")
print(f"  HA EMA 21: {last_bar['ha_ema_21']:.2f} (Diff: {last_bar['ha_close'] - last_bar['ha_ema_21']:.2f})")
print(f"  HA EMA 50: {last_bar['ha_ema_50']:.2f} (Diff: {last_bar['ha_close'] - last_bar['ha_ema_50']:.2f})")

# Trend direction analysis
def analyze_trend(row):
    if row['ha_close'] > row['ha_ema_8'] and row['ha_ema_8'] > row['ha_ema_21']:
        return 'Strong Uptrend'
    elif row['ha_close'] < row['ha_ema_8'] and row['ha_ema_8'] < row['ha_ema_21']:
        return 'Strong Downtrend'
    else:
        return 'Neutral/Consolidating'

last_trend = analyze_trend(last_bar)
print(f"\nCurrent HA Trend Analysis: {last_trend}")