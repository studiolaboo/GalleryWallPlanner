import { useGallery } from '../../context/GalleryContext'
import { backgroundOptions } from '../../data'
import { TopNavBar, Breadcrumb, MobileBottomNav, MobileMenuModal, ResetModal } from '../layout'

export default function SelectBackgroundStep() {
  const {
    setCurrentStep,
    selectedBackground, setSelectedBackground,
    selectedPlace,
    activeVariants, setActiveVariants,
    expandedSection, setExpandedSection,
  } = useGallery()

  return (
    <>
      <ResetModal />
      
      <div className="h-screen bg-white flex flex-col overflow-hidden">
        <TopNavBar />
        <Breadcrumb />
        <div className="flex flex-row flex-1 overflow-hidden pb-12 lg:pb-0">
          {/* Left Sidebar */}
          <div className="flex w-28 lg:w-80 bg-white border-r border-gray-300 px-1 lg:px-6 py-1 lg:py-4 flex-col h-full">

            <div className="lg:hidden flex-shrink-0 mb-1 text-center border-b border-gray-200 pb-1">
              <p className="text-[8px] font-bold tracking-wide">2 BACKGROUND</p>
            </div>

            <div className="hidden lg:flex items-center justify-between px-0 py-3 sm:py-4 border-b border-gray-200 flex-shrink-0">
              <p className="text-xs sm:text-sm font-semibold tracking-wide">2. SELECT BACKGROUND</p>
              <button
                onClick={() => setCurrentStep("intro")}
                className="text-2xl font-light text-gray-600 hover:text-black transition-colors cursor-pointer leading-none"
              >
                ✕
              </button>
            </div>

            {/* Background Options */}
            <div className="flex-1 overflow-y-auto py-1 lg:py-6 px-0 min-h-0" style={{ maxHeight: 'calc(100vh - 200px)' }}>
              <div className="space-y-3 lg:space-y-6 lg:pr-2">
                {backgroundOptions.map((section, sectionIdx) => {
                  const activeVariant = activeVariants[sectionIdx] || section.variants[0]
                  const isSelected = selectedBackground?.id === activeVariant.id
                  
                  return (
                    <div key={sectionIdx}>
                      <div
                        className="relative w-full h-16 lg:h-auto lg:aspect-[16/9] bg-cover bg-center transition-all duration-300 cursor-pointer hover:opacity-90"
                        style={{ backgroundImage: `url(${activeVariant.image})` }}
                        onClick={() => {
                          setExpandedSection(expandedSection === sectionIdx ? null : sectionIdx)
                          setSelectedBackground(activeVariant)
                        }}
                      />

                      {/* Mobile color swatches */}
                      {isSelected && (
                        <div className="lg:hidden mt-1.5 bg-white border border-gray-300 p-1.5 rounded-sm">
                          <div className="flex gap-1.5 flex-wrap">
                            {section.variants.map((variant) => (
                              <div
                                key={variant.id}
                                className={`relative w-8 h-8 lg:w-10 lg:h-10 border-2 cursor-pointer transition-all duration-200 flex-shrink-0 ${
                                  activeVariant.id === variant.id ? 'border-black' : 'border-gray-300'
                                }`}
                                style={{ backgroundColor: variant.color }}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setActiveVariants({ ...activeVariants, [sectionIdx]: variant })
                                  setSelectedBackground(variant)
                                }}
                                title={variant.name}
                              >
                                {activeVariant.id === variant.id && (
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <svg className="w-4 h-4 lg:w-5 lg:h-5 text-white drop-shadow-md" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Desktop color swatches */}
                      {expandedSection === sectionIdx && (
                        <div className="hidden lg:flex gap-2 mt-3 animate-fadeIn flex-wrap px-1">
                          {section.variants.map((variant) => (
                            <div
                              key={variant.id}
                              className={`w-10 h-10 border-2 cursor-pointer transition-all duration-200 flex-shrink-0 ${
                                activeVariant.id === variant.id ? 'border-black scale-110' : 'border-gray-300 hover:border-gray-600'
                              }`}
                              style={{ backgroundColor: variant.color }}
                              onClick={(e) => {
                                e.stopPropagation()
                                setActiveVariants({ ...activeVariants, [sectionIdx]: variant })
                                setSelectedBackground(variant)
                              }}
                              title={variant.name}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="px-0 py-2 lg:py-4 border-t border-gray-200 space-y-1.5 lg:space-y-3 flex-shrink-0">
              <button 
                disabled={!selectedBackground}
                onClick={() => selectedBackground && setCurrentStep("step3")}
                className="w-full bg-black text-white py-2 lg:py-4 font-bold text-[10px] lg:text-sm tracking-widest hover:bg-gray-800 transition-all duration-200 disabled:bg-gray-300 disabled:cursor-not-allowed cursor-pointer"
              >
                NEXT
              </button>
              <button 
                onClick={() => setCurrentStep("step1")}
                className="hidden lg:flex w-full bg-white text-black py-2 lg:py-3 font-bold text-[10px] lg:text-sm tracking-wide border-2 border-black hover:bg-gray-100 transition-all duration-200 cursor-pointer items-center justify-center gap-1"
              >
                PREVIOUS
              </button>
              <button 
                onClick={() => setCurrentStep("intro")}
                className="lg:hidden w-full bg-white text-black py-2 font-bold text-[10px] tracking-wide border-2 border-black hover:bg-gray-100 transition-all duration-200 cursor-pointer flex items-center justify-center gap-1"
              >
                <span className="text-xs">✕</span>
                CLOSE
              </button>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden">

            <div
              className="flex-1 relative bg-cover bg-center transition-all duration-500"
              style={{
                backgroundImage: selectedBackground 
                  ? `url("${selectedBackground.image}")` 
                  : selectedPlace 
                    ? `url("${selectedPlace.image}")`
                    : "url(https://res.cloudinary.com/desenio/image/upload/w_1400/backgrounds/welcome-bg.jpg?v=1)",
              }}
            />

            <MobileBottomNav />
          </div>
        </div>
      </div>

      <MobileMenuModal />
    </>
  )
}
