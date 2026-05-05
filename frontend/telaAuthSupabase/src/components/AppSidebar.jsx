import { WrenchIcon, BoltIcon, StarIcon } from './Icons';
import styles from './AppSidebar.module.css';

const iconMap = {
  wrench: <WrenchIcon size={15} />,
  bolt: <BoltIcon size={15} />,
  star: <StarIcon size={15} />,
};

/**
 * AppSidebar — sidebar compartilhada entre Dashboard e CadastroPecas.
 * Props:
 *   menuItems    — array de { label, icon }
 *   activeNav    — label do item ativo
 *   onNavChange  — fn(label) chamada ao clicar em item
 *   infoTitle    — título do card de info (ex: "Visão Geral")
 *   infoText     — texto do card de info
 *   onInfoAction — fn chamada ao clicar no botão "Home"
 */
export default function AppSidebar({ menuItems, activeNav, onNavChange, infoTitle, infoText, onInfoAction }) {
  return (
    <aside className={styles.sidebar}>
      <p className={styles.menuLabel}>Menu</p>
      <nav className={styles.nav}>
        {menuItems.map((item) => {
          const isActive = activeNav === item.label;
          return (
            <button
              key={item.label}
              onClick={() => onNavChange(item.label)}
              className={`${styles.navItem} ${isActive ? styles.active : ''}`}
            >
              <span className={styles.navLabel}>
                {iconMap[item.icon] || iconMap.wrench}
                {item.label}
              </span>
              <span className={styles.arrow}>›</span>
            </button>
          );
        })}
      </nav>

      <div className={styles.divider} />

      <div className={styles.infoCard}>
        <p className={styles.infoTitle}>{infoTitle}</p>
        <p className={styles.infoText}>{infoText}</p>
        <button className={styles.infoBtn} onClick={onInfoAction}>
          Home
        </button>
      </div>
    </aside>
  );
}
