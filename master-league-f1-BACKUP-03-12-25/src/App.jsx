import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';

// Páginas
import Home from './pages/Home';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PowerRanking from './pages/PowerRanking';
import HallOfFame from './pages/HallOfFame';
import Regulamento from './pages/Regulamento';
import Telemetria from './pages/Telemetria'; // <--- IMPORT ATUALIZADO
import Mercado from './pages/Mercado';
import Standings from './pages/Standings';
import Admin from './pages/Admin'; 

function App() {
    return (
        <BrowserRouter>
            <Navbar />
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/standings" element={<Standings />} />
                <Route path="/login" element={<Login />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/powerranking" element={<PowerRanking />} />
                <Route path="/halloffame" element={<HallOfFame />} />
                <Route path="/regulamento" element={<Regulamento />} />
                
                {/* ROTA ATUALIZADA DE ANÁLISES PARA TELEMETRIA */}
                <Route path="/telemetria" element={<Telemetria />} /> 
                
                <Route path="/mercado" element={<Mercado />} />
                <Route path="/admin" element={<Admin />} />

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;