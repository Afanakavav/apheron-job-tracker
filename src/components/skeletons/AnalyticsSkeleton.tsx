import { Box, Skeleton, Card, CardContent } from '@mui/material';

export const AnalyticsSkeleton = () => (
  <Box sx={{ p: 3 }}>
    {/* Header */}
    <Box mb={3}>
      <Skeleton variant="text" width="30%" height={40} />
      <Skeleton variant="text" width="50%" height={24} sx={{ mt: 1 }} />
    </Box>

    {/* Stats Grid */}
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2, mb: 3 }}>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Card key={i}>
          <CardContent>
            <Skeleton variant="text" width="70%" height={24} />
            <Skeleton variant="text" width="50%" height={40} sx={{ mt: 1 }} />
            <Skeleton variant="text" width="60%" height={20} sx={{ mt: 1 }} />
          </CardContent>
        </Card>
      ))}
    </Box>

    {/* Charts */}
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2, mb: 3 }}>
      <Card>
        <CardContent>
          <Skeleton variant="text" width="40%" height={32} />
          <Skeleton variant="rectangular" width="100%" height={300} sx={{ mt: 2, borderRadius: 1 }} />
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <Skeleton variant="text" width="40%" height={32} />
          <Skeleton variant="rectangular" width="100%" height={300} sx={{ mt: 2, borderRadius: 1 }} />
        </CardContent>
      </Card>
    </Box>

    {/* Insights */}
    <Card>
      <CardContent>
        <Skeleton variant="text" width="30%" height={32} />
        <Box mt={2}>
          {[1, 2, 3].map((i) => (
            <Box key={i} mb={2}>
              <Skeleton variant="text" width="100%" height={24} />
              <Skeleton variant="text" width="80%" height={20} sx={{ mt: 0.5 }} />
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  </Box>
);

