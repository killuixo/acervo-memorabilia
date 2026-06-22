import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MemorabiliaApp from './pages/Memorabilia';
import PrintApp from './pages/Print';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MemorabiliaApp />} />
        <Route path="/print" element={<PrintApp />} />
      </Routes>
    </BrowserRouter>
  );
}
