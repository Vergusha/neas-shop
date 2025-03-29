import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export const updateAudioKeywords = async (): Promise<void> => {
  try {
    console.log('Starting to update keywords for audio products...');
    const collectionName = 'audio';
    
    const querySnapshot = await getDocs(collection(db, collectionName));
    console.log(`Found ${querySnapshot.size} audio products`);
    let totalUpdated = 0;
    
    for (const document of querySnapshot.docs) {
      const data = document.data();
      const name = data.name || '';
      const brand = data.brand || '';
      const model = data.model || '';
      const color = data.color || '';
      const subtype = data.subtype || '';
      const connectivity = data.connectivity || '';
      const description = data.description || '';
      
      // Generate audio-specific keywords
      const keywords = generateAudioKeywords(
        name, 
        brand, 
        model, 
        subtype,
        connectivity,
        color,
        description
      );
      
      console.log(`Generated ${keywords.length} keywords for ${document.id}:`, keywords);
      
      // Always update keywords to ensure they're current
      await updateDoc(doc(db, collectionName, document.id), {
        searchKeywords: keywords,
        updatedAt: new Date().toISOString()
      });
      
      totalUpdated++;
      console.log(`Updated keywords for product: ${document.id} - ${data.name}`);
    }
    
    console.log(`Total audio products updated: ${totalUpdated}`);
  } catch (error) {
    console.error('Error updating audio product keywords:', error);
    throw error;
  }
};

const generateAudioKeywords = (
  name: string, 
  brand: string, 
  model: string, 
  subtype: string,
  connectivity: string,
  color: string,
  description: string
): string[] => {
  const keywords: string[] = [];

  // Process name first
  if (name) {
    const nameLower = name.toLowerCase();
    keywords.push(nameLower);
    // Add individual words from name
    nameLower.split(/[\s-]+/).forEach(word => {
      if (word.length > 2) keywords.push(word);
    });
  }

  // Add brand keywords with variations
  if (brand) {
    const brandLower = brand.toLowerCase();
    keywords.push(brandLower);

    // Special handling for JBL
    if (brandLower === 'jbl') {
      keywords.push('jbl');
      keywords.push('jbl audio');
      keywords.push('jbl sound');

      // Add model specific variations
      if (model) {
        const modelLower = model.toLowerCase();
        keywords.push(`jbl ${modelLower}`);

        // Add Tune series variations
        if (modelLower.includes('tune')) {
          const tuneMatch = modelLower.match(/tune\s*(\d+)/i);
          if (tuneMatch) {
            const tuneNumber = tuneMatch[1];
            // Add all possible variations
            [
              `tune ${tuneNumber}`,
              `tune${tuneNumber}`,
              `jbl tune ${tuneNumber}`,
              `jbl tune${tuneNumber}`,
              connectivity?.toLowerCase().includes('bluetooth') ? `tune ${tuneNumber}bt` : '',
              connectivity?.toLowerCase().includes('bluetooth') ? `tune${tuneNumber}bt` : '',
              connectivity?.toLowerCase().includes('bluetooth') ? `jbl tune ${tuneNumber}bt` : '',
              connectivity?.toLowerCase().includes('bluetooth') ? `jbl tune${tuneNumber}bt` : '',
              color ? `tune ${tuneNumber} ${color.toLowerCase()}` : '',
              color ? `jbl tune ${tuneNumber} ${color.toLowerCase()}` : ''
            ].filter(Boolean).forEach(variant => keywords.push(variant));
          }
        }
      }
    }
  }

  // Add combined variations
  if (brand && model) {
    keywords.push(`${brand.toLowerCase()} ${model.toLowerCase()}`);
  }

  if (brand && color) {
    keywords.push(`${brand.toLowerCase()} ${color.toLowerCase()}`);
  }

  // Add subtype variations
  if (subtype) {
    const subtypeLower = subtype.toLowerCase();
    keywords.push(subtypeLower);
    
    // Common audio categories
    const audioCategories = {
      headphones: ['headphones', 'headset', 'headsets', 'over-ear', 'on-ear'],
      earbuds: ['earbuds', 'earphones', 'in-ear', 'tws', 'true wireless'],
      speaker: ['speaker', 'speakers', 'bluetooth speaker', 'portable speaker'],
      soundbar: ['soundbar', 'sound bar', 'tv speaker', 'home theater']
    };
    
    for (const [category, variants] of Object.entries(audioCategories)) {
      if (subtypeLower.includes(category)) {
        variants.forEach(variant => {
          keywords.push(variant);
          if (brand) keywords.push(`${brand.toLowerCase()} ${variant}`);
        });
      }
    }
  }
  
  // Add connectivity variations
  if (connectivity) {
    const connectivityLower = connectivity.toLowerCase();
    keywords.push(connectivityLower);
    
    if (connectivityLower.includes('bluetooth')) {
      ['bluetooth', 'wireless', 'bt'].forEach(term => {
        keywords.push(term);
        if (subtype) keywords.push(`${term} ${subtype.toLowerCase()}`);
        if (brand) keywords.push(`${brand.toLowerCase()} ${term}`);
      });
    }
    
    if (connectivityLower.includes('wired')) {
      ['wired', 'cable'].forEach(term => {
        keywords.push(term);
        if (subtype) keywords.push(`${term} ${subtype.toLowerCase()}`);
      });
    }
  }
  
  // Add color variations for better search
  if (color) {
    const colorLower = color.toLowerCase();
    keywords.push(colorLower);
    keywords.push(`${brand.toLowerCase()} ${colorLower}`);
    keywords.push(`${model.toLowerCase()} ${colorLower}`);
    keywords.push(`${brand.toLowerCase()} ${model.toLowerCase()} ${colorLower}`);
  }
  
  // Add words from description
  if (description) {
    description.toLowerCase()
      .split(/[\s-]+/)
      .filter(word => word.length > 2)
      .forEach(word => keywords.push(word));
  }
  
  // Ensure all keywords are unique, non-empty and trimmed
  return Array.from(new Set(keywords))
    .filter(kw => kw && kw.trim().length > 0)
    .map(kw => kw.trim());
};

// Сразу обновим ключевые слова при импорте
console.log('Running audio keywords update...');
updateAudioKeywords().catch(console.error);

export default updateAudioKeywords;
