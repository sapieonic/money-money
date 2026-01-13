import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Container,
  Alert,
  Grid,
  Fade,
} from '@mui/material';
import {
  Google,
  TrendingUp,
  AccountBalance,
  PieChart,
  Security,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const quotes = [
  {
    text: "A budget is telling your money where to go instead of wondering where it went.",
    author: "Dave Ramsey",
  },
  {
    text: "The habit of saving is itself an education; it fosters every virtue, teaches self-denial, cultivates the sense of order.",
    author: "T.T. Munger",
  },
  {
    text: "Do not save what is left after spending, but spend what is left after saving.",
    author: "Warren Buffett",
  },
  {
    text: "Financial freedom is available to those who learn about it and work for it.",
    author: "Robert Kiyosaki",
  },
  {
    text: "The stock market is a device for transferring money from the impatient to the patient.",
    author: "Warren Buffett",
  },
];

const features = [
  {
    icon: <AccountBalance sx={{ fontSize: 32 }} />,
    title: "Track Income",
    description: "Monitor all income sources with tax tracking",
  },
  {
    icon: <PieChart sx={{ fontSize: 32 }} />,
    title: "Visualize Spending",
    description: "See where your money goes with charts",
  },
  {
    icon: <TrendingUp sx={{ fontSize: 32 }} />,
    title: "Grow Wealth",
    description: "Track investments, SIPs, and assets",
  },
  {
    icon: <Security sx={{ fontSize: 32 }} />,
    title: "Secure & Private",
    description: "Your data is encrypted and protected",
  },
];

const Login: React.FC = () => {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [fadeIn, setFadeIn] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFadeIn(false);
      setTimeout(() => {
        setQuoteIndex((prev) => (prev + 1) % quotes.length);
        setFadeIn(true);
      }, 500);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      await signIn();
      navigate('/');
    } catch (err) {
      setError('Failed to sign in with Google. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 50%, #0d47a1 100%)',
      }}
    >
      {/* Left side - Branding & Quote */}
      <Box
        sx={{
          flex: 1,
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          p: 6,
          color: 'white',
        }}
      >
        <Box sx={{ maxWidth: 500, textAlign: 'center' }}>
          {/* Logo */}
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              backgroundColor: 'rgba(255,255,255,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 3,
            }}
          >
            <TrendingUp sx={{ fontSize: 40 }} />
          </Box>

          <Typography variant="h3" fontWeight={700} gutterBottom>
            Finance Watch
          </Typography>

          <Typography variant="h6" sx={{ opacity: 0.9, mb: 6 }}>
            Take control of your financial future
          </Typography>

          {/* Rotating Quote */}
          <Fade in={fadeIn} timeout={500}>
            <Box
              sx={{
                backgroundColor: 'rgba(255,255,255,0.1)',
                borderRadius: 3,
                p: 4,
                minHeight: 150,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
              }}
            >
              <Typography
                variant="body1"
                sx={{
                  fontStyle: 'italic',
                  fontSize: '1.1rem',
                  lineHeight: 1.6,
                  mb: 2,
                }}
              >
                "{quotes[quoteIndex].text}"
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                — {quotes[quoteIndex].author}
              </Typography>
            </Box>
          </Fade>
        </Box>
      </Box>

      {/* Right side - Login Form */}
      <Box
        sx={{
          flex: { xs: 1, md: '0 0 480px' },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'background.default',
          p: 3,
        }}
      >
        <Container maxWidth="sm">
          {/* Mobile Logo */}
          <Box
            sx={{
              display: { xs: 'block', md: 'none' },
              textAlign: 'center',
              mb: 4,
            }}
          >
            <Box
              sx={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #1976d2, #4caf50)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 2,
              }}
            >
              <TrendingUp sx={{ fontSize: 30, color: 'white' }} />
            </Box>
            <Typography variant="h5" fontWeight={700} color="primary">
              Finance Watch
            </Typography>
          </Box>

          <Paper
            elevation={0}
            sx={{
              p: 4,
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography
              variant="h5"
              fontWeight={600}
              gutterBottom
              sx={{ textAlign: 'center' }}
            >
              Welcome Back
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: 4, textAlign: 'center' }}
            >
              Sign in to manage your finances
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            <Button
              variant="contained"
              size="large"
              fullWidth
              startIcon={<Google />}
              onClick={handleGoogleSignIn}
              disabled={loading}
              sx={{
                py: 1.5,
                fontSize: '1rem',
                textTransform: 'none',
                borderRadius: 2,
              }}
            >
              {loading ? 'Signing in...' : 'Continue with Google'}
            </Button>

            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 3, display: 'block', textAlign: 'center' }}
            >
              By signing in, you agree to our Terms of Service and Privacy Policy.
            </Typography>
          </Paper>

          {/* Features Grid */}
          <Grid container spacing={2} sx={{ mt: 4 }}>
            {features.map((feature, index) => (
              <Grid size={{ xs: 6 }} key={index}>
                <Box
                  sx={{
                    textAlign: 'center',
                    p: 2,
                    borderRadius: 2,
                    backgroundColor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Box sx={{ color: 'primary.main', mb: 1 }}>
                    {feature.icon}
                  </Box>
                  <Typography variant="body2" fontWeight={600}>
                    {feature.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {feature.description}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>

          {/* Mobile Quote */}
          <Box
            sx={{
              display: { xs: 'block', md: 'none' },
              mt: 4,
              p: 3,
              backgroundColor: 'primary.main',
              borderRadius: 2,
              color: 'white',
            }}
          >
            <Typography
              variant="body2"
              sx={{ fontStyle: 'italic', mb: 1 }}
            >
              "{quotes[quoteIndex].text}"
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              — {quotes[quoteIndex].author}
            </Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default Login;
