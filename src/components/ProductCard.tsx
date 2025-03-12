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
  return (
    <Link to={`/product/${id}`} className="bg-white p-4 rounded-lg shadow-md flex flex-col">
      <div className="w-full h-48 mb-4 overflow-hidden rounded-lg">
        <img src={image} alt={name} className="w-full h-full object-cover" />
      </div>
      <div className="flex flex-col justify-between flex-grow">
        <div>
          <h3 className="font-bold text-lg">{name}</h3>
          <p className="text-gray-500">{description}</p>
        </div>
        <div className="text-right mt-4">
          <p className="text-xl font-bold text-gray-900">{price},-</p>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;