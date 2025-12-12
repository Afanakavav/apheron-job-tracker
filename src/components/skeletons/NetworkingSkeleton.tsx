import { Box, Skeleton, Card, CardContent } from '@mui/material';

export const NetworkingSkeleton = () => (
  <Box sx={{ p: 3 }}>
    {/* Header */}
    <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
      <Box>
        <Skeleton variant="text" width={200} height={40} />
        <Skeleton variant="text" width={300} height={24} sx={{ mt: 1 }} />
      </Box>
      <Skeleton variant="rectangular" width={150} height={40} sx={{ borderRadius: 1 }} />
    </Box>

    {/* Search and Filters */}
    <Box display="flex" gap={2} mb={3}>
      <Skeleton variant="rectangular" width="100%" height={56} sx={{ borderRadius: 1 }} />
      <Skeleton variant="rectangular" width={150} height={56} sx={{ borderRadius: 1 }} />
    </Box>

    {/* Contact Cards */}
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2 }}>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Card key={i}>
          <CardContent>
            <Box display="flex" alignItems="center" mb={2}>
              <Skeleton variant="circular" width={48} height={48} sx={{ mr: 2 }} />
              <Box flex={1}>
                <Skeleton variant="text" width="70%" height={24} />
                <Skeleton variant="text" width="50%" height={20} sx={{ mt: 0.5 }} />
              </Box>
            </Box>
            <Skeleton variant="text" width="60%" height={20} sx={{ mb: 1 }} />
            <Box display="flex" gap={1} mb={2}>
              <Skeleton variant="rounded" width={80} height={24} />
              <Skeleton variant="rounded" width={60} height={24} />
            </Box>
            <Skeleton variant="text" width="40%" height={16} />
          </CardContent>
        </Card>
      ))}
    </Box>
  </Box>
);

