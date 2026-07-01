import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import People from './pages/People';
import Directory from './pages/Directory';
import Statement from './pages/Statement';
import Vault from './pages/Vault';
import Exchange from './pages/Exchange';
import MoneyRecords from './pages/MoneyRecords';
import CashTransactions from './pages/CashTransactions';
import Reports from './pages/Reports';
import Staff from './pages/Staff';
import Invoices from './pages/Invoices';
import Administration from './pages/Administration';
import ModuleHome from './pages/ModuleHome';
import TransactionJournal from './pages/TransactionJournal';
import Ledger from './pages/Ledger';
import OpeningBalance from './pages/OpeningBalance';
import Reconciliation from './pages/Reconciliation';
import DailyClosing from './pages/DailyClosing';
import MultiCurrency from './pages/MultiCurrency';
import ExchangeProfit from './pages/ExchangeProfit';
import SearchEverywhere from './pages/SearchEverywhere';
import DashboardStats from './pages/DashboardStats';
import ActivityLog from './pages/ActivityLog';
import RolesPermissions from './pages/RolesPermissions';
import ExportReports from './pages/ExportReports';
import SystemCheck from './pages/SystemCheck';
import Calendar from './pages/Calendar';
import Notifications from './pages/Notifications';
import StaffIsolation from './pages/StaffIsolation';
import UserDashboard from './pages/UserDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Security from './pages/Security';
import Production from './pages/Production';

