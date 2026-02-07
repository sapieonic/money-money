import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  useTheme,
  useMediaQuery,
  Divider,
  Box,
  Typography,
} from '@mui/material';
import {
  Dashboard,
  AccountBalance,
  Receipt,
  ShoppingCart,
  TrendingUp,
  AccountBalanceWallet,
  CalendarMonth,
  Settings,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

const DRAWER_WIDTH = 240;

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

interface MenuItem {
  text: string;
  icon: React.ReactNode;
  path: string;
  color: string;
}

interface MenuGroup {
  label: string;
  items: MenuItem[];
}

const menuGroups: MenuGroup[] = [
  {
    label: 'Overview',
    items: [
      { text: 'Dashboard', icon: <Dashboard />, path: '/', color: '#1976d2' },
      { text: 'Monthly Tracker', icon: <CalendarMonth />, path: '/monthly-tracker', color: '#00897b' },
    ],
  },
  {
    label: 'Manage',
    items: [
      { text: 'Income', icon: <AccountBalance />, path: '/income', color: '#4caf50' },
      { text: 'Recurring Expenses', icon: <Receipt />, path: '/expenses', color: '#f44336' },
      { text: 'Daily Spending', icon: <ShoppingCart />, path: '/daily-expenses', color: '#ff7043' },
      { text: 'Investments', icon: <TrendingUp />, path: '/investments', color: '#2196f3' },
      { text: 'Assets', icon: <AccountBalanceWallet />, path: '/assets', color: '#ff9800' },
    ],
  },
];

const bottomMenuItems: MenuItem[] = [
  { text: 'Settings', icon: <Settings />, path: '/settings', color: '#607d8b' },
];

const Sidebar: React.FC<SidebarProps> = ({ open, onClose }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigation = (path: string) => {
    navigate(path);
    if (isMobile) {
      onClose();
    }
  };

  const renderMenuItem = (item: MenuItem) => {
    const isSelected = location.pathname === item.path;

    return (
      <ListItem key={item.text} disablePadding>
        <ListItemButton
          selected={isSelected}
          onClick={() => handleNavigation(item.path)}
          sx={{
            mx: 1,
            borderRadius: 2,
            mb: 0.5,
            '&.Mui-selected': {
              backgroundColor: `${item.color}18`,
              color: item.color,
              '&:hover': {
                backgroundColor: `${item.color}28`,
              },
              '& .MuiListItemIcon-root': {
                color: item.color,
              },
              '& .MuiListItemText-primary': {
                fontWeight: 600,
              },
            },
            '&:hover': {
              backgroundColor: `${item.color}0D`,
            },
          }}
        >
          <ListItemIcon
            sx={{
              minWidth: 36,
              color: isSelected ? item.color : `${item.color}99`,
            }}
          >
            {item.icon}
          </ListItemIcon>
          <ListItemText
            primary={item.text}
            primaryTypographyProps={{
              fontSize: '0.875rem',
            }}
          />
        </ListItemButton>
      </ListItem>
    );
  };

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar />
      <Box sx={{ flexGrow: 1, pt: 1 }}>
        {menuGroups.map((group, index) => (
          <Box key={group.label}>
            {index > 0 && <Divider sx={{ mx: 2, my: 1 }} />}
            <Typography
              variant="overline"
              sx={{
                px: 2.5,
                pt: 1.5,
                pb: 0.5,
                display: 'block',
                color: 'text.disabled',
                fontSize: '0.68rem',
                letterSpacing: 1.2,
              }}
            >
              {group.label}
            </Typography>
            <List disablePadding>
              {group.items.map(renderMenuItem)}
            </List>
          </Box>
        ))}
      </Box>
      <Divider />
      <List sx={{ pb: 1 }}>
        {bottomMenuItems.map(renderMenuItem)}
      </List>
    </Box>
  );

  return (
    <>
      {isMobile ? (
        <Drawer
          variant="temporary"
          open={open}
          onClose={onClose}
          ModalProps={{ keepMounted: true }}
          sx={{
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH,
            },
          }}
        >
          {drawerContent}
        </Drawer>
      ) : (
        <Drawer
          variant="permanent"
          sx={{
            width: DRAWER_WIDTH,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
              borderRight: '1px solid',
              borderColor: 'divider',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}
    </>
  );
};

export default Sidebar;
