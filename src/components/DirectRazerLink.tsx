import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

/**
 * Компонент для прямого доступа к товарам Razer в коллекции gaming
 */
const DirectRazerLink: React.FC = () => {
  const [razerProducts, setRazerProducts] = useState<{ id: string, name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRazerProducts = async () => {
      try {
        const gamingRef = collection(db, 'gaming');
        const querySnapshot = await getDocs(gamingRef);
        
        const razerItems = [];
        
        // Проверяем наличие DeathAdder напрямую
        const deathadderId = 'razer-deathadder-wiredwireless-2022-black';
        let hasDeathAdder = false;
        
        try {
          const deathAdderDoc = await getDoc(doc(db, 'gaming', deathadderId));
          if (deathAdderDoc.exists()) {
            console.log("Found DeathAdder directly:", deathAdderDoc.data());
            hasDeathAdder = true;
            razerItems.push({
              id: deathadderId,
              name: deathAdderDoc.data().name || 'Razer DeathAdder'
            });
          }
        } catch (err) {
          console.error("Error checking for DeathAdder:", err);
        }
        
        // Добавляем остальные товары Razer
        for (const doc of querySnapshot.docs) {
          const data = doc.data();
          // Пропускаем DeathAdder, если уже добавили
          if (data.brand && 
              data.brand.toLowerCase() === 'razer' && 
              (!hasDeathAdder || doc.id !== deathadderId)) {
            razerItems.push({
              id: doc.id,
              name: data.name || 'Razer Product'
            });
          }
        }
        
        setRazerProducts(razerItems);
      } catch (error) {
        console.error('Error fetching Razer products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRazerProducts();
  }, []);

  if (loading) {
    return null; // Не показываем ничего во время загрузки
  }

  if (razerProducts.length === 0) {
    return null; // Не показываем компонент, если продуктов Razer не найдено
  }

  return (
    <div className="bg-green-800 text-white p-2 rounded-lg shadow-md">
      <h3 className="font-bold mb-2">Razer Gaming Products</h3>
      <ul className="space-y-1">
        {razerProducts.slice(0, 3).map(product => (
          <li key={product.id}>
            <Link 
              to={`/product/${product.id}`}
              className="hover:underline block"
            >
              {product.name}
            </Link>
          </li>
        ))}
        <li>
          <Link 
            to="/search?q=razer"
            className="text-green-300 hover:underline font-medium"
          >
            View all Razer products →
          </Link>
        </li>
      </ul>
    </div>
  );
};

export default DirectRazerLink;
