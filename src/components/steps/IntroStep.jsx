import { useGallery } from '../../context/GalleryContext'
import { TopNavBar, Breadcrumb, MobileBottomNav, MobileMenuModal, ResetModal } from '../layout'

export default function IntroStep() {
  const {
    setCurrentStep,
    showCart, setShowCart,
    cartItems,
    handleAddToCart,
    calculateCartTotal,
    setShowResetModal,
    showMobileMenu, setShowMobileMenu,
  } = useGallery()

  const hasCartItems = Object.keys(cartItems.artworks).length > 0 || Object.keys(cartItems.frames).length > 0

  return (
    <>
      <ResetModal />
      
      <div className="h-screen bg-white flex flex-col overflow-hidden">
        <TopNavBar />
        <Breadcrumb />
        <div className="flex flex-row flex-1 overflow-hidden pb-12 lg:pb-0">
          {/* Left Sidebar */}
          <div className="flex w-28 sm:w-32 lg:w-80 bg-white border-r border-gray-300 px-2 sm:px-4 lg:px-6 py-4 flex-col h-full overflow-hidden">

            <div className="flex-1 flex flex-col justify-start space-y-4 sm:space-y-5 lg:space-y-4 overflow-y-auto min-h-0">
              {/* Step 1 Icon */}
              <div className="text-center cursor-pointer transition-all duration-200 py-2 group flex-shrink-0">
                <div className="flex justify-center mb-1 sm:mb-1 lg:mb-1">
                  <img 
                    src="https://cdn2.iconfinder.com/data/icons/travel-locations/24/house-512.png" 
                    alt="Select Place" 
                    className="w-10 h-10 sm:w-12 sm:h-12 lg:w-10 lg:h-10 object-contain group-hover:opacity-50 transition-opacity"
                  />
                </div>
                <p className="text-lg sm:text-xl lg:text-sm font-semibold mb-0.5 sm:mb-1 lg:mb-0.5 text-black group-hover:text-gray-400 transition-colors">1</p>
                <p className="text-[9px] sm:text-xs lg:text-xs font-semibold tracking-wide text-black group-hover:text-gray-400 transition-colors leading-tight">SELECT<br className="lg:hidden"/>PLACE</p>
              </div>

              {/* Step 2 Icon */}
              <div className="text-center cursor-pointer transition-all duration-200 py-2 group flex-shrink-0">
                <div className="flex justify-center mb-2 sm:mb-3 lg:mb-3">
                  <div className="relative w-10 h-10 sm:w-12 sm:h-12 lg:w-10 lg:h-10">
                    <div className="absolute top-0 right-0 w-7 h-9 sm:w-8 sm:h-11 lg:w-7 lg:h-9 border-2 border-black group-hover:border-gray-400 bg-white transition-colors transform rotate-6"></div>
                    <div className="absolute top-1 left-0 w-7 h-9 sm:w-8 sm:h-11 lg:w-7 lg:h-9 border-2 border-black group-hover:border-gray-400 bg-white transition-colors">
                      <div className="absolute inset-2 bg-black group-hover:bg-gray-400 transition-colors"></div>
                    </div>
                  </div>
                </div>
                <p className="text-lg sm:text-xl lg:text-sm font-semibold mb-1 sm:mb-2 lg:mb-1 text-black group-hover:text-gray-400 transition-colors">2</p>
                <p className="text-[9px] sm:text-xs lg:text-xs font-semibold tracking-wide text-black group-hover:text-gray-400 transition-colors leading-tight">SELECT<br className="lg:hidden"/>BACKGROUND</p>
              </div>

              {/* Step 3 Icon */}
              <div className="text-center cursor-pointer transition-all duration-200 py-2 group flex-shrink-0">
                <div className="flex justify-center mb-2 sm:mb-3 lg:mb-3">
                  <div className="flex gap-1 sm:gap-1.5 lg:gap-1 items-start">
                    <div className="w-5 h-8 sm:w-6 sm:h-10 lg:w-5 lg:h-8 bg-black group-hover:bg-gray-400 transition-colors"></div>
                    <div className="flex flex-col gap-1 sm:gap-1.5 lg:gap-1">
                      <div className="w-3 h-3.5 sm:w-3.5 sm:h-4.5 lg:w-2 lg:h-3.5 bg-black group-hover:bg-gray-400 transition-colors"></div>
                      <div className="w-3 h-3.5 sm:w-3.5 sm:h-4.5 lg:w-2 lg:h-3.5 bg-black group-hover:bg-gray-400 transition-colors"></div>
                    </div>
                  </div>
                </div>
                <p className="text-lg sm:text-xl lg:text-sm font-semibold mb-1 sm:mb-2 lg:mb-1 text-black group-hover:text-gray-400 transition-colors">3</p>
                <p className="text-[9px] sm:text-xs lg:text-xs font-semibold tracking-wide text-black group-hover:text-gray-400 transition-colors leading-tight">SELECT PICTURE<br className="lg:hidden"/>WALL</p>
              </div>

              {/* Step 4 Icon */}
              <div className="text-center cursor-pointer transition-all duration-200 py-2 group flex-shrink-0">
                <div className="flex justify-center mb-2 sm:mb-3 lg:mb-3">
                  <div className="relative w-7 h-10 sm:w-8 sm:h-12 lg:w-6 lg:h-9 border-2 border-black group-hover:border-gray-400 flex items-center justify-center transition-colors">
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-2 lg:h-2 bg-black group-hover:bg-gray-400 rounded-full transition-colors"></div>
                  </div>
                </div>
                <p className="text-lg sm:text-xl lg:text-sm font-semibold mb-1 sm:mb-2 lg:mb-1 text-black group-hover:text-gray-400 transition-colors">4</p>
                <p className="text-[9px] sm:text-xs lg:text-xs font-semibold tracking-wide text-black group-hover:text-gray-400 transition-colors leading-tight">SELECT<br className="lg:hidden"/>DESIGN</p>
              </div>
            </div>

            {/* Price and Add to Cart - Desktop only */}
            <div className="mt-auto pt-2 sm:pt-3 lg:pt-4 space-y-2 sm:space-y-3 flex-shrink-0 hidden lg:block">
              <div>
                <p className="text-2xl font-bold text-center">£ 0</p>
              </div>
              <button
                onClick={handleAddToCart}
                className="w-full bg-black text-white py-3 font-bold text-sm tracking-wide flex items-center justify-center gap-2 hover:bg-gray-800 transition-all duration-200 cursor-pointer hover:shadow-lg hover:scale-105 active:scale-95"
              >
                ADD TO <span>🛍️</span>
              </button>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden">

            {/* Main Hero */}
            <div
              className="flex-1 relative bg-cover bg-center overflow-hidden"
              style={{
                backgroundImage: "url(https://res.cloudinary.com/desenio/image/upload/w_1400/backgrounds/welcome-bg.jpg?v=1)",
              }}
            >
              <div className="relative h-full flex flex-col items-center justify-center text-center text-white px-4 sm:px-8">
                <div className="bg-black/70 backdrop-blur-sm px-6 sm:px-10 md:px-14 lg:px-24 xl:px-32 py-6 sm:py-8 md:py-10 lg:py-16 xl:py-20">
                  <p className="text-[8px] sm:text-[10px] lg:text-xs tracking-[0.2em] sm:tracking-[0.3em] mb-2 sm:mb-3 lg:mb-5 text-gray-300 font-light">STEP-BY-STEP</p>
                  <h2 className="text-lg sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-sans italic mb-2 sm:mb-3 md:mb-4 lg:mb-6 text-white font-light leading-tight">
                    Create the perfect gallery wall
                  </h2>
                  <p className="text-[10px] sm:text-xs md:text-sm lg:text-base mb-4 sm:mb-5 md:mb-6 lg:mb-10 text-gray-200 font-light leading-relaxed">
                    Use our new tool to find designs and frames that match each other
                  </p>
                  <button
                    onClick={() => setCurrentStep("step1")}
                    className="bg-white text-black px-6 sm:px-8 md:px-10 lg:px-12 py-2.5 sm:py-3 lg:py-4 font-bold text-[10px] sm:text-xs lg:text-sm tracking-widest hover:bg-gray-100 border-2 border-white hover:border-black transition-all duration-300 cursor-pointer"
                  >
                    START HERE
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Nav */}
      <div className="lg:hidden fixed bottom-0 left-28 sm:left-32 right-0 bg-white border-t border-gray-300 flex items-center z-40">
        <button 
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          className="px-3 py-3 text-[9px] font-bold tracking-wide text-black hover:bg-gray-100 transition-colors cursor-pointer border-r border-gray-300 flex items-center gap-1"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          MENU
        </button>
        <button 
          className="flex-1 px-3 py-3 text-[9px] font-bold tracking-wide text-black hover:bg-gray-100 transition-colors cursor-pointer border-r border-gray-300 flex items-center gap-1"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
          </svg>
          SAVED GALLERY WALLS
        </button>
        <button 
          onClick={() => setShowCart(!showCart)}
          className="relative px-3 py-3 hover:bg-gray-100 transition-colors cursor-pointer border-r border-gray-300"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" stroke="currentColor" strokeWidth="2" fill="none"/>
          </svg>
          <span className="absolute -top-1 -right-1 bg-black text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-semibold">
            {Object.keys(cartItems.artworks).length + Object.keys(cartItems.frames).length}
          </span>
        </button>
        <button 
          onClick={handleAddToCart}
          className="px-4 py-3 text-[10px] font-bold tracking-wide bg-black text-white hover:bg-gray-800 transition-colors cursor-pointer flex items-center justify-center gap-1"
        >
          ADD TO 
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          £{hasCartItems ? calculateCartTotal() : '0'}
        </button>
      </div>

      <MobileMenuModal />
    </>
  )
}
