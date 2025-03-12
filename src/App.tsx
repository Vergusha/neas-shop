import Header from './components/Header';
import CategoryList from './components/CategoryList';
import Footer from './components/Footer';

const App = () => {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Header />
      <CategoryList />
      <main className="container mx-auto py-8 flex-grow">
        <h1 className="text-2xl font-bold"></h1>
      </main>
      <Footer />
    </div>
  );
};

export default App;