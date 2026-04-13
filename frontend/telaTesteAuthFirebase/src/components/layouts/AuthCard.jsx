import PageLayout from './PageLayout';
import styles from './AuthCard.module.css';

/**
 * AuthCard — layout de página centrada com card branco.
 * Props:
 *   eyebrow  — texto pequeno acima do título (ex: "BigPeças")
 *   title    — título principal (h1)
 *   subtitle — parágrafo descritivo
 *   wide     — aumenta max-width do card para 580px
 *   alignTop — alinha o card ao topo em vez do centro
 */
export default function AuthCard({ eyebrow, title, subtitle, wide, alignTop, children }) {
  return (
    <PageLayout>
      <div className={`${styles.wrapper} ${alignTop ? styles.wrapperTop : ''}`}>
        <div className={`${styles.card} ${wide ? styles.wide : ''}`}>
          {(eyebrow || title || subtitle) && (
            <div className={styles.cardHeader}>
              {eyebrow && <span className={styles.eyebrow}>{eyebrow}</span>}
              {title && <h1 className={styles.title}>{title}</h1>}
              {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
            </div>
          )}
          {children}
        </div>
      </div>
    </PageLayout>
  );
}
