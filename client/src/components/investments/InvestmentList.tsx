import React from 'react';
import {
  List,
  ListItem,
  ListItemText,
  IconButton,
  Typography,
  Box,
  Chip,
  Paper,
} from '@mui/material';
import { Edit, Delete, PauseCircle, PlayCircle } from '@mui/icons-material';
import type { Investment, InvestmentStatus } from '../../types';
import { formatCurrency, capitalizeFirst } from '../../utils/formatters';

interface InvestmentListProps {
  investments: Investment[];
  onEdit: (investment: Investment) => void;
  onDelete: (investment: Investment) => void;
  onToggleStatus: (investment: Investment, newStatus: InvestmentStatus) => void;
}

const statusColors: Record<InvestmentStatus, 'success' | 'warning' | 'default'> = {
  active: 'success',
  paused: 'warning',
  stopped: 'default',
};

const InvestmentList: React.FC<InvestmentListProps> = ({
  investments,
  onEdit,
  onDelete,
  onToggleStatus,
}) => {
  if (investments.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">
          No investments added yet. Click "Add" to get started.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper>
      <List disablePadding>
        {investments.map((investment, index) => (
          <ListItem
            key={investment._id}
            divider={index < investments.length - 1}
            secondaryAction={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {investment.status === 'active' ? (
                  <IconButton
                    aria-label="pause"
                    onClick={() => onToggleStatus(investment, 'paused')}
                    color="warning"
                    title="Pause"
                  >
                    <PauseCircle fontSize="small" />
                  </IconButton>
                ) : (
                  <IconButton
                    aria-label="resume"
                    onClick={() => onToggleStatus(investment, 'active')}
                    color="success"
                    title="Resume"
                  >
                    <PlayCircle fontSize="small" />
                  </IconButton>
                )}
                <IconButton
                  aria-label="edit"
                  onClick={() => onEdit(investment)}
                >
                  <Edit fontSize="small" />
                </IconButton>
                <IconButton
                  aria-label="delete"
                  onClick={() => onDelete(investment)}
                  color="error"
                >
                  <Delete fontSize="small" />
                </IconButton>
              </Box>
            }
          >
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Typography variant="body1" fontWeight={500}>
                    {investment.name}
                  </Typography>
                  <Chip
                    label={capitalizeFirst(investment.category)}
                    size="small"
                    variant="outlined"
                  />
                  <Chip
                    label={capitalizeFirst(investment.status)}
                    size="small"
                    color={statusColors[investment.status]}
                  />
                  {investment.platform && (
                    <Typography variant="caption" color="text.secondary">
                      via {investment.platform}
                    </Typography>
                  )}
                </Box>
              }
              secondary={
                <Typography
                  variant="h6"
                  color={investment.type === 'sip' ? 'info.main' : 'secondary.main'}
                  fontWeight={600}
                >
                  {formatCurrency(investment.amount)}/month
                </Typography>
              }
            />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
};

export default InvestmentList;
