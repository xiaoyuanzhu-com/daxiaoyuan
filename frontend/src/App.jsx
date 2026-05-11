import { Routes, Route, Navigate } from 'react-router-dom';
import { MobileFrame } from './components/MobileFrame.jsx';
import HomeScreen from './screens/HomeScreen.jsx';
import DetailScreen from './screens/DetailScreen.jsx';
import UpdateFormScreen from './screens/UpdateFormScreen.jsx';
import CitiesScreen from './screens/CitiesScreen.jsx';
import AboutScreen from './screens/AboutScreen.jsx';

export default function App() {
  return (
    <MobileFrame>
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/s/:id" element={<DetailScreen />} />
        <Route path="/update" element={<UpdateFormScreen />} />
        <Route path="/update/:id" element={<UpdateFormScreen />} />
        <Route path="/cities" element={<CitiesScreen />} />
        <Route path="/about" element={<AboutScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </MobileFrame>
  );
}
