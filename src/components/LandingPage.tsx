import { useNavigate } from "react-router-dom";

   const navigate = useNavigate();
 

   const LandingPage = () => {
   const startAnalysis = () => {
    navigate('/body-shape');
   }
   
 
   return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-4xl font-bold">Welcome to the Landing Page</h1>
      <button onClick={startAnalysis} className="bg-blue-500 text-white px-4 py-2 rounded-md">
        Start Analysis
      </button>
    </div>
  );
}

export default LandingPage;