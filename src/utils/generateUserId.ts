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
 * Format: email prefix
 */
export const createCustomUserId = (email: string): string => {
  // Берем часть до @ из email и очищаем от специальных символов
  const emailPrefix = email.split('@')[0];
  
  // Очищаем от специальных символов и заменяем пробелы на дефисы
  const cleanId = emailPrefix
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '')
    .replace(/\s+/g, '-');

  return cleanId;
};
