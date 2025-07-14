import styles from './page.module.css';
import DashboardClient from './DashBoardClient';
export default function Dashboard() {
  return (
    <div className={styles.container}>
      <div className={styles.cards}>
        <DashboardClient />
      </div>
    </div>
  );
}
