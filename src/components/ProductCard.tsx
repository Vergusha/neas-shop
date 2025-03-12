import React from 'react';
import { Link } from 'react-router-dom';

interface ProductCardProps {
  id: string;
  image: string;
  name: string;
  description: string;
  price: number;
}

const ProductCard: React.FC<ProductCardProps> = ({ id, image, name, description, price }) => {
  console.log("Rendering ProductCard with:", { id, image, name, description, price }); // Логирование данных
  return (
    <Link to={`/product/${id}`} className="bg-white p-4 rounded-lg shadow-md flex">
      <img src={image} alt={name} className="w-1/4" />
      <div className="ml-4 flex flex-col justify-between">
        <div>
          <h3 className="font-bold text-lg">{name}</h3>
          <p className="text-gray-500">{description}</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-gray-900">{price},-</p>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;