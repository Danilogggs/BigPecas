import { useNavigate } from 'react-router-dom';
import styles from './ProductCard.module.css';

export default function ProductCard({ product }) {
  const navigate = useNavigate();

  return (
    <div className={styles.card}>
      {/* Image */}
      <div className={styles.imageWrap}>
        <img
          src={product.image}
          alt={product.name}
          className={styles.image}
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
        {product.tag && <span className={styles.badgeTag}>{product.tag}</span>}
        {product.condition && <span className={styles.badgeCondition}>{product.condition}</span>}
      </div>

      {/* Info */}
      <div className={styles.info}>
        {product.application && <p className={styles.application}>{product.application}</p>}
        <p className={styles.name}>{product.name}</p>
        {product.stock !== undefined && (
          <p className={styles.stock}>Estoque: {product.stock}</p>
        )}
        <div className={styles.footer}>
          <span className={styles.price}>{product.price}</span>
          <button
            className={styles.detailsBtn}
            onClick={(e) => { e.stopPropagation(); navigate('/login'); }}
          >
            Ver detalhes
          </button>
        </div>
      </div>
    </div>
  );
}
