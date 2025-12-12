import { Box, Skeleton, Card, CardContent } from '@mui/material';

export const DashboardSkeleton = () => (
  <Box sx={{ p: 3 }}>
    {/* Header */}
    <Box mb={3}>
      <Skeleton variant="text" width="40%" height={40} />
      <Skeleton variant="text" width="60%" height={24} sx={{ mt: 1 }} />
    </Box>

    {/* Stats Cards */}
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <CardContent>
            <Skeleton variant="text" width="60%" height={24} />
            <Skeleton variant="text" width="40%" height={32} sx={{ mt: 1 }} />
          </CardContent>
        </Card>
      ))}
    </Box>

    {/* Charts */}
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2, mb: 3 }}>
      <Card>
        <CardContent>
          <Skeleton variant="text" width="50%" height={32} />
          <Skeleton variant="rectangular" width="100%" height={200} sx={{ mt: 2, borderRadius: 1 }} />
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <Skeleton variant="text" width="50%" height={32} />
          <Skeleton variant="rectangular" width="100%" height={200} sx={{ mt: 2, borderRadius: 1 }} />
        </CardContent>
      </Card>
    </Box>

    {/* Recent Applications */}
    <Card>
      <CardContent>
        <Skeleton variant="text" width="40%" height={32} />
        <Box mt={2}>
          {[1, 2, 3].map((i) => (
            <Box key={i} display="flex" alignItems="center" mb={2}>
              <Skeleton variant="circular" width={48} height={48} sx={{ mr: 2 }} />
              <Box flex={1}>
                <Skeleton variant="text" width="70%" height={24} />
                <Skeleton variant="text" width="50%" height={20} sx={{ mt: 0.5 }} />
              </Box>
              <Skeleton variant="rounded" width={80} height={24} />
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  </Box>
);

