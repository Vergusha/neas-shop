import React from 'react';
import { Link } from 'react-router-dom';

interface ProductCardProps {
  id: string;
  image: string;
  name: string;
  description: string;
  price: number | string; // Allow price to be a number or string
}

const ProductCard: React.FC<ProductCardProps> = ({ id, image, name, description, price }) => {
  const formattedPrice = typeof price === 'number' ? price.toFixed(2) : price;

  return (
    <Link to={`/product/${id}`} className="card card-compact bg-base-100 shadow-xl">
      <figure>
        <img src={image} alt={name} className="w-full h-48 object-contain" />
      </figure>
      <div className="card-body">
        <h2 className="card-title">{name}</h2>
        <p>{description}</p>
        <div className="card-actions justify-end">
          <span className="text-xl font-bold">{formattedPrice} NOK</span>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;