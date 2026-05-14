import { detectCardNetwork } from '../utils/formatters.js';
import styles from './CardBadge.module.css';

const NETWORK_ICONS = {
  visa: (
    <svg viewBox="0 0 48 16" width="32" height="11" fill="none">
      <text x="0" y="13" fontFamily="Arial" fontWeight="900" fontSize="15" fill="#fff" letterSpacing="-0.5">VISA</text>
    </svg>
  ),
  mastercard: (
    <svg viewBox="0 0 32 20" width="24" height="15">
      <circle cx="12" cy="10" r="10" fill="#eb001b" />
      <circle cx="20" cy="10" r="10" fill="#f79e1b" />
      <path d="M16 4.6a10 10 0 010 10.8A10 10 0 0116 4.6z" fill="#ff5f00" />
    </svg>
  ),
  amex: (
    <svg viewBox="0 0 40 14" width="28" height="10">
      <text x="0" y="11" fontFamily="Arial" fontWeight="800" fontSize="11" fill="#fff" letterSpacing="1">AMEX</text>
    </svg>
  ),
  maestro: (
    <svg viewBox="0 0 32 20" width="22" height="14">
      <circle cx="12" cy="10" r="10" fill="#0099df" />
      <circle cx="20" cy="10" r="10" fill="#cc0000" />
    </svg>
  ),
  cash: <span style={{fontSize:'14px'}}>💵</span>,
  ideal: <span style={{fontSize:'14px'}}>🏦</span>,
  paypal: <span style={{fontSize:'14px'}}>🅿</span>,
  card: <span style={{fontSize:'14px'}}>💳</span>,
  unknown: <span style={{fontSize:'14px'}}>💳</span>,
};

export default function CardBadge({ cardString, small = false }) {
  const network = detectCardNetwork(cardString || '');
  const icon = NETWORK_ICONS[network] || NETWORK_ICONS.card;

  return (
    <div className={`${styles.badge} ${small ? styles.small : ''}`}>
      <span className={styles.icon}>{icon}</span>
      <span className={styles.label}>{cardString || 'Unknown payment'}</span>
    </div>
  );
}
