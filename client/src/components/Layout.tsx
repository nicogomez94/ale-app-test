import React, { useCallback, useState, useEffect } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Button, AppBar, Toolbar,
  IconButton, Drawer, List, ListItem, ListItemIcon, ListItemText,
  Divider, Avatar, Menu, MenuItem, Badge, Tooltip, Collapse
} from '@mui/material';
import {
  LayoutDashboard, Users, CreditCard, Bell, LogOut,
  Menu as MenuIcon, UserCircle, BarChart3, Sun, Moon, Building2, HeartPulse,
  Calendar, Clock, Shield, AlertTriangle, MessageSquare,
  PanelLeftClose, PanelLeftOpen, ShieldCheck, ChevronDown, ChevronRight, Wrench, Lightbulb, Coins, BookOpen, Send, StickyNote
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../api';
import { AlertCenter } from './AlertCenter';
import { WhatsAppLauncher } from './WhatsAppLauncher';

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
  const [menuCounts, setMenuCounts] = useState({
    clientes: 0,
    empresas: 0,
    vidaRetiro: 0,
    vida: 0,
    retiro: 0,
    cotizaciones: 0,
    siniestros: 0,
    comisiones: 0,
    importaciones: 0,
    aseguradoras: 0,
    referidos: 0,
  });
  const [insurersOpen, setInsurersOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = !!user?.isAdmin;
  const subscriptionSectionLabel = isAdmin ? 'Planes' : 'Suscripción';

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const refreshMenuCounts = useCallback(() => {
    api.dashboard.stats().then((s) => {
      setExpiringCount(s.vencen7Dias || 0);
      setMenuCounts({
        clientes: s.polizasClientes || 0,
        empresas: s.polizasEmpresas || 0,
        vidaRetiro: s.polizasVidaRetiro || 0,
        vida: s.polizasVida || 0,
        retiro: s.polizasRetiro || 0,
        cotizaciones: s.cotizacionesSinVer || 0,
        siniestros: s.siniestrosPendientes || 0,
        comisiones: s.comisionesPendientes || 0,
        importaciones: s.importacionesPendientes || 0,
        aseguradoras: s.aseguradorasTotal || 0,
        referidos: s.referidosMes || 0,
      });
    }).catch(() => {});
  }, []);

  useEffect(() => {
    refreshMenuCounts();
    const timer = window.setInterval(refreshMenuCounts, 60_000);
    window.addEventListener('pas-alert:refresh-counts', refreshMenuCounts);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('pas-alert:refresh-counts', refreshMenuCounts);
    };
  }, [location.pathname, location.search, refreshMenuCounts]);

  useEffect(() => {
    if (['/directorio', '/aseguradoras'].includes(location.pathname)) {
      setInsurersOpen(true);
    }
    if (location.pathname === '/herramientas') setToolsOpen(true);
  }, [location.pathname]);

  const menuItems = [
    { text: 'Dashboard', icon: <LayoutDashboard size={20} color="#4f46e5" />, path: '/dashboard' },
    { text: 'Clientes', icon: <UserCircle size={20} color="#0ea5e9" />, path: '/clientes', badge: menuCounts.clientes, badgeColor: '#0ea5e9' },
    { text: 'Empresas', icon: <Building2 size={20} color="#8b5cf6" />, path: '/empresas', badge: menuCounts.empresas, badgeColor: '#8b5cf6' },
    { text: 'Vida', icon: <HeartPulse size={20} color="#ef4444" />, path: '/vida-y-retiro?tipo=VIDA', badge: menuCounts.vida, badgeColor: '#ef4444', queryType: 'VIDA' },
    { text: 'Retiro', icon: <Coins size={20} color="#f2a900" />, path: '/vida-y-retiro?tipo=RETIRO', badge: menuCounts.retiro, badgeColor: '#f2a900', queryType: 'RETIRO' },
    { text: 'Cotizaciones', icon: <MessageSquare size={20} color="#10b981" />, path: '/cotizaciones', badge: menuCounts.cotizaciones, badgeColor: '#10b981', showZero: true },
    { text: 'Siniestros', icon: <AlertTriangle size={20} color="#f43f5e" />, path: '/siniestros', badge: menuCounts.siniestros, badgeColor: '#f43f5e' },
    { text: 'Comisiones', icon: <BarChart3 size={20} color="#10b981" />, path: '/comisiones', badge: menuCounts.comisiones, badgeColor: '#10b981' },
    { text: 'Referidos', icon: <Users size={20} color="#ec4899" />, path: '/referidos', badge: menuCounts.referidos, badgeColor: '#ec4899' },
    { text: 'Herramientas', icon: <Wrench size={20} color="#667085" />, path: '/herramientas' },
    { text: subscriptionSectionLabel, icon: <CreditCard size={20} color="#6366f1" />, path: '/pagos' },
    { text: 'Sugerencias', icon: <Lightbulb size={20} color="#dbc21b" />, path: '/sugerencias' },
    ...(user?.isAdmin ? [{ text: 'Administración', icon: <Shield size={20} color="#dc2626" />, path: '/admin' }] : []),
  ];

  const insurerSubItems = [
    { text: 'Compañías y Brokers', icon: <ShieldCheck size={20} color="#10b981" />, path: '/aseguradoras', aliases: ['/directorio'] },
  ];
  const toolSubItems = [
    { text: 'Calendario', icon: <Calendar size={18} />, path: '/herramientas?tab=calendario', tab: 'calendario' },
    { text: 'Notas Rápidas', icon: <StickyNote size={18} />, path: '/herramientas?tab=notas', tab: 'notas' },
    { text: 'Lanzador de Chats', icon: <Send size={18} />, path: '/herramientas?tab=lanzador', tab: 'lanzador' },
    { text: 'Biblioteca de Scripts', icon: <BookOpen size={18} />, path: '/herramientas?tab=biblioteca', tab: 'biblioteca' },
  ];

  const isPathActive = (path: string, aliases: string[] = []) => location.pathname === path || aliases.includes(location.pathname);
  const isInsurersActive = insurerSubItems.some((item) => isPathActive(item.path, item.aliases));
  const isMenuItemActive = (item: { path: string; filter?: string; queryType?: string }) => {
    const dashboardFilter = new URLSearchParams(location.search).get('filter');
    const itemPath = item.path.split('?')[0];
    if (item.queryType) return location.pathname === itemPath && new URLSearchParams(location.search).get('tipo') === item.queryType;
    if (item.filter) return location.pathname === '/dashboard' && dashboardFilter === item.filter;
    if (item.path === '/dashboard') return location.pathname === '/dashboard' && !dashboardFilter;
    return location.pathname === itemPath;
  };

  const activeDrawerWidth = sidebarCollapsed ? collapsedDrawerWidth : drawerWidth;

  const renderDrawer = (collapsed = false, showCollapseButton = false) => (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box
        sx={{
          px: collapsed ? 1.5 : 2.25,
          py: collapsed ? 1.5 : 2.5,
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
        {menuItems.slice(0, 8).map((item) => {
          const active = isMenuItemActive(item);
          return (
          <Tooltip key={item.text} title={collapsed ? item.text : ''} placement="right">
            <ListItem
              component="div"
              onClick={() => { navigate(item.path); setMobileOpen(false); }}
              sx={{
                borderRadius: 999,
                mb: 1,
                cursor: 'pointer',
                minHeight: 54,
                justifyContent: collapsed ? 'center' : 'flex-start',
                px: collapsed ? 1 : 2,
                bgcolor: active ? 'primary.main' : 'transparent',
                color: active ? 'white' : 'text.primary',
                '& .MuiListItemIcon-root': { color: active ? 'white' : 'text.secondary' },
                '&:hover': { bgcolor: active ? 'primary.main' : 'primary.light', color: 'white', '& .MuiListItemIcon-root': { color: 'white' } }
              }}
            >
              <ListItemIcon sx={{ minWidth: collapsed ? 0 : 40, justifyContent: 'center' }}>
                {collapsed ? <Badge badgeContent={(item as any).badge || 0} showZero={Boolean((item as any).showZero)} max={99} sx={{ '& .MuiBadge-badge': { bgcolor: (item as any).badgeColor || 'primary.main', color: 'white', fontWeight: 800 } }}>{item.icon}</Badge> : item.icon}
              </ListItemIcon>
              {!collapsed && <ListItemText primary={item.text} primaryTypographyProps={{ fontWeight: 500 }} />}
              {!collapsed && ((item as any).badge > 0 || (item as any).showZero) && <Box sx={{ ml: 'auto', minWidth: 28, height: 28, px: .75, borderRadius: 999, bgcolor: (item as any).badgeColor || 'primary.main', color: 'white', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 900, boxShadow: `0 4px 10px ${(item as any).badgeColor || '#222'}44` }}>{(item as any).badge || 0}</Box>}
            </ListItem>
          </Tooltip>
          );
        })}

        <Tooltip title={collapsed ? 'Aseguradoras' : ''} placement="right">
          <ListItem
            component="div"
            onClick={() => { navigate('/aseguradoras'); setMobileOpen(false); }}
            sx={{
              borderRadius: 999,
              mb: 1,
              cursor: 'pointer',
              minHeight: 56,
              justifyContent: collapsed ? 'center' : 'flex-start',
              px: collapsed ? 1 : 2,
              bgcolor: isInsurersActive ? 'primary.main' : 'transparent',
              color: isInsurersActive ? 'white' : 'text.primary',
              '&:hover': {
                bgcolor: isInsurersActive ? 'primary.main' : 'primary.light',
                color: 'white',
                '& svg': { stroke: 'white' },
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: collapsed ? 0 : 40, justifyContent: 'center' }}>
              {collapsed ? <Badge badgeContent={menuCounts.aseguradoras} max={99} sx={{ '& .MuiBadge-badge': { bgcolor: '#14b8a6', color: 'white', fontWeight: 800 } }}><ShieldCheck size={22} /></Badge> : <ShieldCheck size={22} color={isInsurersActive ? '#5de4cf' : '#14b8a6'} />}
            </ListItemIcon>
            {!collapsed && <ListItemText primary="Aseguradoras" primaryTypographyProps={{ fontWeight: 700, fontSize: '1rem' }} />}
            {!collapsed && menuCounts.aseguradoras > 0 && <Box sx={{ ml: 'auto', minWidth: 28, height: 28, px: .75, borderRadius: 999, bgcolor: '#14b8a6', color: 'white', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 900 }}>{menuCounts.aseguradoras}</Box>}
          </ListItem>
        </Tooltip>

        {false && !collapsed && (
          <Collapse in={insurersOpen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding sx={{ pl: 2, mb: 1 }}>
              {insurerSubItems.map((item) => {
                const active = isPathActive(item.path, item.aliases);
                return (
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
                      minHeight: 56,
                      px: 2,
                      bgcolor: active ? 'primary.main' : 'transparent',
                      color: active ? 'white' : 'text.primary',
                      '&:hover': {
                        bgcolor: active ? 'primary.main' : 'action.hover',
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
                    <ListItemText primary={item.text} primaryTypographyProps={{ fontWeight: active ? 700 : 500, fontSize: '1rem' }} />
                  </ListItem>
                );
              })}
            </List>
          </Collapse>
        )}

        {menuItems.slice(8).map((item) => {
          const active = isMenuItemActive(item);
          if (item.text === 'Herramientas' && !collapsed) {
            const activeTab = new URLSearchParams(location.search).get('tab') || 'lanzador';
            return (
              <React.Fragment key={item.text}>
                <ListItem
                  component="div"
                  onClick={() => setToolsOpen((value) => !value)}
                  sx={{ borderRadius: 999, mb: 1, cursor: 'pointer', minHeight: 54, px: 2, bgcolor: active ? '#6557c8' : 'transparent', color: active ? 'white' : 'text.primary', '&:hover': { bgcolor: active ? '#6557c8' : 'primary.light', color: 'white' } }}
                >
                  <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>{item.icon}</ListItemIcon>
                  <ListItemText primary="Herramientas" primaryTypographyProps={{ fontWeight: 700 }} />
                  {toolsOpen ? <ChevronDown size={17} /> : <ChevronRight size={17} />}
                </ListItem>
                <Collapse in={toolsOpen} timeout="auto" unmountOnExit>
                  <List disablePadding sx={{ pl: 2, mb: 1 }}>
                    {toolSubItems.map((subItem) => {
                      const subActive = location.pathname === '/herramientas' && activeTab === subItem.tab;
                      return <ListItem key={subItem.tab} component="div" onClick={() => { navigate(subItem.path); setMobileOpen(false); }} sx={{ borderRadius: 3, mb: .5, minHeight: 46, px: 2, cursor: 'pointer', bgcolor: subActive ? 'primary.main' : 'transparent', color: subActive ? 'white' : 'text.primary', '&:hover': { bgcolor: subActive ? 'primary.main' : 'action.hover' } }}><ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>{subItem.icon}</ListItemIcon><ListItemText primary={subItem.text} primaryTypographyProps={{ fontSize: '.88rem', fontWeight: subActive ? 800 : 500 }} /></ListItem>;
                    })}
                  </List>
                </Collapse>
              </React.Fragment>
            );
          }
          return (
          <Tooltip key={item.text} title={collapsed ? item.text : ''} placement="right">
            <ListItem
              component="div"
              onClick={() => { navigate(item.path); setMobileOpen(false); }}
              sx={{
                borderRadius: 999,
                mb: 1,
                cursor: 'pointer',
                minHeight: 54,
                justifyContent: collapsed ? 'center' : 'flex-start',
                px: collapsed ? 1 : 2,
                bgcolor: active ? 'primary.main' : 'transparent',
                color: active ? 'white' : 'text.primary',
                '& .MuiListItemIcon-root': { color: active ? 'white' : 'text.secondary' },
                '&:hover': { bgcolor: active ? 'primary.main' : 'primary.light', color: 'white', '& .MuiListItemIcon-root': { color: 'white' } }
              }}
            >
              <ListItemIcon sx={{ minWidth: collapsed ? 0 : 40, justifyContent: 'center' }}>
                {collapsed ? <Badge badgeContent={(item as any).badge || 0} showZero={Boolean((item as any).showZero)} max={99} sx={{ '& .MuiBadge-badge': { bgcolor: (item as any).badgeColor || 'primary.main', color: 'white', fontWeight: 800 } }}>{item.icon}</Badge> : item.icon}
              </ListItemIcon>
              {!collapsed && <ListItemText primary={item.text} primaryTypographyProps={{ fontWeight: 500 }} />}
              {!collapsed && ((item as any).badge > 0 || (item as any).showZero) && <Box sx={{ ml: 'auto', minWidth: 28, height: 28, px: .75, borderRadius: 999, bgcolor: (item as any).badgeColor || 'primary.main', color: 'white', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 900 }}>{(item as any).badge || 0}</Box>}
            </ListItem>
          </Tooltip>
          );
        })}
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
            <AlertCenter />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 }, minWidth: 0 }}>
            <IconButton onClick={onToggleDarkMode} color="inherit">
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </IconButton>
            <IconButton color="inherit" onClick={() => navigate('/dashboard?filter=expiring')}>
              <Badge badgeContent={expiringCount} color="error"><Bell size={20} /></Badge>
            </IconButton>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer' }} onClick={(e) => setAnchorEl(e.currentTarget)}>
              <Avatar src={user?.avatar} sx={{ width: 48, height: 48, bgcolor: 'primary.main', fontSize: '1.25rem', boxShadow: '0 6px 18px rgba(30, 41, 120, .22)' }}>
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
        <Box component="footer" sx={{ mt: 5, pb: 1, textAlign: 'center', color: 'text.disabled', fontSize: 11 }}>
          Hecho por <Box component="a" href="https://zigodev.com.ar" target="_blank" rel="noopener noreferrer" sx={{ color: 'inherit' }}>zigodev</Box>
        </Box>
      </Box>
      <WhatsAppLauncher />
    </Box>
  );
};
