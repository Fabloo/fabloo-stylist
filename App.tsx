import { BrowserRouter, Routes, Route } from 'react-router-dom';
import BodyShapeQuiz from './components/BodyShapeQuiz';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<BodyShapeQuiz />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App; 