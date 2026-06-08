import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Button, AppBar, Toolbar,
  IconButton, Drawer, List, ListItem, ListItemIcon, ListItemText,
  Divider, Avatar, Menu, MenuItem, Badge, Tooltip
} from '@mui/material';
import {
  LayoutDashboard, FileText, Users, CreditCard, Bell, LogOut,
  Menu as MenuIcon, UserCircle, BarChart3, Sun, Moon, Building2, HeartPulse,
  Calendar, Clock, Shield, AlertTriangle, ClipboardList, MessageSquare,
  PanelLeftClose, PanelLeftOpen, Landmark
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../api';

interface LayoutProps {
  children: React.ReactNode;
  user: any;
  onLogout: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  subscriptionWarning?: { show: boolean; diasRestantes: number };
}

const drawerWidth = 260;
const collapsedDrawerWidth = 84;

const Logo = () => (
  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', flex: 1, minWidth: 0 }}>
    <Box
      component="img"
      src="/assets/2.svg"
      alt="PAS Alert"
      sx={{
        height: { xs: 58, sm: 64 },
        width: 'auto',
        maxWidth: '168px',
        objectFit: 'contain',
        display: 'block',
        transform: 'translateY(4px)',
      }}
    />
  </Box>
);

export const Layout: React.FC<LayoutProps> = ({ children, user, onLogout, isDarkMode, onToggleDarkMode, subscriptionWarning }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [expiringCount, setExpiringCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = !!user?.isAdmin;
  const subscriptionSectionLabel = isAdmin ? 'Planes' : 'Suscripción';

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    api.dashboard.stats().then(s => setExpiringCount(s.vencen7Dias)).catch(() => {});
  }, [location.pathname]);

  const menuItems = [
    { text: 'Dashboard', icon: <LayoutDashboard size={20} color="#4f46e5" />, path: '/dashboard' },
    { text: 'Clientes', icon: <UserCircle size={20} color="#0ea5e9" />, path: '/clientes' },
    { text: 'Empresas', icon: <Building2 size={20} color="#8b5cf6" />, path: '/empresas' },
    { text: 'Vida y Retiro', icon: <HeartPulse size={20} color="#ef4444" />, path: '/vida-y-retiro' },
    { text: 'Pólizas', icon: <FileText size={20} color="#f59e0b" />, path: '/polizas' },
    { text: 'Siniestros', icon: <ClipboardList size={20} color="#dc2626" />, path: '/siniestros' },
    { text: 'Cotizaciones', icon: <MessageSquare size={20} color="#0891b2" />, path: '/cotizaciones' },
    { text: 'Directorio', icon: <Landmark size={20} color="#475569" />, path: '/directorio' },
    { text: 'Comisiones', icon: <BarChart3 size={20} color="#10b981" />, path: '/comisiones' },
    { text: 'Referidos', icon: <Users size={20} color="#ec4899" />, path: '/referidos' },
    { text: subscriptionSectionLabel, icon: <CreditCard size={20} color="#6366f1" />, path: '/pagos' },
    ...(user?.isAdmin ? [{ text: 'Administración', icon: <Shield size={20} color="#dc2626" />, path: '/admin' }] : []),
  ];

  const activeDrawerWidth = sidebarCollapsed ? collapsedDrawerWidth : drawerWidth;

  const renderDrawer = (collapsed = false, showCollapseButton = false) => (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box
        sx={{
          px: collapsed ? 1.5 : 2.25,
          py: collapsed ? 1.5 : 2,
          minHeight: collapsed ? 88 : 104,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          gap: 1.5,
        }}
      >
        {!collapsed && <Logo />}
        {showCollapseButton && (
          <Tooltip title={collapsed ? 'Ampliar menú' : 'Esconder menú'} placement="right">
            <IconButton
              color="inherit"
              onClick={() => setSidebarCollapsed((prev) => !prev)}
              aria-label={collapsed ? 'Ampliar menú' : 'Esconder menú'}
              sx={{
                flexShrink: 0,
                width: 48,
                height: 48,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              {collapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
            </IconButton>
          </Tooltip>
        )}
      </Box>
      <Divider sx={{ opacity: 0.5 }} />
      <List sx={{ px: collapsed ? 1.25 : 2, py: 3, flexGrow: 1 }}>
        {menuItems.map((item) => (
          <Tooltip key={item.text} title={collapsed ? item.text : ''} placement="right">
            <ListItem
              component="div"
              onClick={() => { navigate(item.path); setMobileOpen(false); }}
              sx={{
                borderRadius: 2,
                mb: 1,
                cursor: 'pointer',
                minHeight: 48,
                justifyContent: collapsed ? 'center' : 'flex-start',
                px: collapsed ? 1 : 2,
                bgcolor: location.pathname === item.path ? 'primary.main' : 'transparent',
                color: location.pathname === item.path ? 'white' : 'text.primary',
                '& .MuiListItemIcon-root': { color: location.pathname === item.path ? 'white' : 'text.secondary' },
                '&:hover': { bgcolor: location.pathname === item.path ? 'primary.main' : 'primary.light', color: 'white', '& .MuiListItemIcon-root': { color: 'white' } }
              }}
            >
              <ListItemIcon sx={{ minWidth: collapsed ? 0 : 40, justifyContent: 'center' }}>{item.icon}</ListItemIcon>
              {!collapsed && <ListItemText primary={item.text} primaryTypographyProps={{ fontWeight: 500 }} />}
            </ListItem>
          </Tooltip>
        ))}
      </List>
      {!collapsed && <Box sx={{ p: 2 }}>
        <Card sx={{ bgcolor: 'primary.dark', color: 'white', borderRadius: 3 }}>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Typography variant="caption" sx={{ opacity: 0.8, textTransform: 'uppercase', letterSpacing: 1 }}>
              Plan Actual
            </Typography>
            <Typography variant="h6" sx={{ mb: 1 }}>{isAdmin ? 'Administrador' : user?.plan || 'Gratis'}</Typography>
            {isAdmin ? (
              <Button variant="contained" color="secondary" fullWidth size="small" onClick={() => navigate('/pagos')}>
                Ver planes
              </Button>
            ) : (
              <Button variant="contained" color="secondary" fullWidth size="small" onClick={() => navigate('/pagos')}>
                Mejorar Plan
              </Button>
            )}
          </CardContent>
        </Card>
      </Box>}
      <Divider sx={{ opacity: 0.5 }} />
      <List sx={{ px: collapsed ? 1.25 : 2, py: 2 }}>
        <Tooltip title={collapsed ? 'Cerrar Sesión' : ''} placement="right">
          <ListItem
            component="div"
            onClick={onLogout}
            sx={{
              borderRadius: 2,
              cursor: 'pointer',
              minHeight: 48,
              justifyContent: collapsed ? 'center' : 'flex-start',
              px: collapsed ? 1 : 2,
              '&:hover': { bgcolor: 'error.light', color: 'white', '& .MuiListItemIcon-root': { color: 'white' } }
            }}
          >
            <ListItemIcon sx={{ minWidth: collapsed ? 0 : 40, justifyContent: 'center', color: 'text.secondary' }}><LogOut size={20} /></ListItemIcon>
            {!collapsed && <ListItemText primary="Cerrar Sesión" />}
          </ListItem>
        </Tooltip>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', width: '100%', overflowX: 'hidden' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${activeDrawerWidth}px)` },
          ml: { sm: `${activeDrawerWidth}px` },
          maxWidth: '100%',
          bgcolor: 'background.paper', color: 'text.primary',
          boxShadow: 'none', borderBottom: '1px solid', borderColor: 'divider',
          transition: (theme) => theme.transitions.create(['margin-left', 'width'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.standard,
          }),
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', minWidth: 0, gap: { xs: 1, sm: 2 } }}>
          <IconButton color="inherit" edge="start" onClick={() => setMobileOpen(!mobileOpen)} sx={{ mr: 2, display: { sm: 'none' } }}>
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

          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 }, minWidth: 0 }}>
            <IconButton onClick={onToggleDarkMode} color="inherit">
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </IconButton>
            <IconButton color="inherit" onClick={() => navigate('/dashboard?filter=expiring')}>
              <Badge badgeContent={expiringCount} color="error"><Bell size={20} /></Badge>
            </IconButton>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer' }} onClick={(e) => setAnchorEl(e.currentTarget)}>
              <Avatar src={user?.avatar} sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
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
              onClose={() => setAnchorEl(null)}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              <MenuItem onClick={() => { setAnchorEl(null); navigate('/perfil'); }}>Mi Perfil</MenuItem>
              <Divider />
              <MenuItem onClick={onLogout}>Cerrar Sesión</MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{
          width: { sm: activeDrawerWidth },
          flexShrink: { sm: 0 },
          transition: (theme) => theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.standard,
          }),
        }}
      >
        <Drawer variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)} ModalProps={{ keepMounted: true }}
          sx={{ display: { xs: 'block', sm: 'none' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth } }}
        >
          {renderDrawer(false)}
        </Drawer>
        <Drawer variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: activeDrawerWidth,
              overflowX: 'hidden',
              borderRight: '1px solid',
              borderColor: 'divider',
              transition: (theme) => theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.standard,
              }),
            }
          }}
          open
        >
          {renderDrawer(sidebarCollapsed, true)}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          maxWidth: '100%',
          p: { xs: 2, sm: 3 },
          width: { xs: '100%', sm: `calc(100% - ${activeDrawerWidth}px)` },
          mt: '64px',
          bgcolor: 'background.default',
          transition: (theme) => theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.standard,
          }),
        }}
      >
        {subscriptionWarning?.show && (
          <Box sx={{
            display: 'flex', alignItems: 'center', gap: 2, p: 2, mb: 2,
            bgcolor: 'warning.light', borderRadius: 2, border: '1px solid',
            borderColor: 'warning.main',
          }}>
            <AlertTriangle size={22} color="#ed6c02" />
            <Typography variant="body2" sx={{ flexGrow: 1, fontWeight: 500 }}>
              Tu suscripción vence en <strong>{subscriptionWarning.diasRestantes} día{subscriptionWarning.diasRestantes !== 1 ? 's' : ''}</strong>. Renová ahora para no perder acceso.
            </Typography>
            <Button variant="contained" color="warning" size="small" onClick={() => navigate('/pagos')}>
              Renovar
            </Button>
          </Box>
        )}
        {children}
      </Box>
    </Box>
  );
};
