import { formatCurrency } from '../utils/formatters.js';
import { detectCardNetwork } from '../utils/formatters.js';
import styles from './Dashboard.module.css';

function StatCard({ label, value, sub, accent }) {
  return (
    <div className={`${styles.statCard} glass`}>
      <p className={styles.statLabel}>{label}</p>
      <p className={styles.statValue} style={accent ? { color: accent } : {}}>
        {value}
      </p>
      {sub && <p className={styles.statSub}>{sub}</p>}
    </div>
  );
}

function BarRow({ label, amount, max, currency }) {
  const pct = max > 0 ? (amount / max) * 100 : 0;
  return (
    <div className={styles.barRow}>
      <div className={styles.barLabel}>{label}</div>
      <div className={styles.barTrack}>
        <div
          className={styles.barFill}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className={styles.barAmount}>{formatCurrency(amount, currency)}</div>
    </div>
  );
}

export default function Dashboard({ totals, receipts }) {
  const currency = receipts[0]?.currency || 'EUR';
  const byCard = totals.byCard;
  const byStore = totals.byStore;
  const maxCard = Math.max(...Object.values(byCard), 0.01);
  const maxStore = Math.max(...Object.values(byStore), 0.01);

  if (totals.receiptCount === 0) return null;

  return (
    <section className={styles.section} id="dashboard">
      <div className={styles.sectionHeader}>
        <h2 className={styles.title}>
          <span className={styles.titleIcon}>📊</span>
          Financieel Overzicht
        </h2>
      </div>

      {/* Stat cards */}
      <div className={styles.statsGrid}>
        <StatCard
          label="Totaal Uitgegeven"
          value={formatCurrency(totals.grandTotal, currency)}
          sub={`Over ${totals.receiptCount} ${totals.receiptCount !== 1 ? 'bonnetjes' : 'bonnetje'}`}
          accent="var(--accent-primary-light)"
        />
        <StatCard
          label="Bonnetjes"
          value={totals.receiptCount}
          sub="Verwerkt"
        />
        <StatCard
          label="Items"
          value={totals.itemCount}
          sub="Totaal aantal items"
          accent="var(--accent-secondary)"
        />
        <StatCard
          label="Gem. per bonnetje"
          value={formatCurrency(totals.grandTotal / totals.receiptCount, currency)}
          sub="Gemiddelde uitgave"
        />
      </div>

      <div className={styles.chartsRow}>
        {/* By card */}
        {Object.keys(byCard).length > 0 && (
          <div className={`${styles.chartCard} glass`}>
            <h3 className={styles.chartTitle}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
              </svg>
              Per Betaalmethode
            </h3>
            <div className={styles.bars}>
              {Object.entries(byCard)
                .sort((a, b) => b[1] - a[1])
                .map(([card, amount]) => (
                  <BarRow
                    key={card}
                    label={card}
                    amount={amount}
                    max={maxCard}
                    currency={currency}
                  />
                ))}
            </div>
          </div>
        )}

        {/* By store */}
        {Object.keys(byStore).length > 0 && (
          <div className={`${styles.chartCard} glass`}>
            <h3 className={styles.chartTitle}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
              </svg>
              Per Winkel
            </h3>
            <div className={styles.bars}>
              {Object.entries(byStore)
                .sort((a, b) => b[1] - a[1])
                .map(([store, amount]) => (
                  <BarRow
                    key={store}
                    label={store}
                    amount={amount}
                    max={maxStore}
                    currency={currency}
                  />
                ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
