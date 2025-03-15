export const generateRandomPart = () => {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  let result = '';

  // Generate 4 random letters
  for (let i = 0; i < 4; i++) {
    result += letters.charAt(Math.floor(Math.random() * letters.length));
  }

  // Generate 4 random numbers
  for (let i = 0; i < 4; i++) {
    result += numbers.charAt(Math.floor(Math.random() * numbers.length));
  }

  return result;
};

/**
 * Creates a custom user ID from an email address
 * Format: first letter of email + last part of domain + random 4-digit number
 */
export const createCustomUserId = (email: string | null): string => {
  if (!email) return `user${Math.floor(1000 + Math.random() * 9000)}`;
  
  try {
    // Get first letter of email
    const firstLetter = email.charAt(0).toUpperCase();
    
    // Get domain part (after @)
    const domainParts = email.split('@')[1]?.split('.') || [];
    const domainPart = domainParts[0]?.substring(0, 3).toUpperCase() || '';
    
    // Generate random 4-digit number
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    
    return `${firstLetter}${domainPart}${randomNum}`;
  } catch (error) {
    console.error('Error creating custom user ID:', error);
    return `USER${Math.floor(1000 + Math.random() * 9000)}`;
  }
};
