import {createRoot} from 'react-dom/client';
import {DrawingStore} from './data/house';
import {App} from './App';
import './style.css';
createRoot(document.getElementById('root')!).render(<App store={new DrawingStore()}/>);
