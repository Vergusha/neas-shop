import Header from '../components/Header'

const Home = () => {
  return (
    <div>
      <Header />
      <main>
        <section className="hero bg-base-200 py-8">
          <div className="container mx-auto">
            <h1 className="text-4xl font-bold">Welcome to NEAS Shop</h1>
            <p className="mt-4">Find the best electronics and gadgets here.</p>
          </div>
        </section>
        <section className="py-8">
          <div className="container mx-auto">
            <h2 className="text-2xl font-bold mb-4">Popular Products</h2>
            {/* Add popular products here */}
          </div>
        </section>
        <section className="py-8 bg-base-200">
          <div className="container mx-auto">
            <h2 className="text-2xl font-bold mb-4">Categories</h2>
            <CategoryList />
          </div>
        </section>
        <section className="py-8">
          <div className="container mx-auto">
            <h2 className="text-2xl font-bold mb-4">Promotions</h2>
            {/* Add promotions here */}
          </div>
        </section>
      </main>
    </div>
  )
}

export default Home
