export const ADMIN_EMAIL = 'zherbalex1@gmail.com'; // Замените на ваш email

export const isAdmin = (email: string | null) => {
  return email === ADMIN_EMAIL;
};
