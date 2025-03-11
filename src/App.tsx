import React from 'react';
import Header from './components/Header';
import CategoryList from './components/CategoryList';

const App = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <CategoryList />
      <main className="container mx-auto py-8">
        <h1 className="text-2xl font-bold"></h1>
      </main>
    </div>
  );
};

export default App;