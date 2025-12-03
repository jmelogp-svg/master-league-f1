import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';

// Páginas
import Home from './pages/Home';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PowerRanking from './pages/PowerRanking';
import HallOfFame from './pages/HallOfFame';
import Regulamento from './pages/Regulamento';
import Analises from './pages/Analises';
import Mercado from './pages/Mercado';
import Standings from './pages/Standings';

function App() {
    return (
        <BrowserRouter>
            <Navbar />
            <Routes>
                {/* Rota Principal */}
                <Route path="/" element={<Home />} />
                
                {/* Rotas Internas */}
                <Route path="/standings" element={<Standings />} />
                <Route path="/login" element={<Login />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/powerranking" element={<PowerRanking />} />
                <Route path="/halloffame" element={<HallOfFame />} />
                <Route path="/regulamento" element={<Regulamento />} />
                <Route path="/analises" element={<Analises />} />
                <Route path="/mercado" element={<Mercado />} />

                {/* ROTA CORINGA (Salva-vidas): Qualquer erro 404 volta pra Home */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;