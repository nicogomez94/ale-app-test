import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  Button, 
  AppBar, 
  Toolbar, 
  IconButton, 
  Drawer, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText,
  Divider,
  Avatar,
  Menu,
  MenuItem,
  Chip
} from '@mui/material';
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  CreditCard, 
  Bell, 
  Settings, 
  LogOut, 
  Menu as MenuIcon,
  ChevronRight,
  Plus,
  TrendingUp,
  AlertTriangle,
  Clock,
  Calendar,
  UserCircle,
  BarChart3,
  Sun,
  Moon,
  Building2,
  HeartPulse
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useNavigate, useLocation } from 'react-router-dom';
import { Badge } from '@mui/material';
import { MOCK_POLICIES, getExpiringPoliciesCount } from '../data/mockData';

interface LayoutProps {
  children: React.ReactNode;
  user: any;
  onLogout: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

const drawerWidth = 260;

const Logo = () => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
    <Box sx={{ 
      width: 40, 
      height: 40, 
      bgcolor: 'primary.main', 
      borderRadius: 2.5, 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      boxShadow: '0 4px 12px rgba(26, 35, 126, 0.3)'
    }}>
      <Bell size={24} color="white" />
    </Box>
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 900, letterSpacing: -1, lineHeight: 1, color: 'primary.main' }}>
        PAS ALERT
      </Typography>
      <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: 1, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.6rem' }}>
        Insurance Tech
      </Typography>
    </Box>
  </Box>
);

export const Layout: React.FC<LayoutProps> = ({ children, user, onLogout, isDarkMode, onToggleDarkMode }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const navigate = useNavigate();
  const location = useLocation();

  const expiringCount = getExpiringPoliciesCount(MOCK_POLICIES);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const menuItems = [
    { text: 'Dashboard', icon: <LayoutDashboard size={20} color="#4f46e5" />, path: '/' },
    { text: 'Clientes', icon: <UserCircle size={20} color="#0ea5e9" />, path: '/clientes' },
    { text: 'Empresas', icon: <Building2 size={20} color="#8b5cf6" />, path: '/empresas' },
    { text: 'Vida y Finanzas', icon: <HeartPulse size={20} color="#ef4444" />, path: '/vida-finanzas' },
    { text: 'Pólizas', icon: <FileText size={20} color="#f59e0b" />, path: '/polizas' },
    { text: 'Comisiones', icon: <BarChart3 size={20} color="#10b981" />, path: '/comisiones' },
    { text: 'Referidos', icon: <Users size={20} color="#ec4899" />, path: '/referidos' },
    { text: 'Suscripción', icon: <CreditCard size={20} color="#6366f1" />, path: '/pagos' },
  ];

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 3 }}>
        <Logo />
      </Box>
      <Divider sx={{ opacity: 0.5 }} />
      <List sx={{ px: 2, py: 3, flexGrow: 1 }}>
        {menuItems.map((item) => (
          <ListItem 
            key={item.text} 
            component="div"
            onClick={() => {
              navigate(item.path);
              setMobileOpen(false);
            }}
            sx={{ 
              borderRadius: 2, 
              mb: 1, 
              cursor: 'pointer',
              bgcolor: location.pathname === item.path ? 'primary.main' : 'transparent',
              color: location.pathname === item.path ? 'white' : 'text.primary',
              '& .MuiListItemIcon-root': { color: location.pathname === item.path ? 'white' : 'text.secondary' },
              '&:hover': { bgcolor: location.pathname === item.path ? 'primary.main' : 'primary.light', color: 'white', '& .MuiListItemIcon-root': { color: 'white' } } 
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText primary={item.text} primaryTypographyProps={{ fontWeight: 500 }} />
          </ListItem>
        ))}
      </List>
      <Box sx={{ p: 2 }}>
        <Card sx={{ bgcolor: 'primary.dark', color: 'white', borderRadius: 3 }}>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Typography variant="caption" sx={{ opacity: 0.8, textTransform: 'uppercase', letterSpacing: 1 }}>
              Plan Actual
            </Typography>
            <Typography variant="h6" sx={{ mb: 1 }}>Gratis</Typography>
            <Button 
              variant="contained" 
              color="secondary" 
              fullWidth 
              size="small"
              onClick={() => navigate('/pagos')}
            >
              Mejorar Plan
            </Button>
          </CardContent>
        </Card>
      </Box>
      <Divider sx={{ opacity: 0.5 }} />
      <List sx={{ px: 2, py: 2 }}>
        <ListItem 
          component="div"
          onClick={onLogout}
          sx={{ borderRadius: 2, cursor: 'pointer', '&:hover': { bgcolor: 'error.light', color: 'white', '& .MuiListItemIcon-root': { color: 'white' } } }}
        >
          <ListItemIcon sx={{ minWidth: 40, color: 'text.secondary' }}>
            <LogOut size={20} />
          </ListItemIcon>
          <ListItemText primary="Cerrar Sesión" />
        </ListItem>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          bgcolor: 'background.paper',
          color: 'text.primary',
          boxShadow: 'none',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          
          <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
              <Calendar size={18} />
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {format(currentTime, "EEEE, d 'de' MMMM", { locale: es })}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'primary.main' }}>
              <Clock size={18} />
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {format(currentTime, "HH:mm:ss 'hs'")}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton onClick={onToggleDarkMode} color="inherit">
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </IconButton>
            <IconButton color="inherit" onClick={() => navigate('/?filter=expiring')}>
              <Badge badgeContent={expiringCount} color="error">
                <Bell size={20} />
              </Badge>
            </IconButton>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer' }} onClick={handleMenu}>
              <Avatar 
                src={user?.avatar}
                sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}
              >
                {user?.nombre?.charAt(0) || 'U'}
              </Avatar>
              <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>{user?.nombre || 'Usuario'}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{user?.email}</Typography>
              </Box>
            </Box>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleClose}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              <MenuItem onClick={() => { handleClose(); navigate('/perfil'); }}>Mi Perfil</MenuItem>
              <MenuItem onClick={handleClose}>Configuración</MenuItem>
              <Divider />
              <MenuItem onClick={onLogout}>Cerrar Sesión</MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, borderRight: '1px solid', borderColor: 'divider' },
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
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mt: '64px',
          bgcolor: 'background.default',
        }}
      >
        {children}
      </Box>
    </Box>
  );
};
