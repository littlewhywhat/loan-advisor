import { Badge, Box, Flex, IconButton, Text } from '@radix-ui/themes';
import {
  ArrowDownUp,
  BarChart3,
  Calculator,
  CreditCard,
  LayoutDashboard,
  Menu,
  PiggyBank,
  X,
} from 'lucide-react';
import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useEvents } from '@/context/EventProvider';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/assets', label: 'Assets', icon: PiggyBank },
  { path: '/liabilities', label: 'Liabilities', icon: CreditCard },
  { path: '/cashflows', label: 'Income & Expenses', icon: ArrowDownUp },
  { path: '/simulator', label: 'Simulator', icon: BarChart3 },
  { path: '/calculator', label: 'Loan Calculator', icon: Calculator },
] as const;

const SIDEBAR_WIDTH = 220;
const MOBILE_BREAKPOINT = 768;

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    () => window.innerWidth < MOBILE_BREAKPOINT,
  );

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return isMobile;
}

function ModeToggle() {
  const { mode, setMode } = useEvents();
  const isDev = mode === 'dev';
  return (
    <Badge
      size="1"
      color={isDev ? 'orange' : 'green'}
      variant="soft"
      style={{ cursor: 'pointer', userSelect: 'none' }}
      onClick={() => setMode(isDev ? 'prod' : 'dev')}
    >
      {isDev ? 'DEV' : 'PROD'}
    </Badge>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const closeSidebar = useCallback(() => setOpen(false), []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: close sidebar on route change
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const sidebarVisible = !isMobile || open;

  return (
    <Flex style={{ minHeight: '100vh' }}>
      {isMobile && open && (
        <Box
          position="fixed"
          inset="0"
          onClick={closeSidebar}
          style={{ background: 'var(--black-a6)', zIndex: 40 }}
        />
      )}

      {sidebarVisible && (
        <Box
          asChild
          position={isMobile ? 'fixed' : undefined}
          style={{
            width: SIDEBAR_WIDTH,
            minWidth: SIDEBAR_WIDTH,
            height: '100vh',
            borderRight: '1px solid var(--gray-a5)',
            background: 'var(--color-background)',
            zIndex: isMobile ? 50 : undefined,
            overflowY: 'auto',
          }}
        >
          <nav>
            <Flex direction="column" gap="1" p="3">
              <Flex justify="between" align="center" mb="3">
                <Flex align="center" gap="2">
                  <Text size="3" weight="bold">
                    Loan Advisor
                  </Text>
                  <ModeToggle />
                </Flex>
                {isMobile && (
                  <IconButton size="1" variant="ghost" onClick={closeSidebar}>
                    <X size={18} />
                  </IconButton>
                )}
              </Flex>

              {NAV_ITEMS.map(({ path, label, icon: Icon }) => {
                const active = location.pathname === path;
                return (
                  <Link key={path} to={path} style={{ textDecoration: 'none' }}>
                    <Flex
                      align="center"
                      gap="2"
                      px="3"
                      py="2"
                      style={{
                        borderRadius: 'var(--radius-2)',
                        background: active ? 'var(--accent-a3)' : undefined,
                        color: active ? 'var(--accent-11)' : 'var(--gray-11)',
                        cursor: 'pointer',
                      }}
                    >
                      <Icon size={18} />
                      <Text size="2" weight={active ? 'bold' : 'medium'}>
                        {label}
                      </Text>
                    </Flex>
                  </Link>
                );
              })}
            </Flex>
          </nav>
        </Box>
      )}

      <Flex direction="column" flexGrow="1" style={{ minWidth: 0 }}>
        {isMobile && (
          <Flex
            align="center"
            gap="2"
            p="3"
            style={{ borderBottom: '1px solid var(--gray-a5)' }}
          >
            <IconButton size="2" variant="ghost" onClick={() => setOpen(true)}>
              <Menu size={20} />
            </IconButton>
            <Text size="3" weight="bold">
              Loan Advisor
            </Text>
            <Box flexGrow="1" />
            <ModeToggle />
          </Flex>
        )}
        <Box p="5" flexGrow="1" style={{ overflowY: 'auto' }}>
          {children}
        </Box>
      </Flex>
    </Flex>
  );
}
