import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import Loading from '../components/Loading';
import './DashboardPro.css';

function formatAmount(value) {
  const number = Number(value || 0);

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(number);
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/reports/dashboard')
      .then((response) => setData(response.data))
      .catch(() => setError('Dashboard data could not be loaded.'));
  }, []);

  const cashMap = useMemo(() => {
    if (!data?.currentMonthCash) return {};

    return Object.fromEntries(
      data.currentMonthCash.map((item) => [
        item.transaction_type,
        item.total,
      ])
    );
  }, [data]);

  if (error) {
    return (
      <div className="dashboard-error">
        <h2>Dashboard unavailable</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!data) return <Loading />;

  const totalVaultBalance = data.vaultBalances.reduce(
    (sum, item) => sum + Number(item.balance || 0),
    0
  );

  const receivables = data.outstanding
    .filter((item) =>
      String(item.category).toUpperCase().includes('RECEIV')
    )
    .reduce((sum, item) => sum + Number(item.total || 0), 0);

  const payables = data.outstanding
    .filter((item) =>
      String(item.category).toUpperCase().includes('PAY')
    )
    .reduce((sum, item) => sum + Number(item.total || 0), 0);

  const monthlyIncome = Number(cashMap.INCOME || 0);
  const monthlyExpenses = Number(cashMap.EXPENSE || 0);
  const monthlyProfit = monthlyIncome - monthlyExpenses;

  return (
    <div className="pro-dashboard">
      <header className="dashboard-hero">
        <div>
          <span className="dashboard-eyebrow">CFM FINANCE MANAGER</span>
          <h1>Welcome back, CFM Admin</h1>
          <p>
            {data.scope === 'ALL_DATA'
              ? 'Overview of all staff activity and financial performance.'
              : 'Overview of your financial activity.'}
          </p>
        </div>

        <div className="hero-actions">
          <Link className="hero-button primary" to="/exchange">
            New Exchange
          </Link>

          <Link className="hero-button" to="/reports">
            View Reports
          </Link>
        </div>
      </header>

      <section className="quick-actions">
        <Link to="/exchange">
          <span>⇄</span>
          <strong>New Exchange</strong>
          <small>Currency transaction</small>
        </Link>

        <Link to="/customers/add">
          <span>＋</span>
          <strong>Add Customer</strong>
          <small>Create customer profile</small>
        </Link>

        <Link to="/vault/deposit">
          <span>↓</span>
          <strong>Deposit</strong>
          <small>Add money to vault</small>
        </Link>

        <Link to="/expenses">
          <span>↑</span>
          <strong>Expense</strong>
          <small>Record business cost</small>
        </Link>

        <Link to="/reports">
          <span>▥</span>
          <strong>Reports</strong>
          <small>Financial summaries</small>
        </Link>
      </section>

      <section className="dashboard-stat-grid">
        <article className="dashboard-stat-card">
          <div className="stat-icon">▣</div>
          <div>
            <span>Total Cash</span>
            <strong>{formatAmount(totalVaultBalance)}</strong>
            <small>Across all vaults</small>
          </div>
        </article>

        <article className="dashboard-stat-card">
          <div className="stat-icon">↙</div>
          <div>
            <span>Receivables</span>
            <strong>{formatAmount(receivables)}</strong>
            <small>Money customers owe</small>
          </div>
        </article>

        <article className="dashboard-stat-card">
          <div className="stat-icon">↗</div>
          <div>
            <span>Payables</span>
            <strong>{formatAmount(payables)}</strong>
            <small>Money business owes</small>
          </div>
        </article>

        <article className="dashboard-stat-card profit">
          <div className="stat-icon">＋</div>
          <div>
            <span>Monthly Profit</span>
            <strong>{formatAmount(monthlyProfit)}</strong>
            <small>Income minus expenses</small>
          </div>
        </article>
      </section>

      <section className="dashboard-content-grid">
        <article className="dashboard-panel large-panel">
          <div className="panel-heading">
            <div>
              <h2>Recent Transactions</h2>
              <p>Latest income and expense activity</p>
            </div>

            <Link to="/journal">View all</Link>
          </div>

          <div className="dashboard-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Category</th>
                  <th>Amount</th>
                </tr>
              </thead>

              <tbody>
                {data.recentTransactions.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="empty-row">
                      No recent transactions found.
                    </td>
                  </tr>
                ) : (
                  data.recentTransactions.map((item) => (
                    <tr key={item.id}>
                      <td>{item.transaction_date}</td>
                      <td>
                        <span
                          className={`dashboard-badge ${String(
                            item.transaction_type
                          ).toLowerCase()}`}
                        >
                          {item.transaction_type}
                        </span>
                      </td>
                      <td>{item.category}</td>
                      <td className="amount-cell">
                        {formatAmount(item.amount)} {item.currency_code}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className="dashboard-panel">
          <div className="panel-heading">
            <div>
              <h2>Vault Balances</h2>
              <p>Current available cash</p>
            </div>
          </div>

          <div className="balance-list">
            {data.vaultBalances.length === 0 ? (
              <p className="empty-text">No vault balances found.</p>
            ) : (
              data.vaultBalances.map((item) => (
                <div className="balance-row" key={item.currency_code}>
                  <div>
                    <span>{item.currency_code}</span>
                    <small>Available balance</small>
                  </div>

                  <strong>{formatAmount(item.balance)}</strong>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="dashboard-panel">
          <div className="panel-heading">
            <div>
              <h2>Business Overview</h2>
              <p>Current month performance</p>
            </div>
          </div>

          <div className="overview-bars">
            <div>
              <span>Monthly Income</span>
              <strong>{formatAmount(monthlyIncome)}</strong>
              <div className="bar">
                <i style={{ width: '82%' }} />
              </div>
            </div>

            <div>
              <span>Monthly Expenses</span>
              <strong>{formatAmount(monthlyExpenses)}</strong>
              <div className="bar expense-bar">
                <i style={{ width: '48%' }} />
              </div>
            </div>

            <div>
              <span>People</span>
              <strong>{data.peopleCount}</strong>
              <div className="bar people-bar">
                <i style={{ width: '62%' }} />
              </div>
            </div>
          </div>
        </article>

        <article className="dashboard-panel">
          <div className="panel-heading">
            <div>
              <h2>Outstanding</h2>
              <p>Receivables and payables</p>
            </div>
          </div>

          <div className="balance-list">
            {data.outstanding.length === 0 ? (
              <p className="empty-text">No outstanding balances found.</p>
            ) : (
              data.outstanding.map((item) => (
                <div
                  className="balance-row"
                  key={`${item.category}-${item.currency_code}`}
                >
                  <div>
                    <span>{item.category}</span>
                    <small>{item.currency_code}</small>
                  </div>

                  <strong>{formatAmount(item.total)}</strong>
                </div>
              ))
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
