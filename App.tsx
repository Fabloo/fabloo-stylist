import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { Layout } from './src/components/Layout';
import { BodyShapeAnalysis } from './src/components/BodyShapeAnalysis';
import { SkinToneOptions } from './src/components/SkinToneOptions';
import { SkinToneAnalysis } from './src/components/SkinToneAnalysis';
import { SkinToneDetector } from './src/components/SkinToneDetector';
import SkinToneRecommendations from './src/components/SkinToneRecommendations';
import { FriendCircleResults } from './src/pages/FriendCircleResults';
import { ProductReview } from './src/pages/ProductReview';
import { ReviewSuccess } from './src/pages/ReviewSuccess';
import { useState } from 'react';
import { GoogleTagManager } from './src/components/GoogleTagManager';
import MetaPixel from './src/components/MetaPexel';
import { ErrorBoundary } from 'react-error-boundary';
import React from 'react';

// Define types locally to avoid import issues
type BodyShape = 'hourglass' | 'pear' | 'inverted-triangle' | 'rectangle' | 'apple';
type SkinTone = {
  id?: string;
  name?: string;
  hexColor?: string;
  season?: 'warm' | 'cool' | 'neutral';
};

function Home() {
  const navigate = useNavigate();
  return (
    <div>
      <h1>Home Page</h1>
      <button onClick={() => navigate('/body-shape')}>Start Analysis</button>
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
    // Navigate to skin tone options page
    navigate('/skin-tone', { state: { fromBodyShape: true } });
  };

  return (
    <>
      <GoogleTagManager />
      <MetaPixel />
      <ErrorBoundary>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            
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
            <Route path="/skin-tone-quiz" element={<SkinToneAnalysis />} />
            <Route path="/skin-tone-detector" element={<SkinToneDetector />} />
            <Route path="/skin-tone-recommendations" element={<SkinToneRecommendations />} />
            
            {/* Friend Circle Results */}
            <Route path="/friend-circle-results" element={<FriendCircleResults />} />
            
            {/* Review Pages - No layout wrapper for these to match the design */}
            <Route path="/review/:itemId/:shareId" element={
              <ProductReview />
            } />
            <Route path="/review-success/:itemId" element={
              <ReviewSuccess />
            } />
          </Routes>
        </Layout>
      </ErrorBoundary>
    </>
  );
}

export default App; 