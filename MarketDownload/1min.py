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

# Step 4: Calculate ADX (Average Directional Index)
def calculate_adx(df, period=14):
    """
    Calculate ADX indicator
    Returns: +DI, -DI, and ADX values
    """
    # Calculate True Range (TR)
    df['h_l'] = df['high'] - df['low']
    df['h_pc'] = abs(df['high'] - df['close'].shift(1))
    df['l_pc'] = abs(df['low'] - df['close'].shift(1))
    df['tr'] = df[['h_l', 'h_pc', 'l_pc']].max(axis=1)
    
    # Calculate Directional Movement
    df['high_diff'] = df['high'] - df['high'].shift(1)
    df['low_diff'] = df['low'].shift(1) - df['low']
    
    # +DM and -DM
    df['+dm'] = np.where((df['high_diff'] > df['low_diff']) & (df['high_diff'] > 0), df['high_diff'], 0)
    df['-dm'] = np.where((df['low_diff'] > df['high_diff']) & (df['low_diff'] > 0), df['low_diff'], 0)
    
    # Smooth TR, +DM, -DM using Wilder's smoothing (EMA with alpha = 1/period)
    df['atr'] = df['tr'].ewm(alpha=1/period, adjust=False).mean()
    df['+dm_smooth'] = df['+dm'].ewm(alpha=1/period, adjust=False).mean()
    df['-dm_smooth'] = df['-dm'].ewm(alpha=1/period, adjust=False).mean()
    
    # Calculate +DI and -DI
    df['+di'] = 100 * df['+dm_smooth'] / df['atr']
    df['-di'] = 100 * df['-dm_smooth'] / df['atr']
    
    # Calculate DX
    df['di_diff'] = abs(df['+di'] - df['-di'])
    df['di_sum'] = df['+di'] + df['-di']
    df['dx'] = 100 * df['di_diff'] / df['di_sum']
    
    # Calculate ADX (smoothed DX)
    df['adx'] = df['dx'].ewm(alpha=1/period, adjust=False).mean()
    
    # Clean up temporary columns
    temp_cols = ['h_l', 'h_pc', 'l_pc', 'tr', 'high_diff', 'low_diff', 
                 '+dm', '-dm', 'atr', '+dm_smooth', '-dm_smooth', 
                 'di_diff', 'di_sum', 'dx']
    df.drop(columns=temp_cols, inplace=True)
    
    return df

# Calculate ADX
bars = calculate_adx(bars.copy())

# Step 5: Calculate EMAs for traditional bars
ema_periods = [8, 9, 13, 21, 22, 50, 100, 200]

# Calculate EMAs for close price
for period in ema_periods:
    bars[f'ema_{period}'] = bars['close'].ewm(span=period, adjust=False).mean()

# Calculate EMAs for CVD close
for period in ema_periods:
    bars[f'cvd_ema_{period}'] = bars['cvd_close'].ewm(span=period, adjust=False).mean()

# Create output DataFrame with logical column ordering
output_df = pd.DataFrame({
    'timestamp': bars.index,
    # Regular price OHLC
    'open': bars['open'],
    'high': bars['high'],
    'low': bars['low'],
    'close': bars['close'],
    'volume': bars['volume'],
    # Regular CVD data
    'delta': bars['delta'],
    'cvd_open': bars['cvd_open'],
    'cvd_high': bars['cvd_high'],
    'cvd_low': bars['cvd_low'],
    'cvd_close': bars['cvd_close'],
    # ADX indicators
    '+di': bars['+di'],
    '-di': bars['-di'],
    'adx': bars['adx'],
    # Price EMAs
    'ema_8': bars['ema_8'],
    'ema_9': bars['ema_9'],
    'ema_13': bars['ema_13'],
    'ema_21': bars['ema_21'],
    'ema_22': bars['ema_22'],
    'ema_50': bars['ema_50'],
    'ema_100': bars['ema_100'],
    'ema_200': bars['ema_200'],
    # CVD EMAs
    'cvd_ema_8': bars['cvd_ema_8'],
    'cvd_ema_9': bars['cvd_ema_9'],
    'cvd_ema_13': bars['cvd_ema_13'],
    'cvd_ema_21': bars['cvd_ema_21'],
    'cvd_ema_22': bars['cvd_ema_22'],
    'cvd_ema_50': bars['cvd_ema_50'],
    'cvd_ema_100': bars['cvd_ema_100'],
    'cvd_ema_200': bars['cvd_ema_200']
})

# Save traditional bars output
output_df.to_csv('mesu5_traditional_1min_with_emas_adx.csv', index=False)

# Print summary statistics
print(f"\nTraditional Bars Summary:")
print(f"Total bars: {len(output_df)}")
print(f"Time range: {output_df['timestamp'].iloc[0]} to {output_df['timestamp'].iloc[-1]}")
print(f"Final CVD: {output_df['cvd_close'].iloc[-1]}")
print(f"Total Volume: {output_df['volume'].sum():,}")
print(f"Net Delta: {output_df['delta'].sum()}")

# Display first few rows
print("\nFirst 5 bars with EMAs and ADX:")
print(output_df[['timestamp', 'close', 'ema_8', 'ema_21', '+di', '-di', 'adx']].head())

# ADX Analysis
print("\nADX Trend Strength Analysis:")
last_bar = output_df.iloc[-1]
print(f"Current ADX: {last_bar['adx']:.2f}")
print(f"+DI: {last_bar['+di']:.2f}")
print(f"-DI: {last_bar['-di']:.2f}")

# Interpret ADX
if last_bar['adx'] < 20:
    adx_strength = "No Trend (Ranging)"
elif last_bar['adx'] < 25:
    adx_strength = "Weak Trend"
elif last_bar['adx'] < 50:
    adx_strength = "Strong Trend"
else:
    adx_strength = "Very Strong Trend"

trend_direction = "Bullish" if last_bar['+di'] > last_bar['-di'] else "Bearish"
print(f"Trend Strength: {adx_strength}")
print(f"Trend Direction: {trend_direction}")

# EMA convergence check
print(f"\nPrice - Current: {last_bar['close']:.2f}")
print(f"  EMA 8: {last_bar['ema_8']:.2f} (Diff: {last_bar['close'] - last_bar['ema_8']:.2f})")
print(f"  EMA 21: {last_bar['ema_21']:.2f} (Diff: {last_bar['close'] - last_bar['ema_21']:.2f})")
print(f"  EMA 50: {last_bar['ema_50']:.2f} (Diff: {last_bar['close'] - last_bar['ema_50']:.2f})")