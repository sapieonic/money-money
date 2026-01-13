import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Typography,
  Chip,
  Box,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  MoreVert,
  Edit,
  Delete,
  Update,
  History,
  SellOutlined,
} from '@mui/icons-material';
import type { Asset } from '../../types';
import { formatCurrency, capitalizeFirst } from '../../utils/formatters';
import { assetCategoryColors } from '../../theme/theme';

interface AssetListProps {
  assets: Asset[];
  onEdit: (asset: Asset) => void;
  onDelete: (asset: Asset) => void;
  onUpdateValue: (asset: Asset) => void;
  onViewHistory: (asset: Asset) => void;
}

const AssetList: React.FC<AssetListProps> = ({
  assets,
  onEdit,
  onDelete,
  onUpdateValue,
  onViewHistory,
}) => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [selectedAsset, setSelectedAsset] = React.useState<Asset | null>(null);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, asset: Asset) => {
    setAnchorEl(event.currentTarget);
    setSelectedAsset(asset);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedAsset(null);
  };

  const handleAction = (action: (asset: Asset) => void) => {
    if (selectedAsset) {
      action(selectedAsset);
    }
    handleMenuClose();
  };

  if (assets.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">
          No assets added yet. Click "Add Asset" to get started.
        </Typography>
      </Paper>
    );
  }

  return (
    <>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Asset</TableCell>
              <TableCell>Category</TableCell>
              <TableCell align="right">Qty</TableCell>
              <TableCell align="right">Value (INR)</TableCell>
              <TableCell align="right">Value (USD)</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {assets.map((asset) => (
              <TableRow key={asset._id} hover>
                <TableCell>
                  <Box>
                    <Typography variant="body1" fontWeight={500}>
                      {asset.name}
                    </Typography>
                    {asset.platform && (
                      <Typography variant="caption" color="text.secondary">
                        {asset.platform}
                      </Typography>
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={capitalizeFirst(asset.category)}
                    size="small"
                    sx={{
                      backgroundColor: `${assetCategoryColors[asset.category]}20`,
                      color: assetCategoryColors[asset.category],
                    }}
                  />
                </TableCell>
                <TableCell align="right">
                  {asset.quantity > 0 ? (
                    <Box>
                      <Typography variant="body2">{asset.quantity}</Typography>
                      {asset.category === 'rsu' && asset.unitPrice && (
                        <Typography variant="caption" color="text.secondary">
                          @ {asset.currency === 'USD' ? '$' : '₹'}{asset.unitPrice.toLocaleString()}
                        </Typography>
                      )}
                    </Box>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell align="right">
                  <Typography fontWeight={600} color="warning.dark">
                    {formatCurrency(asset.currentValueINR)}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  {asset.currentValueUSD > 0 ? (
                    <Typography color="text.secondary">
                      {formatCurrency(asset.currentValueUSD, 'USD')}
                    </Typography>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell align="center">
                  <IconButton onClick={(e) => handleMenuClick(e, asset)}>
                    <MoreVert />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => handleAction(onUpdateValue)}>
          <ListItemIcon>
            <Update fontSize="small" />
          </ListItemIcon>
          <ListItemText>Update Value</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleAction(onViewHistory)}>
          <ListItemIcon>
            <History fontSize="small" />
          </ListItemIcon>
          <ListItemText>View History</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleAction(onEdit)}>
          <ListItemIcon>
            <Edit fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit Details</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleAction(onDelete)} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <SellOutlined fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Mark as Sold</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleAction(onDelete)} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <Delete fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};

export default AssetList;
