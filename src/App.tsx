import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate} from 'react-router-dom';
import { Layout } from './components/Layout';
import { ChevronDown } from 'lucide-react';
import { BodyShapeAnalysis } from './components/BodyShapeAnalysis';
import { SkinToneAnalysis } from './components/SkinToneAnalysis';
import { SkinToneOptions } from './components/SkinToneOptions';
import { SkinToneDetector } from './components/SkinToneDetector';
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
import { GoogleTagManager } from './components/GoogleTagManager';
import ColorWheel from './components/ColorWheel';
import MetaPixel from './components/MetaPexel';
import { supabase } from './lib/supabase';

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
                   rounded-lg hover:bg-gray-800 transition-colors duration-200"
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
                   rounded-lg hover:bg-gray-800 transition-colors duration-200"
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
              className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800
                       transition-colors duration-200 text-sm font-medium"
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
              <div className="space-y-4">
                {/* Basic Analysis Results */}
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <span className="text-[#565656] text-sm font-semibold uppercase tracking-wider leading-[16.8px] font-poppins">BODY SHAPE</span>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 flex items-center justify-center">
                        <img 
                          src={
                            profile.bodyShape ? 
                              profile.bodyShape.toLowerCase() === 'rectangle' 
                                ? 'https://res.cloudinary.com/drvhoqgno/image/upload/v1743358211/Screenshot_2025-03-30_at_11.40.04_PM_opafaj.png'
                              : profile.bodyShape.toLowerCase() === 'apple'
                                ? 'https://res.cloudinary.com/drvhoqgno/image/upload/v1743358070/Screenshot_2025-03-30_at_11.37.41_PM_a7y4ci.png'
                              : profile.bodyShape.toLowerCase() === 'pear'
                                ? 'https://res.cloudinary.com/drvhoqgno/image/upload/v1743357962/Screenshot_2025-03-30_at_11.35.54_PM_fbz2o2.png'
                              : profile.bodyShape.toLowerCase() === 'hourglass'
                                ? 'https://res.cloudinary.com/drvhoqgno/image/upload/v1743358165/Screenshot_2025-03-30_at_11.39.17_PM_bkawge.png'
                              : profile.bodyShape.toLowerCase() === 'inverted-triangle'
                                ? 'https://res.cloudinary.com/drvhoqgno/image/upload/v1743358120/Screenshot_2025-03-30_at_11.38.33_PM_ptsriy.png'
                                : ''
                            : ''
                          }
                          alt={profile.bodyShape || 'Body shape'}
                          className="w-full h-full object-contain"
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
                <div className="border-t border-b border-gray-100 py-4">
                  <h3 className="text-[#212121] text-xl font-semibold mb-3 font-poppins">Balanced Proportions</h3>
                  <p className="text-[#565656] text-lg leading-[27px] font-poppins">
                    Your shoulders and hips are about the same width with a defined waist.
                  </p>
                </div>

                {/* Color Wheel */}
                <div>
                  <ColorWheel selectedTone={profile.skinTone?.name || 'Fair Cool'} />
                </div>
                
                {/* Style Recommendations */}
                <div className="space-y-6">
                  {/* DO's */}
                  <div>
                    <h4 className="text-[#1E8227] text-base font-semibold leading-[19.2px] font-poppins mb-4">DO'S</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {recommendations?.styleTips.do.map((tip, i) => (
                        <div 
                          key={i} 
                          className="flex items-center gap-2.5 px-5 py-3.5 bg-[#F2F9F3] rounded-lg"
                        >
                          <span className="text-[#1E8227] text-lg flex-shrink-0">✓</span>
                          <p className="text-[#1E8227] text-base leading-[19.2px] font-poppins">
                            {tip}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* DON'Ts */}
                  <div>
                    <h4 className="text-[#D92D20] text-base font-semibold leading-[19.2px] font-poppins mb-4">DON'TS</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {recommendations?.styleTips.avoid.map((tip, i) => (
                        <div 
                          key={i} 
                          className="flex items-center gap-2.5 px-5 py-3.5 bg-[#FEF3F2] rounded-lg"
                        >
                          <span className="text-[#D92D20] text-lg flex-shrink-0">✗</span>
                          <p className="text-[#D92D20] text-base leading-[19.2px] font-poppins">
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
              onClick={() => {
                // Track view more/less event
                window.gtag('event', isAnalysisExpanded ? 'View Less' : 'View More', {
                  'event_category': 'Analysis Report',
                  'event_label': isAnalysisExpanded ? 'View Less' : 'View More'
                });
                setIsAnalysisExpanded(!isAnalysisExpanded);
              }}
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
          src="https://res.cloudinary.com/dofgnvgo6/image/upload/v1744395474/Screenshot_2025-04-11_at_11.47.10_PM_ejr2dl.png"
          alt="Fabloo app screenshot"
          className="w-full relative z-10 transform hover:scale-[1.02] transition-transform duration-500"
        />
      </div>

      {/* Features Section */}
      <div className="w-[312px] mx-auto mt-[22px] space-y-4 pb-24">
        <div className="text-center text-[#212121] text-[20px] font-semibold leading-[24px] font-poppins mb-6">
          Discover fashion with
        </div>

        {/* Color Wheel Card - Horizontal */}
        <div className="w-full h-[160px] bg-gradient-to-tr from-[rgba(225,187,255,0.25)] to-[rgba(255,226,255,0.25)] rounded-[16px] border border-[#EAEAEA] shadow-[4px_4px_8px_rgba(0,0,0,0.05)] relative overflow-hidden">
          <div className="absolute left-6 top-1/2 -translate-y-1/2 w-[120px] h-[120px]">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <path d="M 50,50 L 100,50 A 50,50 0 0,1 93.3,75 Z" fill="#00C2AF" />
              <path d="M 50,50 L 93.3,75 A 50,50 0 0,1 75,93.3 Z" fill="#009775" />
              <path d="M 50,50 L 75,93.3 A 50,50 0 0,1 50,100 Z" fill="#99D6EA" />
              <path d="M 50,50 L 50,100 A 50,50 0 0,1 25,93.3 Z" fill="#808286" />
              <path d="M 50,50 L 25,93.3 A 50,50 0 0,1 6.7,75 Z" fill="#F8E59A" />
              <path d="M 50,50 L 6.7,75 A 50,50 0 0,1 0,50 Z" fill="#F395C7" />
              <path d="M 50,50 L 0,50 A 50,50 0 0,1 6.7,25 Z" fill="#E3006D" />
              <path d="M 50,50 L 6.7,25 A 50,50 0 0,1 25,6.7 Z" fill="#CE0037" />
              <path d="M 50,50 L 25,6.7 A 50,50 0 0,1 50,0 Z" fill="#D2298E" />
              <path d="M 50,50 L 50,0 A 50,50 0 0,1 75,6.7 Z" fill="#7421B0" />
              <path d="M 50,50 L 75,6.7 A 50,50 0 0,1 93.3,25 Z" fill="#3A48BA" />
              <path d="M 50,50 L 93.3,25 A 50,50 0 0,1 100,50 Z" fill="#006FC4" />
            </svg>
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[60px] h-[60px] rounded-full overflow-hidden bg-white border-2 border-white shadow-lg">
              <img
                src="https://res.cloudinary.com/drvhoqgno/image/upload/v1743339615/pixelcut-export__2_-removebg_tlsny4.png"
                alt="Profile"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <div className="absolute left-[180px] top-[50%] -translate-y-1/2">
            <div className="text-[#212121] text-[18px] font-medium font-poppins">
              Shades That Shine On You
            </div>
          </div>
        </div>

        {/* Styles Card - Horizontal */}
        <div className="w-full h-[160px] bg-gradient-to-tr from-[rgba(225,187,255,0.25)] to-[rgba(255,226,255,0.25)] rounded-[16px] border border-[#EAEAEA] shadow-[4px_4px_8px_rgba(0,0,0,0.05)] relative overflow-hidden">
          <div className="absolute left-6 top-[50%] -translate-y-1/2">
            <div className="text-[#212121] text-[18px] font-medium font-poppins max-w-[140px] leading-[22px]">
              Styles That<br />Flatters On <br /> You
            </div>
          </div>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 w-[160px] flex justify-center ml-12">
            <img
              src="https://res.cloudinary.com/drvhoqgno/image/upload/v1742970214/Marianne_Jones_Body_Shape_For_Dresses_6_2048x2048_2_ahcorn.png"
              alt="Style"
              className="w-auto h-[128px] object-contain"
            />
          </div>
        </div>
      </div>

      {/* CTA Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100">
        <div className="w-[312px] mx-auto">
          <button
            onClick={startAnalysis}
            className="w-full py-4 bg-gradient-to-r from-[#B252FF] to-[#F777F7] text-white text-[16px] font-medium leading-5 font-poppins rounded-[8px] shadow-lg hover:shadow-xl transition-shadow"
          >
            Get Started
          </button>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [analysisResults, setAnalysisResults] = useState<UserProfile>({});
  const navigate = useNavigate();

  // Check authentication and profile status on app load
  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      // Only redirect if we're on the root path
      if (window.location.pathname !== '/') {
        return;
      }

      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (session && !error) {
        try {
          // Get the user's profile from Supabase
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          // If we have a valid profile with body shape and skin tone, redirect to recommendations
          if (profile?.body_shape && profile?.skin_tone) {
            setAnalysisResults({
              id: session.user.id,
              bodyShape: profile.body_shape,
              skinTone: profile.skin_tone,
              body_shape: profile.body_shape,
              skin_tone: profile.skin_tone
            });
            navigate('/recommendations');
          }
        } catch (e) {
          console.error('Error fetching profile:', e);
        }
      }
    };

    checkAuthAndRedirect();
  }, [navigate]);

  const handleBodyShapeComplete = (bodyShape: BodyShape) => {
    setAnalysisResults(prev => ({ ...prev, bodyShape }));
    console.log("Body shape complete, navigating to /skin-tone with state:", { state: { fromBodyShape: true } });
    navigate('/skin-tone', { state: { fromBodyShape: true } });
  };

  const handleSkinToneComplete = (results: { skinTone: SkinTone }) => {
    console.log("Skin tone detection complete, navigating to /auth with results:", results);
    setAnalysisResults(prev => ({ ...prev, ...results }));
    navigate('/auth');
  };

  const recommendations = analysisResults.bodyShape && analysisResults.skinTone 
    ? getStyleRecommendations(analysisResults.bodyShape, analysisResults.skinTone)
    : null;
  const colorPalette = recommendations?.colors;

  return (
    <>
      <GoogleTagManager />
      <MetaPixel />
      <ErrorBoundary>
        <Layout>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          
          {/* Body Shape Analysis */}
          <Route
            path="/body-shape"
            element={
              <BodyShapeAnalysis 
                onComplete={handleBodyShapeComplete} 
                currentShape={analysisResults.bodyShape}
              />
            }
          />
          
          {/* Skin Tone Flow */}
          <Route path="/skin-tone" element={<SkinToneOptions />} />
          <Route 
            path="/skin-tone-quiz" 
            element={
              <SkinToneAnalysis 
                currentResults={analysisResults}
                onComplete={handleSkinToneComplete}
              />
            }
          />
          <Route 
            path="/skin-tone-detector" 
            element={
              <SkinToneDetector 
                onComplete={handleSkinToneComplete}
              />
            }
          />
          
          {/* Authentication and Recommendations */}
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
          
          {/* Other Routes */}
          <Route path="/profile" element={<Profile />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/order-success" element={<OrderSuccess />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/admin" element={<AdminPanel />} />
        </Routes>
        </Layout>
      </ErrorBoundary>
    </>
  );
}

export default App;
