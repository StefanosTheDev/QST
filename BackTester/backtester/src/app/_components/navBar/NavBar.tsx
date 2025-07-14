'use client';
import styles from '@/app/_components/NavBar/NavBar.module.css';
import Link from 'next/link';
import { TrendingUp } from 'lucide-react';

export default function NavBar() {
  return (
    <nav className={styles.navContainer}>
      <div className={styles.titleSection}>
        <TrendingUp className={styles.icon} />
        <h1 className={styles.title}>Quick Scope Trading Backtester</h1>
      </div>
      <div className={styles.navLinks}></div>
    </nav>
  );
}
