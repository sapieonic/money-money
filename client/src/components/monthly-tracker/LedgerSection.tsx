import React from 'react';
import {
  Paper,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Button,
  Chip,
} from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import type { LedgerSection as LedgerSectionType } from '../../types';

interface LedgerItem {
  _id: string;
  sourceId: string | null;
  name: string;
  amount: number;
  [key: string]: unknown;
}

interface LedgerSectionProps {
  title: string;
  items: LedgerItem[];
  sectionKey: LedgerSectionType;
  onAdd: (section: LedgerSectionType) => void;
  onEdit: (section: LedgerSectionType, item: LedgerItem) => void;
  onDelete: (section: LedgerSectionType, item: LedgerItem) => void;
  formatAmount: (amount: number, currency?: string) => string;
  getChipLabel?: (item: LedgerItem) => string;
  getChipColor?: (item: LedgerItem) => string;
}

const LedgerSection: React.FC<LedgerSectionProps> = ({
  title,
  items,
  sectionKey,
  onAdd,
  onEdit,
  onDelete,
  formatAmount,
  getChipLabel,
  getChipColor,
}) => {
  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" fontWeight={600}>
          {title}
        </Typography>
        <Button
          startIcon={<Add />}
          variant="outlined"
          size="small"
          onClick={() => onAdd(sectionKey)}
        >
          Add
        </Button>
      </Box>
      {items.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
          No items yet
        </Typography>
      ) : (
        <List dense disablePadding>
          {items.map((item) => (
            <ListItem
              key={item._id}
              sx={{
                py: 1.5,
                borderBottom: '1px solid',
                borderColor: 'divider',
                '&:last-child': { borderBottom: 'none' },
              }}
              secondaryAction={
                <Box>
                  <IconButton size="small" onClick={() => onEdit(sectionKey, item)}>
                    <Edit fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => onDelete(sectionKey, item)} color="error">
                    <Delete fontSize="small" />
                  </IconButton>
                </Box>
              }
            >
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" fontWeight={500}>
                      {item.name}
                    </Typography>
                    {getChipLabel && (
                      <Chip
                        label={getChipLabel(item)}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: '0.7rem',
                          backgroundColor: getChipColor ? `${getChipColor(item)}20` : undefined,
                          color: getChipColor ? getChipColor(item) : undefined,
                        }}
                      />
                    )}
                    {item.sourceId === null && (
                      <Chip
                        label="Ad-hoc"
                        size="small"
                        variant="outlined"
                        color="info"
                        sx={{ height: 20, fontSize: '0.7rem' }}
                      />
                    )}
                  </Box>
                }
                secondary={
                  <Typography variant="body2" fontWeight={600} color="text.primary">
                    {formatAmount(item.amount, item.currency as string)}
                  </Typography>
                }
              />
            </ListItem>
          ))}
        </List>
      )}
    </Paper>
  );
};

export default LedgerSection;
