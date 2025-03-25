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
  const [activeTab, setActiveTab] = useState<string | null>(null);
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
        {/* Analysis Results Tab */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <button
            onClick={() => setActiveTab(activeTab === 'analysis' ? null : 'analysis')}
            className="w-full flex items-center justify-between p-6 hover:bg-gray-50"
          >
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Your Analysis Results</h3>
              <p className="text-sm text-gray-600 mt-1">View your body shape and skin tone analysis</p>
            </div>
            <ChevronDown 
              className={`w-5 h-5 text-gray-600 transition-transform duration-200
                       ${activeTab === 'analysis' ? 'rotate-180' : ''}`}
            />
          </button>
          
          {activeTab === 'analysis' && (
            <div className="px-6 pb-6">
              <div className="space-y-8">
                {/* Basic Analysis Results */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <span className="text-sm text-gray-500">Body Shape</span>
                    <p className="text-lg font-medium text-gray-900 capitalize">{profile.bodyShape}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Skin Tone</span>
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-6 h-6 rounded-full" 
                        style={{ backgroundColor: profile.skinTone.hexColor }}
                      />
                      <p className="text-lg font-medium text-gray-900">{profile.skinTone.name}</p>
                    </div>
                  </div>
                </div>
                
                {/* Style Recommendations */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    {recommendations.styleTips.title}
                  </h3>
                  <p className="text-gray-600 mb-4">{recommendations.styleTips.description}</p>
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-green-700 mb-2">Do's</h4>
                      <ul className="space-y-2">
                        {recommendations.styleTips.do.map((tip, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <span className="text-green-500 mt-1">✓</span>
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium text-red-700 mb-2">Don'ts</h4>
                      <ul className="space-y-2">
                        {recommendations.styleTips.avoid.map((tip, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <span className="text-red-500 mt-1">✗</span>
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
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
    <div className="w-full space-y-8  flex flex-col items-start pb-24 relative bg-purple-50">

      <div className="w-full">
          <img 
            src="https://res.cloudinary.com/drvhoqgno/image/upload/v1742925824/Frame_1000003885_beeerj.svg"
            alt="Fabloo app screenshot"
            className="w-full"
          />
          
         
      </div>

      <div className="w-full text-center px-4">
        <h3 className="text-xl font-bold text-gray-900 mb-6">Discover fashion with</h3>
        <div className="grid grid-cols-2 gap-4">
          {/* Color Palette Feature */}
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <div className="flex justify-center mb-2">
            <div className="relative aspect-square w-28 mx-auto">
  {/* Color Wheel (SVG) */}
  <svg viewBox="0 0 100 100" className="w-full h-full">
    <path d="M 50,50 L 100,50 A 50,50 0 0,1 93.3,75 Z" fill="#2563eb" /> {/* blue-600 */}
    <path d="M 50,50 L 93.3,75 A 50,50 0 0,1 75,93.3 Z" fill="#581c87" /> {/* purple-900 */}
    <path d="M 50,50 L 75,93.3 A 50,50 0 0,1 50,100 Z" fill="#5eead4" /> {/* teal-300 */}
    <path d="M 50,50 L 50,100 A 50,50 0 0,1 25,93.3 Z" fill="#e11d48" /> {/* rose-600 */}
    <path d="M 50,50 L 25,93.3 A 50,50 0 0,1 6.7,75 Z" fill="#7dd3fc" /> {/* sky-300 */}
    <path d="M 50,50 L 6.7,75 A 50,50 0 0,1 0,50 Z" fill="#fef08a" /> {/* yellow-200 */}
    <path d="M 50,50 L 0,50 A 50,50 0 0,1 6.7,25 Z" fill="#f9a8d4" /> {/* pink-300 */}
    <path d="M 50,50 L 6.7,25 A 50,50 0 0,1 25,6.7 Z" fill="#e5e7eb" /> {/* gray-200 */}
    <path d="M 50,50 L 25,6.7 A 50,50 0 0,1 50,0 Z" fill="#60a5fa" /> {/* blue-400 */}
    <path d="M 50,50 L 50,0 A 50,50 0 0,1 75,6.7 Z" fill="#86efac" /> {/* green-300 */}
    <path d="M 50,50 L 75,6.7 A 50,50 0 0,1 93.3,25 Z" fill="#c4b5fd" /> {/* violet-300 */}
    <path d="M 50,50 L 93.3,25 A 50,50 0 0,1 100,50 Z" fill="#f9a8d4" /> {/* pink-200 */}
  </svg>

  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
    <img
      src="https://res.cloudinary.com/drvhoqgno/image/upload/v1742234094/Frame_1000003729_yhgkns.png" // Replace with actual image
      alt="Center Image"
      className="w-16 h-16 rounded-full border-2 border-white shadow-lg object-cover"
    />
  </div>
</div>
            </div>
            <p className="text-gray-800 text-sm font-medium">Shades That Shine On You</p>
          </div>
          
          {/* Body Shape Feature */}
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <div className="flex justify-center mb-2">
              <div className="flex space-x-1">
                {[1, 2, 3].map(index => (
                  <img
                    key={index}
                    src="https://res.cloudinary.com/drvhoqgno/image/upload/v1742233389/Screenshot_2025-03-17_at_11.13.04_PM_mxk2zf.png"
                    alt={`Dress silhouette ${index}`}
                    className="w-8 h-28 object-contain"
                  />
                ))}
              </div>
            </div>
            <p className="text-gray-800 text-sm font-medium">Styles That Flatters On You</p>
          </div>
        </div>
      </div>
      
      {/* CTA Button */}
      <div className="w-full mt-6 px-4">
        <button
          onClick={startAnalysis}
          className="w-full flex items-center justify-center gap-2 px-6 py-4 
                   bg-gray-900 text-white text-lg font-medium rounded-xl
                   hover:bg-gray-800 transition-colors shadow-md hover:shadow-lg"
        >
          Get Started
        </button>
      </div>
    </div>
  );
}

function App() {
  const [analysisResults, setAnalysisResults] = useState<{
    bodyShape?: BodyShape;
    skinTone?: SkinTone;
  }>({});
  const navigate = useNavigate();

  const handleBodyShapeComplete = (bodyShape: BodyShape) => {
    setAnalysisResults(prev => ({ ...prev, bodyShape }));
    navigate('/skin-tone');
  };

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