export default function App() {
  return <AuthProvider><BrowserRouter><Routes>
    <Route path="/login" element={<Login />} />
    <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
      <Route path="/" element={<Dashboard />} />
      <Route path="/customers" element={<Directory type="CUSTOMER" title="Customers" />} />
      <Route path="/customers/add" element={<Directory type="CUSTOMER" title="Customers" />} />
      <Route path="/customers/search" element={<Directory type="CUSTOMER" title="Customers" />} />
      <Route path="/customers/statement" element={<Directory type="CUSTOMER" title="Customers" />} />
      <Route path="/suppliers/add" element={<Directory type="SUPPLIER" title="Suppliers" />} />
      <Route path="/suppliers/search" element={<Directory type="SUPPLIER" title="Suppliers" />} />
      <Route path="/suppliers/statement" element={<Directory type="SUPPLIER" title="Suppliers" />} />
      <Route path="/receivable/add" element={<MoneyRecords category="RECEIVABLE" />} />
      <Route path="/receivable/payment" element={<MoneyRecords category="RECEIVABLE" />} />
      <Route path="/payable/add" element={<MoneyRecords category="PAYABLE" />} />
      <Route path="/payable/payment" element={<MoneyRecords category="PAYABLE" />} />
      <Route path="/vault/transactions" element={<Vault />} />
      <Route path="/income/add" element={<CashTransactions type="INCOME" />} />
      <Route path="/expenses/add" element={<CashTransactions type="EXPENSE" />} />
      <Route path="/invoices/create" element={<Invoices />} />
      <Route path="/invoices/print" element={<Invoices />} />
      <Route path="/reports/customer-statement" element={<Reports />} />
      <Route path="/reports/supplier-statement" element={<Reports />} />
      <Route path="/reports/profit-loss" element={<Reports />} />
      <Route path="/reports/cash-flow" element={<Reports />} />
      <Route path="/reports/export" element={<ExportReports />} />
      <Route path="/admin/restore" element={<Administration />} />
      <Route path="/suppliers" element={<Directory type="SUPPLIER" title="Suppliers" />} />
      <Route path="/people" element={<People />} />
      <Route path="/statement/:id" element={<Statement />} />
      <Route path="/vault" element={<Vault />} />
      <Route path="/vault/deposit" element={<Vault />} />
      <Route path="/vault/withdraw" element={<Vault />} />
      <Route path="/vault/transfer" element={<Vault />} />
      <Route path="/exchange" element={<Exchange />} />
      <Route path="/exchange/rates" element={<Exchange />} />
      <Route path="/exchange/history" element={<Exchange />} />
      <Route path="/receivable" element={<MoneyRecords category="RECEIVABLE" />} />
      <Route path="/payable" element={<MoneyRecords category="PAYABLE" />} />
      <Route path="/held" element={<MoneyRecords category="HELD" />} />
      <Route path="/income" element={<CashTransactions type="INCOME" />} />
      <Route path="/expenses" element={<CashTransactions type="EXPENSE" />} />
      <Route path="/invoices" element={<Invoices />} />
      <Route path="/reports" element={<Reports />} />
      <Route path="/journal" element={<TransactionJournal />} />
      <Route path="/journal/search" element={<TransactionJournal />} />
      <Route path="/journal/reports" element={<TransactionJournal />} />
      <Route path="/customers/ledger" element={<Ledger type="customers" />} />
      <Route path="/suppliers/ledger" element={<Ledger type="suppliers" />} />
      <Route path="/opening-balance" element={<OpeningBalance />} />
      <Route path="/daily-closing" element={<DailyClosing />} />
      <Route path="/multi-currency" element={<MultiCurrency />} />
      <Route path="/reconciliation" element={<Reconciliation />} />
      <Route path="/reconciliation/cash" element={<Reconciliation />} />
      <Route path="/reconciliation/vault" element={<Reconciliation />} />
      <Route path="/reconciliation/bank" element={<Reconciliation />} />
      <Route path="/reconciliation/customer" element={<Reconciliation />} />
      <Route path="/reconciliation/supplier" element={<Reconciliation />} />
      <Route path="/reconciliation/reports" element={<Reconciliation />} />
      <Route path="/reports/daily" element={<Reports />} />
      <Route path="/reports/weekly" element={<Reports />} />
      <Route path="/reports/monthly" element={<Reports />} />
      <Route path="/administration" element={<Administration />} />
      <Route path="/staff" element={<Staff />} />
      <Route path="/admin/users" element={<Staff />} />
      <Route path="/admin/roles" element={<RolesPermissions />} />
      <Route path="/admin/audit-log" element={<ActivityLog />} />
      <Route path="/admin/backup" element={<Administration />} />
      <Route path="/admin/settings" element={<Administration />} />
      <Route path="/receivable/reports" element={<Reports />} />
      <Route path="/payable/reports" element={<Reports />} />
      <Route path="/vault/reports" element={<Reports />} />
      <Route path="/exchange/reports" element={<Reports />} />
      <Route path="/exchange/profit" element={<ExchangeProfit />} />
      <Route path="/search" element={<SearchEverywhere />} />
      <Route path="/dashboard-stats" element={<DashboardStats />} />
      <Route path="/activity-log" element={<ActivityLog />} />
      <Route path="/system-check" element={<SystemCheck />} />

      <Route path="/calendar" element={<Calendar />} />
      <Route path="/calendar/daily" element={<Calendar />} />
      <Route path="/calendar/weekly" element={<Calendar />} />
      <Route path="/calendar/monthly" element={<Calendar />} />
      <Route path="/calendar/due" element={<Calendar />} />
      <Route path="/calendar/overdue" element={<Calendar />} />
      <Route path="/notifications" element={<Notifications />} />
      <Route path="/staff-isolation" element={<StaffIsolation />} />
      <Route path="/my-dashboard" element={<UserDashboard />} />
      <Route path="/admin-dashboard" element={<AdminDashboard />} />
      <Route path="/security" element={<Security />} />
      <Route path="/production" element={<Production />} />
      <Route path="/phase6" element={<Production />} />
      <Route path="/income/reports" element={<Reports />} />
      <Route path="/expenses/reports" element={<Reports />} />
      <Route path="/invoices/reports" element={<Reports />} />
      <Route path="/module/:name" element={<ModuleHome title="CFM Module" items={['Dashboard', 'Reports', 'Export']} />} />
    </Route>
  </Routes></BrowserRouter></AuthProvider>;
}
