import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export const updateAllProductsSearchKeywords = async (): Promise<void> => {
  try {
    console.log('Starting to update search keywords for all products...');
    const collections = ['products', 'mobile', 'tv', 'audio', 'gaming', 'laptops'];
    let totalUpdated = 0;
    
    for (const collectionName of collections) {
      console.log(`Processing collection: ${collectionName}`);
      const querySnapshot = await getDocs(collection(db, collectionName));
      let collectionUpdated = 0;
      
      for (const document of querySnapshot.docs) {
        const data = document.data();
        const name = data.name || '';
        const brand = data.brand || '';
        const model = data.model || '';
        const color = data.color || '';
        const deviceType = data.deviceType || '';
        const diagonal = data.diagonal || '';
        const resolution = data.resolution || '';
        const displayType = data.displayType || '';
        
        // Generate keywords based on product information
        const keywords = generateSearchKeywords(
          name, 
          brand, 
          model, 
          color, 
          deviceType, 
          collectionName,
          diagonal,
          resolution,
          displayType,
          data
        );
        
        // If product doesn't have keywords or they're different, update them
        if (!data.searchKeywords || 
            !Array.isArray(data.searchKeywords) || 
            JSON.stringify(data.searchKeywords.sort()) !== JSON.stringify(keywords.sort())) {
          
          await updateDoc(doc(db, collectionName, document.id), {
            searchKeywords: keywords,
            updatedAt: new Date().toISOString()
          });
          
          collectionUpdated++;
          totalUpdated++;
        }
      }
      
      console.log(`Updated ${collectionUpdated} products in ${collectionName} collection`);
    }
    
    console.log(`Total products updated: ${totalUpdated}`);
  } catch (error) {
    console.error('Error updating search keywords:', error);
    throw error;
  }
};

const generateSearchKeywords = (
  name: string, 
  brand: string, 
  model: string, 
  color: string, 
  deviceType: string,
  collection: string,
  diagonal?: string,
  resolution?: string,
  displayType?: string,
  data?: any
): string[] => {
  const keywords: string[] = [];
  
  // Add basic information
  if (name) {
    keywords.push(name.toLowerCase());
    name.toLowerCase().split(' ').forEach(word => {
      if (word.length > 2) keywords.push(word);
    });
  }
  
  if (brand) {
    const brandLower = brand.toLowerCase();
    keywords.push(brandLower);
    // Add brand-specific keywords
    if (brandLower === 'jbl') {
      keywords.push('jbl');
      keywords.push('jbl audio');
      keywords.push('jbl sound');
      if (model) {
        const modelLower = model.toLowerCase();
        keywords.push(`jbl ${modelLower}`);
        // Add specific keywords for Tune series
        if (modelLower.includes('tune')) {
          const tuneNumber = modelLower.match(/\d+/)?.[0];
          if (tuneNumber) {
            keywords.push(`tune ${tuneNumber}`);
            keywords.push(`tune${tuneNumber}`);
            keywords.push(`jbl tune ${tuneNumber}`);
            keywords.push(`jbl tune${tuneNumber}`);
          }
        }
      }
    }
  }
  
  if (model) keywords.push(model.toLowerCase());
  if (color) keywords.push(color.toLowerCase());
  
  // Collection-specific keywords
  if (collection === 'gaming' && deviceType) {
    keywords.push(deviceType.toLowerCase());
    keywords.push(`${brand} ${deviceType}`.toLowerCase());
    keywords.push(`gaming ${deviceType}`.toLowerCase());
    keywords.push(`${brand} gaming`.toLowerCase());
  }
  
  if (collection === 'tv') {
    if (diagonal) {
      keywords.push(`${diagonal} inch`.toLowerCase());
      keywords.push(`${diagonal}"`.toLowerCase());
      keywords.push(`${brand} ${diagonal}"`.toLowerCase());
    }
    
    if (resolution) {
      keywords.push(resolution.toLowerCase());
      keywords.push(`${resolution} tv`.toLowerCase());
      keywords.push(`${brand} ${resolution}`.toLowerCase());
    }
    
    if (displayType) {
      keywords.push(displayType.toLowerCase());
      keywords.push(`${displayType} tv`.toLowerCase());
      keywords.push(`${brand} ${displayType}`.toLowerCase());
    }
    
    // Common TV search terms
    keywords.push('tv');
    keywords.push('television');
    keywords.push(`${brand} tv`.toLowerCase());
  }
  
  if (collection === 'audio') {
    keywords.push('audio');
    keywords.push('sound');
    
    // Add specific audio product type keywords
    const subtype = data?.subtype?.toLowerCase() || '';
    if (subtype) {
      keywords.push(subtype);
      keywords.push(`${brand} ${subtype}`.toLowerCase());
      
      // Common audio product types
      if (subtype.includes('headphones')) {
        keywords.push('headphones');
        keywords.push('headset');
        keywords.push(`${brand} headphones`.toLowerCase());
      }
      
      if (subtype.includes('earbuds')) {
        keywords.push('earbuds');
        keywords.push('earphones');
        keywords.push('tws');
        keywords.push(`${brand} earbuds`.toLowerCase());
      }
      
      if (subtype.includes('speaker')) {
        keywords.push('speaker');
        keywords.push('speakers');
        keywords.push('bluetooth speaker');
        keywords.push(`${brand} speaker`.toLowerCase());
      }
      
      if (subtype.includes('soundbar')) {
        keywords.push('soundbar');
        keywords.push('sound bar');
        keywords.push('tv speaker');
        keywords.push(`${brand} soundbar`.toLowerCase());
      }
    }
    
    // Add connectivity keywords for audio products
    const connectivity = data?.connectivity?.toLowerCase() || '';
    if (connectivity) {
      keywords.push(connectivity);
      if (subtype) {
        keywords.push(`${connectivity} ${subtype}`.toLowerCase());
      }
      
      if (connectivity.includes('bluetooth')) {
        keywords.push('bluetooth');
        keywords.push('wireless');
        if (subtype) keywords.push(`bluetooth ${subtype}`.toLowerCase());
      }
    }
  }
  
  if (collection === 'laptops') {
    keywords.push('laptop');
    keywords.push('notebook');
    keywords.push(`${brand} laptop`.toLowerCase());
  }
  
  if (collection === 'mobile') {
    keywords.push('mobile');
    keywords.push('phone');
    keywords.push('smartphone');
    keywords.push(`${brand} phone`.toLowerCase());
  }
  
  // Combine brand and model
  if (brand && model) {
    keywords.push(`${brand} ${model}`.toLowerCase());
  }
  
  // Fully qualified product names
  const parts = [brand, model, diagonal, resolution, displayType, color].filter(Boolean);
  if (parts.length > 1) {
    keywords.push(parts.join(' ').toLowerCase());
  }
  
  // Remove duplicates
  return Array.from(new Set(keywords));
};

// Add immediate execution
console.log('Running search keywords update...');
updateAllProductsSearchKeywords().catch(console.error);
