import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  CircularProgress,
  Alert,
  InputAdornment,
  Divider,
} from '@mui/material';
import { Save } from '@mui/icons-material';
import { settingsService } from '../services/settingsService';
import type { UserSettings } from '../types';
import { useAuth } from '../context/AuthContext';

const Settings: React.FC = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [usdRate, setUsdRate] = useState('89');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await settingsService.get();
      setSettings(data);
      setUsdRate(data.exchangeRates.USD?.toString() || '89');
      setError(null);
    } catch (err) {
      setError('Failed to load settings');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setSuccess(false);
      await settingsService.update({
        exchangeRates: {
          USD: parseFloat(usdRate),
        },
      });
      setSuccess(true);
      setError(null);
    } catch (err) {
      setError('Failed to save settings');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Settings
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Configure your preferences
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Settings saved successfully!
        </Alert>
      )}

      {/* Profile Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Profile
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Name"
            value={user?.displayName || ''}
            disabled
            fullWidth
          />
          <TextField
            label="Email"
            value={user?.email || ''}
            disabled
            fullWidth
          />
        </Box>
      </Paper>

      {/* Exchange Rates Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Exchange Rates
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Set the current exchange rates for currency conversion
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 300 }}>
          <TextField
            label="USD to INR"
            value={usdRate}
            onChange={(e) => setUsdRate(e.target.value)}
            type="number"
            InputProps={{
              startAdornment: <InputAdornment position="start">1 USD =</InputAdornment>,
              endAdornment: <InputAdornment position="end">INR</InputAdornment>,
            }}
          />
        </Box>
      </Paper>

      {/* Save Button */}
      <Button
        variant="contained"
        startIcon={<Save />}
        onClick={handleSave}
        disabled={saving}
        size="large"
      >
        {saving ? 'Saving...' : 'Save Settings'}
      </Button>
    </Box>
  );
};

export default Settings;
