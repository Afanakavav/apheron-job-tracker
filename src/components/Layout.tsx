import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  useTheme,
  useMediaQuery,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  FormControlLabel,
  Checkbox,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Work as WorkIcon,
  Description as DescriptionIcon,
  Analytics as AnalyticsIcon,
  Psychology as PsychologyIcon,
  Email as EmailIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  AccountCircle,
  InstallMobile as InstallIcon,
  Search as SearchIcon,
  People as PeopleIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../hooks/useTranslation';
import { disconnectGmail } from '../services/gmailServiceClient';
import { usePWAInstall } from '../hooks/useMobile';
import { prefetchOnHover } from '../services/prefetchService';
import { Breadcrumbs } from './Breadcrumbs';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

const drawerWidth = 240;

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [disconnectGmailChecked, setDisconnectGmailChecked] = useState(false);
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { install, isInstallable } = usePWAInstall();
  const [installPromptOpen, setInstallPromptOpen] = useState(false);
  const [hasShownPrompt, setHasShownPrompt] = useState(false);

  // Show install prompt after 3 seconds if app is installable
  useEffect(() => {
    if (isInstallable && !hasShownPrompt) {
      const timer = setTimeout(() => {
        setInstallPromptOpen(true);
        setHasShownPrompt(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isInstallable, hasShownPrompt]);

  // Global keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: 'n',
      ctrlKey: true,
      action: () => navigate('/applications?action=new'),
      description: 'Nuova candidatura',
    },
    {
      key: 'f',
      ctrlKey: true,
      action: () => {
        // Focus search if available, otherwise navigate to search
        const searchInput = document.querySelector('input[type="search"], input[placeholder*="Cerca"], input[placeholder*="Search"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        } else {
          navigate('/job-search');
        }
      },
      description: 'Cerca',
    },
    {
      key: 'k',
      ctrlKey: true,
      action: () => {
        // Command palette (future feature)
        console.log('Command palette - da implementare');
      },
      description: 'Command palette',
    },
    {
      key: '/',
      ctrlKey: true,
      action: () => {
        // Show shortcuts help
        alert('Shortcuts:\nCtrl+N: Nuova candidatura\nCtrl+F: Cerca\nCtrl+K: Command palette\nCtrl+/: Mostra shortcuts');
      },
      description: 'Mostra shortcuts',
    },
  ]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleProfileMenuClose();
    setLogoutDialogOpen(true);
  };

  const handleLogoutConfirm = async () => {
    try {
      // Disconnect Gmail if checkbox is checked
      if (disconnectGmailChecked && currentUser) {
        try {
          await disconnectGmail(currentUser.uid);
          console.log('✅ Gmail disconnected during logout');
        } catch (error) {
          console.error('❌ Error disconnecting Gmail:', error);
        }
      }

      // Logout
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Errore logout:', error);
    } finally {
      setLogoutDialogOpen(false);
      setDisconnectGmailChecked(false);
    }
  };

  const handleLogoutCancel = () => {
    setLogoutDialogOpen(false);
    setDisconnectGmailChecked(false);
  };

  const menuItems = [
    { text: t('nav.dashboard'), icon: <DashboardIcon />, path: '/dashboard' },
    { text: t('nav.applications'), icon: <WorkIcon />, path: '/applications' },
    { text: t('nav.jobSearch'), icon: <SearchIcon />, path: '/job-search', badge: '🔍' },
    { text: t('nav.networking'), icon: <PeopleIcon />, path: '/networking', badge: '👥' },
    { text: t('nav.cvManager'), icon: <DescriptionIcon />, path: '/cv-manager' },
    { text: t('nav.analytics'), icon: <AnalyticsIcon />, path: '/analytics' },
    { text: t('nav.aiAssistant'), icon: <PsychologyIcon />, path: '/ai-assistant', badge: '🤖' },
    { text: t('nav.gmailIntegration'), icon: <EmailIcon />, path: '/gmail', badge: '📧' },
    { text: t('nav.settings'), icon: <SettingsIcon />, path: '/settings' },
  ];

  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 'bold' }}>
          Apheron Jobs
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onMouseEnter={() => {
                if (currentUser?.uid) {
                  prefetchOnHover(item.path, currentUser.uid);
                }
              }}
              onClick={() => {
                navigate(item.path);
                if (isMobile) {
                  setMobileOpen(false);
                }
              }}
              sx={{
                '&.Mui-selected': {
                  backgroundColor: theme.palette.primary.main,
                  color: 'white',
                  '&:hover': {
                    backgroundColor: theme.palette.primary.dark,
                  },
                  '& .MuiListItemIcon-root': {
                    color: 'white',
                  },
                },
              }}
            >
              <ListItemIcon
                sx={{
                  color: location.pathname === item.path ? 'inherit' : 'inherit',
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Job Tracker
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {isInstallable && (
              <IconButton
                onClick={async () => {
                  const installed = await install();
                  if (installed) {
                    setInstallPromptOpen(false);
                  }
                }}
                color="inherit"
                title="Installa app"
              >
                <InstallIcon />
              </IconButton>
            )}
            <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>
              {currentUser?.displayName || currentUser?.email}
            </Typography>
            <IconButton onClick={handleProfileMenuOpen} color="inherit" sx={{ minWidth: 40, minHeight: 40 }}>
              {currentUser?.photoURL ? (
                <Avatar src={currentUser.photoURL} sx={{ width: 32, height: 32 }} />
              ) : (
                <AccountCircle />
              )}
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleProfileMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        {isInstallable && (
          <MenuItem
            onClick={async () => {
              handleProfileMenuClose();
              const installed = await install();
              if (!installed) {
                // Fallback: mostra istruzioni se l'installazione non funziona
                alert('Per installare l\'app, usa il menu Chrome (3 punti) → "Installa app" o "Aggiungi alla schermata home"');
              }
            }}
          >
            <ListItemIcon>
              <InstallIcon fontSize="small" />
            </ListItemIcon>
            Installa App
          </MenuItem>
        )}
        <MenuItem onClick={() => { navigate('/settings'); handleProfileMenuClose(); }}>
          <ListItemIcon>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          {t('nav.settings')}
        </MenuItem>
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          {t('nav.logout')}
        </MenuItem>
      </Menu>

      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 1.5, sm: 2, md: 3 },
          width: { md: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          backgroundColor: '#f5f5f5',
          pb: { xs: 10, md: 3 }, // Extra padding bottom on mobile for FAB
        }}
      >
        <Toolbar />
        <Breadcrumbs />
        {children}
      </Box>

      {/* Logout Confirmation Dialog */}
      <Dialog
        open={logoutDialogOpen}
        onClose={handleLogoutCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Conferma Logout</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Sei sicuro di voler uscire?
          </DialogContentText>
          <Box sx={{ mt: 2 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={disconnectGmailChecked}
                  onChange={(e) => setDisconnectGmailChecked(e.target.checked)}
                  color="error"
                />
              }
              label="Disconnetti anche Gmail"
            />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, ml: 4 }}>
              ℹ️ Se non selezioni questa opzione, l'integrazione Gmail rimarrà attiva. 
              Potrai disconnetterla manualmente dalla pagina Integrazione Gmail.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleLogoutCancel} color="primary">
            Annulla
          </Button>
          <Button
            onClick={handleLogoutConfirm}
            color="error"
            variant="contained"
            autoFocus
          >
            Esci
          </Button>
        </DialogActions>
      </Dialog>

      {/* PWA Install Prompt */}
      <Snackbar
        open={isInstallable && installPromptOpen}
        autoHideDuration={6000}
        onClose={() => setInstallPromptOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setInstallPromptOpen(false)}
          severity="info"
          action={
            <Button
              color="inherit"
              size="small"
              onClick={async () => {
                const installed = await install();
                if (installed) {
                  setInstallPromptOpen(false);
                }
              }}
            >
              Installa
            </Button>
          }
        >
          Installa l'app per un'esperienza migliore!
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Layout;

