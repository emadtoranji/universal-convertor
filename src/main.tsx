import React from 'react';
import ReactDOM from 'react-dom/client';
import RootRouter from './RootRouter';
import './index.css';

const rootElement = document.getElementById('root');

if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <RootRouter />
    </React.StrictMode>
  );
}
