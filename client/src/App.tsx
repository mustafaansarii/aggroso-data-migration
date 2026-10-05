import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Database, Workflow, History } from 'lucide-react';
import DatasetPage from './pages/DatasetPage';
import PlannerPage from './pages/PlannerPage';
import HistoryPage from './pages/HistoryPage';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col">
        <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Database className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900">Data Migration Workbench</h1>
          </div>
          <nav className="flex space-x-6">
            <Link to="/" className="text-gray-600 hover:text-gray-900 flex items-center space-x-1">
              <Database className="w-4 h-4" />
              <span>Dataset</span>
            </Link>
            <Link to="/planner" className="text-gray-600 hover:text-gray-900 flex items-center space-x-1">
              <Workflow className="w-4 h-4" />
              <span>Planner</span>
            </Link>
            <Link to="/history" className="text-gray-600 hover:text-gray-900 flex items-center space-x-1">
              <History className="w-4 h-4" />
              <span>History</span>
            </Link>
          </nav>
        </header>

        <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
          <Routes>
            <Route path="/" element={<DatasetPage />} />
            <Route path="/planner" element={<PlannerPage />} />
            <Route path="/history" element={<HistoryPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
