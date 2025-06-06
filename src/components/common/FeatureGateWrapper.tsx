import React from 'react';
import { useProfile } from '../../contexts/ProfileContext';
import { Typography, Button, Box } from '@mui/material';

interface FeatureGateWrapperProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const FeatureGateWrapper: React.FC<FeatureGateWrapperProps> = ({ feature, children, fallback }) => {
  const { user, isPremium, featureFlags } = useProfile();

  // Example: premium features or feature flags
  const hasAccess =
    (feature === 'premium' && isPremium) ||
    (featureFlags && featureFlags[feature]) ||
    false;

  if (hasAccess) return <>{children}</>;

  return (
    fallback || (
      <Box textAlign="center" p={3}>
        <Typography variant="h6">This feature requires an upgrade</Typography>
        <Typography variant="body2" mb={2}>Unlock <b>{feature}</b> and more with FitArchitect Premium.</Typography>
        <Button variant="contained" color="primary" href="/settings/subscription">Upgrade Now</Button>
      </Box>
    )
  );
};

export default FeatureGateWrapper; 