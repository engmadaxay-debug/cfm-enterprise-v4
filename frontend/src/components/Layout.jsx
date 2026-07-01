import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const defaultGroups = [
  {
    title: 'Dashboard',
    links: [
      ['/', 'Overview'],
      ['/my-dashboard', 'My Dashboard'],
      ['/admin-dashboard', 'Admin Dashboard', 'ADMIN'],
      ['/dashboard-stats', 'Analytics'],
    ],
  },
  {
    title: 'People',
    links: [
      ['/customers', 'Customers'],
      ['/customers/add', 'Add Customer'],
      ['/suppliers', 'Suppliers'],
      ['/suppliers/add', 'Add Supplier'],
      ['/staff', 'Staff'],
    ],
  },
  {
    title: 'Sales',
    links: [
      ['/invoices', 'Customer Invoices'],
      ['/receivable', 'Receivables'],
      ['/receivable/payment', 'Receive Payment'],
      ['/customers/statement', 'Customer Statement'],
      ['/customers/ledger', 'Customer Ledger'],
    ],
  },
  {
    title: 'Purchases',
    links: [
      ['/invoices/create', 'Supplier Invoice'],
      ['/payable', 'Payables'],
      ['/payable/payment', 'Supplier Payment'],
      ['/suppliers/statement', 'Supplier Statement'],
      ['/suppliers/ledger', 'Supplier Ledger'],
    ],
  },
  {
    title: 'Finance',
    links: [
      ['/income', 'Income'],
      ['/expenses', 'Expenses'],
      ['/journal', 'Journal'],
      ['/opening-balance', 'Opening Balance'],
      ['/daily-closing', 'Daily Closing'],
      ['/reconciliation', 'Reconciliation'],
    ],
  },
  {
    title: 'Vault',
    links: [
      ['/vault', 'Accounts'],
      ['/vault/deposit', 'Deposit'],
      ['/vault/withdraw', 'Withdraw'],
      ['/vault/transfer', 'Transfer'],
      ['/vault/transactions', 'History'],
    ],
  },
  {
    title: 'Exchange',
    links: [
      ['/exchange', 'New Exchange'],
      ['/exchange/history', 'History'],
      ['/exchange/rates', 'Rates'],
      ['/exchange/profit', 'Profit'],
      ['/multi-currency', 'Currencies'],
    ],
  },
  {
    title: 'Reports',
    links: [
      ['/reports', 'Reports Center'],
      ['/reports/customer-statement', 'Customer Reports'],
      ['/reports/supplier-statement', 'Supplier Reports'],
      ['/reports/profit-loss', 'Profit & Loss'],
      ['/reports/export', 'PDF / Excel Export'],
    ],
  },
  {
    title: 'Tools',
    links: [
      ['/search', 'Global Search'],
      ['/notifications', 'Notifications'],
      ['/calendar', 'Calendar'],
      ['/system-check', 'System Check'],
    ],
  },
  {
    title: 'Administration',
    adminOnly: true,
    links: [
      ['/admin/users', 'Users'],
      ['/admin/roles', 'Roles & Permissions'],
      ['/staff-isolation', 'Staff Isolation'],
      ['/security', 'Security'],
      ['/activity-log', 'Activity Log'],
      ['/admin/settings', 'Settings'],
      ['/production', 'Production'],
    ],
  },
];

const STORAGE_KEY = 'cfm_sidebar_group_order_v1';

function getOrderedGroups(groups, order) {
  if (!Array.isArray(order) || !order.length) return groups;
  const map = new Map(groups.map((group) => [group.title, group]));
  const ordered = order.map((title) => map.get(title)).filter(Boolean);
  const missing = groups.filter((group) => !order.includes(group.title));
  return [...ordered, ...missing];
}

export default function Layout() {
  const { user, logout } = useAuth();
  const [dragTitle, setDragTitle] = useState(null);
  const [order, setOrder] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
  });

  const groups = useMemo(() => {
    const visible = defaultGroups
      .filter((group) => !group.adminOnly || user?.role === 'ADMIN')
      .map((group) => ({
        ...group,
        links: group.links.filter((link) => !link[2] || link[2] === user?.role),
      }));
    return getOrderedGroups(visible, order);
  }, [order, user?.role]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
  }, [order]);

  function moveGroup(targetTitle) {
    if (!dragTitle || dragTitle === targetTitle) return;
    const titles = groups.map((group) => group.title);
    const from = titles.indexOf(dragTitle);
    const to = titles.indexOf(targetTitle);
    if (from < 0 || to < 0) return;
    const next = [...titles];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setOrder(next);
    setDragTitle(null);
  }

  function resetMenu() {
    localStorage.removeItem(STORAGE_KEY);
    setOrder([]);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span>CFM</span>
          <small>Professional Enterprise v4.0 Phase 1</small>
        </div>
        <div className="menu-tools">
          <small>Drag groups to reorder</small>
          <button type="button" className="small ghost" onClick={resetMenu}>Reset</button>
        </div>
        <nav>
          {groups.map((group) => (
            <div
              className="nav-group"
              key={group.title}
              draggable
              onDragStart={() => setDragTitle(group.title)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => moveGroup(group.title)}
            >
              <strong title="Drag to reorder">☰ {group.title}</strong>
              {group.links.map(([to, label]) => (
                <NavLink key={to} to={to} end={to === '/'}>{label}</NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-user">
          <strong>{user?.fullName}</strong>
          <small>{user?.email}</small>
          <span className="role-label">{user?.role}</span>
          <button className="ghost danger" onClick={logout}>Logout</button>
        </div>
      </aside>
      <main className="main-content"><Outlet /></main>
    </div>
  );
}
