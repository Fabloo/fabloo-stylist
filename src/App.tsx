import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate} from 'react-router-dom';
import { Layout } from './components/Layout';
import { ChevronDown } from 'lucide-react';
import { BodyShapeAnalysis } from './components/BodyShapeAnalysis';
import { SkinToneAnalysis } from './components/SkinToneAnalysis';
import { Auth } from './pages/Auth';
import { Profile } from './pages/Profile';
import { Checkout } from './pages/Checkout';
import { OrderSuccess } from './components/OrderSuccess';
import { ProductDetail } from './pages/ProductDetail';
import { ShopRecommendations } from './components/ShopRecommendations';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AdminPanel } from './pages/AdminPanel';
import type { BodyShape, UserProfile, SkinTone } from './types';
import { getStyleRecommendations } from './utils/styleRecommendations';

type RecommendationsPageProps = {
  initialResults: {
    bodyShape?: BodyShape;
    skinTone?: SkinTone;
  };
};

function RecommendationsPage({ initialResults }: RecommendationsPageProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalysisExpanded, setIsAnalysisExpanded] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({
    bodyShape: initialResults.bodyShape,
    skinTone: initialResults.skinTone
  });
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('supabase.auth.token');
    if (token) {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  if (!profile.bodyShape || !profile.skinTone) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Complete Your Analysis</h2>
        <p className="text-lg text-gray-600 mb-8">
          Please complete your body shape and skin tone analysis to view personalized recommendations.
        </p>
        <button
          onClick={() => navigate('/body-shape')}
          className="inline-flex items-center px-6 py-3 bg-black text-white
                   rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Start Analysis
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <p className="text-lg text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto">
        <Auth onSuccess={() => setIsAuthenticated(true)} />
      </div>
    );
  }

  const recommendations = profile.bodyShape && profile.skinTone 
    ? getStyleRecommendations(profile.bodyShape, profile.skinTone)
    : null;
  
  if (!profile.bodyShape || !profile.skinTone || !recommendations) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Complete Your Analysis</h2>
        <p className="text-lg text-gray-600 mb-8">
          Please complete your body shape and skin tone analysis to view personalized recommendations.
        </p>
        <button
          onClick={() => navigate('/body-shape')}
          className="inline-flex items-center px-6 py-3 bg-black text-white
                   rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Start Analysis
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {!isAuthenticated && (
        <div className="bg-indigo-50 p-6 rounded-xl mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Save Your Results</h3>
              <p className="text-sm text-gray-600">
                Sign in to save your analysis and get personalized recommendations
              </p>
            </div>
            <button
              onClick={() => setIsAuthenticated(true)}
              className="px-4 py-2 bg-black text-white rounded-lg hover:bg-indigo-700
                       transition-colors text-sm font-medium"
            >
              Sign In
            </button>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Analysis Results Section */}
        <div className="bg-white w-full mx-auto shadow-[0px_0px_16px_rgba(0,0,0,0.10)] rounded-lg">
          <div className="text-center p-8">
            <h3 className="text-[#212121] text-[24px] font-semibold leading-[24px] font-poppins">Your analysis results</h3>
            <p className="text-[#565656] text-lg leading-[21.6px] font-poppins mt-3">View your body shape and skin tone analysis</p>
          </div>
          
          {isAnalysisExpanded && (
            <div className="px-8 pb-6">
              <div className="space-y-8">
                {/* Basic Analysis Results */}
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <span className="text-[#565656] text-sm font-semibold uppercase tracking-wider leading-[16.8px] font-poppins">BODY SHAPE</span>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 flex items-center justify-center">
                        <img 
                          src={`/images/body-shapes/${profile.bodyShape?.toLowerCase()}-icon.svg`}
                          alt={profile.bodyShape || 'Body shape'}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            const target = e.currentTarget;
                            if (profile.bodyShape) {
                              target.src = `https://res.cloudinary.com/drvhoqgno/image/upload/v1742970214/body-shapes/${profile.bodyShape.toLowerCase()}-icon.svg`;
                            }
                          }}
                        />
                      </div>
                      <p className="text-[#212121] text-xl font-semibold leading-[25.2px] font-poppins capitalize">
                        {profile.bodyShape || 'Loading...'}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <span className="text-[#565656] text-sm font-semibold uppercase tracking-wider leading-[16.8px] font-poppins">SKIN TONE</span>
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-full border border-gray-100" 
                        style={{ backgroundColor: profile.skinTone?.hexColor }}
                      />
                      <p className="text-[#212121] text-xl font-semibold leading-[25.2px] font-poppins">
                        {profile.skinTone?.name || 'Loading...'}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Description */}
                <div className="border-t border-b border-gray-100 py-8">
                  <h3 className="text-[#212121] text-xl font-semibold mb-3 font-poppins">Balanced Proportions</h3>
                  <p className="text-[#565656] text-lg leading-[27px] font-poppins">
                    Your shoulders and hips are about the same width with a defined waist.
                  </p>
                </div>
                
                {/* Style Recommendations */}
                <div className="space-y-6">
                  {/* DO's */}
                  <div>
                    <h4 className="text-[#1E8227] text-base font-semibold leading-[19.2px] font-poppins mb-4">DO'S</h4>
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                      {recommendations?.styleTips.do.map((tip, i) => (
                        <div 
                          key={i} 
                          className="flex items-center gap-2.5 px-5 py-3.5 bg-[#F2F9F3] rounded-lg min-w-max"
                        >
                          <span className="text-[#1E8227] text-lg">✓</span>
                          <p className="text-[#1E8227] text-base leading-[19.2px] font-poppins whitespace-nowrap">
                            {tip}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* DON'Ts */}
                  <div>
                    <h4 className="text-[#D92D20] text-base font-semibold leading-[19.2px] font-poppins mb-4">DON'TS</h4>
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                      {recommendations?.styleTips.avoid.map((tip, i) => (
                        <div 
                          key={i} 
                          className="flex items-center gap-2.5 px-5 py-3.5 bg-[#FEF3F2] rounded-lg min-w-max"
                        >
                          <span className="text-[#D92D20] text-lg">✗</span>
                          <p className="text-[#D92D20] text-base leading-[19.2px] font-poppins whitespace-nowrap">
                            {tip}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex justify-center pb-8">
            <button
              onClick={() => setIsAnalysisExpanded(!isAnalysisExpanded)}
              className="w-[164px] flex items-center justify-center gap-1.5 px-4 py-3
                       bg-[#BC4BF8] hover:bg-[#A43DE0] text-white rounded-[100px] transition-colors"
            >
              <span className="text-base font-medium font-poppins">
                {isAnalysisExpanded ? 'View Less' : 'View More'}
              </span>
              <ChevronDown 
                className={`w-4 h-4 transition-transform duration-200
                         ${isAnalysisExpanded ? 'rotate-180' : ''}`}
              />
            </button>
          </div>
        </div>
        
        {/* Shop Recommendations Section */}
        <div className="mt-8">
          <ShopRecommendations 
            bodyShape={profile.bodyShape} 
            skinTone={profile.skinTone}
          />
        </div>
      </div>
    </div>
  );
}

function LandingPage() {
  const navigate = useNavigate();

  const startAnalysis = () => {
    navigate('/body-shape');
  };

  return (
    <div className="w-full min-h-screen space-y-12 flex flex-col items-start pb-24 relative bg-gradient-to-b from-purple-50 to-white">
      {/* Hero Section */}
      <div className="w-full relative">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-100/50 to-pink-100/50 z-0" />
        <img 
          src="https://res.cloudinary.com/drvhoqgno/image/upload/v1742925824/Frame_1000003885_beeerj.svg"
          alt="Fabloo app screenshot"
          className="w-full relative z-10 transform hover:scale-[1.02] transition-transform duration-500"
        />
      </div>

      {/* Features Section */}
      <div className="w-full text-center px-4 max-w-4xl mx-auto">
        <h3 className="text-2xl font-bold text-gray-900 mb-8">Discover fashion with</h3>
        <div className="grid grid-cols-2 gap-6">
          {/* Color Palette Feature */}
          <div className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex justify-center mb-4">
              <div className="relative aspect-square w-32 mx-auto">
                <svg viewBox="0 0 100 100" className="w-full h-full animate-spin-slow">
                  <path d="M 50,50 L 100,50 A 50,50 0 0,1 93.3,75 Z" fill="#2563eb" />
                  <path d="M 50,50 L 93.3,75 A 50,50 0 0,1 75,93.3 Z" fill="#581c87" />
                  <path d="M 50,50 L 75,93.3 A 50,50 0 0,1 50,100 Z" fill="#5eead4" />
                  <path d="M 50,50 L 50,100 A 50,50 0 0,1 25,93.3 Z" fill="#e11d48" />
                  <path d="M 50,50 L 25,93.3 A 50,50 0 0,1 6.7,75 Z" fill="#7dd3fc" />
                  <path d="M 50,50 L 6.7,75 A 50,50 0 0,1 0,50 Z" fill="#fef08a" />
                  <path d="M 50,50 L 0,50 A 50,50 0 0,1 6.7,25 Z" fill="#f9a8d4" />
                  <path d="M 50,50 L 6.7,25 A 50,50 0 0,1 25,6.7 Z" fill="#e5e7eb" />
                  <path d="M 50,50 L 25,6.7 A 50,50 0 0,1 50,0 Z" fill="#60a5fa" />
                  <path d="M 50,50 L 50,0 A 50,50 0 0,1 75,6.7 Z" fill="#86efac" />
                  <path d="M 50,50 L 75,6.7 A 50,50 0 0,1 93.3,25 Z" fill="#c4b5fd" />
                  <path d="M 50,50 L 93.3,25 A 50,50 0 0,1 100,50 Z" fill="#f9a8d4" />
                </svg>

                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <img
                    src="https://res.cloudinary.com/drvhoqgno/image/upload/v1742234094/Frame_1000003729_yhgkns.png"
                    alt="Center Image"
                    className="w-20 h-20 rounded-full border-4 border-white shadow-xl object-cover transform hover:scale-110 transition-transform duration-300"
                  />
                </div>
              </div>
            </div>
            <p className="text-gray-800 text-base font-semibold">Shades That Shine On You</p>
            <p className="text-gray-600 text-sm mt-2">Discover your perfect color palette</p>
          </div>
          
          {/* Body Shape Feature */}
          <div className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex justify-center mb-4">
              <div className="w-full aspect-square flex items-center justify-center">
                <img
                  src="https://res.cloudinary.com/drvhoqgno/image/upload/v1742970214/Marianne_Jones_Body_Shape_For_Dresses_6_2048x2048_2_ahcorn.png"
                  alt="Dress silhouette"
                  className="w-full h-full object-contain transform hover:scale-105 transition-transform duration-300"
                />
              </div>
            </div>
            <p className="text-gray-800 text-base font-semibold">Styles That Flatter You</p>
            <p className="text-gray-600 text-sm mt-2">Find clothes that enhance your shape</p>
          </div>
        </div>
      </div>

      {/* CTA Button */}
      <div className="w-full mt-8 px-4 max-w-md mx-auto">
        <button
          onClick={startAnalysis}
          className="w-full flex items-center justify-center gap-3 px-8 py-5 
                   bg-gradient-to-r from-purple-600 to-pink-600 text-white text-lg font-semibold rounded-2xl
                   hover:from-purple-700 hover:to-pink-700 transition-all duration-300 
                   shadow-lg hover:shadow-xl transform hover:-translate-y-1"
        >
          Get Started
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function App() {
  const [isAnalysisExpanded, setIsAnalysisExpanded] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<{
    bodyShape?: BodyShape;
    skinTone?: SkinTone;
  }>({});
  const navigate = useNavigate();

  const handleBodyShapeComplete = (bodyShape: BodyShape) => {
    setAnalysisResults(prev => ({ ...prev, bodyShape }));
    navigate('/skin-tone');
  };

  const recommendations = analysisResults.bodyShape && analysisResults.skinTone 
    ? getStyleRecommendations(analysisResults.bodyShape, analysisResults.skinTone)
    : null;
  const colorPalette = recommendations?.colors;

  return (
    <ErrorBoundary>
      <Layout>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/body-shape"
          element={
            <BodyShapeAnalysis 
              onComplete={handleBodyShapeComplete} 
              currentShape={analysisResults.bodyShape}
            />
          }
        />
        <Route 
          path="/skin-tone" 
          element={
            <SkinToneAnalysis 
              currentResults={analysisResults}
              onComplete={(results) => {
                setAnalysisResults(prev => ({ ...prev, ...results }));
                navigate('/auth');
              }}
            />
          }
        />
        <Route
          path="/auth"
          element={
            <Auth onSuccess={() => navigate('/recommendations')} />
          }
        />
        <Route 
          path="/recommendations" 
          element={
            <RecommendationsPage 
              initialResults={analysisResults}
            />
          }
        />
        <Route path="/profile" element={<Profile />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/order-success" element={<OrderSuccess />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/admin" element={<AdminPanel />} />
      </Routes>
      </Layout>
    </ErrorBoundary>
  );
}

export default App;