import { Card, CardContent, Box, Skeleton } from '@mui/material';

export const ApplicationCardSkeleton = () => (
  <Card>
    <CardContent>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
        <Box flex={1}>
          <Skeleton variant="text" width="60%" height={32} />
          <Skeleton variant="text" width="40%" height={24} sx={{ mt: 1 }} />
        </Box>
        <Skeleton variant="circular" width={40} height={40} />
      </Box>
      <Skeleton variant="rectangular" width="100%" height={60} sx={{ borderRadius: 1, mb: 2 }} />
      <Box display="flex" gap={1} mb={2}>
        <Skeleton variant="rounded" width={80} height={24} />
        <Skeleton variant="rounded" width={100} height={24} />
      </Box>
      <Box display="flex" justifyContent="space-between">
        <Skeleton variant="text" width="40%" height={20} />
        <Skeleton variant="text" width="30%" height={20} />
      </Box>
    </CardContent>
  </Card>
);

export const ApplicationListSkeleton = ({ count = 3 }: { count?: number }) => (
  <Box>
    {Array.from({ length: count }).map((_, i) => (
      <ApplicationCardSkeleton key={i} />
    ))}
  </Box>
);

