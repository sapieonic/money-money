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
  Chip,
} from '@mui/material';
import { Save, Telegram, CheckCircle, Cancel, Link as LinkIcon } from '@mui/icons-material';
import { settingsService } from '../services/settingsService';
import { telegramService } from '../services/telegramService';
import { useAuth } from '../context/AuthContext';
import type { TelegramStatus } from '../types';

const Settings: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [usdRate, setUsdRate] = useState('89');

  // Telegram state
  const [telegramStatus, setTelegramStatus] = useState<TelegramStatus | null>(null);
  const [telegramLoading, setTelegramLoading] = useState(true);
  const [linkCode, setLinkCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [telegramError, setTelegramError] = useState<string | null>(null);
  const [telegramSuccess, setTelegramSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
    loadTelegramStatus();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await settingsService.get();
      setUsdRate(data.exchangeRates.USD?.toString() || '89');
      setError(null);
    } catch (err) {
      setError('Failed to load settings');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadTelegramStatus = async () => {
    try {
      setTelegramLoading(true);
      const status = await telegramService.getStatus();
      setTelegramStatus(status);
    } catch (err) {
      console.error('Failed to load Telegram status:', err);
    } finally {
      setTelegramLoading(false);
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

  const handleVerifyCode = async () => {
    if (!linkCode || linkCode.length !== 6) {
      setTelegramError('Please enter a valid 6-digit code');
      return;
    }

    try {
      setVerifying(true);
      setTelegramError(null);
      setTelegramSuccess(null);
      const response = await telegramService.verifyCode(linkCode);
      setTelegramStatus({ linked: response.linked, username: response.username });
      setTelegramSuccess('Telegram account linked successfully!');
      setLinkCode('');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setTelegramError(error.response?.data?.error || 'Failed to verify code. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const handleUnlink = async () => {
    try {
      setUnlinking(true);
      setTelegramError(null);
      setTelegramSuccess(null);
      await telegramService.unlink();
      setTelegramStatus({ linked: false, username: null });
      setTelegramSuccess('Telegram account disconnected');
    } catch (err) {
      setTelegramError('Failed to disconnect Telegram account');
    } finally {
      setUnlinking(false);
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

      {/* Telegram Integration Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Telegram color="primary" />
          <Typography variant="h6" fontWeight={600}>
            Telegram Integration
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Connect Telegram to track expenses by forwarding bank SMS messages
        </Typography>
        <Divider sx={{ mb: 2 }} />

        {telegramLoading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
            <CircularProgress size={20} />
            <Typography color="text.secondary">Loading status...</Typography>
          </Box>
        ) : (
          <>
            {/* Status Display */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Typography fontWeight={500}>Status:</Typography>
              {telegramStatus?.linked ? (
                <Chip
                  icon={<CheckCircle />}
                  label={`Connected${telegramStatus.username ? ` (@${telegramStatus.username})` : ''}`}
                  color="success"
                  size="small"
                />
              ) : (
                <Chip
                  icon={<Cancel />}
                  label="Not Connected"
                  color="default"
                  size="small"
                />
              )}
            </Box>

            {telegramError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {telegramError}
              </Alert>
            )}

            {telegramSuccess && (
              <Alert severity="success" sx={{ mb: 2 }}>
                {telegramSuccess}
              </Alert>
            )}

            {telegramStatus?.linked ? (
              /* Connected State */
              <>
                <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                    How to add expenses:
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Simply forward your bank SMS messages to the bot. The bot will automatically parse the amount and add it as an expense.
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    <strong>Example:</strong> "Rs.500 debited at Amazon" will be added as a Rs.500 expense.
                  </Typography>
                </Paper>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={handleUnlink}
                  disabled={unlinking}
                  startIcon={unlinking ? <CircularProgress size={16} /> : <Cancel />}
                >
                  {unlinking ? 'Disconnecting...' : 'Disconnect Telegram'}
                </Button>
              </>
            ) : (
              /* Not Connected State */
              <>
                <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                    How to connect:
                  </Typography>
                  <Box component="ol" sx={{ pl: 2, m: 0, '& li': { mb: 0.5 } }}>
                    <Typography component="li" variant="body2" color="text.secondary">
                      Open Telegram and search for your Finance Watch bot
                    </Typography>
                    <Typography component="li" variant="body2" color="text.secondary">
                      Send <strong>/link</strong> command to the bot
                    </Typography>
                    <Typography component="li" variant="body2" color="text.secondary">
                      Enter the 6-digit code you receive below
                    </Typography>
                  </Box>
                </Paper>

                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', maxWidth: 400 }}>
                  <TextField
                    label="Link Code"
                    value={linkCode}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setLinkCode(value);
                    }}
                    placeholder="123456"
                    size="small"
                    inputProps={{ maxLength: 6 }}
                    sx={{ width: 150 }}
                  />
                  <Button
                    variant="contained"
                    onClick={handleVerifyCode}
                    disabled={verifying || linkCode.length !== 6}
                    startIcon={verifying ? <CircularProgress size={16} /> : <LinkIcon />}
                  >
                    {verifying ? 'Verifying...' : 'Verify'}
                  </Button>
                </Box>
              </>
            )}
          </>
        )}
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
