import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { Asset } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface AssetValueHistoryProps {
  open: boolean;
  onClose: () => void;
  asset: Asset | null;
}

const AssetValueHistory: React.FC<AssetValueHistoryProps> = ({
  open,
  onClose,
  asset,
}) => {
  if (!asset) return null;

  const chartData = asset.valueHistory.map((entry) => ({
    date: formatDate(entry.date),
    valueINR: entry.valueINR,
    valueUSD: entry.valueUSD || 0,
  }));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Value History - {asset.name}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Current Value: {formatCurrency(asset.currentValueINR)}
            {asset.currentValueUSD > 0 && (
              <> ({formatCurrency(asset.currentValueUSD, 'USD')})</>
            )}
          </Typography>
        </Box>

        {chartData.length > 1 ? (
          <Box sx={{ height: 300, width: '100%' }}>
            <ResponsiveContainer>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis
                  tickFormatter={(value) => `₹${(value / 100000).toFixed(1)}L`}
                  fontSize={12}
                />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  labelStyle={{ color: '#333' }}
                />
                <Line
                  type="monotone"
                  dataKey="valueINR"
                  stroke="#ff9800"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name="Value (INR)"
                />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        ) : (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary">
              Not enough data points to show a chart. Update the asset value to see history.
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AssetValueHistory;
