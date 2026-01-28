import React from 'react';
import { SandGame } from './components/SandGame';

export default function App() {
  return (
    <div className="min-h-screen bg-[#050515] overflow-x-hidden selection:bg-rose-500">
      <SandGame />
    </div>
  );
}