import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

interface Product {
  id: string;
  name: string;
  brand: string;
  model: string;
  modelNumber?: string;
  searchKeywords?: string[];
}

const generateSearchKeywords = (name: string, modelNumber?: string): string[] => {
  const keywords: string[] = [];
  
  // Process name
  const words = name.toLowerCase().split(' ');
  
  // Add individual words and their combinations
  for (let i = 0; i < words.length; i++) {
    // Add individual word
    if (words[i].length > 1) {
      keywords.push(words[i]);
    }
    
    // Add word combinations
    let combined = words[i];
    keywords.push(combined);
    
    for (let j = i + 1; j < words.length; j++) {
      combined += ' ' + words[j];
      keywords.push(combined);
      
      // Add version without spaces
      keywords.push(combined.replace(/\s+/g, ''));
    }
  }

  // Add model number variations if provided
  if (modelNumber) {
    // Add original model number
    keywords.push(modelNumber.toLowerCase());
    
    // Add version without spaces and hyphens
    const cleanModelNumber = modelNumber.toLowerCase().replace(/[\s-]/g, '');
    if (cleanModelNumber !== modelNumber.toLowerCase()) {
      keywords.push(cleanModelNumber);
    }

    // Add combinations with brand/model and model number
    words.forEach((word) => {
      keywords.push(`${word} ${modelNumber}`.toLowerCase());
      keywords.push(`${word}${modelNumber}`.toLowerCase());
    });
  }

  // Add special combinations for phones
  if (name.toLowerCase().includes('iphone')) {
    // Add variations like "iphone15", "iphone 15", "15"
    const matches = name.match(/iphone\s*(\d+)/i);
    if (matches && matches[1]) {
      const number = matches[1];
      keywords.push(`iphone${number}`);
      keywords.push(`iphone ${number}`);
      keywords.push(number);
      
      // Add variations with "pro", "plus", "max" if present
      ['pro', 'plus', 'max'].forEach(variant => {
        if (name.toLowerCase().includes(variant)) {
          keywords.push(`iphone${number}${variant}`);
          keywords.push(`iphone ${number} ${variant}`);
          keywords.push(`iphone${number} ${variant}`);
          keywords.push(`${number}${variant}`);
          keywords.push(`${number} ${variant}`);
        }
      });
    }
  }

  // Add numeric-only versions for all numbers in the name
  name.match(/\d+/g)?.forEach(num => {
    keywords.push(num);
  });

  // Remove duplicates and empty strings
  return Array.from(new Set(keywords.filter(k => k.length > 0)));
};

export const updateAllProductsSearchKeywords = async () => {
  const categories = ['mobile', 'tv']; // Add all your product categories
  let updatedCount = 0;
  let errorCount = 0;

  try {
    for (const category of categories) {
      console.log(`Processing ${category} category...`);
      const querySnapshot = await getDocs(collection(db, category));
      
      for (const document of querySnapshot.docs) {
        const product = document.data() as Product;
        
        try {
          // Generate new keywords including model number
          const newKeywords = generateSearchKeywords(
            `${product.brand} ${product.model}`, 
            product.modelNumber
          );
          
          // Update the document
          const productRef = doc(db, category, document.id);
          await updateDoc(productRef, {
            searchKeywords: newKeywords
          });
          
          updatedCount++;
          console.log(`Updated ${product.name} (${document.id}) with new keywords`);
        } catch (error) {
          errorCount++;
          console.error(`Failed to update ${product.name} (${document.id}):`, error);
        }
      }
    }
    
    console.log(`Update complete. Successfully updated ${updatedCount} products. Failed: ${errorCount}`);
  } catch (error) {
    console.error('Error updating products:', error);
    throw error;
  }
};
