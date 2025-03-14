import CategoryList from '../components/CategoryList'

const Home = () => {
  return (
    <div className="flex flex-col">
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8">
        <section className="hero bg-base-200 py-6 md:py-8 rounded-lg my-4">
          <div className="px-4 md:px-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">Welcome to NEAS Shop</h1>
            <p className="mt-2 md:mt-4 text-sm sm:text-base">Find the best electronics and gadgets here.</p>
          </div>
        </section>
        
        <section className="py-6 md:py-8 bg-base-200 rounded-lg">
          <div className="px-4 md:px-8">
            <h2 className="text-xl sm:text-2xl font-bold mb-3 md:mb-4">Categories</h2>
            <CategoryList />
          </div>
        </section>
        
        <section className="py-6 md:py-8 mb-4">
          <h2 className="text-xl sm:text-2xl font-bold mb-3 md:mb-4">Popular Products</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* Placeholder products for demonstration */}
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white p-4 rounded-lg shadow-md h-48 flex items-center justify-center">
                <p className="text-gray-400">Product {i}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}

export default Home
