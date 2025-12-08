import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar'; // Importando o Menu

// Páginas
import Home from './pages/Home';
import Login from './pages/Login';
import LoginJurado from './pages/LoginJurado';
import LoginJuradoTeste from './pages/LoginJuradoTeste';
import Dashboard from './pages/Dashboard';
import PowerRanking from './pages/PowerRanking';
import HallOfFame from './pages/HallOfFame';
import Regulamento from './pages/Regulamento';
import Telemetria from './pages/Telemetria';
import Mercado from './pages/Mercado';
import Standings from './pages/Standings';
import Admin from './pages/Admin';
import Calendario from './pages/Calendario';
import Analises from './pages/Analises';
import ConsultarAnalises from './pages/ConsultarAnalises';
import FormularioAcusacao from './pages/FormularioAcusacao';
import FormularioDefesa from './pages/FormularioDefesa';
import PainelVeredito from './pages/PainelVeredito';

function App() {
    return (
        <BrowserRouter>
            <Navbar />
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/login-jurado" element={<LoginJurado />} />
                <Route path="/login-jurado-teste" element={<LoginJuradoTeste />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/standings" element={<Standings />} />
                <Route path="/powerranking" element={<PowerRanking />} />
                <Route path="/halloffame" element={<HallOfFame />} />
                <Route path="/regulamento" element={<Regulamento />} />
                <Route path="/telemetria" element={<Telemetria />} />
                <Route path="/mercado" element={<Mercado />} />
                <Route path="/calendario" element={<Calendario />} />
                <Route path="/analises" element={<ConsultarAnalises />} />
                <Route path="/acusacao" element={<FormularioAcusacao />} />
                <Route path="/defesa" element={<FormularioDefesa />} />
                <Route path="/veredito" element={<PainelVeredito />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
