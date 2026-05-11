import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <p className={styles.brandEyebrow}>Retro Garage</p>
          <h2 className={styles.brandName}>BigPeças</h2>
          <p className={styles.tagline}>
            Peças automotivas para clássicos com qualidade, procedência e estilo.
          </p>
        </div>
        <p className={styles.copyright}>
          © {new Date().getFullYear()} BigPeças. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}
